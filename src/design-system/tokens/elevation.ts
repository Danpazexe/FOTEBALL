/**
 * Elevação (briefing §7.3). No claro, preferir borda/diferença de superfície
 * ANTES de sombra; sombra só em header fixo, bottom bar, menu, sheet e modal.
 * Glow NÃO é elevação comum (reservado a gol/conquista/CTA momentâneo).
 *
 * Import de TIPO apenas (apagado em build) — não puxa runtime de RN.
 */
import type {ViewStyle} from 'react-native';

type EstiloElevacao = Pick<
  ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'
>;

export const elevacao: Record<'nivel0' | 'nivel1' | 'nivel2', EstiloElevacao> = {
  /** Plano — sem sombra. */
  nivel0: {
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  /** Sombra mínima — header fixo, bottom bar. */
  nivel1: {
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  /** Menu, sheet, modal. */
  nivel2: {
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
};
