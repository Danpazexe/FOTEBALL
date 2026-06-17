import {criarClube, criarPlayer} from '../../../testing/fixtures';

import {evoluirJogador} from '../playerProgression';

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
});
