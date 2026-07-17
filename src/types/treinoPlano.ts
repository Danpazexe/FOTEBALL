/**
 * CONTRATOS DO PLANO DE TREINO RECORRENTE (épico Overall Dinâmico, Onda 1).
 *
 * Corrige a raiz de H2/H3/H4: hoje a escolha de treino vive em `useState` da
 * tela (reseta a cada abertura) e o fallback automático treina 'hab_fisico'
 * leve em silêncio. O plano passa a ser estado de DOMÍNIO persistido, com
 * status explícito — o jogo nunca apresenta um plano como escolha do usuário
 * quando ele não escolheu (RF-08).
 */

/** Intensidade de uma sessão — fonte única (a engine re-exporta este tipo). */
export type IntensidadeTreino = 'leve' | 'normal' | 'forte' | 'muito_forte';

/**
 * Situação da CONFIGURAÇÃO de treino do clube do usuário:
 * - `nao_configurado`: carreira nova, ninguém escolheu nada (gera pendência);
 * - `padrao_assistente`: plano provisório seguro aplicado pelo auxiliar
 *   (inclui saves antigos, que já treinavam no automático);
 * - `configurado_usuario`: o usuário montou/aceitou um plano.
 */
export type PlanoTreinoStatus =
  | 'nao_configurado'
  | 'padrao_assistente'
  | 'configurado_usuario';

/** Uma sessão agendada num dia do plano. `treinoId` vem do catálogo da engine. */
export interface SessaoPlanoTreino {
  treinoId: string;
  intensidade: IntensidadeTreino;
}

/**
 * Uma semana-modelo do plano: 7 slots (índice 0 = segunda … 6 = domingo).
 * `null` = descanso/folga naquele dia. Dias de PARTIDA são sempre respeitados
 * pelo executor quando `autoAjustePartidas` está ligado (a sessão do dia vira
 * recuperação leve, sem apagar o plano).
 */
export interface SemanaPlanoTreino {
  dias: (SessaoPlanoTreino | null)[];
}

export type RecorrenciaPlanoTreino =
  | {tipo: 'semanal'}
  | {tipo: 'ciclo'; semanas: number}
  | {tipo: 'ate_data'; dataFim: string};

/**
 * Plano de treino recorrente do clube. Continua ativo até ser alterado,
 * pausado, substituído ou atingir a data final — nunca "esquece" sozinho.
 */
export interface PlanoTreino {
  id: string;
  clubeId: string;
  nome: string;
  status: 'ativo' | 'pausado';
  recorrencia: RecorrenciaPlanoTreino;
  /** Semanas-modelo aplicadas em sequência (ciclo reinicia ao terminar). */
  semanas: SemanaPlanoTreino[];
  /** Ajusta sessões automaticamente em semanas com jogos (pré/pós-jogo leve). */
  autoAjustePartidas: boolean;
  criadoPor: 'usuario' | 'assistente' | 'ia_clube';
  /** Data ISO da carreira em que o plano foi criado. */
  criadoEm: string;
}
