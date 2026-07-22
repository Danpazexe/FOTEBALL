/**
 * arbitroDoJogo — contrato do Pré-Jogo: mostrar exatamente o árbitro que vai
 * apitar o ao vivo. A tela MatchSimulation deriva a seed da partida como
 * `hashString(partida.id) % 1_000_000`; o helper precisa reproduzir essa
 * derivação bit a bit.
 */
import {arbitroDoJogo, NOMES_ARBITROS, sortearArbitro} from '../arbitro';
import {hashString} from '../rng';

describe('arbitroDoJogo', () => {
  it('é determinístico: mesmo id de partida ⇒ mesmo árbitro', () => {
    const primeira = arbitroDoJogo('match_flu_cor_seed42_7');
    const segunda = arbitroDoJogo('match_flu_cor_seed42_7');
    expect(segunda).toEqual(primeira);
  });

  it('coincide com o ao vivo: sortearArbitro(hashString(id) % 1_000_000)', () => {
    const ids = [
      'match_flamengo_vasco_123_4',
      'partida_serie_c_rodada_9',
      'copa_r1_j3',
      'x',
    ];
    for (const id of ids) {
      expect(arbitroDoJogo(id)).toEqual(
        sortearArbitro(hashString(id) % 1_000_000),
      );
    }
  });

  it('devolve sempre nome do pool e rigor entre 1 e 5', () => {
    for (let i = 0; i < 30; i += 1) {
      const arbitro = arbitroDoJogo(`jogo_${i}`);
      expect(NOMES_ARBITROS).toContain(arbitro.nome);
      expect(arbitro.rigor).toBeGreaterThanOrEqual(1);
      expect(arbitro.rigor).toBeLessThanOrEqual(5);
    }
  });

  it('varia entre partidas (não é um árbitro fixo)', () => {
    const nomes = new Set(
      Array.from({length: 40}, (_, i) => arbitroDoJogo(`p_${i}`).nome),
    );
    expect(nomes.size).toBeGreaterThan(1);
  });
});
