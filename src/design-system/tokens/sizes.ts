/**
 * Tamanhos de interação e ícone (briefing §7/§17). Touch target mínimo 44,
 * preferencial 48. PURO.
 */
export const tamanhos = {
  /** Alvo de toque acessível. */
  toque: {min: 44, confortavel: 48},
  /** Tamanhos de ícone (grade 24 base). */
  icone: {sm: 16, md: 20, lg: 24, xl: 28},
  /** Altura mínima de botão por tamanho. */
  botao: {sm: 36, md: 44, lg: 52},
  /** Altura de linha de lista. */
  linha: {compacta: 44, padrao: 56},
} as const;

export type TamanhoIcone = keyof typeof tamanhos.icone;
