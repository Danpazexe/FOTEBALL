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
