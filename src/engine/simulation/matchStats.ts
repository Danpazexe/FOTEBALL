/**
 * Estatísticas avançadas da partida — acumuladas minuto a minuto a partir do
 * jogo REAL; nada é inventado na UI. Duas fontes alimentam os números:
 *
 * 1. EVENTOS do simulador (gol, pênalti, chance, cartão): cada um vira as
 *    contagens que implica — gol => finalização no alvo; cartão => falta;
 *    pênalti => falta do adversário + finalização na área...
 * 2. VOLUME por minuto derivado do estado real: posse do minuto, probabilidade
 *    de gol ATUAL do motor (fadiga/expulsões/momentum inclusos), atributos dos
 *    jogadores EM CAMPO, tática e clima — com um RNG próprio que não interfere
 *    no sorteio de eventos (mesma seed => mesma partida de antes).
 *
 * Invariantes garantidos (cobertos por teste):
 * finalizacoes = finalizacoesNaArea + finalizacoesDeFora;
 * finalizacoesNoAlvo >= gols; passesCertos <= passesTentados;
 * faltas >= cartões do time.
 */

import type {
  ClimaPartida,
  EstatisticasPartida,
  EstatisticasTimePartida,
  EventoPartida,
  Player,
  Position,
  Tatica,
} from '../../types';

import type {ProbabilidadesPartida} from './probabilityCalc';
import {limitar, type RandomGenerator} from './rng';

/** Acumulador mutável de um time (floats; arredonda só no fim). */
interface AcumuladorTime {
  golsEsperados: number;
  assistenciasEsperadas: number;
  finalizacoes: number;
  finalizacoesNoAlvo: number;
  finalizacoesNaArea: number;
  finalizacoesDeFora: number;
  grandesChances: number;
  passesTentados: number;
  passesCertos: number;
  dribles: number;
  desarmes: number;
  interceptacoes: number;
  cruzamentos: number;
  escanteios: number;
  faltas: number;
  impedimentos: number;
  posseZonas: number[][];
  perigoSetores: number[];
  finalizacoesPorJogador: Record<string, {total: number; noAlvo: number}>;
  passesPorJogador: Record<string, {tentados: number; certos: number}>;
}

/** Estado vivo das estatísticas da partida (casa + fora + condições do jogo). */
export interface EstatisticasAoVivo {
  casa: AcumuladorTime;
  fora: AcumuladorTime;
  clima: ClimaPartida;
  temperatura: number;
  /** Momentum por minuto na perspectiva da casa (−1..1). */
  momentumPorMinuto: number[];
}

/** Tudo que o acumulador precisa saber sobre UM minuto simulado. */
export interface EntradaMinutoEstatisticas {
  timeCasaId: string;
  /** Jogadores realmente EM CAMPO neste minuto (sem expulsos/lesionados). */
  emCampoCasa: Player[];
  emCampoFora: Player[];
  taticaCasa: Tatica | null | undefined;
  taticaFora: Tatica | null | undefined;
  probabilidades: ProbabilidadesPartida;
  eventosDoMinuto: EventoPartida[];
  /** Fração de posse da CASA neste minuto (a mesma da barra de posse). */
  fracaoPosseCasa: number;
  fatorTempo: number;
  momentumCasa: number;
  momentumFora: number;
  rng: RandomGenerator;
}

function criarAcumuladorTime(): AcumuladorTime {
  return {
    golsEsperados: 0,
    assistenciasEsperadas: 0,
    finalizacoes: 0,
    finalizacoesNoAlvo: 0,
    finalizacoesNaArea: 0,
    finalizacoesDeFora: 0,
    grandesChances: 0,
    passesTentados: 0,
    passesCertos: 0,
    dribles: 0,
    desarmes: 0,
    interceptacoes: 0,
    cruzamentos: 0,
    escanteios: 0,
    faltas: 0,
    impedimentos: 0,
    posseZonas: [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ],
    perigoSetores: [0, 0, 0],
    finalizacoesPorJogador: {},
    passesPorJogador: {},
  };
}

/**
 * Sorteia as condições do jogo (determinístico pela seed via `rng`). O clima
 * influencia o VOLUME das estatísticas (passes certos, dribles, faltas) — a
 * probabilidade de gol do motor não muda, preservando o balanceamento.
 */
export function criarEstatisticasAoVivo(rng: RandomGenerator): EstatisticasAoVivo {
  const sorteioClima = rng();
  const clima: ClimaPartida =
    sorteioClima < 0.5 ? 'Ensolarado' : sorteioClima < 0.8 ? 'Nublado' : 'Chuvoso';
  const temperatura = Math.round(17 + rng() * 19); // 17–36°C
  return {
    casa: criarAcumuladorTime(),
    fora: criarAcumuladorTime(),
    clima,
    temperatura,
    momentumPorMinuto: [],
  };
}

/** Corredor do campo pela posição natural: 0=esquerda, 1=centro, 2=direita. */
function corredorDaPosicao(posicao: Position): 0 | 1 | 2 {
  if (posicao === 'LE' || posicao === 'PE') {
    return 0;
  }
  if (posicao === 'LD' || posicao === 'PD') {
    return 2;
  }
  return 1;
}

function mediaAtributo(
  jogadores: Player[],
  seletor: (jogador: Player) => number,
): number {
  if (jogadores.length === 0) {
    return 60;
  }
  return jogadores.reduce((soma, j) => soma + seletor(j), 0) / jogadores.length;
}

/** Peso de quem FINALIZA (não de quem marca): posição de área + aptidão. */
function pesoFinalizador(jogador: Player): number {
  const posicao = jogador.posicaoPrincipal;
  const base =
    posicao === 'CA'
      ? 6
      : ['PD', 'PE', 'SA'].includes(posicao)
        ? 4
        : ['MEI', 'MC'].includes(posicao)
          ? 2
          : 0.5;
  return base * (Math.max(20, jogador.atributos.finalizacao) / 70);
}

function escolherFinalizador(
  jogadores: Player[],
  rng: RandomGenerator,
): Player | undefined {
  const total = jogadores.reduce((s, j) => s + pesoFinalizador(j), 0);
  if (total <= 0) {
    return jogadores[0];
  }
  let cursor = rng() * total;
  for (const jogador of jogadores) {
    cursor -= pesoFinalizador(jogador);
    if (cursor <= 0) {
      return jogador;
    }
  }
  return jogadores[0];
}

function registrarFinalizacaoJogador(
  time: AcumuladorTime,
  jogadorId: string,
  noAlvo: boolean,
): void {
  const atual = time.finalizacoesPorJogador[jogadorId] ?? {total: 0, noAlvo: 0};
  time.finalizacoesPorJogador[jogadorId] = {
    total: atual.total + 1,
    noAlvo: atual.noAlvo + (noAlvo ? 1 : 0),
  };
}

/** Aplica ao acumulador o que os EVENTOS reais do minuto implicam. */
function processarEventosDoMinuto(
  entrada: EntradaMinutoEstatisticas,
  casa: AcumuladorTime,
  fora: AcumuladorTime,
): void {
  const rng = entrada.rng;
  const porId = new Map(
    [...entrada.emCampoCasa, ...entrada.emCampoFora].map(j => [j.id, j]),
  );
  // Faltas de pênalti que JÁ viraram cartão neste minuto: o cartão conta a
  // falta sozinho — sem isto o mesmo lance somaria duas faltas.
  const punidosComCartao = new Set(
    entrada.eventosDoMinuto
      .filter(
        e => e.tipo === 'cartao_amarelo' || e.tipo === 'cartao_vermelho',
      )
      .map(e => e.jogadorId),
  );

  for (const evento of entrada.eventosDoMinuto) {
    const ehCasa = evento.timeId === entrada.timeCasaId;
    const time = ehCasa ? casa : fora;
    const adversario = ehCasa ? fora : casa;
    const autor = porId.get(evento.jogadorId);
    const corredor = evento.penaltiData
      ? 1
      : corredorDaPosicao(autor?.posicaoPrincipal ?? 'MC');

    if (evento.tipo === 'gol') {
      const naArea = evento.penaltiData ? true : rng() < 0.8;
      time.finalizacoes += 1;
      time.finalizacoesNoAlvo += 1;
      time.finalizacoesNaArea += naArea ? 1 : 0;
      time.finalizacoesDeFora += naArea ? 0 : 1;
      time.grandesChances += 1;
      time.perigoSetores[corredor] = (time.perigoSetores[corredor] ?? 0) + 1;
      registrarFinalizacaoJogador(time, evento.jogadorId, true);
      // Gol de pênalti: o adversário cometeu a falta que originou a cobrança
      // (a menos que o infrator já tenha sido punido com cartão no lance).
      if (
        evento.penaltiData &&
        !(evento.jogadorFaltaId && punidosComCartao.has(evento.jogadorFaltaId))
      ) {
        adversario.faltas += 1;
      }
    } else if (evento.tipo === 'penalti') {
      // Pênalti desperdiçado: defendido = foi no alvo; para fora, não.
      const defendido =
        evento.penaltiData !== undefined &&
        evento.penaltiData.direcaoGoleiro === evento.penaltiData.direcaoChute;
      time.finalizacoes += 1;
      time.finalizacoesNaArea += 1;
      time.finalizacoesNoAlvo += defendido ? 1 : 0;
      time.grandesChances += 1;
      time.perigoSetores[1] = (time.perigoSetores[1] ?? 0) + 0.8;
      if (
        !(evento.jogadorFaltaId && punidosComCartao.has(evento.jogadorFaltaId))
      ) {
        adversario.faltas += 1;
      }
      registrarFinalizacaoJogador(time, evento.jogadorId, defendido);
    } else if (evento.tipo === 'chance_perdida') {
      const naArea = rng() < 0.7;
      time.finalizacoes += 1;
      time.finalizacoesNaArea += naArea ? 1 : 0;
      time.finalizacoesDeFora += naArea ? 0 : 1;
      const noAlvo = rng() < 0.45;
      time.finalizacoesNoAlvo += noAlvo ? 1 : 0;
      time.grandesChances += 1;
      time.perigoSetores[corredor] = (time.perigoSetores[corredor] ?? 0) + 0.7;
      registrarFinalizacaoJogador(time, evento.jogadorId, noAlvo);
    } else if (
      evento.tipo === 'cartao_amarelo' ||
      evento.tipo === 'cartao_vermelho'
    ) {
      time.faltas += 1;
    }
  }
}

/** Pesos das LINHAS (def/meio/ata) da posse por zona, conforme tática e jogo. */
function pesosLinhas(tatica: Tatica | null | undefined, momentum: number): number[] {
  const linhas = [0.28, 0.44, 0.28];
  if (tatica?.linhaDefensiva === 'Recuada') {
    linhas[0] += 0.05;
    linhas[2] -= 0.05;
  } else if (tatica?.linhaDefensiva === 'Adiantada') {
    linhas[0] -= 0.05;
    linhas[2] += 0.05;
  }
  if (tatica?.estiloOfensivo === 'Posse de bola') {
    linhas[1] += 0.06;
    linhas[0] -= 0.03;
    linhas[2] -= 0.03;
  } else if (tatica?.estiloOfensivo === 'Ataque direto') {
    // Bola longa pula o meio-campo.
    linhas[1] -= 0.08;
    linhas[0] += 0.03;
    linhas[2] += 0.05;
  }
  // Atrás do placar (momentum > 1): empurra o time para o terço ofensivo.
  if (momentum > 1.02) {
    linhas[2] += 0.05;
    linhas[0] -= 0.05;
  }
  return linhas;
}

/** Pesos das COLUNAS (esq/centro/dir) pela força real dos corredores em campo. */
function pesosColunas(emCampo: Player[]): number[] {
  const base = [0.27, 0.46, 0.27];
  const overallGeral = mediaAtributo(
    emCampo.filter(j => j.posicaoPrincipal !== 'GOL'),
    j => j.overall,
  );
  const pesos = base.map((peso, coluna) => {
    const doCorredor = emCampo.filter(
      j =>
        j.posicaoPrincipal !== 'GOL' &&
        corredorDaPosicao(j.posicaoPrincipal) === coluna,
    );
    const overallCorredor =
      doCorredor.length > 0
        ? mediaAtributo(doCorredor, j => j.overall)
        : overallGeral * 0.85; // corredor sem ninguém escala pouco
    return peso * (1 + (overallCorredor - overallGeral) / 150);
  });
  const total = pesos.reduce((s, p) => s + p, 0);
  return pesos.map(p => p / total);
}

/** Acumula o volume sintético de UM lado num minuto (posse, chutes, faltas...). */
function acumularVolumeTime(
  time: AcumuladorTime,
  emCampo: Player[],
  tatica: Tatica | null | undefined,
  taticaAdversario: Tatica | null | undefined,
  fracaoPosse: number,
  probGolMinuto: number,
  probPenaltiMinuto: number,
  fatorTempo: number,
  momentum: number,
  clima: ClimaPartida,
  temperatura: number,
  rng: RandomGenerator,
): void {
  const chuva = clima === 'Chuvoso';
  const linha = emCampo.filter(j => j.posicaoPrincipal !== 'GOL');

  // xG/xA: a probabilidade REAL de gol do minuto (com reta final e momentum) é,
  // por definição, os gols esperados do modelo. Pênalti vale ~0.78 de xG.
  const xgMinuto = probGolMinuto * fatorTempo * momentum;
  time.golsEsperados += xgMinuto + probPenaltiMinuto * 0.78;
  // O motor credita garçom em ~70% dos gols de jogo aberto.
  time.assistenciasEsperadas += xgMinuto * 0.7;

  // Finalização extra (sem evento do simulador): quem pressiona chuta mais.
  // Calibrado p/ ~25–29 chutes/jogo (soma dos dois times) — ver medição de stats.
  const probFinalizacao = limitar(xgMinuto * 8, 0.022, 0.4);
  if (rng() < probFinalizacao) {
    const naArea = rng() < 0.58;
    const noAlvo = rng() < (naArea ? 0.36 : 0.24) * (chuva ? 0.9 : 1);
    time.finalizacoes += 1;
    time.finalizacoesNaArea += naArea ? 1 : 0;
    time.finalizacoesDeFora += naArea ? 0 : 1;
    time.finalizacoesNoAlvo += noAlvo ? 1 : 0;
    const autor = escolherFinalizador(linha, rng);
    if (autor) {
      registrarFinalizacaoJogador(time, autor.id, noAlvo);
      const corredor = corredorDaPosicao(autor.posicaoPrincipal);
      time.perigoSetores[corredor] =
        (time.perigoSetores[corredor] ?? 0) + (naArea ? 0.45 : 0.3);
    }
    // Chute na área rende escanteio com frequência (desvio/defesa).
    if (naArea && rng() < 0.42) {
      time.escanteios += 1;
    }
  }
  // Escanteio de pressão sem chute (cruzamento afastado pela zaga).
  if (rng() < 0.032 * (0.5 + fracaoPosse)) {
    time.escanteios += 1;
  }

  // Faltas: marcação pesada e ritmo intenso cobram seu preço.
  const agressividade =
    (tatica?.marcacao === 'Pressão alta'
      ? 1.5
      : tatica?.marcacao === 'Individual'
        ? 1.25
        : 1) *
    (tatica?.ritmo === 'Intenso' ? 1.15 : 1) *
    (chuva ? 1.1 : 1);
  if (rng() < 0.115 * agressividade) {
    time.faltas += 1;
  }

  // Impedimentos: bola longa contra linha adiantada é a receita clássica.
  const probImpedimento =
    0.016 *
    (tatica?.estiloOfensivo === 'Ataque direto'
      ? 1.6
      : tatica?.estiloOfensivo === 'Contra-ataque'
        ? 1.3
        : 1) *
    (taticaAdversario?.linhaDefensiva === 'Adiantada' ? 1.5 : 1);
  if (rng() < probImpedimento) {
    time.impedimentos += 1;
  }

  // Passes: ~9.5 passes/minuto de jogo repartidos pela posse do minuto.
  const fatorEstiloPasses =
    tatica?.estiloOfensivo === 'Posse de bola'
      ? 1.15
      : tatica?.estiloOfensivo === 'Ataque direto'
        ? 0.85
        : tatica?.estiloOfensivo === 'Contra-ataque'
          ? 0.9
          : 1;
  const volumePasses =
    9.5 * fracaoPosse * fatorEstiloPasses * (temperatura > 32 ? 0.97 : 1);
  const acerto =
    limitar(0.62 + (mediaAtributo(linha, j => j.atributos.passe) / 100) * 0.33, 0.7, 0.94) *
    (chuva ? 0.96 : 1);
  time.passesTentados += volumePasses;
  time.passesCertos += volumePasses * acerto;

  // Reparte os passes do minuto entre quem está EM CAMPO: construtores (meio/
  // defesa) tocam mais; a precisão individual segue o atributo de passe.
  const pesoPasse = (j: Player): number => {
    const posicao = j.posicaoPrincipal;
    const fatorPosicao = ['VOL', 'MC', 'MEI'].includes(posicao)
      ? 1.3
      : posicao === 'ZAG'
        ? 1.15
        : ['LD', 'LE'].includes(posicao)
          ? 1.0
          : posicao === 'GOL'
            ? 0.45
            : ['PD', 'PE', 'SA'].includes(posicao)
              ? 0.85
              : 0.7;
    return fatorPosicao * (Math.max(30, j.atributos.passe) / 70);
  };
  const somaPesos = emCampo.reduce((s, j) => s + pesoPasse(j), 0);
  if (somaPesos > 0) {
    for (const jogador of emCampo) {
      const parcela = volumePasses * (pesoPasse(jogador) / somaPesos);
      const acertoJogador =
        limitar(0.6 + (jogador.atributos.passe / 100) * 0.35, 0.65, 0.95) *
        (chuva ? 0.96 : 1);
      const atual = time.passesPorJogador[jogador.id] ?? {tentados: 0, certos: 0};
      time.passesPorJogador[jogador.id] = {
        tentados: atual.tentados + parcela,
        certos: atual.certos + parcela * acertoJogador,
      };
    }
  }

  // Duelos: com a bola dribla-se; sem a bola desarma-se e intercepta-se.
  time.dribles +=
    fracaoPosse * (mediaAtributo(linha, j => j.atributos.drible) / 70) * 0.26 *
    (chuva ? 0.9 : 1);
  time.desarmes +=
    (1 - fracaoPosse) *
    (mediaAtributo(linha, j => j.atributos.desarme) / 70) *
    0.24 *
    (tatica?.marcacao === 'Pressão alta' ? 1.2 : 1);
  time.interceptacoes +=
    (1 - fracaoPosse) * (mediaAtributo(linha, j => j.atributos.marcacao) / 70) * 0.16;

  const alas = linha.filter(j =>
    ['LD', 'LE', 'PD', 'PE'].includes(j.posicaoPrincipal),
  ).length;
  time.cruzamentos +=
    fracaoPosse *
    (mediaAtributo(linha, j => j.atributos.cruzamento) / 70) *
    0.2 *
    limitar(alas / 4, 0.4, 1.2) *
    (tatica?.estiloOfensivo === 'Ataque direto' ? 1.25 : 1);

  // Posse por zona: distribui a posse do minuto na grade 3×3 do próprio time.
  const linhas = pesosLinhas(tatica, momentum);
  const colunas = pesosColunas(emCampo);
  for (let l = 0; l < 3; l += 1) {
    for (let c = 0; c < 3; c += 1) {
      const linhaZona = time.posseZonas[l];
      if (linhaZona) {
        linhaZona[c] =
          (linhaZona[c] ?? 0) + fracaoPosse * (linhas[l] ?? 0) * (colunas[c] ?? 0);
      }
    }
  }
}

/** Acumula TUDO de um minuto simulado (eventos reais + volume dos dois lados). */
export function acumularEstatisticasMinuto(
  stats: EstatisticasAoVivo,
  entrada: EntradaMinutoEstatisticas,
): void {
  processarEventosDoMinuto(entrada, stats.casa, stats.fora);

  // Momentum do minuto (casa positivo): posse do minuto + peso dos lances.
  let momento = (entrada.fracaoPosseCasa - 0.5) * 1.6;
  for (const evento of entrada.eventosDoMinuto) {
    const ehCasa = evento.timeId === entrada.timeCasaId;
    const impacto =
      evento.tipo === 'gol'
        ? 0.4
        : evento.tipo === 'penalti' || evento.tipo === 'chance_perdida'
          ? 0.2
          : 0;
    momento += ehCasa ? impacto : -impacto;
  }
  stats.momentumPorMinuto.push(
    Math.round(limitar(momento, -1, 1) * 100) / 100,
  );

  const p = entrada.probabilidades;
  acumularVolumeTime(
    stats.casa,
    entrada.emCampoCasa,
    entrada.taticaCasa,
    entrada.taticaFora,
    entrada.fracaoPosseCasa,
    p.probGolCasaPorMinuto,
    p.probPenaltiCasaPorMinuto,
    entrada.fatorTempo,
    entrada.momentumCasa,
    stats.clima,
    stats.temperatura,
    entrada.rng,
  );
  acumularVolumeTime(
    stats.fora,
    entrada.emCampoFora,
    entrada.taticaFora,
    entrada.taticaCasa,
    1 - entrada.fracaoPosseCasa,
    p.probGolForaPorMinuto,
    p.probPenaltiForaPorMinuto,
    entrada.fatorTempo,
    entrada.momentumFora,
    stats.clima,
    stats.temperatura,
    entrada.rng,
  );
}

function normalizar(valores: number[], uniforme: number): number[] {
  const total = valores.reduce((s, v) => s + v, 0);
  if (total <= 0) {
    return valores.map(() => uniforme);
  }
  return valores.map(v => v / total);
}

function fecharTime(acumulador: AcumuladorTime): EstatisticasTimePartida {
  const passesTentados = Math.round(acumulador.passesTentados);
  return {
    golsEsperados: Math.round(acumulador.golsEsperados * 100) / 100,
    assistenciasEsperadas:
      Math.round(acumulador.assistenciasEsperadas * 100) / 100,
    finalizacoes: acumulador.finalizacoes,
    finalizacoesNoAlvo: acumulador.finalizacoesNoAlvo,
    finalizacoesNaArea: acumulador.finalizacoesNaArea,
    finalizacoesDeFora: acumulador.finalizacoesDeFora,
    grandesChances: acumulador.grandesChances,
    passesTentados,
    passesCertos: Math.min(passesTentados, Math.round(acumulador.passesCertos)),
    dribles: Math.round(acumulador.dribles),
    desarmes: Math.round(acumulador.desarmes),
    interceptacoes: Math.round(acumulador.interceptacoes),
    cruzamentos: Math.round(acumulador.cruzamentos),
    escanteios: acumulador.escanteios,
    faltas: acumulador.faltas,
    impedimentos: acumulador.impedimentos,
    posseZonas: (() => {
      const plano = acumulador.posseZonas.flat();
      const normalizado = normalizar(plano, 1 / 9);
      return [
        normalizado.slice(0, 3),
        normalizado.slice(3, 6),
        normalizado.slice(6, 9),
      ];
    })(),
    perigoSetores: normalizar(acumulador.perigoSetores, 1 / 3),
    finalizacoesPorJogador: acumulador.finalizacoesPorJogador,
    passesPorJogador: Object.fromEntries(
      Object.entries(acumulador.passesPorJogador).map(([id, passes]) => {
        const tentados = Math.round(passes.tentados);
        return [
          id,
          {tentados, certos: Math.min(tentados, Math.round(passes.certos))},
        ];
      }),
    ),
  };
}

/** Fecha as estatísticas (arredonda e normaliza) para persistir na Partida. */
export function finalizarEstatisticas(
  stats: EstatisticasAoVivo,
): EstatisticasPartida {
  return {
    casa: fecharTime(stats.casa),
    fora: fecharTime(stats.fora),
    clima: stats.clima,
    temperatura: stats.temperatura,
    momentumPorMinuto: stats.momentumPorMinuto,
  };
}
