import {calcularOverall} from './overall';
import {
  INTENSIDADES,
  CONDICAO_MIN,
  CONDICAO_MAX,
  FORMA_MIN,
  FORMA_MAX,
  buscarTreino,
  type IntensidadeTreino,
  type TreinoTipo,
} from './treinoTipos';
import {grupoDaPosicao} from '../tactics/posicoes';
import {
  criarRNGComSeed,
  inteiroEntre,
  hashString,
  type RandomGenerator,
} from '../simulation/rng';
import {aplicarMoral} from './moralEngine';
import type {
  AtributoChave,
  Player,
  PlayerAttributes,
  ProgressoAtributos,
} from '../../types';

/**
 * Motor de TREINO por acúmulo de progresso. Cada sessão de treino concentra
 * ganho em poucos atributos (pesos do `TreinoTipo`, normalizados aqui) e o
 * jogador só sobe um ponto de atributo quando o progresso acumulado cruza 100%.
 *
 * Modela ainda os efeitos colaterais da sessão (condição física, forma, moral)
 * e o risco de lesão, tudo de forma DETERMINÍSTICA: o RNG é injetado, então a
 * mesma entrada (jogador + treino + intensidade + seed) produz sempre a mesma
 * saída. Lesionados não treinam de verdade — fazem reabilitação leve.
 *
 * Funções puras: `calcularEfeitoTreino` apenas descreve o que aconteceria;
 * `aplicarEfeitoTreino` produz o novo `Player`; `treinarElenco` orquestra o
 * elenco derivando um RNG estável por jogador a partir do seed base.
 */

/** Ganho de progresso base (em "pontos de 100%") antes dos fatores e da intensidade. */
const BASE_GANHO = 26;

/** Teto duro de atributo: ao chegar a 99 o progresso é zerado (não há mais subida). */
const ATRIBUTO_MAX = 99;

export interface ContextoTreino {
  /** Nível de infraestrutura do clube (1–5). Default 3 (médio). */
  nivelInfra?: number;
  /** Jogos disputados na temporada (proxy de ritmo/minutagem). Default 0. */
  jogosNaTemporada?: number;
}

export interface EfeitoTreino {
  jogadorId: string;
  /** Delta efetivo de condição física (já considerado o clamp). */
  deltaCondicao: number;
  /** Delta efetivo de forma (já considerado o clamp). */
  deltaForma: number;
  /** Delta efetivo de moral (após `aplicarMoral`). */
  deltaMoral: number;
  lesionou: boolean;
  /** Dias de lesão (0 se não lesionou). */
  diasLesao: number;
  /** Pontos de atributo ganhos nesta sessão (+1, +2...) por atributo que subiu. */
  ganhoAtributos: Partial<Record<AtributoChave, number>>;
  /** Novo progresso (0–100%) por atributo treinado. */
  progressoAtributos: ProgressoAtributos;
  atributosFinais: PlayerAttributes;
  novoOverall: number;
}

/** Multiplicador de evolução por faixa etária (jovens evoluem muito mais). */
function fatorIdade(idade: number): number {
  if (idade < 18) {
    return 1.6;
  }
  if (idade <= 20) {
    return 1.4;
  }
  if (idade <= 24) {
    return 1.1;
  }
  if (idade <= 28) {
    return 0.9;
  }
  if (idade <= 31) {
    return 0.6;
  }
  if (idade <= 33) {
    return 0.4;
  }
  return 0.25;
}

/** Quanto mais longe do potencial, mais o jogador evolui (margem em pontos de overall). */
function fatorPotencial(margem: number): number {
  if (margem <= 0) {
    return 0.15;
  }
  return 0.2 + 0.8 * Math.min(margem / 15, 1);
}

/**
 * Calcula o efeito de uma sessão de treino sobre UM jogador (função pura).
 * Não muta o jogador; retorna a descrição completa do que aconteceria.
 */
export function calcularEfeitoTreino(
  jogador: Player,
  treino: TreinoTipo,
  intensidade: IntensidadeTreino,
  contexto: ContextoTreino,
  rng: RandomGenerator,
): EfeitoTreino {
  // --- Lesionados: reabilitação leve, sem ganho de atributos. ---
  if (jogador.lesionado) {
    const leve = INTENSIDADES.leve;
    const deltaCondicao = clampDelta(
      jogador.condicaoFisica,
      leve.deltaCondicao,
      CONDICAO_MIN,
      CONDICAO_MAX,
    );
    const deltaForma = clampDelta(
      jogador.forma,
      leve.deltaForma,
      FORMA_MIN,
      FORMA_MAX,
    );
    const novaMoral = aplicarMoral(jogador.moral, leve.deltaMoral);
    return {
      jogadorId: jogador.id,
      deltaCondicao,
      deltaForma,
      deltaMoral: novaMoral - jogador.moral,
      lesionou: false,
      diasLesao: 0,
      ganhoAtributos: {},
      progressoAtributos: {},
      atributosFinais: {...jogador.atributos},
      novoOverall: jogador.overall,
    };
  }

  const config = INTENSIDADES[intensidade];

  // --- Fatores de evolução (jogador saudável). ---
  const margem = jogador.potencial - jogador.overall;
  const fIdade = fatorIdade(jogador.idade);
  const fPotencial = fatorPotencial(margem);
  const fMoral = 0.8 + (jogador.moral / 100) * 0.4;
  const fCondicao = 0.7 + (jogador.condicaoFisica / 100) * 0.3;
  const fMinutos =
    0.8 + (Math.min(contexto.jogosNaTemporada ?? 0, 20) / 20) * 0.4;
  const fInfra = 0.9 + (((contexto.nivelInfra ?? 3) - 1) / 4) * 0.3;
  const fAfinidade = treino.gruposIdeais.includes(
    grupoDaPosicao(jogador.posicaoPrincipal),
  )
    ? 1.15
    : 1.0;
  const produto =
    fIdade *
    fPotencial *
    fMoral *
    fCondicao *
    fMinutos *
    fInfra *
    fAfinidade *
    config.multiplicadorGanho;

  // --- Ganho por atributo (pesos normalizados para somar 1). ---
  const pesos = treino.atributos;
  const somaPesos = Object.values(pesos).reduce(
    (acc, peso) => acc + (peso ?? 0),
    0,
  );

  const atributosFinais: PlayerAttributes = {...jogador.atributos};
  const ganhoAtributos: Partial<Record<AtributoChave, number>> = {};
  const progressoAtributos: ProgressoAtributos = {};

  if (somaPesos > 0) {
    for (const [chave, peso] of Object.entries(pesos) as [
      AtributoChave,
      number,
    ][]) {
      const pesoNormalizado = peso / somaPesos;
      const ganho = BASE_GANHO * pesoNormalizado * produto;

      let atributoAtual = atributosFinais[chave];
      let progressoAtual = (jogador.progressoAtributos?.[chave] ?? 0) + ganho;
      let subiu = 0;

      while (progressoAtual >= 100 && atributoAtual < ATRIBUTO_MAX) {
        atributoAtual += 1;
        progressoAtual -= 100;
        subiu += 1;
      }

      // Chegou ao teto: não acumula mais progresso "perdido".
      if (atributoAtual >= ATRIBUTO_MAX) {
        atributoAtual = ATRIBUTO_MAX;
        progressoAtual = 0;
      }

      atributosFinais[chave] = atributoAtual;
      progressoAtributos[chave] = progressoAtual;
      if (subiu > 0) {
        ganhoAtributos[chave] = subiu;
      }
    }
  }

  const overallDerivado = calcularOverall(
    atributosFinais,
    jogador.posicaoPrincipal,
  );
  // O overall nunca cai por treino e nunca ultrapassa o potencial.
  const novoOverall = Math.min(
    jogador.potencial,
    Math.max(jogador.overall, overallDerivado),
  );

  // --- Efeitos físicos/mentais da sessão. ---
  const deltaForma = clampDelta(
    jogador.forma,
    config.deltaForma,
    FORMA_MIN,
    FORMA_MAX,
  );
  const deltaBrutoMoral = config.deltaMoral + (treino.bonusMoral ?? 0);
  const novaMoral = aplicarMoral(jogador.moral, deltaBrutoMoral);
  const deltaMoral = novaMoral - jogador.moral;

  // --- Risco de lesão (modulado por condição e idade). ---
  const risco =
    config.riscoLesaoBase *
    (jogador.condicaoFisica < 70 ? 1.6 : 1.0) *
    (jogador.idade >= 32 ? 1.3 : 1.0);

  if (rng() < risco) {
    // Treino interrompido: sem ganho, e desgaste físico extra. Dias REAIS de
    // calendário (Onda 3: rodadas distam 3-4 dias) — ~1 a 3 jogos fora.
    const diasLesao = inteiroEntre(rng, 3, 10);
    const condicaoBruta =
      intensidade === 'descanso' ||
      intensidade === 'leve' ||
      intensidade === 'normal'
        ? -5
        : config.deltaCondicao;
    const deltaCondicao = clampDelta(
      jogador.condicaoFisica,
      condicaoBruta,
      CONDICAO_MIN,
      CONDICAO_MAX,
    );
    return {
      jogadorId: jogador.id,
      deltaCondicao,
      deltaForma,
      deltaMoral,
      lesionou: true,
      diasLesao,
      ganhoAtributos: {},
      progressoAtributos: {},
      atributosFinais: {...jogador.atributos},
      novoOverall: jogador.overall,
    };
  }

  const deltaCondicao = clampDelta(
    jogador.condicaoFisica,
    config.deltaCondicao,
    CONDICAO_MIN,
    CONDICAO_MAX,
  );

  return {
    jogadorId: jogador.id,
    deltaCondicao,
    deltaForma,
    deltaMoral,
    lesionou: false,
    diasLesao: 0,
    ganhoAtributos,
    progressoAtributos,
    atributosFinais,
    novoOverall,
  };
}

/**
 * Delta efetivo de um valor após clamp: quanto o valor realmente muda quando
 * `atual + delta` é limitado a [minimo, maximo].
 */
function clampDelta(
  atual: number,
  delta: number,
  minimo: number,
  maximo: number,
): number {
  const final = Math.min(maximo, Math.max(minimo, atual + delta));
  return final - atual;
}

/**
 * Aplica um `EfeitoTreino` a um jogador, retornando um novo `Player` (imutável).
 * Os deltas já vêm com clamp considerado; aqui apenas reaplicamos os limites
 * por segurança e mesclamos o progresso novo sobre o existente.
 */
export function aplicarEfeitoTreino(
  jogador: Player,
  efeito: EfeitoTreino,
): Player {
  const condicaoFisica = Math.min(
    CONDICAO_MAX,
    Math.max(CONDICAO_MIN, jogador.condicaoFisica + efeito.deltaCondicao),
  );
  const forma = Math.min(
    FORMA_MAX,
    Math.max(FORMA_MIN, jogador.forma + efeito.deltaForma),
  );
  const moral = Math.min(100, Math.max(10, jogador.moral + efeito.deltaMoral));

  const novo: Player = {
    ...jogador,
    atributos: efeito.atributosFinais,
    progressoAtributos: {
      ...(jogador.progressoAtributos ?? {}),
      ...efeito.progressoAtributos,
    },
    overall: efeito.novoOverall,
    condicaoFisica,
    forma,
    moral,
  };

  if (efeito.lesionou) {
    novo.lesionado = true;
    novo.diasLesao = efeito.diasLesao;
  }

  return novo;
}

/**
 * Treina um elenco inteiro com o mesmo treino/intensidade. Cada jogador recebe
 * um RNG estável derivado de `baseSeed + hashString(id)`, garantindo
 * determinismo (mesma entrada => mesma saída) e independência entre jogadores.
 * Se o treino não existir, o elenco é retornado inalterado.
 */
export function treinarElenco(
  jogadores: Player[],
  treinoId: string,
  intensidade: IntensidadeTreino,
  contexto: ContextoTreino,
  baseSeed: number,
): Player[] {
  const treino = buscarTreino(treinoId);
  if (!treino) {
    return jogadores;
  }

  return jogadores.map(jogador => {
    const rng = criarRNGComSeed(baseSeed + hashString(jogador.id));
    const efeito = calcularEfeitoTreino(
      jogador,
      treino,
      intensidade,
      contexto,
      rng,
    );
    return aplicarEfeitoTreino(jogador, efeito);
  });
}
