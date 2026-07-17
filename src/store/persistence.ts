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
  PendenciaCarreira,
  PlanoTreino,
  PlanoTreinoStatus,
  Player,
  RegistroDesenvolvimento,
  TabelaClassificacao,
} from '../types';
import {REPUTACAO_INICIAL} from '../engine/carreira/carreiraEngine';
import {sugerirCapitao} from '../engine/carreira/capitao';
import {comEstadoFisico} from '../engine/physical/fisicoEngine';
import {comAtributosCalibrados} from '../engine/progression/calibracaoAtributos';
import {comHabilidades} from '../engine/progression/habilidades';
import {comTipo} from '../engine/progression/tipoJogador';
import type {EstadoSerieDCarreira} from './serieDCarreira';
import type {ResumoSerieD} from './serieDSeason';
import {
  criarEstadoPatrocinioVazio,
  type EstadoPatrocinio,
} from '../types/patrocinio';
import type {TransferRecord} from '../types/world';
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
  // Mundo mestre (TODAS as divisões) — evolui a cada temporada. Sem persistir,
  // ao recarregar o app o mundo regride ao seed. Opcionais para ler saves que
  // ainda não os tinham (aditivo, sem bump de versão — apps antigos os ignoram).
  todosClubes?: Clube[];
  todosJogadores?: Player[];
  /** Histórico da Série D por temporada (aditivo; ausente em saves anteriores). */
  historicoSerieD?: ResumoSerieD[];
  /** Mata-mata da Série D em andamento (carreira na D). Aditivo. */
  serieDCarreira?: EstadoSerieDCarreira | null;
  /** Patrocínios do clube do usuário (propostas/contrato/histórico). Aditivo. */
  patrocinio?: EstadoPatrocinio;
  /** Histórico mundial de transferências (AD-09). Aditivo; vazio em saves antigos. */
  transferHistory?: TransferRecord[];
  // Épico Overall Dinâmico (Onda 1) — aditivos, sem bump de versão:
  /** Plano de treino recorrente do clube do usuário. */
  planoTreino?: PlanoTreino | null;
  /** Situação da configuração de treino (saves antigos → 'padrao_assistente'). */
  planoTreinoStatus?: PlanoTreinoStatus;
  /** Central de Pendências do clube. */
  pendencias?: PendenciaCarreira[];
  /** Ledger de desenvolvimento do elenco do usuário (tela Desenvolvimento). */
  ledgerDesenvolvimento?: RegistroDesenvolvimento[];
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
    todosClubes: state.todosClubes,
    todosJogadores: state.todosJogadores,
    historicoSerieD: state.historicoSerieD,
    serieDCarreira: state.serieDCarreira,
    patrocinio: state.patrocinio,
    transferHistory: state.transferHistory,
    planoTreino: state.planoTreino,
    planoTreinoStatus: state.planoTreinoStatus,
    pendencias: state.pendencias,
    ledgerDesenvolvimento: state.ledgerDesenvolvimento,
  };
}

/** Atribui um capitão padrão aos clubes sem um (saves anteriores ao capitão). */
function comCapitaoPadrao(clubes: Clube[], jogadores: Player[]): Clube[] {
  return clubes.map(clube =>
    clube.capitaoId
      ? clube
      : {
          ...clube,
          capitaoId:
            sugerirCapitao(
              jogadores.filter(jogador => jogador.clubeId === clube.id),
            ) ?? undefined,
        },
  );
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
    clubes: comCapitaoPadrao(snapshot.clubes, snapshot.jogadores),
    // Migração: calibra atributos ↔ overall (drift do épico Overall Dinâmico)
    // e deriva habilidades/tipo — tudo idempotente (no-op para quem já tem).
    jogadores: snapshot.jogadores
      .map(comAtributosCalibrados)
      .map(comHabilidades)
      .map(comTipo)
      .map(comEstadoFisico),
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
    historicoSerieD: snapshot.historicoSerieD ?? [],
    serieDCarreira: snapshot.serieDCarreira ?? null,
    // Patrocínios: ausente em saves anteriores → estado vazio (nada fabricado).
    patrocinio: snapshot.patrocinio ?? criarEstadoPatrocinioVazio(),
    transferHistory: snapshot.transferHistory ?? [],
    // Treino (épico Overall Dinâmico): save antigo já treinava no automático,
    // então o default honesto é 'padrao_assistente' — nunca fingir escolha do
    // usuário ('configurado_usuario' só quando ele configurar de fato).
    planoTreino: snapshot.planoTreino ?? null,
    planoTreinoStatus: snapshot.planoTreinoStatus ?? 'padrao_assistente',
    pendencias: snapshot.pendencias ?? [],
    ledgerDesenvolvimento: snapshot.ledgerDesenvolvimento ?? [],
    // Mundo mestre: restaura o evoluído quando presente. Ausente (save antigo),
    // OMITE — o estado inicial mantém o mundo completo do seed (não regride para
    // só a Série A). Aplica a migração de habilidades/tipo também aqui.
    ...(snapshot.todosClubes
      ? {
          todosClubes: comCapitaoPadrao(
            snapshot.todosClubes,
            snapshot.todosJogadores ?? snapshot.jogadores,
          ),
        }
      : {}),
    ...(snapshot.todosJogadores
      ? {
          todosJogadores: snapshot.todosJogadores
            .map(comAtributosCalibrados)
            .map(comHabilidades)
            .map(comTipo)
            .map(comEstadoFisico),
        }
      : {}),
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
  // Abrir/ler o save PODE lançar (SQLite indisponível, I/O, import dinâmico). Se
  // isso ficar fora do try, a exceção sobe e o boot (App.tsx) a engole, iniciando
  // como jogo novo SEM distinguir "sem save" de "load quebrado". Capturamos aqui e
  // devolvemos 'erro' tipado (nunca rejeita silencioso) — assim o boot loga e o
  // save NÃO é tratado como inexistente (evita apagá-lo por engano).
  let arm: ArmazenamentoSave;
  let principal: string | null;
  try {
    arm = await obterArmazenamento();
    principal = await arm.ler();
  } catch (erro) {
    return {tipo: 'erro', mensagem: `Falha ao abrir/ler o save: ${String(erro)}`};
  }
  if (!principal) {
    return {tipo: 'vazio'};
  }
  try {
    const {estado, conquistas} = decodificar(principal);
    return {tipo: 'ok', estado, conquistas, origem: 'principal'};
  } catch (erroPrincipal) {
    let backup: string | null = null;
    try {
      backup = await arm.lerBackup();
    } catch {
      backup = null;
    }
    if (backup) {
      try {
        const {estado, conquistas} = decodificar(backup);
        return {tipo: 'ok', estado, conquistas, origem: 'backup'};
      } catch {
        // backup também ilegível — cai no erro abaixo.
      }
    }
    // Diagnóstico rico: o erro REAL do decode + tamanho e início do JSON. Se o JSON
    // estiver truncado (não termina em '}') ou for enorme, é problema de gravação de
    // string grande; se for SyntaxError com posição, é JSON malformado.
    const fim = principal.slice(-30);
    return {
      tipo: 'erro',
      mensagem:
        `Save corrompido e sem backup recuperável. Detalhe: ${String(
          erroPrincipal,
        )} · tamanho=${principal.length} · início="${principal.slice(
          0,
          30,
        )}" · fim="${fim}"`,
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
