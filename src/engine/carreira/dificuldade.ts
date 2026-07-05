/**
 * Níveis de dificuldade — eixo DIRETORIA (cobrança). Puro e determinístico: cada
 * nível ajusta o quão exigente é a meta contratada e o tamanho da punição de
 * reputação por não cumpri-la. NÃO toca no balanceamento de partida (regra do
 * CLAUDE.md: nunca tunar o placar "no escuro"); mexe só na paciência da diretoria.
 */

export type Dificuldade = 'Fácil' | 'Normal' | 'Difícil' | 'Lendário';

export const DIFICULDADES: readonly Dificuldade[] = [
  'Fácil',
  'Normal',
  'Difícil',
  'Lendário',
];

export interface ModificadoresDificuldade {
  /** Deslocamento da posição-alvo da meta (negativo = mais exigente). */
  ajusteMetaPosicao: number;
  /** Multiplicador da PENALIDADE de reputação por falhar a meta (recompensa não muda). */
  fatorPenalidadeMeta: number;
}

/** Modificadores da diretoria por nível de dificuldade. */
export function modificadoresDificuldade(
  dificuldade: Dificuldade,
): ModificadoresDificuldade {
  switch (dificuldade) {
    case 'Fácil':
      return {ajusteMetaPosicao: 3, fatorPenalidadeMeta: 0.5};
    case 'Difícil':
      return {ajusteMetaPosicao: -2, fatorPenalidadeMeta: 1.5};
    case 'Lendário':
      return {ajusteMetaPosicao: -4, fatorPenalidadeMeta: 2};
    case 'Normal':
    default:
      return {ajusteMetaPosicao: 0, fatorPenalidadeMeta: 1};
  }
}
