/**
 * Geometria do campo (pura, sem RNG) compartilhada pela engine de simulação:
 * mapeamento posição→corredor e clamp de coordenada normalizada. Um único lugar
 * para as regras que traduzem posição/coordenada em espaço do campo.
 */
import type {Position} from '../../types';

/** Corredor do campo pela posição natural: 0=esquerda, 1=centro, 2=direita. */
export function corredorDaPosicao(posicao: Position | undefined): 0 | 1 | 2 {
  if (posicao === 'LE' || posicao === 'PE') {
    return 0;
  }
  if (posicao === 'LD' || posicao === 'PD') {
    return 2;
  }
  return 1;
}

/** Limita uma coordenada normalizada ao intervalo [0, 1]. */
export function limitar01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/**
 * Posição na BALIZA (0..1) da cobrança de pênalti, a partir da direção (E/C/D)
 * e altura (Alta/Baixa) sorteadas no lance. Fonte única do mapeamento — usada
 * pelo ledger de chutes (matchSimulator) e pela derivação do mapa de
 * finalizações (com jitter aplicado pelo chamador).
 */
export function balizaDoPenalti(penaltiData: {
  direcaoChute: 'E' | 'C' | 'D';
  alturaChute: 'A' | 'B';
}): {golX: number; golY: number} {
  return {
    golX:
      penaltiData.direcaoChute === 'E'
        ? 0.24
        : penaltiData.direcaoChute === 'D'
          ? 0.76
          : 0.5,
    golY: penaltiData.alturaChute === 'A' ? 0.68 : 0.24,
  };
}
