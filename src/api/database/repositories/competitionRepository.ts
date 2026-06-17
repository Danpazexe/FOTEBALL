import type {Competicao} from '../../../types';

import type {GameDataSource} from './gameDataSource';

export interface CompetitionRepository {
  get(id: string): Promise<Competicao | null>;
  getAll(): Promise<Competicao[]>;
  update(competicao: Competicao): Promise<void>;
}

export function createCompetitionRepository(
  dataSource: GameDataSource,
): CompetitionRepository {
  return {
    get(id: string) {
      return dataSource.getCompeticaoById(id);
    },
    getAll() {
      return dataSource.getCompeticoes();
    },
    update(competicao: Competicao) {
      return dataSource.saveCompeticao(competicao);
    },
  };
}
