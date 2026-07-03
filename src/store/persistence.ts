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
import type {EstadoCopa} from '../engine/season/copaEngine';
import type {PropostaTransferencia} from '../engine/transfers/negociacaoEngine';
import type {ConquistaSalva} from '../data/conquistas';
import type {
  Clube,
  EstadoFinanceiro,
  MotivoDemissao,
  Partida,
  Player,
  TabelaClassificacao,
} from '../types';
import {REPUTACAO_INICIAL} from '../engine/carreira/carreiraEngine';
import {comHabilidades} from '../engine/progression/habilidades';
import {comTipo} from '../engine/progression/tipoJogador';
import {CONFIG_PADRAO, type ConfigJogo, type GameState} from './useGameStore';
import {migrarSnapshot, VERSAO_SAVE} from './saveMigrations';

// Reexporta a versão atual do save (definida em saveMigrations p/ evitar ciclo).
export {VERSAO_SAVE};

export interface SnapshotJogo {
  versao: number;
  clubeUsuarioId: string | null;
  temporadaAtual: string;
  rodadaAtual: number;
  dataAtual?: string;
  treinouProximoJogo?: boolean;
  conversouComGrupo?: boolean;
  clubes: Clube[];
  jogadores: Player[];
  partidas: Partida[];
  tabela: TabelaClassificacao[];
  jovensDisponiveis: JovemTalento[];
  // Adicionados na v2 (opcionais para ler saves v1):
  config?: ConfigJogo;
  propostasRecebidas?: PropostaTransferencia[];
  conquistas?: ConquistaSalva[];
  copa?: EstadoCopa | null;
  // Eixo Meta/Carreira (opcionais para ler saves anteriores):
  reputacaoTecnico?: number;
  derrotasConsecutivas?: number;
  rodadasNoVermelho?: number;
  estadoFinanceiro?: EstadoFinanceiro;
  demissao?: MotivoDemissao | null;
}

/**
 * Extrai do estado apenas o que precisa ser persistido (sem as ações). As
 * conquistas vivem em outro store (`useAchievementsStore`), então entram por
 * parâmetro — quem salva passa `conquistasParaSalvar(...)`.
 */
export function montarSnapshot(
  state: GameState,
  conquistas: ConquistaSalva[] = [],
): SnapshotJogo {
  return {
    versao: VERSAO_SAVE,
    clubeUsuarioId: state.clubeUsuarioId,
    temporadaAtual: state.temporadaAtual,
    rodadaAtual: state.rodadaAtual,
    dataAtual: state.dataAtual,
    treinouProximoJogo: state.treinouProximoJogo,
    conversouComGrupo: state.conversouComGrupo,
    clubes: state.clubes,
    jogadores: state.jogadores,
    partidas: state.partidas,
    tabela: state.tabela,
    jovensDisponiveis: state.jovensDisponiveis,
    config: state.config,
    propostasRecebidas: state.propostasRecebidas,
    conquistas,
    copa: state.copa,
    reputacaoTecnico: state.reputacaoTecnico,
    derrotasConsecutivas: state.derrotasConsecutivas,
    rodadasNoVermelho: state.rodadasNoVermelho,
    estadoFinanceiro: state.estadoFinanceiro,
    demissao: state.demissao,
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
    conversouComGrupo: snapshot.conversouComGrupo ?? false,
    clubes: snapshot.clubes,
    // Migração: saves anteriores ao sistema de habilidades/tipo não têm esses
    // campos — deriva no load (no-op para quem já tem).
    jogadores: snapshot.jogadores.map(comHabilidades).map(comTipo),
    partidas: snapshot.partidas,
    tabela: snapshot.tabela,
    jovensDisponiveis: snapshot.jovensDisponiveis ?? [],
    config: {...CONFIG_PADRAO, ...snapshot.config},
    propostasRecebidas: snapshot.propostasRecebidas ?? [],
    copa: snapshot.copa ?? null,
    reputacaoTecnico: snapshot.reputacaoTecnico ?? REPUTACAO_INICIAL,
    derrotasConsecutivas: snapshot.derrotasConsecutivas ?? 0,
    rodadasNoVermelho: snapshot.rodadasNoVermelho ?? 0,
    estadoFinanceiro: snapshot.estadoFinanceiro ?? 'SAUDAVEL',
    demissao: snapshot.demissao ?? null,
  };
}

export interface ArmazenamentoSave {
  /** Grava o save atual; antes disso, copia o save válido anterior para backup. */
  escrever(json: string): Promise<void>;
  ler(): Promise<string | null>;
  /** Último save íntegro anterior, usado como rede de segurança no carregamento. */
  lerBackup(): Promise<string | null>;
  limpar(): Promise<void>;
}

/** Resultado tipado do carregamento — nunca "engole" um erro silenciosamente. */
export type ResultadoCarregamento =
  | {tipo: 'vazio'}
  | {
      tipo: 'ok';
      estado: Partial<GameState>;
      conquistas: ConquistaSalva[];
      origem: 'principal' | 'backup';
    }
  | {tipo: 'erro'; mensagem: string};

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
export async function salvarJogo(
  state: GameState,
  conquistas: ConquistaSalva[] = [],
): Promise<void> {
  const arm = await obterArmazenamento();
  await arm.escrever(JSON.stringify(montarSnapshot(state, conquistas)));
}

/** Faz parse + valida + migra um JSON de save para uma fatia de estado aplicável. */
function decodificar(json: string): {
  estado: Partial<GameState>;
  conquistas: ConquistaSalva[];
} {
  const snapshot = migrarSnapshot(JSON.parse(json)); // lança em JSON/save inválido
  return {
    estado: aplicarSnapshot(snapshot),
    conquistas: snapshot.conquistas ?? [],
  };
}

/**
 * Carrega o save com rede de segurança: tenta o principal; se ele estiver
 * corrompido ou for de versão incompatível, cai para o backup; só então
 * retorna erro (sem nunca apagar nada nem fingir que não há save).
 */
export async function carregarJogo(): Promise<ResultadoCarregamento> {
  const arm = await obterArmazenamento();
  const principal = await arm.ler();
  if (!principal) {
    return {tipo: 'vazio'};
  }
  try {
    const {estado, conquistas} = decodificar(principal);
    return {tipo: 'ok', estado, conquistas, origem: 'principal'};
  } catch {
    const backup = await arm.lerBackup();
    if (backup) {
      try {
        const {estado, conquistas} = decodificar(backup);
        return {tipo: 'ok', estado, conquistas, origem: 'backup'};
      } catch {
        // backup também ilegível — cai no erro abaixo.
      }
    }
    return {
      tipo: 'erro',
      mensagem: 'Save corrompido e sem backup recuperável.',
    };
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
