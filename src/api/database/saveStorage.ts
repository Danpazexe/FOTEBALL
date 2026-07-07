/**
 * Armazenamento de save em SQLite (op-sqlite). Guarda o snapshot do jogo como
 * uma única linha de texto JSON na tabela `save_state`. Carregado sob demanda
 * por `persistence.ts` (mantém op-sqlite fora do ambiente de testes).
 *
 * IMPORTANTE — usamos `executeSync` (NÃO o `execute` assíncrono). O `execute`
 * async do op-sqlite roda a query numa thread de fundo e resolve a promise
 * cruzando threads para o runtime JS; com o debugger do Hermes anexado (dev) isso
 * derruba o app (EXC_BAD_ACCESS na thread JS enquanto a thread do op-sqlite copia
 * o resultado). Nossas operações são de UMA linha — `executeSync` roda na própria
 * thread do JS, é instantâneo e elimina a instabilidade cross-thread.
 */

import type {ArmazenamentoSave} from '../../store/persistence';
import {paraAscii} from './asciiSafe';
import {getDatabase} from './db';

const CRIAR_TABELA =
  'CREATE TABLE IF NOT EXISTS save_state (id INTEGER PRIMARY KEY, snapshot TEXT NOT NULL)';

// Linha 1 = save atual; linha 2 = backup (último save íntegro anterior).
const ID_ATUAL = 1;
const ID_BACKUP = 2;

export function criarArmazenamentoSqlite(): ArmazenamentoSave {
  let preparado = false;

  function db() {
    const base = getDatabase();
    if (!preparado) {
      base.executeSync(CRIAR_TABELA);
      preparado = true;
    }
    return base;
  }

  function lerLinha(base: ReturnType<typeof db>, id: number): string | null {
    const resultado = base.executeSync(
      'SELECT snapshot FROM save_state WHERE id = ?',
      [id],
    );
    const valor = resultado.rows[0]?.snapshot;
    return typeof valor === 'string' ? valor : null;
  }

  return {
    async escrever(json: string): Promise<void> {
      const base = db();
      // ASCII-safe: contorna a truncagem do op-sqlite no primeiro não-ASCII.
      const seguro = paraAscii(json);
      // Backup-before-overwrite: preserva o save anterior antes de sobrescrever,
      // para recuperação caso a próxima gravação corrompa (ou interrompa) o atual.
      // O anterior já está gravado em ASCII, então vai direto para o backup.
      const anterior = lerLinha(base, ID_ATUAL);
      if (anterior !== null) {
        base.executeSync(
          'INSERT OR REPLACE INTO save_state (id, snapshot) VALUES (?, ?)',
          [ID_BACKUP, anterior],
        );
      }
      base.executeSync(
        'INSERT OR REPLACE INTO save_state (id, snapshot) VALUES (?, ?)',
        [ID_ATUAL, seguro],
      );
      // Verificação pós-escrita: relê o que gravou. Se não bater, o "salvo" seria
      // MENTIRA — lançamos para o indicador sumir e o log acusar (em vez de o
      // usuário achar que salvou e perder tudo ao reabrir).
      const conferido = lerLinha(base, ID_ATUAL);
      if (conferido !== seguro) {
        throw new Error(
          'Verificação pós-escrita falhou: o save não persistiu no SQLite.',
        );
      }
    },

    async ler(): Promise<string | null> {
      return lerLinha(db(), ID_ATUAL);
    },

    async lerBackup(): Promise<string | null> {
      return lerLinha(db(), ID_BACKUP);
    },

    async limpar(): Promise<void> {
      db().executeSync('DELETE FROM save_state');
    },
  };
}
