/**
 * Raios de canto — cartaz de arquibancada (v3): cantos QUASE RETOS. O cartaz é
 * papel cortado, não sabonete; a curva existe só para não serrilhar. PURO.
 */
export const raios = {
  /** Badge pequeno. */
  xs: 2,
  /** Chip, item compacto. */
  sm: 3,
  /** Input, botão, card padrão. */
  md: 5,
  /** Card de destaque e sheet. */
  lg: 8,
  /** Hero ou modal especial. */
  xl: 12,
  /** Pill / avatar. */
  full: 999,
} as const;

export type ChaveRaio = keyof typeof raios;
