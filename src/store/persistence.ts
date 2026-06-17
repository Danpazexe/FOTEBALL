/**
 * Persistência do jogo (Módulo 1). Estratégia: snapshot único em JSON.
 *
 * A lógica de (de)serialização é PURA e testável (`montarSnapshot` /
 * `aplicarSnapshot`). O I/O fica atrás de `ArmazenamentoSave` — por padrão um
 * armazenamento SQLite (op-sqlite, carregado sob demanda para não tocar o
 * ambiente de testes), substituível por uma implementação em memória nos testes
 * via `definirArmazenamentoSave`.
 */

import type {JovemTalento} from '../engine/progression/academiaEngine';
import type {Clube, Partida, Player, TabelaClassificacao} from '../types';
import type {GameState} from './useGameStore';

export const VERSAO_SAVE = 1;

export interface SnapshotJogo {
  versao: number;
  clubeUsuarioId: string | null;
  temporadaAtual: string;
  rodadaAtual: number;
  dataAtual?: string;
  treinouProximoJogo?: boolean;
  clubes: Clube[];
  jogadores: Player[];
  partidas: Partida[];
  tabela: TabelaClassificacao[];
  jovensDisponiveis: JovemTalento[];
}

/** Extrai do estado apenas o que precisa ser persistido (sem as ações). */
export function montarSnapshot(state: GameState): SnapshotJogo {
  return {
    versao: VERSAO_SAVE,
    clubeUsuarioId: state.clubeUsuarioId,
    temporadaAtual: state.temporadaAtual,
    rodadaAtual: state.rodadaAtual,
    dataAtual: state.dataAtual,
    treinouProximoJogo: state.treinouProximoJogo,
    clubes: state.clubes,
    jogadores: state.jogadores,
    partidas: state.partidas,
    tabela: state.tabela,
    jovensDisponiveis: state.jovensDisponiveis,
  };
}

/** Reconstrói a fatia de estado a aplicar via `useGameStore.setState`. */
export function aplicarSnapshot(snapshot: SnapshotJogo): Partial<GameState> {
  return {
    clubeUsuarioId: snapshot.clubeUsuarioId,
    temporadaAtual: snapshot.temporadaAtual,
    rodadaAtual: snapshot.rodadaAtual,
    dataAtual: snapshot.dataAtual ?? `${snapshot.temporadaAtual}-04-04`,
    treinouProximoJogo: snapshot.treinouProximoJogo ?? false,
    clubes: snapshot.clubes,
    jogadores: snapshot.jogadores,
    partidas: snapshot.partidas,
    tabela: snapshot.tabela,
    jovensDisponiveis: snapshot.jovensDisponiveis ?? [],
  };
}

export interface ArmazenamentoSave {
  escrever(json: string): Promise<void>;
  ler(): Promise<string | null>;
  limpar(): Promise<void>;
}

let armazenamento: ArmazenamentoSave | null = null;

/** Injeta um armazenamento (usado nos testes com implementação em memória). */
export function definirArmazenamentoSave(novo: ArmazenamentoSave): void {
  armazenamento = novo;
}

async function obterArmazenamento(): Promise<ArmazenamentoSave> {
  if (!armazenamento) {
    // Carrega o SQLite só quando necessário (evita op-sqlite no ambiente de teste).
    const modulo = await import('../api/database/saveStorage');
    armazenamento = modulo.criarArmazenamentoSqlite();
  }
  return armazenamento;
}

/** Salva o estado atual (sobrescreve o save anterior — idempotente). */
export async function salvarJogo(state: GameState): Promise<void> {
  const arm = await obterArmazenamento();
  await arm.escrever(JSON.stringify(montarSnapshot(state)));
}

/** Carrega o último save e devolve a fatia de estado, ou null se não houver. */
export async function carregarJogo(): Promise<Partial<GameState> | null> {
  const arm = await obterArmazenamento();
  const json = await arm.ler();
  if (!json) {
    return null;
  }
  try {
    const snapshot = JSON.parse(json) as SnapshotJogo;
    return aplicarSnapshot(snapshot);
  } catch {
    return null;
  }
}

/** Indica se existe algum save salvo. */
export async function existeSave(): Promise<boolean> {
  const arm = await obterArmazenamento();
  const json = await arm.ler();
  return json !== null && json.length > 0;
}

/** Apaga o save (usado ao reiniciar a carreira). */
export async function limparSave(): Promise<void> {
  const arm = await obterArmazenamento();
  await arm.limpar();
}
