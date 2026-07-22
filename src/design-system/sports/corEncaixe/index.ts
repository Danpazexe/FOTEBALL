/**
 * corEncaixe — FONTE ÚNICA da cor do encaixe posicional (nível de adaptação
 * calculado pela engine: natural/similar/adaptado/improvisado).
 *
 * Substitui o `corAdaptacao` do tema antigo. Decisão de produto: "natural" é o
 * caso COMUM da escalação e não ganha cor de destaque ("o acento é raro") —
 * devolve null e o consumidor aplica o neutro local (borda/texto secundário).
 * Só os desvios sinalizam: similar→info · adaptado→warning · improvisado→danger.
 * Verde ficou de fora de propósito (colidia com o verde de condição física
 * exibido ao lado); brand/azul idem (é o anel de "selecionado" nas mesmas
 * fichas). A cor nunca é o único sinal: os consumidores mantêm rótulo/%.
 * Função pura: sem React, sem hooks, sem estado.
 */
import type {NivelAdaptacao} from '../../../engine/tactics/adaptacao';
import type {CoresSemanticas} from '../../tokens/colors';

/** Cor (hex do tema ativo) do encaixe, ou null quando 'natural' (neutro). */
export function corEncaixe(
  nivel: NivelAdaptacao,
  cores: CoresSemanticas,
): string | null {
  switch (nivel) {
    case 'natural':
      return null;
    case 'similar':
      return cores.info;
    case 'adaptado':
      return cores.warning;
    case 'improvisado':
      return cores.danger;
  }
}
