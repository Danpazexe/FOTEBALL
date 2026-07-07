import {clubesSeed} from '../../../data/seed/clubes';
import {jogadoresSeed} from '../../../data/seed/jogadores';
import {filtrarClubesSerieD, simularSerieD} from '../index';
import type {ResultadoSerieD} from '../index';

const CLUBES_D = filtrarClubesSerieD(clubesSeed);

function rodar(seed: number): ResultadoSerieD {
  return simularSerieD({
    clubes: CLUBES_D,
    jogadores: jogadoresSeed,
    temporada: '2026',
    seed,
  });
}

describe('simularSerieD (temporada completa, formato 2026)', () => {
  const resultado = rodar(2026);

  it('monta 16 grupos de 6 e 64 classificados', () => {
    expect(resultado.grupos).toHaveLength(16);
    expect(resultado.grupos.every(g => g.clubeIds.length === 6)).toBe(true);
    expect(resultado.classificados).toHaveLength(64);
    // Todos os classificados são clubes reais da Série D, sem repetição.
    const ids = new Set(CLUBES_D.map(c => c.id));
    const classificadosIds = resultado.classificados.map(c => c.clubeId);
    expect(new Set(classificadosIds).size).toBe(64);
    expect(classificadosIds.every(id => ids.has(id))).toBe(true);
  });

  it('joga todas as fases do mata-mata, da 2ª fase à final', () => {
    const nomes = resultado.fases.map(f => f.nome);
    expect(nomes).toEqual([
      'Segunda Fase',
      'Terceira Fase',
      'Oitavas de final',
      'Quartas de final',
      'Semifinal',
      'Final',
    ]);
    // 64 → 32 confrontos na 2ª fase; 1 na final.
    expect(resultado.fases[0].confrontos).toHaveLength(32);
    expect(resultado.fases[5].confrontos).toHaveLength(1);
  });

  it('define campeão e vice distintos, ambos entre os semifinalistas', () => {
    expect(resultado.semifinalistas).toHaveLength(4);
    expect(resultado.campeao).not.toBe(resultado.vice);
    expect(resultado.semifinalistas).toContain(resultado.campeao);
    expect(resultado.semifinalistas).toContain(resultado.vice);
  });

  it('promove exatamente 6 clubes: os 4 semifinalistas + 2 do playoff', () => {
    expect(resultado.promovidos).toHaveLength(6);
    expect(new Set(resultado.promovidos).size).toBe(6);
    for (const semi of resultado.semifinalistas) {
      expect(resultado.promovidos).toContain(semi);
    }
    // Todos os promovidos vieram do mata-mata (são classificados).
    const classificadosIds = new Set(resultado.classificados.map(c => c.clubeId));
    expect(resultado.promovidos.every(id => classificadosIds.has(id))).toBe(true);
    // O playoff de acesso existe e tem 2 confrontos.
    expect(resultado.playoffAcesso?.confrontos).toHaveLength(2);
  });

  it('é 100% determinístico: mesma seed → mesmo campeão e mesmos promovidos', () => {
    const outra = rodar(2026);
    expect(outra.campeao).toBe(resultado.campeao);
    expect(outra.promovidos).toEqual(resultado.promovidos);
    expect(outra.grupos).toEqual(resultado.grupos);
  });

  it('seeds diferentes tendem a produzir campeões/chaves diferentes', () => {
    const outra = rodar(7);
    // Não é garantia absoluta, mas os grupos devem diferir com outra seed.
    expect(outra.grupos).not.toEqual(resultado.grupos);
  });
});
