import type {Player} from '../../../types';

import type {GameDataSource} from './gameDataSource';

export interface PlayerRepository {
  get(id: string): Promise<Player | null>;
  getAll(): Promise<Player[]>;
  getByClub(clubeId: string): Promise<Player[]>;
  update(jogador: Player): Promise<void>;
}

export function createPlayerRepository(
  dataSource: GameDataSource,
): PlayerRepository {
  return {
    get(id: string) {
      return dataSource.getJogadorById(id);
    },
    getAll() {
      return dataSource.getJogadores();
    },
    getByClub(clubeId: string) {
      return dataSource.getJogadoresByClube(clubeId);
    },
    update(jogador: Player) {
      return dataSource.saveJogador(jogador);
    },
  };
}
