import {open, type DB} from '@op-engineering/op-sqlite';

let database: DB | null = null;

/**
 * Conexão única com o SQLite (`foteball.db`). As tabelas necessárias são criadas
 * sob demanda por quem usa (ex.: `saveStorage` cria `save_state`).
 */
export function getDatabase(): DB {
  if (database === null) {
    database = open({name: 'foteball.db'});
  }

  return database;
}
