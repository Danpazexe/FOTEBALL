/**
 * CONTRATOS DO DESENVOLVIMENTO (épico Overall Dinâmico, Onda 1 — P0).
 *
 * Fonte da verdade da cadeia: atributos → força por posição → Overall Base →
 * estado do atleta → atributos efetivos → Overall de Partida. O overall é um
 * RESUMO; nunca a causa. Nenhuma mudança relevante acontece sem um código de
 * motivo (`MotivoDesenvolvimento`) — é o que permite explicar ao usuário por
 * que um jogador subiu ou caiu.
 *
 * P0 usa os 12 atributos existentes (`PlayerAttributes`); a categorização por
 * grupo (físico/técnico/mental/goleiro) habilita curvas de idade e
 * modificadores de partida POR CATEGORIA sem expandir o conjunto agora.
 */
import type {AtributoChave} from './player';

/** Grupo de um atributo — curvas de idade e modificadores agem por grupo. */
export type CategoriaAtributo = 'fisico' | 'tecnico' | 'mental' | 'goleiro';

/**
 * Código de motivo de TODA mudança relevante de desenvolvimento (PR-05,
 * explicabilidade). A UI traduz para texto; a engine só emite códigos.
 */
export type MotivoDesenvolvimento =
  | 'HIGH_TRAINING_PERFORMANCE'
  | 'LOW_MATCH_MINUTES'
  | 'AGE_CURVE_GROWTH'
  | 'AGE_CURVE_DECLINE'
  | 'SERIOUS_INJURY_REGRESSION'
  | 'GOOD_RECENT_FORM'
  | 'LOW_MORALE'
  | 'TACTICAL_FAMILIARITY'
  | 'MATCH_CONGESTION'
  | 'INSUFFICIENT_RECOVERY'
  | 'TRAINING_FOCUS'
  | 'LOAN_DEVELOPMENT'
  | 'MIGRATION';

/**
 * Os 4 pilares do Overall Base (40/25/20/15). Cada pilar já na escala 1–99;
 * a composição e os pesos vivem na engine de ratings (Onda 2).
 */
export interface PilaresRating {
  /** Nota técnica: média ponderada dos atributos pelo perfil da posição. */
  tecnica: number;
  /** Desempenho da temporada (notas/minutos, com regressão à média). */
  temporada: number;
  /** Estatísticas avançadas em percentis por posição. */
  avancadas: number;
  /** Valor de mercado normalizado (log + percentil na coorte). */
  mercado: number;
}

/** Rating derivado de um jogador — sempre recalculável, nunca editado à mão. */
export interface RatingJogador {
  overallBase: number;
  pilares: PilaresRating;
  /** Confiança da avaliação 0–1 (amostra de minutos/dados), não qualidade. */
  confianca: number;
}

/**
 * Estado físico NOVO do atleta (Onda 5 popula; Onda 1 só contrata). Convive
 * com os campos legados sem duplicá-los: `condicaoFisica` segue sendo a
 * condição (0–100) e `forma` segue sendo a fase técnica; aqui entram os
 * conceitos que hoje NÃO existem. Prontidão e risco de lesão são DERIVAÇÕES
 * (funções na engine), nunca campos persistidos.
 */
export interface EstadoFisicoJogador {
  /** Esforço recente acumulado (0–100): minutos + treino dos últimos ciclos. */
  cargaAguda: number;
  /** Preparação acumulada (0–100): base construída ao longo da temporada. */
  cargaCronica: number;
  /** Ritmo competitivo (0–100) — separado de condição: descansado ≠ em ritmo. */
  ritmo: number;
}

/**
 * Registro do ledger de desenvolvimento (H10): toda mudança de atributo,
 * overall ou potencial vira um registro explicável. Persistido com TETO por
 * jogador + agregados por temporada (padrão `transferHistory`) para o save
 * não crescer sem poda.
 */
export interface RegistroDesenvolvimento {
  id: string;
  playerId: string;
  /** Data ISO (YYYY-MM-DD) do jogo/carreira em que a mudança ocorreu. */
  data: string;
  origem:
    | 'treino'
    | 'partida'
    | 'curva_idade'
    | 'lesao'
    | 'recuperacao'
    | 'emprestimo'
    | 'migracao';
  /** Delta de pontos INTEIROS por atributo (só os que mudaram). */
  atributosDelta: Partial<Record<AtributoChave, number>>;
  overallAntes: number;
  overallDepois: number;
  motivos: MotivoDesenvolvimento[];
}
