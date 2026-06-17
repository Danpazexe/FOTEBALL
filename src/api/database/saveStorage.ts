/**
 * Armazenamento de save em SQLite (op-sqlite). Guarda o snapshot do jogo como
 * uma única linha de texto JSON na tabela `save_state`. Carregado sob demanda
 * por `persistence.ts` (mantém op-sqlite fora do ambiente de testes).
 */

import type {ArmazenamentoSave} from '../../store/persistence';
import {getDatabase} from './db';

const CRIAR_TABELA =
  'CREATE TABLE IF NOT EXISTS save_state (id INTEGER PRIMARY KEY, snapshot TEXT NOT NULL)';

export function criarArmazenamentoSqlite(): ArmazenamentoSave {
  let preparado = false;

  async function db() {
    const base = getDatabase();
    if (!preparado) {
      await base.execute(CRIAR_TABELA);
      preparado = true;
    }
    return base;
  }

  return {
    async escrever(json: string): Promise<void> {
      const base = await db();
      await base.execute(
        'INSERT OR REPLACE INTO save_state (id, snapshot) VALUES (1, ?)',
        [json],
      );
    },

    async ler(): Promise<string | null> {
      const base = await db();
      const resultado = await base.execute(
        'SELECT snapshot FROM save_state WHERE id = 1',
      );
      const valor = resultado.rows[0]?.snapshot;
      return typeof valor === 'string' ? valor : null;
    },

    async limpar(): Promise<void> {
      const base = await db();
      await base.execute('DELETE FROM save_state');
    },
  };
}
