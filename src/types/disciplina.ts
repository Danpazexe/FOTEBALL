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

/**
 * Regra de disciplina CONFIGURÁVEL por competição — o futebol não tem regra
 * universal; cada torneio define a sua. `amarelosParaSuspensao` = limiar de
 * amarelos avulsos (em jogos diferentes) para 1 gancho; `jogosSuspensao` =
 * jogos cumpridos por gancho. Ao gerar o gancho, o acúmulo zera.
 */
export interface RegraDisciplina {
  amarelosParaSuspensao: number;
  jogosSuspensao: number;
}

/** Padrão brasileiro (Séries A/B/C/D e Copa do Brasil): 3 amarelos = 1 jogo. */
export const REGRA_DISCIPLINA_PADRAO: RegraDisciplina = {
  amarelosParaSuspensao: 3,
  jogosSuspensao: 1,
};

/**
 * Overrides por competição (id do registry). Vazio = todas seguem o padrão.
 * Ex. futuro: Champions/Libertadores/Copa do Mundo com limiares e limpezas
 * próprias entram aqui, sem tocar no motor.
 */
export const REGRAS_DISCIPLINA: Record<string, RegraDisciplina> = {};

/** Regra de disciplina vigente da competição (ou o padrão brasileiro). */
export function regraDisciplina(competicaoId: string): RegraDisciplina {
  return REGRAS_DISCIPLINA[competicaoId] ?? REGRA_DISCIPLINA_PADRAO;
}

/** @deprecated Use `regraDisciplina(competicaoId).amarelosParaSuspensao`. */
export const LIMIAR_AMARELOS_SUSPENSAO =
  REGRA_DISCIPLINA_PADRAO.amarelosParaSuspensao;

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
