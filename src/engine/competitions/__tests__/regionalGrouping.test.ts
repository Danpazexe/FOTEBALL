import {clubesSeed} from '../../../data/seed/clubes';
import {regiaoDaUF} from '../../../data/federations/regioes';
import {criarRNGComSeed, hashString} from '../../simulation/rng';
import {filtrarClubesSerieD, montarGruposRegionais, SERIE_D_2026} from '../index';

const CLUBES_D = filtrarClubesSerieD(clubesSeed);
const clubePorId = new Map(CLUBES_D.map(clube => [clube.id, clube]));

function agrupar(seed: number) {
  return montarGruposRegionais(
    CLUBES_D,
    SERIE_D_2026,
    criarRNGComSeed(hashString(`${seed}`)),
  );
}

describe('montarGruposRegionais', () => {
  it('o seed da Série D tem exatamente 96 clubes', () => {
    expect(CLUBES_D).toHaveLength(96);
  });

  it('gera 16 grupos de 6 usando cada clube exatamente uma vez', () => {
    const grupos = agrupar(2026);
    expect(grupos).toHaveLength(16);
    for (const grupo of grupos) {
      expect(grupo.clubeIds).toHaveLength(6);
    }
    const todos = grupos.flatMap(grupo => grupo.clubeIds);
    expect(todos).toHaveLength(96);
    expect(new Set(todos).size).toBe(96);
  });

  it('é determinístico para a mesma seed', () => {
    expect(agrupar(2026)).toEqual(agrupar(2026));
  });

  it('a maioria dos grupos é regionalmente coesa (mesma região)', () => {
    const grupos = agrupar(2026);
    const coesos = grupos.filter(grupo => {
      const regioes = new Set(
        grupo.clubeIds.map(id => regiaoDaUF(clubePorId.get(id)!.estado)),
      );
      return regioes.size === 1;
    });
    // Com regiões de tamanho variado, alguns grupos de fronteira misturam UFs;
    // a maioria, porém, deve ser de uma única região.
    expect(coesos.length).toBeGreaterThanOrEqual(8);
  });

  it('aceita override manual válido e o devolve como está', () => {
    const base = agrupar(1);
    const override: Record<string, string[]> = {};
    base.forEach(grupo => {
      override[grupo.id] = grupo.clubeIds;
    });
    const grupos = montarGruposRegionais(
      CLUBES_D,
      SERIE_D_2026,
      criarRNGComSeed(1),
      {override},
    );
    expect(grupos).toEqual(base);
  });

  it('rejeita override com tamanho de grupo errado', () => {
    const override: Record<string, string[]> = {A: [CLUBES_D[0].id]};
    expect(() =>
      montarGruposRegionais(CLUBES_D, SERIE_D_2026, criarRNGComSeed(1), {
        override,
      }),
    ).toThrow();
  });
});
