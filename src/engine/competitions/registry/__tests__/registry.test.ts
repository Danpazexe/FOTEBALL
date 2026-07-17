/**
 * Registry de competições: o Brasil descrito nos tipos genéricos é EQUIVALENTE
 * ao comportamento atual (pirâmide A→B→C→D, 4 acessos entre adjacentes).
 */
import {
  competicaoPorDivisaoLegada,
  competicaoPorId,
  ligasDoPais,
  listarPaises,
  piramideDoPais,
} from '../competitionRegistry';
import {N_ACESSO, PIRAMIDE_DIVISOES} from '../../../../store/setup';

describe('catálogo/registry do mundo', () => {
  it('tem o Brasil registrado', () => {
    expect(listarPaises().some(p => p.id === 'brasil')).toBe(true);
  });

  it('a pirâmide brasileira do registry casa com PIRAMIDE_DIVISOES', () => {
    const nomes = piramideDoPais('brasil').map(c => c.divisaoLegada);
    expect(nomes).toEqual(PIRAMIDE_DIVISOES);
  });

  it('acesso entre divisões adjacentes é N_ACESSO (4), topo/base sem acesso extra', () => {
    const serieA = competicaoPorId('br-serie-a');
    const serieB = competicaoPorId('br-serie-b');
    const serieD = competicaoPorId('br-serie-d');
    expect(serieA?.acesso).toBe(0); // topo não sobe
    expect(serieA?.rebaixamento).toBe(N_ACESSO);
    expect(serieB?.acesso).toBe(N_ACESSO);
    expect(serieD?.rebaixamento).toBe(0); // base não desce
  });

  it('mapeia a divisão legada para a competição (compat)', () => {
    expect(competicaoPorDivisaoLegada('Série A')?.id).toBe('br-serie-a');
    expect(competicaoPorDivisaoLegada('Série C')?.id).toBe('br-serie-c');
    expect(competicaoPorDivisaoLegada(undefined)).toBeUndefined();
  });

  it('vizinhança da pirâmide é coerente (above/below encadeados)', () => {
    const b = competicaoPorId('br-serie-b');
    expect(b?.competitionAboveId).toBe('br-serie-a');
    expect(b?.competitionBelowId).toBe('br-serie-c');
  });

  it('ligas do Brasil vêm ordenadas do topo para a base', () => {
    const tiers = ligasDoPais('brasil').map(c => c.tier);
    expect(tiers).toEqual([...tiers].sort((a, b) => a - b));
  });
});
