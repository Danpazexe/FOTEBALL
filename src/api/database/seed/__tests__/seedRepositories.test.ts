import {createClubRepository} from '../../repositories/clubRepository';
import {createPlayerRepository} from '../../repositories/playerRepository';
import {createInMemoryGameDataSource} from '../../testing/inMemoryGameDataSource';
import {loadSeedData} from '../loadSeed';

describe('seed repositories', () => {
  it('loads 60 clubes (20 por divisão) e jogadores para cada clube', async () => {
    const seed = loadSeedData();
    const dataSource = createInMemoryGameDataSource(seed);
    const clubRepository = createClubRepository(dataSource);
    const playerRepository = createPlayerRepository(dataSource);

    const clubes = await clubRepository.getAll();

    // Brasileirão Série A + B + C: 20 clubes em cada divisão.
    expect(clubes).toHaveLength(60);
    expect(clubes.filter(clube => clube.divisao === 'Série A')).toHaveLength(20);
    expect(clubes.filter(clube => clube.divisao === 'Série B')).toHaveLength(20);
    expect(clubes.filter(clube => clube.divisao === 'Série C')).toHaveLength(20);

    for (const clube of clubes) {
      const jogadores = await playerRepository.getByClub(clube.id);

      expect(jogadores.length).toBeGreaterThan(0);
      expect(clube.formacaoAtual?.titulares).toHaveLength(11);
      expect(clube.taticaAtual).toMatchObject({
        estiloOfensivo: 'Equilibrado',
        marcacao: 'Zona',
        linhaDefensiva: 'Normal',
        ritmo: 'Normal',
      });
    }
  });
});
