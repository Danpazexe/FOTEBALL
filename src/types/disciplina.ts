/**
 * Disciplina POR COMPETIÇÃO (regras de cartões/suspensão do projeto, refs 03/04/06).
 * Cada torneio tem histórico próprio: cartões da Série A não contaminam a Copa.
 * A lesão continua em DIAS (motor físico da Onda 5) — aqui só entra a suspensão
 * por cartão. `partidasRestantesLesao` é uma leitura por-partida derivada, mantida
 * por compatibilidade com o contrato dos refs.
 */

/** Sentinela para suspensões LEGADAS (save antigo, sem competição conhecida):
 * valem em qualquer competição, preservando o comportamento global anterior. */
export const COMPETICAO_LEGADO = '__legado__';

/** Ao completar 2 amarelos acumulados numa competição → 1 jogo de suspensão. */
export const LIMIAR_AMARELOS_SUSPENSAO = 2;

export interface DisciplinaPorCompeticao {
  /** Chave canônica da competição (id do registry). */
  competicaoId: string;
  /** Amarelos acumulados rumo ao gancho (0..1; zera ao gerar a suspensão). */
  amarelosAcumulados: number;
  /** Jogos de suspensão restantes NAQUELA competição (>0 = inelegível nela). */
  partidasRestantesSuspensao: number;
}

export interface DisponibilidadeJogador {
  /** Jogos restantes de lesão (derivado; a lesão real anda em dias no motor físico). */
  partidasRestantesLesao: number;
  /** Uma entrada por competição em que o jogador tem histórico disciplinar. */
  disciplinas: DisciplinaPorCompeticao[];
}
