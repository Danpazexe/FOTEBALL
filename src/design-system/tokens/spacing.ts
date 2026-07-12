/**
 * Escala de espaçamento — grid de 4 pontos (briefing §7.1). PURO.
 *
 * Chaves numéricas = múltiplos do passo de 4 px (`espacamento[4] === 16`).
 * `margemTela` é a margem horizontal padrão da tela (16 compacto / 20 largo).
 */
export const espacamento = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;

export type ChaveEspaco = keyof typeof espacamento;

/** Margem horizontal padrão da tela por largura. */
export const margemTela = {
  compacto: 16,
  largo: 20,
} as const;
