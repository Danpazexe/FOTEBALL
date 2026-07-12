/**
 * Extrator PURO de finalizações para o MAPA DE CHUTES (estilo Sofascore).
 *
 * Motivação: o motor JÁ decide, a cada lance, se a finalização foi na área / no
 * alvo / etc., mas essa classificação sai de `rng()` DURANTE a simulação e NÃO é
 * gravada no evento — vira só contagem agregada em `EstatisticasTimePartida`.
 * Reproduzir a coordenada exata exigiria mudar a engine (deslocando o stream do
 * RNG → mudaria TODOS os resultados) e migrar o save.
 *
 * Em vez disso, este módulo RECONSTRÓI, para cada chute, uma posição no campo, a
 * posição na baliza (chutes no alvo), xG/xGOT, pé e situação — tudo plausível e
 * derivado de dados JÁ presentes em `partida.eventos` + posição do jogador. É:
 *   • PURO e DETERMINÍSTICO: um RNG local semeado por `partida.id`+minuto+autor —
 *     mesma partida ⇒ mesmo mapa (sem tocar no RNG da simulação).
 *   • SEM migração de save: deriva de eventos que todo save já tem (funciona até
 *     em partidas antigas).
 *
 * Invariante: cada evento de GOL (`gol`/`gol_contra`) vira exatamente um chute com
 * `gol: true` para o time que marcou → nº de gols no mapa == placar.
 */
import type {EventoPartida, Partida, Position} from '../../types';
import {ehEventoGol} from '../../types';
import {criarRNGComSeed, hashString, type RandomGenerator} from './rng';

/** Desfecho de um chute, para colorir o dot no mapa. */
export type ResultadoFinalizacao =
  | 'gol'
  | 'defesa' // no alvo, defendido/parado
  | 'trave'
  | 'fora' // para fora
  | 'bloqueada'
  | 'penalti_perdido';

/** Parte do corpo que finalizou. */
export type PeChute = 'Pé direito' | 'Pé esquerdo' | 'Cabeça';

/** Origem da jogada que gerou o chute. */
export type SituacaoChute =
  | 'Jogo aberto'
  | 'Assistência'
  | 'Escanteio'
  | 'Contra-ataque'
  | 'Pênalti'
  | 'Falta';

/** Um chute posicionado no terço de ataque (coordenadas normalizadas 0..1). */
export interface Finalizacao {
  timeId: string;
  jogadorId: string;
  minuto: number;
  /** minuto <= 45 (para o filtro Todos · 1º · 2º). */
  primeiroTempo: boolean;
  resultado: ResultadoFinalizacao;
  gol: boolean;
  /** Chute foi no alvo (gol/defesa/trave) → aparece na baliza. */
  noAlvo: boolean;
  /** Chance real de gol do chute (0..1) — controla o TAMANHO do dot. */
  xG: number;
  /** xG on target: qualidade do chute que foi ao gol (0 se para fora). */
  xGOT: number;
  /** Horizontal no campo, ataque para cima: 0 = esquerda … 1 = direita. */
  x: number;
  /** Profundidade: 0 = na linha do gol … 1 = fundo do terço de ataque. */
  y: number;
  /** Posição na BALIZA (só chutes no alvo): 0..1 esq→dir. */
  golX?: number;
  /** Altura na baliza (só chutes no alvo): 0 = rente ao chão … 1 = travessão. */
  golY?: number;
  /** Chute de fora da área. */
  deFora: boolean;
  pe: PeChute;
  situacao: SituacaoChute;
}

/** Tipos de evento que representam uma finalização (o resto é ignorado). */
function ehEventoChute(evento: EventoPartida): boolean {
  return (
    ehEventoGol(evento.tipo) ||
    evento.tipo === 'bola_trave' ||
    evento.tipo === 'penalti' ||
    evento.tipo === 'chance_perdida' ||
    evento.tipo === 'falta_cobranca'
  );
}

/** Corredor natural: 0 = esquerda, 1 = centro, 2 = direita (espelha a engine). */
function corredorDaPosicao(posicao: Position | undefined): 0 | 1 | 2 {
  if (posicao === 'LE' || posicao === 'PE') {
    return 0;
  }
  if (posicao === 'LD' || posicao === 'PD') {
    return 2;
  }
  return 1;
}

/** x-base do corredor (0.5 = centro do gol) com leve espalhamento por RNG. */
function xDoCorredor(corredor: 0 | 1 | 2, rng: RandomGenerator): number {
  const centro = corredor === 0 ? 0.34 : corredor === 2 ? 0.66 : 0.5;
  return Math.min(0.92, Math.max(0.08, centro + (rng() - 0.5) * 0.24));
}

/** y de acordo com a distância: dentro da área é perto do gol; de fora é longe. */
function yDaDistancia(deFora: boolean, rng: RandomGenerator): number {
  return deFora ? 0.4 + rng() * 0.45 : 0.05 + rng() * 0.27;
}

const limitar01 = (v: number): number => Math.min(1, Math.max(0, v));

/** Pé/cabeça — direita é a mais comum; cabeça mais provável perto do gol. */
function derivarPe(deFora: boolean, rng: RandomGenerator): PeChute {
  const r = rng();
  const probCabeca = deFora ? 0.03 : 0.22;
  if (r < probCabeca) {
    return 'Cabeça';
  }
  return r < probCabeca + (1 - probCabeca) * 0.62 ? 'Pé direito' : 'Pé esquerdo';
}

/** Situação: pênalti/falta vêm do evento; assistência do gol; resto sorteado. */
function derivarSituacao(evento: EventoPartida, rng: RandomGenerator): SituacaoChute {
  if (evento.penaltiData) {
    return 'Pênalti';
  }
  if (evento.tipo === 'falta_cobranca') {
    return 'Falta';
  }
  if (evento.jogadorAssistenciaId) {
    return 'Assistência';
  }
  const r = rng();
  if (r < 0.5) {
    return 'Jogo aberto';
  }
  if (r < 0.72) {
    return 'Assistência';
  }
  if (r < 0.9) {
    return 'Escanteio';
  }
  return 'Contra-ataque';
}

/** Posição na baliza (0..1). Pênalti usa a direção/altura reais do lance. */
function derivarGol(
  evento: EventoPartida,
  rng: RandomGenerator,
): {golX: number; golY: number} {
  const p = evento.penaltiData;
  if (p) {
    const baseX = p.direcaoChute === 'E' ? 0.24 : p.direcaoChute === 'D' ? 0.76 : 0.5;
    const baseY = p.alturaChute === 'A' ? 0.68 : 0.24;
    return {
      golX: limitar01(baseX + (rng() - 0.5) * 0.08),
      golY: limitar01(baseY + (rng() - 0.5) * 0.08),
    };
  }
  // Chutes no alvo tendem aos cantos baixos; poucos no ângulo.
  return {
    golX: limitar01(0.12 + rng() * 0.76),
    golY: limitar01(0.08 + rng() * 0.72),
  };
}

/**
 * Reconstrói a lista de finalizações da partida (ordenada por minuto). `posicoes`
 * mapeia jogadorId → posição natural (para o corredor do chute); ausências caem
 * no centro. Determinístico por `partida.id`.
 */
export function extrairFinalizacoes(
  partida: Partida,
  posicoes: Record<string, Position>,
): Finalizacao[] {
  const chutes: Finalizacao[] = [];
  const eventos = [...partida.eventos].sort((a, b) => a.minuto - b.minuto);

  eventos.forEach((evento, idx) => {
    if (!ehEventoChute(evento)) {
      return;
    }
    // VAR anulou o gol: não é um chute "real" no mapa (evita confundir o placar).
    if (evento.tipo === 'chance_perdida' && /anulad/i.test(evento.descricao)) {
      return;
    }

    // RNG local por chute — estável (mesma partida ⇒ mesmo lance), isolado do
    // stream da simulação.
    const rng = criarRNGComSeed(
      hashString(`${partida.id}|fin|${evento.minuto}|${evento.jogadorId}|${idx}`),
    );
    const corredor = corredorDaPosicao(posicoes[evento.jogadorId]);
    const primeiroTempo = evento.minuto <= 45;
    const ehPenalti = evento.penaltiData !== undefined;

    let resultado: ResultadoFinalizacao;
    let gol = false;
    let xG: number;
    let deFora = false;
    let x: number;
    let y: number;

    if (ehEventoGol(evento.tipo)) {
      gol = true;
      resultado = 'gol';
      if (ehPenalti) {
        deFora = false;
        x = 0.5 + (rng() - 0.5) * 0.12;
        y = 0.16 + rng() * 0.04;
        xG = 0.76;
      } else if (evento.tipo === 'gol_contra') {
        deFora = false;
        x = 0.4 + rng() * 0.2;
        y = 0.04 + rng() * 0.08;
        xG = 0.2 + rng() * 0.15;
      } else {
        deFora = rng() > 0.85;
        x = xDoCorredor(corredor, rng);
        y = yDaDistancia(deFora, rng);
        xG = deFora ? 0.09 + rng() * 0.06 : 0.28 + rng() * 0.32;
      }
    } else if (evento.tipo === 'penalti') {
      const defendido =
        evento.penaltiData !== undefined &&
        evento.penaltiData.direcaoGoleiro === evento.penaltiData.direcaoChute;
      resultado = defendido ? 'defesa' : 'fora';
      deFora = false;
      x = 0.5 + (rng() - 0.5) * 0.14;
      y = 0.16 + rng() * 0.04;
      xG = 0.75;
    } else if (evento.tipo === 'bola_trave') {
      resultado = 'trave';
      deFora = rng() > 0.7;
      x = xDoCorredor(corredor, rng);
      y = yDaDistancia(deFora, rng);
      xG = deFora ? 0.08 + rng() * 0.05 : 0.18 + rng() * 0.18;
    } else if (evento.tipo === 'falta_cobranca') {
      deFora = true;
      const noAlvoFalta = rng() < 0.4;
      resultado = noAlvoFalta ? 'defesa' : rng() < 0.5 ? 'fora' : 'bloqueada';
      x = xDoCorredor(corredor, rng);
      y = 0.5 + rng() * 0.35;
      xG = 0.03 + rng() * 0.05;
    } else {
      deFora = rng() >= 0.7;
      const noAlvoChance = rng() < 0.45;
      resultado = noAlvoChance ? 'defesa' : rng() < 0.5 ? 'fora' : 'bloqueada';
      x = xDoCorredor(corredor, rng);
      y = yDaDistancia(deFora, rng);
      xG = deFora ? 0.04 + rng() * 0.05 : 0.12 + rng() * 0.2;
    }

    xG = Math.min(0.95, Math.max(0.02, xG));
    const noAlvo =
      resultado === 'gol' || resultado === 'defesa' || resultado === 'trave';

    // Campos ricos do painel (draws APÓS x/y/xG → não alteram os valores acima).
    const pe = derivarPe(deFora, rng);
    const situacao = derivarSituacao(evento, rng);
    const xGOT = noAlvo
      ? Math.min(0.95, gol ? Math.max(xG, 0.3 + rng() * 0.5) : xG * (0.5 + rng() * 0.45))
      : 0;
    const golPos = noAlvo ? derivarGol(evento, rng) : undefined;

    chutes.push({
      timeId: evento.timeId,
      jogadorId: evento.jogadorId,
      minuto: evento.minuto,
      primeiroTempo,
      resultado,
      gol,
      noAlvo,
      xG,
      xGOT,
      x,
      y,
      golX: golPos?.golX,
      golY: golPos?.golY,
      deFora,
      pe,
      situacao,
    });
  });

  return chutes;
}
