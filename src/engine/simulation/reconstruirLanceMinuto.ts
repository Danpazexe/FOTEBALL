/**
 * reconstruirLanceMinuto — o jogo VIVO do radar, minuto a minuto.
 *
 * Mesmo padrão do replay de gol ("reconstrução DERIVADA, nunca persistida"):
 * funções PURAS e DETERMINÍSTICAS que leem o que a engine JÁ produziu e
 * derivam (1) a posição dos 22 jogadores no campo e (2) uma sequência curta de
 * TOQUES entre jogadores reais — a bola sempre "pega" em alguém visível.
 *
 * O que é FATO (vem da engine, nunca inventado):
 *  • quem está em campo (titulares vigentes, com substituições/expulsões);
 *  • a ÂNCORA de formação de cada jogador (slot REAL da escalação —
 *    `coordenadaDoTitular`, a mesma fonte da tela de tática);
 *  • o momento do minuto (amostra real de `momentumPorMinuto`) — decide quem
 *    fica com a bola e desliza o BLOCO dos times (linha alta/baixa);
 *  • o evento âncora do minuto: chute nas coordenadas REAIS do ledger causal,
 *    cartão/lesão sobre o jogador real, autor/assistente reais.
 *
 * O que é DERIVADO (determinístico por seed real + minuto + jogador): o
 * micro-drift de cada ponto e a ordem dos toques de construção — mesma
 * partida ⇒ mesmo quadro.
 *
 * COORDENADAS DE SAÍDA: campo INTEIRO HORIZONTAL compartilhado — a casa
 * defende a ESQUERDA e ataca para a DIREITA; x 0 = linha do gol da casa …
 * 1 = linha do gol do visitante; y 0 = topo … 1 = base.
 *
 * Sem React, sem Math.random(), sem Date.now(), sem Zustand/SQLite/rede.
 */

import type {ChutePartida, EventoPartida, Position} from '../../types';

import type {TipoPassoLance} from './lances';
import {
  criarRNGComSeed,
  hashString,
  limitar,
  type RandomGenerator,
} from './rng';

/** O terço de ataque do ledger cobre 33% do campo (mesma régua do PassoLance). */
const TERCO_ATAQUE = 0.33;
/** Largura da boca do gol no eixo lateral (fração do campo), centrada. */
const BOCA_GOL = 0.3;
/** Quanto o BLOCO do time desliza com momento ±1 (linha alta/baixa). */
const DESLIZE_BLOCO = 0.09;
/** Amplitude do micro-drift por jogador (goleiro drifta menos). */
const DRIFT_JOGADOR = 0.035;
const DRIFT_GOLEIRO = 0.012;

/** Ponto normalizado 0..1 × 0..1. */
export interface PontoCampo {
  x: number;
  y: number;
}

/**
 * Jogador em campo NO MINUTO. `ancora` é o slot REAL da formação vigente na
 * convenção da tática (`coordenadaDoTitular`: x 0=lateral esquerda…1=direita;
 * y 0=própria defesa…1=ataque). Sem âncora (save antigo sem coordenadas), cai
 * na posição-base da função.
 */
export interface JogadorEmCampoLance {
  id: string;
  posicao: Position;
  ancora?: PontoCampo;
}

export interface EntradaLanceMinuto {
  /** Seed REAL da partida (a mesma de `iniciarPartidaAoVivo`). */
  seedPartida: number;
  minuto: number;
  /** Amostra REAL do momento deste minuto (ótica da casa, −1..1). */
  momentoMinuto: number;
  timeCasaId: string;
  timeForaId: string;
  emCampoCasa: JogadorEmCampoLance[];
  emCampoFora: JogadorEmCampoLance[];
  /** Eventos REAIS emitidos neste minuto. */
  eventosDoMinuto: EventoPartida[];
  /** Chutes REAIS do ledger causal neste minuto. */
  chutesDoMinuto: ChutePartida[];
}

/** Um toque do lance: a bola SEMPRE está com um jogador real. */
export interface ToqueLance {
  tipo: TipoPassoLance;
  jogadorId: string;
  /** Time do jogador que dá o toque (no gol contra, o defensor adversário). */
  timeId: string;
  x: number;
  y: number;
}

export interface LanceMinuto {
  minuto: number;
  /** Time com a posse no lance. */
  timeId: string;
  toques: ToqueLance[];
}

/** Ponto de UM jogador no radar (frame horizontal), com flag de goleiro. */
export interface PontoJogadorRadar {
  id: string;
  x: number;
  y: number;
  goleiro: boolean;
}

/** Os dois elencos posicionados no minuto (frame horizontal). */
export interface ElencosPosicionados {
  casa: PontoJogadorRadar[];
  fora: PontoJogadorRadar[];
}

/**
 * Posição-base de cada função no frame "ataque para cima" (x 0=esq…1=dir,
 * y 0=gol adversário…1=próprio gol). Fallback quando a formação não traz o
 * slot real (save antigo sem coordenadas).
 */
const BASE_POSICAO: Record<Position, PontoCampo> = {
  GOL: {x: 0.5, y: 0.94},
  ZAG: {x: 0.5, y: 0.8},
  LD: {x: 0.84, y: 0.7},
  LE: {x: 0.16, y: 0.7},
  VOL: {x: 0.5, y: 0.6},
  MC: {x: 0.5, y: 0.48},
  MEI: {x: 0.5, y: 0.35},
  PD: {x: 0.84, y: 0.24},
  PE: {x: 0.16, y: 0.24},
  SA: {x: 0.5, y: 0.2},
  CA: {x: 0.5, y: 0.12},
};

/** Posição-base (frame ataque-para-cima) de uma função. */
export function coordenadaBasePosicao(posicao: Position): PontoCampo {
  return {...BASE_POSICAO[posicao]};
}

/**
 * Converte um ponto do frame "ataque para cima" de um time para o campo
 * HORIZONTAL compartilhado (casa ataca para a direita; visitante, esquerda).
 */
export function paraCampoHorizontal(
  ponto: PontoCampo,
  ehCasa: boolean,
): PontoCampo {
  const x = limitar(ponto.x, 0, 1);
  const y = limitar(ponto.y, 0, 1);
  return ehCasa ? {x: 1 - y, y: x} : {x: y, y: 1 - x};
}

/** Âncora do jogador no frame ataque-para-cima (slot real ou base da função). */
function ancoraAtaqueAcima(jogador: JogadorEmCampoLance): PontoCampo {
  if (jogador.ancora) {
    // Convenção da tática (y 0=defesa…1=ataque) → ataque-para-cima.
    return {
      x: limitar(jogador.ancora.x, 0, 1),
      y: 1 - limitar(jogador.ancora.y, 0, 1),
    };
  }
  return BASE_POSICAO[jogador.posicao];
}

/**
 * Posição de UM jogador no minuto, no frame HORIZONTAL: âncora real da
 * formação + deslize do BLOCO pelo momento (linha alta/baixa) + micro-drift
 * determinístico por (seed, minuto, jogador). É a MESMA função usada pelos 22
 * pontos do radar e pelos toques do lance — a bola viaja até o ponto visível.
 */
export function posicaoJogadorNoMinuto(
  seedPartida: number,
  minuto: number,
  momentoMinuto: number,
  jogador: JogadorEmCampoLance,
  ehCasa: boolean,
): PontoCampo {
  const base = ancoraAtaqueAcima(jogador);
  const goleiro = jogador.posicao === 'GOL';
  // Momento do PRÓPRIO time: positivo empurra o bloco para o ataque (y menor
  // no frame ataque-para-cima); o time pressionado recua. Goleiro acompanha
  // pouco (sai da linha só um passo).
  const momentoDoTime = ehCasa ? momentoMinuto : -momentoMinuto;
  const deslize =
    (goleiro ? DESLIZE_BLOCO * 0.3 : DESLIZE_BLOCO) * momentoDoTime;
  // Drift por JOGADOR (seed própria por id): idêntico aqui e nos toques do
  // lance, em qualquer ordem de chamada — determinístico, sem Math.random.
  const rngDrift = criarRNGComSeed(
    hashString(`${seedPartida}:${minuto}:${jogador.id}:drift`),
  );
  const amplitude = goleiro ? DRIFT_GOLEIRO : DRIFT_JOGADOR;
  const x = limitar(base.x + (rngDrift() - 0.5) * amplitude, 0.02, 0.98);
  const y = limitar(
    base.y - deslize + (rngDrift() - 0.5) * amplitude,
    0.02,
    0.98,
  );
  return paraCampoHorizontal({x, y}, ehCasa);
}

/** Posiciona os DOIS elencos do minuto — os 22 pontos vivos do radar. */
export function posicionarElencosMinuto(
  entrada: Pick<
    EntradaLanceMinuto,
    'seedPartida' | 'minuto' | 'momentoMinuto' | 'emCampoCasa' | 'emCampoFora'
  >,
): ElencosPosicionados {
  const {seedPartida, minuto, momentoMinuto, emCampoCasa, emCampoFora} =
    entrada;
  const posicionar = (
    jogadores: JogadorEmCampoLance[],
    ehCasa: boolean,
  ): PontoJogadorRadar[] =>
    jogadores.map(jogador => ({
      id: jogador.id,
      goleiro: jogador.posicao === 'GOL',
      ...posicaoJogadorNoMinuto(
        seedPartida,
        minuto,
        momentoMinuto,
        jogador,
        ehCasa,
      ),
    }));
  return {
    casa: posicionar(emCampoCasa, true),
    fora: posicionar(emCampoFora, false),
  };
}

/** Pools de preferência para a construção (meio primeiro, depois frente). */
const POOL_MEIO: readonly Position[] = ['VOL', 'MC', 'MEI'];
const POOL_FRENTE: readonly Position[] = ['MEI', 'PD', 'PE', 'SA', 'CA'];

/** Sorteio ponderado (pool preferida pesa 4×) que REMOVE o escolhido. */
function retirarPonderado(
  rng: RandomGenerator,
  candidatos: JogadorEmCampoLance[],
  pool: readonly Position[],
): JogadorEmCampoLance | undefined {
  if (candidatos.length === 0) {
    return undefined;
  }
  const pesos = candidatos.map(c => (pool.includes(c.posicao) ? 4 : 1));
  const total = pesos.reduce((soma, peso) => soma + peso, 0);
  let sorteio = rng() * total;
  for (let i = 0; i < candidatos.length; i += 1) {
    sorteio -= pesos[i];
    if (sorteio < 0) {
      return candidatos.splice(i, 1)[0];
    }
  }
  return candidatos.pop();
}

/** Escolhe o chute âncora do minuto: gol primeiro; senão, o último chute. */
function chuteAncora(chutes: ChutePartida[]): ChutePartida | undefined {
  return chutes.find(c => c.resultado === 'gol') ?? chutes[chutes.length - 1];
}

/**
 * Reconstrói o lance de um minuto simulado. Cada toque de CONSTRUÇÃO acontece
 * SOBRE o ponto visível do jogador (`posicaoJogadorNoMinuto` — o mesmo dos 22
 * pontos); só os desfechos reais (chute/gol/falta) ancoram no ponto do FATO.
 * Devolve null quando não há jogadores em campo para o lado com a posse.
 *
 * Determinístico: a MESMA entrada produz SEMPRE o mesmo lance.
 */
export function reconstruirLanceMinuto(
  entrada: EntradaLanceMinuto,
): LanceMinuto | null {
  const {
    seedPartida,
    minuto,
    momentoMinuto,
    timeCasaId,
    timeForaId,
    emCampoCasa,
    emCampoFora,
    eventosDoMinuto,
    chutesDoMinuto,
  } = entrada;
  const rng = criarRNGComSeed(
    hashString(`${seedPartida}:${minuto}:lance-minuto`),
  );

  const ladoDe = (timeId: string): JogadorEmCampoLance[] =>
    timeId === timeCasaId ? emCampoCasa : emCampoFora;

  /** Ponto VISÍVEL do jogador neste minuto (mesmo dos 22 pontos do radar). */
  const pontoDe = (jogador: JogadorEmCampoLance, ehCasa: boolean): PontoCampo =>
    posicaoJogadorNoMinuto(seedPartida, minuto, momentoMinuto, jogador, ehCasa);

  /** Construção: 1..n jogadores reais tocando SOBRE seus pontos do radar. */
  const toquesConstrucao = (
    emCampo: JogadorEmCampoLance[],
    excluirIds: Array<string | undefined>,
    quantos: number,
    timeId: string,
    ehCasa: boolean,
  ): ToqueLance[] => {
    const candidatos = emCampo.filter(
      j => !excluirIds.includes(j.id) && j.posicao !== 'GOL',
    );
    const toques: ToqueLance[] = [];
    for (let i = 0; i < quantos; i += 1) {
      const escolhido = retirarPonderado(
        rng,
        candidatos,
        i === 0 ? POOL_MEIO : POOL_FRENTE,
      );
      if (!escolhido) {
        break;
      }
      toques.push({
        tipo: rng() < 0.7 ? 'passe' : 'conducao',
        jogadorId: escolhido.id,
        timeId,
        ...pontoDe(escolhido, ehCasa),
      });
    }
    return toques;
  };

  // ── ÂNCORA 1: chute REAL do minuto (coordenada do ledger causal) ───────────
  const chute = chuteAncora(chutesDoMinuto);
  if (chute) {
    const posseId = chute.timeId;
    const posseEhCasa = posseId === timeCasaId;
    const emCampo = ladoDe(posseId);
    if (emCampo.length === 0) {
      return null;
    }
    // Ponto REAL do chute (terço de ataque → campo inteiro → horizontal).
    const ancora = paraCampoHorizontal(
      {x: chute.x, y: chute.y * TERCO_ATAQUE},
      posseEhCasa,
    );
    const golContra = chute.golContra === true;
    const autorId = chute.jogadorId;
    const assistenteId = golContra ? undefined : chute.assistenciaId;

    const toques: ToqueLance[] = toquesConstrucao(
      emCampo,
      [autorId, assistenteId],
      1 + (rng() < 0.6 ? 1 : 0),
      posseId,
      posseEhCasa,
    );
    if (assistenteId !== undefined) {
      const assistente = emCampo.find(j => j.id === assistenteId);
      toques.push({
        tipo: 'assistencia',
        jogadorId: assistenteId,
        timeId: posseId,
        // Garçom real toca do SEU ponto visível; sem slot (raro), perto do chute.
        ...(assistente
          ? pontoDe(assistente, posseEhCasa)
          : {
              x: limitar(ancora.x + (rng() - 0.5) * 0.2, 0.02, 0.98),
              y: limitar(ancora.y + (rng() - 0.5) * 0.2, 0.02, 0.98),
            }),
      });
    }
    if (golContra) {
      // O toque final é do DEFENSOR adversário no ponto real do desvio (mesma
      // convenção do replay de gol contra).
      toques.push({
        tipo: 'gol_contra',
        jogadorId: autorId,
        timeId: posseEhCasa ? timeForaId : timeCasaId,
        x: ancora.x,
        y: ancora.y,
      });
    } else {
      toques.push({
        tipo: 'finalizacao',
        jogadorId: autorId,
        timeId: posseId,
        x: ancora.x,
        y: ancora.y,
      });
    }
    if (chute.resultado === 'gol') {
      // Bola na rede: lateral REAL da baliza (golX do ledger, quando houver).
      const rede = paraCampoHorizontal(
        {x: 0.5 - BOCA_GOL / 2 + (chute.golX ?? 0.5) * BOCA_GOL, y: 0},
        posseEhCasa,
      );
      toques.push({
        tipo: golContra ? 'gol_contra' : 'gol',
        jogadorId: autorId,
        timeId: golContra
          ? posseEhCasa
            ? timeForaId
            : timeCasaId
          : posseId,
        x: rede.x,
        y: rede.y,
      });
    }
    return {minuto, timeId: posseId, toques};
  }

  // ── ÂNCORA 2: cartão/lesão — jogada em cima do jogador REAL punido ─────────
  const disciplinar = eventosDoMinuto.find(
    e =>
      e.tipo === 'cartao_amarelo' ||
      e.tipo === 'cartao_vermelho' ||
      e.tipo === 'lesao',
  );
  if (disciplinar) {
    const punidoEhCasa = disciplinar.timeId === timeCasaId;
    const posseId = punidoEhCasa ? timeForaId : timeCasaId;
    const posseEhCasa = !punidoEhCasa;
    const emCampo = ladoDe(posseId);
    if (emCampo.length === 0) {
      return null;
    }
    // O lance para ONDE o punido/lesionado está no radar neste minuto.
    const punido: JogadorEmCampoLance = ladoDe(disciplinar.timeId).find(
      j => j.id === disciplinar.jogadorId,
    ) ?? {id: disciplinar.jogadorId, posicao: 'MC'};
    const ancora = pontoDe(punido, punidoEhCasa);

    const construcao = toquesConstrucao(emCampo, [], 2, posseId, posseEhCasa);
    const sofredorId =
      construcao.length > 0
        ? construcao[construcao.length - 1].jogadorId
        : emCampo[0].id;
    const toques: ToqueLance[] = [
      ...construcao.slice(0, -1),
      {
        tipo: 'falta_sofrida',
        jogadorId: sofredorId,
        timeId: posseId,
        x: ancora.x,
        y: ancora.y,
      },
    ];
    return {minuto, timeId: posseId, toques};
  }

  // ── SEM EVENTO: reciclagem de posse guiada pelo momento REAL ───────────────
  const posseEhCasa =
    momentoMinuto > 0.08
      ? true
      : momentoMinuto < -0.08
        ? false
        : rng() < 0.5;
  const posseId = posseEhCasa ? timeCasaId : timeForaId;
  const emCampo = ladoDe(posseId);
  if (emCampo.length === 0) {
    return null;
  }
  // Profundidade emerge do próprio bloco: com momento alto o time inteiro
  // (e portanto os toques) já deslizou para o campo adversário.
  const construcao = toquesConstrucao(emCampo, [], 3, posseId, posseEhCasa);
  if (construcao.length === 0) {
    return null;
  }
  const ultimo = construcao[construcao.length - 1];
  const toques: ToqueLance[] = [
    ...construcao.slice(0, -1),
    {...ultimo, tipo: 'recepcao'},
  ];
  return {minuto, timeId: posseId, toques};
}
