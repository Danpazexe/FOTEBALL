/**
 * Armazenamento de save em SQLite (op-sqlite). Guarda o snapshot do jogo como
 * uma única linha de texto JSON na tabela `save_state`. Carregado sob demanda
 * por `persistence.ts` (mantém op-sqlite fora do ambiente de testes).
 */

import type {ArmazenamentoSave} from '../../store/persistence';
import {getDatabase} from './db';

const CRIAR_TABELA =
  'CREATE TABLE IF NOT EXISTS save_state (id INTEGER PRIMARY KEY, snapshot TEXT NOT NULL)';

// Linha 1 = save atual; linha 2 = backup (último save íntegro anterior).
const ID_ATUAL = 1;
const ID_BACKUP = 2;

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

  async function lerLinha(base: Awaited<ReturnType<typeof db>>, id: number) {
    const resultado = await base.execute(
      'SELECT snapshot FROM save_state WHERE id = ?',
      [id],
    );
    const valor = resultado.rows[0]?.snapshot;
    return typeof valor === 'string' ? valor : null;
  }

  return {
    async escrever(json: string): Promise<void> {
      const base = await db();
      // Backup-before-overwrite: preserva o save anterior antes de sobrescrever,
      // para recuperação caso a próxima gravação corrompa (ou interrompa) o atual.
      const anterior = await lerLinha(base, ID_ATUAL);
      if (anterior !== null) {
        await base.execute(
          'INSERT OR REPLACE INTO save_state (id, snapshot) VALUES (?, ?)',
          [ID_BACKUP, anterior],
        );
      }
      await base.execute(
        'INSERT OR REPLACE INTO save_state (id, snapshot) VALUES (?, ?)',
        [ID_ATUAL, json],
      );
      // Verificação pós-escrita: relê o que gravou. Se não bater, o "salvo" seria
      // MENTIRA — lançamos para o indicador sumir e o log acusar (em vez de o
      // usuário achar que salvou e perder tudo ao reabrir).
      const conferido = await lerLinha(base, ID_ATUAL);
      if (conferido !== json) {
        throw new Error(
          'Verificação pós-escrita falhou: o save não persistiu no SQLite.',
        );
      }
    },

    async ler(): Promise<string | null> {
      return lerLinha(await db(), ID_ATUAL);
    },

    async lerBackup(): Promise<string | null> {
      return lerLinha(await db(), ID_BACKUP);
    },

    async limpar(): Promise<void> {
      const base = await db();
      await base.execute('DELETE FROM save_state');
    },
  };
}
