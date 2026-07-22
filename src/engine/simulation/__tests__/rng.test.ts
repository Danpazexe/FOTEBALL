import {
  criarRNGComSeed,
  embaralhar,
  hashString,
  inteiroEntre,
  limitar,
} from '../rng';

/**
 * A RNG é a base de TODO o determinismo do jogo (partida, mercado IA, peneiras,
 * lesões pós-jogo). Estes testes blindam a reprodutibilidade por seed — se algo
 * aqui quebrar, replays e testes de partida deixam de ser confiáveis.
 */

describe('criarRNGComSeed', () => {
  it('é reprodutível: mesma seed gera a mesma sequência', () => {
    const a = criarRNGComSeed(42);
    const b = criarRNGComSeed(42);
    const seqA = Array.from({length: 25}, () => a());
    const seqB = Array.from({length: 25}, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('gera valores no intervalo [0, 1)', () => {
    const rng = criarRNGComSeed(7);
    for (let i = 0; i < 2000; i += 1) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('seeds diferentes geram sequências diferentes', () => {
    const seqA = Array.from({length: 25}, criarRNGComSeed(1));
    const seqB = Array.from({length: 25}, criarRNGComSeed(2));
    expect(seqA).not.toEqual(seqB);
  });

  it('distribui de forma razoável (média ≈ 0,5 em amostra grande)', () => {
    const rng = criarRNGComSeed(99);
    const n = 5000;
    let soma = 0;
    for (let i = 0; i < n; i += 1) {
      soma += rng();
    }
    const media = soma / n;
    expect(media).toBeGreaterThan(0.45);
    expect(media).toBeLessThan(0.55);
  });
});

describe('inteiroEntre', () => {
  it('respeita os limites [min, max] inclusivos e devolve inteiros', () => {
    const rng = criarRNGComSeed(3);
    for (let i = 0; i < 2000; i += 1) {
      const v = inteiroEntre(rng, 2, 5);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(5);
    }
  });

  it('cobre todos os valores do intervalo em amostra suficiente', () => {
    const rng = criarRNGComSeed(11);
    const vistos = new Set<number>();
    for (let i = 0; i < 500; i += 1) {
      vistos.add(inteiroEntre(rng, 0, 3));
    }
    expect(vistos).toEqual(new Set([0, 1, 2, 3]));
  });

  it('é determinístico para a mesma seed', () => {
    const r1 = criarRNGComSeed(5);
    const r2 = criarRNGComSeed(5);
    const s1 = Array.from({length: 15}, () => inteiroEntre(r1, 1, 100));
    const s2 = Array.from({length: 15}, () => inteiroEntre(r2, 1, 100));
    expect(s1).toEqual(s2);
  });
});

describe('limitar', () => {
  it('faz clamp abaixo do mínimo, acima do máximo e mantém no intervalo', () => {
    expect(limitar(-5, 0, 10)).toBe(0);
    expect(limitar(15, 0, 10)).toBe(10);
    expect(limitar(7, 0, 10)).toBe(7);
    expect(limitar(0, 0, 10)).toBe(0);
    expect(limitar(10, 0, 10)).toBe(10);
  });
});

describe('hashString', () => {
  it('é estável e determinístico para a mesma entrada', () => {
    expect(hashString('partida_2026_1_0')).toBe(hashString('partida_2026_1_0'));
  });

  it('entradas diferentes geram hashes diferentes', () => {
    expect(hashString('a')).not.toBe(hashString('b'));
    expect(hashString('partida_1')).not.toBe(hashString('partida_2'));
  });

  it('retorna um inteiro uint32 (0 .. 2^32-1)', () => {
    const h = hashString('qualquer-id');
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
  });
});

describe('embaralhar (Fisher-Yates)', () => {
  it('é uma permutação e NÃO muta a entrada', () => {
    const original = [1, 2, 3, 4, 5, 6, 7, 8];
    const copia = [...original];
    const saida = embaralhar(original, criarRNGComSeed(42));
    expect(original).toEqual(copia); // entrada intacta
    expect([...saida].sort((a, b) => a - b)).toEqual(original); // mesmos elementos
  });

  it('é determinístico por seed', () => {
    const itens = ['a', 'b', 'c', 'd', 'e'];
    expect(embaralhar(itens, criarRNGComSeed(7))).toEqual(
      embaralhar(itens, criarRNGComSeed(7)),
    );
  });
});
