/**
 * Elevação — cartaz de arquibancada (v3): sombra DURA de serigrafia (offset
 * sólido na cor da tinta, SEM blur → `shadowOpacity: 1` + `shadowRadius: 0`).
 * No Android `elevation` não faz sombra dura; fica baixa só para dar leve
 * profundidade (limite aceito da plataforma). Glow NÃO é elevação comum.
 *
 * Import de TIPO apenas (apagado em build) — não puxa runtime de RN.
 */
import type {ViewStyle} from 'react-native';

type EstiloElevacao = Pick<
  ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'
>;

const TINTA = '#141414';

export const elevacao: Record<
  'nivel0' | 'nivel1' | 'nivel2' | 'dura',
  EstiloElevacao
> = {
  /** Plano — sem sombra. */
  nivel0: {
    shadowColor: TINTA,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  /** Filete sólido sob header fixo e bottom bar (linha de cartaz). */
  nivel1: {
    shadowColor: TINTA,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  /** Menu, sheet, modal — bloco deslocado. */
  nivel2: {
    shadowColor: TINTA,
    shadowOffset: {width: 4, height: 4},
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  /** Sombra de cartaz de botão/card de destaque — offset diagonal sólido. */
  dura: {
    shadowColor: TINTA,
    shadowOffset: {width: 3, height: 3},
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
};
