export interface RngCore {
  random(): number;
  integer(min: number, max: number): number;
  chance(probabilidade: number): boolean;
  pick<T>(itens: readonly T[]): T;
}

const normalizarProbabilidade = (valor: number): number => {
  if (Number.isNaN(valor)) {
    return 0;
  }

  return Math.max(0, Math.min(1, valor));
};

const hashSeed = (seed: string): number => {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

export const criarRngCore = (seed: string): RngCore => {
  let estado = hashSeed(seed || 'foteball-core');

  const random = (): number => {
    estado += 0x6d2b79f5;
    let valor = estado;
    valor = Math.imul(valor ^ (valor >>> 15), valor | 1);
    valor ^= valor + Math.imul(valor ^ (valor >>> 7), valor | 61);

    return ((valor ^ (valor >>> 14)) >>> 0) / 4294967296;
  };

  return {
    random,
    integer(min: number, max: number): number {
      const menor = Math.ceil(min);
      const maior = Math.floor(max);

      return Math.floor(random() * (maior - menor + 1)) + menor;
    },
    chance(probabilidade: number): boolean {
      return random() < normalizarProbabilidade(probabilidade);
    },
    pick<T>(itens: readonly T[]): T {
      if (itens.length === 0) {
        throw new Error('rng.pick recebeu uma lista vazia.');
      }

      return itens[this.integer(0, itens.length - 1)];
    },
  };
};
