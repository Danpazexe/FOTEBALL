import {criarRNGComSeed} from '../../simulation/rng';
import {
  faixaPotencial,
  gerarJovensTemporada,
  jovemParaPlayer,
} from '../academiaEngine';

describe('academiaEngine', () => {
  it('gera de 3 a 5 jovens, determinístico por seed', () => {
    const a = gerarJovensTemporada(2027, {CA: 2}, criarRNGComSeed(2027));
    const b = gerarJovensTemporada(2027, {CA: 2}, criarRNGComSeed(2027));
    expect(a.length).toBeGreaterThanOrEqual(3);
    expect(a.length).toBeLessThanOrEqual(5);
    expect(a).toEqual(b);
  });

  it('overall entre 55-68 e potencial entre 72-90 (acima do overall)', () => {
    const jovens = gerarJovensTemporada(2030, {}, criarRNGComSeed(5));
    for (const jovem of jovens) {
      expect(jovem.overall).toBeGreaterThanOrEqual(55);
      expect(jovem.overall).toBeLessThanOrEqual(68);
      expect(jovem.potencial).toBeGreaterThanOrEqual(72);
      expect(jovem.potencial).toBeLessThanOrEqual(90);
      expect(jovem.potencial).toBeGreaterThan(jovem.overall);
    }
  });

  it('faixaPotencial classifica B/A/S', () => {
    expect(faixaPotencial(90)).toBe('S');
    expect(faixaPotencial(86)).toBe('S');
    expect(faixaPotencial(85)).toBe('A');
    expect(faixaPotencial(79)).toBe('A');
    expect(faixaPotencial(78)).toBe('B');
  });

  it('jovemParaPlayer cria um Player do clube', () => {
    const [jovem] = gerarJovensTemporada(2027, {}, criarRNGComSeed(9));
    const player = jovemParaPlayer(jovem, 'meu_clube', '2027');
    expect(player.id).toBe(jovem.id);
    expect(player.clubeId).toBe('meu_clube');
    expect(player.overall).toBe(jovem.overall);
    expect(player.posicaoPrincipal).toBe(jovem.posicao);
  });
});
