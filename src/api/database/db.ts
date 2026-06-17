import {open, type DB} from '@op-engineering/op-sqlite';

import {schemaStatements} from './schema';

let database: DB | null = null;

export function getDatabase(): DB {
  if (database === null) {
    database = open({name: 'foteball.db'});
  }

  return database;
}

export async function migrateDatabase(db: DB = getDatabase()): Promise<void> {
  await db.executeBatch(schemaStatements.map(statement => [statement]));
}

export async function initializeDatabase(): Promise<DB> {
  const db = getDatabase();
  await migrateDatabase(db);
  return db;
}
