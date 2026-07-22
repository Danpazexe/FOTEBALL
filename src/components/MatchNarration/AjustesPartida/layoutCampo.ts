/**
 * Geometria do campo do painel: projeção dos titulares para coordenadas de
 * tela e detecção do slot mais próximo do dedo. Funções puras — as medidas
 * entram por parâmetro (o chamador usa as constantes de `constantes.ts`).
 */
import {coordenadaDoTitular} from '../../../engine/tactics/geometria';
import type {Formacao} from '../../../types';
import type {SlotPos} from './tipos';

export type MedidasCampo = {
  largura: number;
  altura: number;
  padTopo: number;
  padBase: number;
};

/**
 * Posição de tela de cada titular. Usa a MESMA fonte do DraggablePitch
 * (`coordenadaDoTitular` → x/y explícitos ou coordenada padrão da posição), de
 * modo que a escalação apareça IDÊNTICA aqui e na tela de tática/pré-jogo.
 * Convenção: y 0..1 (defesa→ataque); na tela o ataque fica em cima, por isso
 * `(1 - y)`.
 */
export function posicoesDosSlots(
  formacao: Formacao,
  medidas: MedidasCampo,
): SlotPos[] {
  const banda = medidas.altura - medidas.padTopo - medidas.padBase;
  return formacao.titulares.map((titular, slotIndex) => {
    const {x, y} = coordenadaDoTitular(titular);
    return {
      slotIndex,
      x: x * medidas.largura,
      // y invertido (ataque em cima) e comprimido na banda com margens, para
      // os rótulos caberem dentro do gramado.
      y: medidas.padTopo + (1 - y) * banda,
      posicao: titular.posicao,
    };
  });
}

/**
 * Slot mais próximo do ponto solto (coordenadas absolutas de tela), dentro do
 * limiar de drop. `origem` é o canto do campo medido via measureInWindow;
 * (0,0) = ainda não medido: não tenta soltar (evita comparar com o canto da
 * tela).
 */
export function slotMaisProximo(
  slots: SlotPos[],
  origem: {x: number; y: number},
  ax: number,
  ay: number,
  limiar: number,
): number | null {
  if (origem.x === 0 && origem.y === 0) {
    return null;
  }
  let melhor: number | null = null;
  let melhorDist = limiar;
  for (const slot of slots) {
    const cx = origem.x + slot.x;
    const cy = origem.y + slot.y;
    const dist = Math.sqrt((ax - cx) ** 2 + (ay - cy) ** 2);
    if (dist < melhorDist) {
      melhorDist = dist;
      melhor = slot.slotIndex;
    }
  }
  return melhor;
}
