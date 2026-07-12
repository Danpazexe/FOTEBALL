/**
 * Raios de canto (briefing §7.2). PURO. Mais fechado que o tema antigo — em
 * listas densas nem tudo precisa parecer sabonete.
 */
export const raios = {
  /** Badge pequeno. */
  xs: 6,
  /** Chip, item compacto. */
  sm: 8,
  /** Input, botão, card padrão. */
  md: 12,
  /** Card de destaque e sheet. */
  lg: 16,
  /** Hero ou modal especial. */
  xl: 24,
  /** Pill / avatar. */
  full: 999,
} as const;

export type ChaveRaio = keyof typeof raios;
