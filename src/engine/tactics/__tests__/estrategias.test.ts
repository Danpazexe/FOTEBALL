import {
  ESTRATEGIAS,
  estrategiaAtiva,
  mentalidadeDaTatica,
} from '../estrategias';

describe('estrategiaAtiva', () => {
  it('reconhece a tática de cada preset pelo nome', () => {
    for (const estrategia of ESTRATEGIAS) {
      expect(estrategiaAtiva(estrategia.tatica)).toBe(estrategia.nome);
    }
  });

  it('retorna null quando a tática não bate com nenhum preset', () => {
    const equilibrado = ESTRATEGIAS.find(e => e.nome === 'Equilibrado')!;
    const custom = {...equilibrado.tatica, ladoAtaque: 'Esquerda' as const};
    expect(estrategiaAtiva(custom)).toBeNull();
  });
});

describe('mentalidadeDaTatica', () => {
  it('Ataque total é mais ofensivo que Retranca', () => {
    const ataqueTotal = ESTRATEGIAS.find(e => e.nome === 'Ataque total')!;
    const retranca = ESTRATEGIAS.find(e => e.nome === 'Retranca')!;
    expect(mentalidadeDaTatica(ataqueTotal.tatica)).toBeGreaterThan(
      mentalidadeDaTatica(retranca.tatica),
    );
  });

  it('fica sempre no intervalo 0-100', () => {
    for (const estrategia of ESTRATEGIAS) {
      const m = mentalidadeDaTatica(estrategia.tatica);
      expect(m).toBeGreaterThanOrEqual(0);
      expect(m).toBeLessThanOrEqual(100);
    }
  });
});
