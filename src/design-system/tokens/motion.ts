/**
 * Movimento (briefing §9.1). A animação deve EXPLICAR mudança de estado, não
 * decorar. Respeitar "reduzir movimento" do sistema. PURO (durações em ms).
 */
export const duracao = {
  /** Toque/press. */
  press: 120,
  /** Entrada de card/elemento. */
  entrada: 200,
  /** Sheet/modal. */
  sheet: 280,
} as const;

/** Escala aplicada quando "reduzir movimento" está ativo (quase instantâneo). */
export const escalaReduzida = 0.01;

export type ChaveDuracao = keyof typeof duracao;
