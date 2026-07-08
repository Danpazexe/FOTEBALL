import {montarFase, nomeFaseSerieD, type Semente} from '../index';

describe('montarFase', () => {
  it('cruza melhor × pior campanha, com a melhor (clubeB) mandando a volta', () => {
    const sementes: Semente[] = [
      {clubeId: 'w1', seed: 1},
      {clubeId: 'w2', seed: 2},
      {clubeId: 'w3', seed: 3},
      {clubeId: 'w4', seed: 4},
    ];
    const confrontos = montarFase(sementes, '2026', 0);
    expect(confrontos).toHaveLength(2);
    // 1×4 e 2×3
    expect(confrontos[0].clubeB).toBe('w1');
    expect(confrontos[0].clubeA).toBe('w4');
    expect(confrontos[1].clubeB).toBe('w2');
    expect(confrontos[1].clubeA).toBe('w3');
    // Nome pela contagem: 4 clubes => Semifinal.
    expect(confrontos[0].fase).toBe('Semifinal');
  });

  it('ordena por seed mesmo com entrada embaralhada', () => {
    const sementes: Semente[] = [
      {clubeId: 'c', seed: 3},
      {clubeId: 'a', seed: 1},
      {clubeId: 'd', seed: 4},
      {clubeId: 'b', seed: 2},
    ];
    const confrontos = montarFase(sementes, '2026', 0);
    expect(confrontos[0].clubeB).toBe('a');
    expect(confrontos[0].clubeA).toBe('d');
  });

  it('nomeFaseSerieD mapeia a contagem de clubes para o nome da fase', () => {
    expect(nomeFaseSerieD(64)).toBe('Segunda Fase');
    expect(nomeFaseSerieD(32)).toBe('Terceira Fase');
    expect(nomeFaseSerieD(16)).toBe('Oitavas de final');
    expect(nomeFaseSerieD(8)).toBe('Quartas de final');
    expect(nomeFaseSerieD(4)).toBe('Semifinal');
    expect(nomeFaseSerieD(2)).toBe('Final');
  });
});
