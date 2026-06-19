import {criarClube, criarPlayer} from '../../../testing/fixtures';

import {evoluirJogador, fatorValorPorIdade} from '../playerProgression';

const CLUBE = criarClube({id: 'time'});

describe('evoluirJogador', () => {
  it('um veterano em alto nível decai mais devagar que um encostado', () => {
    const base = {
      idade: 34,
      overall: 80,
      potencial: 80,
    } as const;
    const titularDecisivo = criarPlayer({
      id: 'vet1',
      ...base,
      estatisticasTemporada: {
        temporada: '2026',
        jogos: 30,
        gols: 5,
        assistencias: 4,
        cartoesAmarelos: 2,
        cartoesVermelhos: 0,
        notaMedia: 7.4,
      },
    });
    const encostado = criarPlayer({
      id: 'vet2',
      ...base,
      estatisticasTemporada: {
        temporada: '2026',
        jogos: 3,
        gols: 0,
        assistencias: 0,
        cartoesAmarelos: 0,
        cartoesVermelhos: 0,
        notaMedia: 5.5,
      },
    });

    const decaiTitular = titularDecisivo.overall - evoluirJogador(titularDecisivo, CLUBE).overall;
    const decaiEncostado = encostado.overall - evoluirJogador(encostado, CLUBE).overall;
    expect(decaiTitular).toBeLessThan(decaiEncostado);
  });

  it('um jovem promissor evolui', () => {
    const jovem = criarPlayer({
      id: 'jovem',
      idade: 18,
      overall: 60,
      potencial: 85,
    });
    expect(evoluirJogador(jovem, CLUBE).overall).toBeGreaterThan(jovem.overall);
  });

  it('fatorValorPorIdade decresce com a idade (jovem > auge > veterano)', () => {
    expect(fatorValorPorIdade(20)).toBeGreaterThan(fatorValorPorIdade(27));
    expect(fatorValorPorIdade(27)).toBeGreaterThanOrEqual(fatorValorPorIdade(31));
    expect(fatorValorPorIdade(31)).toBeGreaterThan(fatorValorPorIdade(34));
    expect(fatorValorPorIdade(34)).toBeGreaterThan(fatorValorPorIdade(36));
  });

  it('veterano desvaloriza mesmo no teto de overall', () => {
    // idade 34 (vai a 35), overall já no potencial: o overall pouco muda, mas
    // o valor cai pela idade.
    const veterano = criarPlayer({
      id: 'vet',
      idade: 34,
      overall: 82,
      potencial: 82,
      valorMercado: 10_000_000,
      estatisticasTemporada: {
        temporada: '2026',
        jogos: 30,
        gols: 8,
        assistencias: 5,
        cartoesAmarelos: 1,
        cartoesVermelhos: 0,
        notaMedia: 7.5,
      },
    });
    const depois = evoluirJogador(veterano, CLUBE);
    expect(depois.valorMercado).toBeLessThan(veterano.valorMercado);
  });

  it('jovem em evolução valoriza', () => {
    const jovem = criarPlayer({
      id: 'joia',
      idade: 19,
      overall: 65,
      potencial: 88,
      valorMercado: 3_000_000,
    });
    expect(evoluirJogador(jovem, CLUBE).valorMercado).toBeGreaterThan(
      jovem.valorMercado,
    );
  });
});
