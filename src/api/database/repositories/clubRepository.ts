import type {Clube} from '../../../types';

import type {GameDataSource} from './gameDataSource';

export interface ClubRepository {
  get(id: string): Promise<Clube | null>;
  getAll(): Promise<Clube[]>;
  update(clube: Clube): Promise<void>;
}

export function createClubRepository(dataSource: GameDataSource): ClubRepository {
  return {
    get(id: string) {
      return dataSource.getClubeById(id);
    },
    getAll() {
      return dataSource.getClubes();
    },
    update(clube: Clube) {
      return dataSource.saveClube(clube);
    },
  };
}
