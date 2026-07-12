/**
 * Armazenamento de preferências de app em SQLite (op-sqlite) — tabela `app_prefs`
 * (chave/valor), SEPARADA do save do jogo. Usa `executeSync` (UMA linha), pelo
 * mesmo motivo de estabilidade cross-thread descrito em `saveStorage.ts`.
 * Carregado sob demanda por `temaPersistence.ts` (op-sqlite fora dos testes).
 */
import type {ArmazenamentoPrefs} from '../../store/temaPersistence';
import {getDatabase} from './db';

const CRIAR_TABELA =
  'CREATE TABLE IF NOT EXISTS app_prefs (chave TEXT PRIMARY KEY, valor TEXT NOT NULL)';

export function criarArmazenamentoPrefs(): ArmazenamentoPrefs {
  let preparado = false;

  function db() {
    const base = getDatabase();
    if (!preparado) {
      base.executeSync(CRIAR_TABELA);
      preparado = true;
    }
    return base;
  }

  return {
    async ler(chave: string): Promise<string | null> {
      const resultado = db().executeSync(
        'SELECT valor FROM app_prefs WHERE chave = ?',
        [chave],
      );
      const valor = resultado.rows[0]?.valor;
      return typeof valor === 'string' ? valor : null;
    },

    async gravar(chave: string, valor: string): Promise<void> {
      db().executeSync(
        'INSERT OR REPLACE INTO app_prefs (chave, valor) VALUES (?, ?)',
        [chave, valor],
      );
    },
  };
}
