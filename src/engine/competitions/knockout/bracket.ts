/**
 * Chaveamento do mata-mata da Série D. Semeado por CAMPANHA: a cada fase os
 * remanescentes são ordenados por `seed` (1 = melhor campanha) e cruzados
 * melhor × pior (1×N, 2×N-1, …). A melhor campanha vira `clubeB` — manda a volta
 * em casa (vantagem), como no regulamento. Sem gol fora; empate → pênaltis.
 */
import type {ConfrontoMataMata} from '../tipos';
import {criarConfronto} from './confronto';

/** Clube ainda vivo no mata-mata, com seu seed de campanha. */
export interface Semente {
  clubeId: string;
  seed: number;
}

/** Nome da fase a partir de quantos clubes ainda disputam. */
export function nomeFaseSerieD(times: number): string {
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
      return 'Terceira Fase';
    case 64:
      return 'Segunda Fase';
    default:
      return `Fase de ${times}`;
  }
}

/**
 * Monta os confrontos de uma fase cruzando melhor × pior campanha. `clubeB`
 * (melhor seed) manda a volta em casa. `faseIndice` só garante ids únicos.
 */
export function montarFase(
  sementes: Semente[],
  temporada: string,
  faseIndice: number,
  jogoUnico = false,
): ConfrontoMataMata[] {
  const ordenados = [...sementes].sort((a, b) => a.seed - b.seed);
  const nome = nomeFaseSerieD(ordenados.length);
  const confrontos: ConfrontoMataMata[] = [];
  const n = ordenados.length;
  for (let i = 0; i < n / 2; i += 1) {
    const forte = ordenados[i]; // melhor campanha → manda a volta
    const fraco = ordenados[n - 1 - i]; // pior campanha → manda a ida
    confrontos.push(
      criarConfronto(
        `serie_d_${temporada}_f${faseIndice}_${i}`,
        nome,
        fraco.clubeId,
        forte.clubeId,
        jogoUnico,
      ),
    );
  }
  return confrontos;
}
