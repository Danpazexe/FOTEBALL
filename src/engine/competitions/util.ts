/**
 * Helpers puros compartilhados pela engine de competições. Sem React, sem
 * Math.random (o embaralhamento recebe o RNG semeado do chamador).
 */
import type {Player} from '../../types';
import {type RandomGenerator} from '../simulation/rng';

/** Fisher-Yates determinístico (não muta o array original). */
export function embaralhar<T>(itens: T[], rng: RandomGenerator): T[] {
  const copia = [...itens];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** Letra do grupo por índice: 0→'A', 1→'B', … (até 'Z'). */
export function letraGrupo(indice: number): string {
  return String.fromCharCode(65 + indice);
}

/**
 * Força efetiva do clube (0–100): média dos overalls dos 11 melhores jogadores
 * do elenco. Proxy determinístico usado nas partidas de fundo (mesma ideia do
 * `forcaClube` da Copa). 0 se o clube não tiver jogadores.
 */
export function forcaDoElenco(clubeId: string, jogadores: Player[]): number {
  const top11 = jogadores
    .filter(jogador => jogador.clubeId === clubeId)
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 11);
  if (top11.length === 0) {
    return 0;
  }
  return top11.reduce((soma, jogador) => soma + jogador.overall, 0) / top11.length;
}

/** Mapa clubeId → força (top-11) para todos os clubes informados. */
export function mapaDeForca(
  clubeIds: string[],
  jogadores: Player[],
): Map<string, number> {
  return new Map(clubeIds.map(id => [id, forcaDoElenco(id, jogadores)]));
}
