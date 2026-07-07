/**
 * Resolução de um confronto de mata-mata. Ida e volta com placar AGREGADO (sem
 * gol fora — abolido pela CBF em 2018); empate no agregado → pênaltis. Suporta
 * também jogo único (para reuso na Copa do Brasil), disputado na casa do clubeB.
 *
 * Determinístico: recebe um RNG semeado; mesmo confronto + mesma seed = mesmo
 * resultado (placares e disputa de pênaltis).
 */
import {limitar, type RandomGenerator} from '../../simulation/rng';
import {simularPlacar} from '../simulacao/placar';
import type {ConfrontoMataMata} from '../tipos';

/** Cria um confronto: `clubeA` manda a ida; `clubeB` (melhor campanha) manda a volta. */
export function criarConfronto(
  id: string,
  fase: string,
  clubeA: string,
  clubeB: string,
  jogoUnico = false,
): ConfrontoMataMata {
  return {id, fase, clubeA, clubeB, jogoUnico};
}

/** Disputa de pênaltis ponderada por força. Retorna a contagem de cada lado. */
function disputarPenaltis(
  forcaA: number,
  forcaB: number,
  rng: RandomGenerator,
): {penaltisA: number; penaltisB: number} {
  const probA = limitar(0.72 + (forcaA - forcaB) / 600, 0.55, 0.9);
  const probB = limitar(0.72 + (forcaB - forcaA) / 600, 0.55, 0.9);
  let a = 0;
  let b = 0;
  for (let i = 0; i < 5; i += 1) {
    if (rng() < probA) {
      a += 1;
    }
    if (rng() < probB) {
      b += 1;
    }
  }
  // Morte súbita (limitada; se persistir o empate, desempata por força).
  let rodadas = 0;
  while (a === b && rodadas < 20) {
    if (rng() < probA) {
      a += 1;
    }
    if (rng() < probB) {
      b += 1;
    }
    rodadas += 1;
  }
  if (a === b) {
    if (rng() < forcaA / (forcaA + forcaB || 1)) {
      a += 1;
    } else {
      b += 1;
    }
  }
  return {penaltisA: a, penaltisB: b};
}

/**
 * Simula e RESOLVE o confronto por completo (ida+volta ou jogo único), definindo
 * agregado, pênaltis (se preciso), vencedor, perdedor e como foi decidido.
 * `mandoNeutro` (final em campo neutro) remove a vantagem de casa do jogo único.
 */
export function resolverConfronto(
  confronto: ConfrontoMataMata,
  forcaA: number,
  forcaB: number,
  rng: RandomGenerator,
  mandoNeutro = false,
): ConfrontoMataMata {
  let golsIdaA: number;
  let golsIdaB: number;
  let golsVoltaA: number | undefined;
  let golsVoltaB: number | undefined;

  if (confronto.jogoUnico) {
    // Casa do clubeB: golsCasa = B, golsFora = A.
    const jogo = simularPlacar(forcaB, forcaA, rng, mandoNeutro);
    golsIdaB = jogo.golsCasa;
    golsIdaA = jogo.golsFora;
  } else {
    // Ida na casa de A.
    const ida = simularPlacar(forcaA, forcaB, rng);
    golsIdaA = ida.golsCasa;
    golsIdaB = ida.golsFora;
    // Volta na casa de B (A visitante).
    const volta = simularPlacar(forcaB, forcaA, rng);
    golsVoltaB = volta.golsCasa;
    golsVoltaA = volta.golsFora;
  }

  const agregadoA = golsIdaA + (golsVoltaA ?? 0);
  const agregadoB = golsIdaB + (golsVoltaB ?? 0);

  const resolvido: ConfrontoMataMata = {
    ...confronto,
    golsIdaA,
    golsIdaB,
    golsVoltaA,
    golsVoltaB,
    agregadoA,
    agregadoB,
  };

  if (agregadoA > agregadoB) {
    return {
      ...resolvido,
      vencedor: confronto.clubeA,
      perdedor: confronto.clubeB,
      decididoPor: 'AGREGADO',
    };
  }
  if (agregadoB > agregadoA) {
    return {
      ...resolvido,
      vencedor: confronto.clubeB,
      perdedor: confronto.clubeA,
      decididoPor: 'AGREGADO',
    };
  }
  // Empate no agregado → pênaltis.
  const {penaltisA, penaltisB} = disputarPenaltis(forcaA, forcaB, rng);
  const aVence = penaltisA > penaltisB;
  return {
    ...resolvido,
    penaltisA,
    penaltisB,
    vencedor: aVence ? confronto.clubeA : confronto.clubeB,
    perdedor: aVence ? confronto.clubeB : confronto.clubeA,
    decididoPor: 'PENALTIS',
  };
}
