/**
 * Preferências de APP (não da carreira) em SQLite — hoje só o tema dia/noite.
 * Fica FORA do save do jogo: vale mesmo sem carreira (menu, loading) e não entra
 * no snapshot da carreira.
 *
 * Import-safe: o op-sqlite é carregado via `import()` dinâmico (como em
 * persistence.ts), então este módulo pode ser importado em qualquer lugar sem
 * quebrar os testes. Usa `executeSync` (o async do op-sqlite crasha com o
 * debugger do Hermes; ver saveStorage.ts). Toda falha é engolida com aviso —
 * preferência de tema nunca deve derrubar o boot.
 */
import type {ModoTema} from '../../store/useTemaStore';

const CRIAR_TABELA =
  'CREATE TABLE IF NOT EXISTS preferencias (chave TEXT PRIMARY KEY, valor TEXT NOT NULL)';

const CHAVE_MODO_TEMA = 'modoTema';

let preparado = false;

async function tabela() {
  const {getDatabase} = await import('./db');
  const base = getDatabase();
  if (!preparado) {
    base.executeSync(CRIAR_TABELA);
    preparado = true;
  }
  return base;
}

/** Lê o modo de tema salvo, ou `null` se nunca foi definido / em caso de falha. */
export async function carregarModoTema(): Promise<ModoTema | null> {
  try {
    const base = await tabela();
    const resultado = base.executeSync(
      'SELECT valor FROM preferencias WHERE chave = ?',
      [CHAVE_MODO_TEMA],
    );
    const valor = resultado.rows[0]?.valor;
    return valor === 'claro' || valor === 'escuro' ? valor : null;
  } catch (erro) {
    console.warn('[tema] carregar preferência falhou:', erro);
    return null;
  }
}

/** Persiste o modo de tema. Falha silenciosa (só loga). */
export async function salvarModoTema(modo: ModoTema): Promise<void> {
  try {
    const base = await tabela();
    base.executeSync(
      'INSERT OR REPLACE INTO preferencias (chave, valor) VALUES (?, ?)',
      [CHAVE_MODO_TEMA, modo],
    );
  } catch (erro) {
    console.warn('[tema] salvar preferência falhou:', erro);
  }
}
