/* eslint-disable no-bitwise */

export type RandomGenerator = () => number;

export function criarRNGComSeed(seed: number): RandomGenerator {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function inteiroEntre(
  rng: RandomGenerator,
  minimo: number,
  maximo: number,
): number {
  return Math.floor(rng() * (maximo - minimo + 1)) + minimo;
}

/** Limita `valor` ao intervalo [minimo, maximo]. Helper compartilhado do engine. */
export function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor));
}

/**
 * Hash determinístico (FNV-1a 32 bits) de uma string para uso como seed.
 * Permite derivar um RNG estável a partir do `id` de uma partida, mantendo o
 * determinismo da pós-partida (mesma partida => mesmos sorteios de lesão).
 */
export function hashString(texto: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < texto.length; i += 1) {
    hash ^= texto.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
