/**
 * Copa do Brasil — engine PURA do chaveamento (mata-mata de jogo único).
 *
 * Gera a chave a partir dos clubes do seed (16 por padrão, o do usuário sempre
 * incluído), resolve confrontos por placar (empate → pênaltis) e avança de fase
 * com os vencedores até sair o campeão. Sem React, sem Math.random/Date.now:
 * o embaralhamento usa o RNG semeado (determinístico por temporada).
 */

import type {Clube, Player} from '../../types';
import {embaralhar, type RandomGenerator} from '../simulation/rng';

export interface ConfrontoCopa {
  id: string;
  timeA: string;
  timeB: string;
  golsA?: number;
  golsB?: number;
  /** Vencedor nos pênaltis, quando o jogo terminou empatado. */
  vencedorPenaltis?: string;
  /** Vencedor resolvido do confronto (avança de fase). */
  vencedor?: string;
}

export interface FaseCopa {
  nome: string;
  /** Data (ISO) em que a fase é disputada — jogo de meio de semana. */
  data: string;
  confrontos: ConfrontoCopa[];
}

export interface EstadoCopa {
  nome: string;
  temporada: string;
  /** Índice da fase em andamento dentro de `fases`. */
  faseAtual: number;
  fases: FaseCopa[];
  /** Datas (ISO) de cada fase, na ordem; usadas para encaixar no calendário. */
  datasFases: string[];
  /** Id do campeão quando a final é decidida; null enquanto há jogos. */
  campeao: string | null;
}

/** Quantos clubes entram na chave (potência de 2). */
export const CLUBES_NA_COPA = 16;

/** Nome da fase a partir do número de clubes ainda na disputa. */
export function nomeFase(times: number): string {
  switch (times) {
    case 2:
      return 'Final';
    case 4:
      return 'Semifinal';
    case 8:
      return 'Quartas de final';
    case 16:
      return 'Oitavas de final';
    case 32:
      return 'Primeira fase';
    default:
      return `Fase de ${times}`;
  }
}

function forcaClube(clubeId: string, jogadores: Player[]): number {
  const top11 = jogadores
    .filter(jogador => jogador.clubeId === clubeId)
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 11);
  if (top11.length === 0) {
    return 0;
  }
  return top11.reduce((soma, j) => soma + j.overall, 0) / top11.length;
}

/**
 * Seleciona os participantes: os clubes mais fortes do seed, garantindo o do
 * usuário, embaralhados para o chaveamento não ser sempre forte × fraco.
 */
function selecionarParticipantes(
  clubes: Clube[],
  jogadores: Player[],
  clubeUsuarioId: string | null,
  rng: RandomGenerator,
): string[] {
  const n = Math.min(CLUBES_NA_COPA, clubes.length - (clubes.length % 2));
  const ranking = [...clubes]
    .map(clube => ({id: clube.id, forca: forcaClube(clube.id, jogadores)}))
    .sort((a, b) => b.forca - a.forca);
  const ids = ranking.slice(0, n).map(r => r.id);
  if (clubeUsuarioId && !ids.includes(clubeUsuarioId)) {
    ids[ids.length - 1] = clubeUsuarioId; // entra no lugar do 16º mais fraco
  }
  return embaralhar(ids, rng);
}

function montarConfrontos(
  ids: string[],
  temporada: string,
  faseIndice: number,
): ConfrontoCopa[] {
  const confrontos: ConfrontoCopa[] = [];
  for (let i = 0; i < ids.length; i += 2) {
    confrontos.push({
      id: `copa_${temporada}_f${faseIndice}_${i / 2}`,
      timeA: ids[i],
      timeB: ids[i + 1],
    });
  }
  return confrontos;
}

/** Gera a Copa do Brasil da temporada com a primeira fase já sorteada. */
export function gerarCopaDoBrasil(
  clubes: Clube[],
  jogadores: Player[],
  temporada: string,
  clubeUsuarioId: string | null,
  rng: RandomGenerator,
  datasFases: string[] = [],
): EstadoCopa {
  const participantes = selecionarParticipantes(
    clubes,
    jogadores,
    clubeUsuarioId,
    rng,
  );
  const confrontos = montarConfrontos(participantes, temporada, 0);
  return {
    nome: 'Copa do Brasil',
    temporada,
    faseAtual: 0,
    fases: [
      {
        nome: nomeFase(participantes.length),
        data: datasFases[0] ?? '',
        confrontos,
      },
    ],
    datasFases,
    campeao: null,
  };
}

/** Resolve um confronto a partir do placar (empate exige `vencedorPenaltis`). */
export function definirResultadoConfronto(
  confronto: ConfrontoCopa,
  golsA: number,
  golsB: number,
  vencedorPenaltis?: string,
): ConfrontoCopa {
  let vencedor: string;
  if (golsA > golsB) {
    vencedor = confronto.timeA;
  } else if (golsB > golsA) {
    vencedor = confronto.timeB;
  } else {
    vencedor = vencedorPenaltis ?? confronto.timeA;
  }
  return {...confronto, golsA, golsB, vencedorPenaltis, vencedor};
}

/** A fase em andamento (a que precisa ser jogada/resolvida). */
export function faseAtualCopa(estado: EstadoCopa): FaseCopa {
  return estado.fases[estado.faseAtual];
}

/** Confronto do clube na fase atual (ou null se já eliminado/ausente). */
export function confrontoDoClube(
  estado: EstadoCopa,
  clubeId: string | null,
): ConfrontoCopa | null {
  if (!clubeId || estado.campeao) {
    return null;
  }
  return (
    faseAtualCopa(estado).confrontos.find(
      c => c.timeA === clubeId || c.timeB === clubeId,
    ) ?? null
  );
}

/**
 * Avança a copa: com a fase atual TODA resolvida, monta a próxima fase com os
 * vencedores — ou, se restou um único vencedor, define o campeão.
 */
export function avancarCopa(estado: EstadoCopa): EstadoCopa {
  const fase = faseAtualCopa(estado);
  const vencedores = fase.confrontos
    .map(c => c.vencedor)
    .filter((v): v is string => Boolean(v));
  if (vencedores.length !== fase.confrontos.length) {
    throw new Error('Fase da copa incompleta: há confrontos sem vencedor.');
  }
  if (vencedores.length === 1) {
    return {...estado, campeao: vencedores[0]};
  }
  const proximoIndice = estado.faseAtual + 1;
  const confrontos = montarConfrontos(vencedores, estado.temporada, proximoIndice);
  return {
    ...estado,
    faseAtual: proximoIndice,
    fases: [
      ...estado.fases,
      {
        nome: nomeFase(vencedores.length),
        data: estado.datasFases[proximoIndice] ?? '',
        confrontos,
      },
    ],
  };
}
