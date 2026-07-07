import {criarRNGComSeed, hashString} from '../../simulation/rng';
import {criarConfronto, resolverConfronto} from '../index';

const rng = (seed: number) => criarRNGComSeed(hashString(`${seed}`));

describe('resolverConfronto (ida e volta)', () => {
  it('agregado é a soma dos dois jogos e o vencedor é coerente', () => {
    for (let s = 1; s <= 100; s += 1) {
      const confronto = criarConfronto('c', 'Quartas de final', 'A', 'B');
      const r = resolverConfronto(confronto, 70, 40, rng(s));
      expect(r.agregadoA).toBe((r.golsIdaA ?? 0) + (r.golsVoltaA ?? 0));
      expect(r.agregadoB).toBe((r.golsIdaB ?? 0) + (r.golsVoltaB ?? 0));
      expect(['A', 'B']).toContain(r.vencedor);
      expect(r.vencedor).not.toBe(r.perdedor);
      if (r.decididoPor === 'AGREGADO') {
        const aVence = (r.agregadoA ?? 0) > (r.agregadoB ?? 0);
        expect(r.vencedor).toBe(aVence ? 'A' : 'B');
      } else {
        expect(r.decididoPor).toBe('PENALTIS');
        expect(r.agregadoA).toBe(r.agregadoB); // sem gol fora
        expect(r.penaltisA).not.toBe(r.penaltisB);
        const aVence = (r.penaltisA ?? 0) > (r.penaltisB ?? 0);
        expect(r.vencedor).toBe(aVence ? 'A' : 'B');
      }
    }
  });

  it('empate no agregado vai para os pênaltis (ao menos um cenário)', () => {
    let houvePenaltis = false;
    for (let s = 1; s <= 200 && !houvePenaltis; s += 1) {
      const r = resolverConfronto(criarConfronto('c', 'Final', 'A', 'B'), 1, 1, rng(s));
      houvePenaltis = r.decididoPor === 'PENALTIS';
    }
    expect(houvePenaltis).toBe(true);
  });

  it('time muito mais forte vence a grande maioria dos confrontos', () => {
    let vitoriasA = 0;
    for (let s = 1; s <= 100; s += 1) {
      const r = resolverConfronto(criarConfronto('c', 'Oitavas de final', 'A', 'B'), 80, 35, rng(s));
      if (r.vencedor === 'A') {
        vitoriasA += 1;
      }
    }
    expect(vitoriasA).toBeGreaterThan(55);
  });

  it('jogo único: sem placar de volta e agregado = ida', () => {
    const r = resolverConfronto(criarConfronto('c', 'Final', 'A', 'B', true), 60, 50, rng(3));
    expect(r.golsVoltaA).toBeUndefined();
    expect(r.golsVoltaB).toBeUndefined();
    expect(r.agregadoA).toBe(r.golsIdaA);
    expect(r.agregadoB).toBe(r.golsIdaB);
  });

  it('é determinístico para a mesma seed', () => {
    const a = resolverConfronto(criarConfronto('c', 'Semifinal', 'A', 'B'), 60, 55, rng(9));
    const b = resolverConfronto(criarConfronto('c', 'Semifinal', 'A', 'B'), 60, 55, rng(9));
    expect(a).toEqual(b);
  });
});
