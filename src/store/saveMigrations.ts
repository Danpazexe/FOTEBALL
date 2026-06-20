/**
 * Migração versionada de saves. Sempre que o formato do `SnapshotJogo` mudar,
 * incremente `VERSAO_SAVE` (em persistence.ts) e adicione um passo aqui para
 * converter o save antigo. Saves de versão MAIS NOVA que o app são rejeitados
 * (o usuário precisa atualizar), e saves estruturalmente corrompidos lançam erro
 * para acionar o fallback de backup em `carregarJogo`.
 */

import type {SnapshotJogo} from './persistence';

// v1: snapshot original. v2: passa a incluir config, propostas recebidas e
// conquistas desbloqueadas (antes eram perdidas ao recarregar). Mora aqui (e não
// em persistence.ts) para a aresta de runtime persistence -> saveMigrations ser
// unidirecional (o import de SnapshotJogo acima é apenas de tipo).
export const VERSAO_SAVE = 2;

/** Valida e migra o JSON bruto (já parseado) para o formato atual do save. */
export function migrarSnapshot(bruto: unknown): SnapshotJogo {
  if (!bruto || typeof bruto !== 'object') {
    throw new Error('Save inválido: conteúdo não é um objeto.');
  }
  const dado = bruto as Partial<SnapshotJogo> & {versao?: unknown};
  const versao = typeof dado.versao === 'number' ? dado.versao : 0;

  if (versao > VERSAO_SAVE) {
    throw new Error(
      `Save da versão ${versao} é mais novo que o app (versão ${VERSAO_SAVE}).`,
    );
  }

  // Validação estrutural mínima: sem estes campos o save não é jogável.
  if (
    !Array.isArray(dado.clubes) ||
    !Array.isArray(dado.jogadores) ||
    !Array.isArray(dado.partidas) ||
    !Array.isArray(dado.tabela)
  ) {
    throw new Error('Save corrompido: campos essenciais ausentes.');
  }

  // Migrações incrementais (encadeie um passo por bump de VERSAO_SAVE):
  // v0/v1 -> v2: campos opcionais novos (config, propostasRecebidas,
  //   conquistas) são preenchidos com padrões por `aplicarSnapshot`; aqui basta
  //   normalizar a versão.
  return {...(dado as SnapshotJogo), versao: VERSAO_SAVE};
}
