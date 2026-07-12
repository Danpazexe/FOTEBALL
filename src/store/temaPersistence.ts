/**
 * Persistência da preferência de tema (`modo`). Espelha o padrão de
 * `persistence.ts`: I/O atrás de uma interface, SQLite (op-sqlite) carregado
 * SOB DEMANDA para não tocar o ambiente de testes, e injeção em memória via
 * `definirArmazenamentoPrefs`.
 *
 * Grava numa tabela `app_prefs` DEDICADA — não toca o schema do save (crítico).
 */
import type {ModoTema} from '../design-system/themes/types';

export interface ArmazenamentoPrefs {
  ler(chave: string): Promise<string | null>;
  gravar(chave: string, valor: string): Promise<void>;
}

const CHAVE_MODO = 'tema.modo';
const MODOS: readonly ModoTema[] = ['claro', 'escuro', 'sistema'];

let armazenamento: ArmazenamentoPrefs | null = null;

/** Injeta um armazenamento (usado nos testes com implementação em memória). */
export function definirArmazenamentoPrefs(novo: ArmazenamentoPrefs): void {
  armazenamento = novo;
}

async function obterArmazenamento(): Promise<ArmazenamentoPrefs> {
  if (!armazenamento) {
    // Carrega o SQLite só quando necessário (evita op-sqlite no ambiente de teste).
    const modulo = await import('../api/database/prefsStorage');
    armazenamento = modulo.criarArmazenamentoPrefs();
  }
  return armazenamento;
}

/** Lê o modo salvo; `null` se ausente ou inválido (cai no default do store). */
export async function carregarModo(): Promise<ModoTema | null> {
  const arm = await obterArmazenamento();
  const bruto = await arm.ler(CHAVE_MODO);
  return MODOS.includes(bruto as ModoTema) ? (bruto as ModoTema) : null;
}

export async function salvarModo(modo: ModoTema): Promise<void> {
  const arm = await obterArmazenamento();
  await arm.gravar(CHAVE_MODO, modo);
}
