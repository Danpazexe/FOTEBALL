/**
 * reconstruirLanceMinuto — lance de UM minuto para o radar ao vivo.
 *
 * Mesmo padrão do replay de gol ("reconstrução DERIVADA, nunca persistida"):
 * uma função PURA e DETERMINÍSTICA que lê o que a engine JÁ produziu no minuto
 * e deriva uma sequência curta de TOQUES entre jogadores REAIS — a bola sempre
 * "pega" em alguém que está em campo naquele minuto.
 *
 * O que é FATO (vem da engine, nunca inventado):
 *  • quem está em campo (titulares vigentes, com substituições/expulsões);
 *  • o momento do minuto (amostra real de `momentumPorMinuto`) — decide quem
 *    fica com a bola e a profundidade do lance;
 *  • o evento âncora do minuto: chute nas coordenadas REAIS do ledger causal
 *    (mesmo ponto do mapa de finalizações), cartão/lesão sobre o jogador real;
 *  • autor/assistente reais do lance (quem chuta é quem chutou de verdade).
 *
 * O que é DERIVADO (plausível, determinístico por seed real + minuto): a ordem
 * dos toques de construção e o jitter de posição — mesma partida ⇒ mesmo lance.
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

/** Ponto normalizado 0..1 × 0..1. */
export interface PontoCampo {
  x: number;
  y: number;
}

/** Jogador em campo NO MINUTO (id real + posição natural). */
export interface JogadorEmCampoLance {
  id: string;
  posicao: Position;
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

/**
 * Posição-base de cada função no frame "ataque para cima" (x 0=esq…1=dir,
 * y 0=gol adversário…1=próprio gol). Fonte única do radar para "onde um
 * jogador daquela posição naturalmente está".
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

/** Espelha um ponto do frame do ADVERSÁRIO para o frame do time com a posse. */
function espelharFrameAdversario(ponto: PontoCampo): PontoCampo {
  return {x: 1 - ponto.x, y: 1 - ponto.y};
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

/** Jitter determinístico curto em torno de um valor. */
function jitter(rng: RandomGenerator, valor: number, amplitude: number): number {
  return limitar(valor + (rng() - 0.5) * amplitude, 0.02, 0.98);
}

/** Escolhe o chute âncora do minuto: gol primeiro; senão, o último chute. */
function chuteAncora(chutes: ChutePartida[]): ChutePartida | undefined {
  return chutes.find(c => c.resultado === 'gol') ?? chutes[chutes.length - 1];
}

/**
 * Toques de CONSTRUÇÃO (frame ataque-para-cima da posse): 1..n jogadores reais
 * saindo das posições-base e progredindo em direção ao ponto-alvo.
 */
function toquesConstrucao(
  rng: RandomGenerator,
  emCampo: JogadorEmCampoLance[],
  excluirIds: Array<string | undefined>,
  alvo: PontoCampo,
  quantos: number,
  timeId: string,
): ToqueLance[] {
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
    const base = BASE_POSICAO[escolhido.posicao];
    // Progressão: cada toque puxa mais em direção ao alvo do lance.
    const avanco = ((i + 1) / (quantos + 1)) * 0.6;
    toques.push({
      tipo: rng() < 0.7 ? 'passe' : 'conducao',
      jogadorId: escolhido.id,
      timeId,
      x: jitter(rng, base.x + (alvo.x - base.x) * avanco, 0.1),
      y: jitter(rng, base.y + (alvo.y - base.y) * avanco, 0.08),
    });
  }
  return toques;
}

/**
 * Reconstrói o lance de um minuto simulado. Devolve null quando não há
 * jogadores em campo para o lado com a posse (estado degenerado).
 *
 * Determinístico: a MESMA entrada (seed real da partida + minuto + fatos do
 * minuto) produz SEMPRE o mesmo lance.
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

  // ── ÂNCORA 1: chute REAL do minuto (coordenada do ledger causal) ───────────
  const chute = chuteAncora(chutesDoMinuto);
  if (chute) {
    const posseId = chute.timeId;
    const posseEhCasa = posseId === timeCasaId;
    const emCampo = [...ladoDe(posseId)];
    if (emCampo.length === 0) {
      return null;
    }
    // Ponto REAL do chute no frame ataque-para-cima do time que chutou.
    const ancora: PontoCampo = {x: chute.x, y: chute.y * TERCO_ATAQUE};
    const golContra = chute.golContra === true;
    const autorId = chute.jogadorId;
    const assistenteId = golContra ? undefined : chute.assistenciaId;

    const construcao = toquesConstrucao(
      rng,
      emCampo,
      [autorId, assistenteId],
      ancora,
      1 + (rng() < 0.6 ? 1 : 0),
      posseId,
    );

    const toques: ToqueLance[] = [...construcao];
    if (assistenteId !== undefined) {
      toques.push({
        tipo: 'assistencia',
        jogadorId: assistenteId,
        timeId: posseId,
        x: jitter(rng, ancora.x, 0.24),
        y: limitar(ancora.y + 0.06 + rng() * 0.08, 0.02, 0.98),
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
      toques.push({
        tipo: golContra ? 'gol_contra' : 'gol',
        jogadorId: autorId,
        timeId: golContra
          ? posseEhCasa
            ? timeForaId
            : timeCasaId
          : posseId,
        x: 0.5 - BOCA_GOL / 2 + (chute.golX ?? 0.5) * BOCA_GOL,
        y: 0,
      });
    }
    return {
      minuto,
      timeId: posseId,
      toques: toques.map(t => ({
        ...t,
        ...paraCampoHorizontal({x: t.x, y: t.y}, posseEhCasa),
      })),
    };
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
    const emCampo = [...ladoDe(posseId)];
    if (emCampo.length === 0) {
      return null;
    }
    // Onde o lance parou: a posição natural do jogador punido/lesionado,
    // espelhada para o frame de quem tinha a bola.
    const punido = ladoDe(disciplinar.timeId).find(
      j => j.id === disciplinar.jogadorId,
    );
    const basePunido = BASE_POSICAO[punido?.posicao ?? 'MC'];
    const ancora = espelharFrameAdversario({
      x: jitter(rng, basePunido.x, 0.12),
      y: jitter(rng, basePunido.y, 0.1),
    });

    const construcao = toquesConstrucao(
      rng,
      emCampo,
      [],
      ancora,
      2,
      posseId,
    );
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
    const posseEhCasa = posseId === timeCasaId;
    return {
      minuto,
      timeId: posseId,
      toques: toques.map(t => ({
        ...t,
        ...paraCampoHorizontal({x: t.x, y: t.y}, posseEhCasa),
      })),
    };
  }

  // ── SEM EVENTO: reciclagem de posse guiada pelo momento REAL ───────────────
  const posseEhCasa =
    momentoMinuto > 0.08
      ? true
      : momentoMinuto < -0.08
        ? false
        : rng() < 0.5;
  const posseId = posseEhCasa ? timeCasaId : timeForaId;
  const emCampo = [...ladoDe(posseId)];
  if (emCampo.length === 0) {
    return null;
  }
  // Quanto maior o momento, mais fundo no campo adversário o lance circula.
  const intensidade = limitar(Math.abs(momentoMinuto), 0, 1);
  const alvo: PontoCampo = {
    x: 0.3 + rng() * 0.4,
    y: 0.62 - 0.42 * intensidade,
  };
  const construcao = toquesConstrucao(rng, emCampo, [], alvo, 3, posseId);
  if (construcao.length === 0) {
    return null;
  }
  const ultimo = construcao[construcao.length - 1];
  const toques: ToqueLance[] = [
    ...construcao.slice(0, -1),
    {...ultimo, tipo: 'recepcao'},
  ];
  return {
    minuto,
    timeId: posseId,
    toques: toques.map(t => ({
      ...t,
      ...paraCampoHorizontal({x: t.x, y: t.y}, posseEhCasa),
    })),
  };
}
