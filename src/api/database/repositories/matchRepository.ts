import type {Partida} from '../../../types';

import type {GameDataSource} from './gameDataSource';

export interface MatchRepository {
  get(id: string): Promise<Partida | null>;
  getAll(): Promise<Partida[]>;
  update(partida: Partida): Promise<void>;
}

export function createMatchRepository(
  dataSource: GameDataSource,
): MatchRepository {
  return {
    get(id: string) {
      return dataSource.getPartidaById(id);
    },
    getAll() {
      return dataSource.getPartidas();
    },
    update(partida: Partida) {
      return dataSource.savePartida(partida);
    },
  };
}
