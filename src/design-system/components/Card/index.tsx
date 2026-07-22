/**
 * Card — superfície do design system, estilo cartaz (v3): moldura dura 2px na
 * tinta (`borderStrong`) nas variantes com borda e sombra deslocada sólida na
 * variante elevated. Variantes plain/outlined/elevated/interactive/status.
 * Sem card-dentro-de-card nem glow. Cor por token.
 */
import React from 'react';
import {View, type StyleProp, type ViewStyle} from 'react-native';

import {Pressable} from '../../primitives/Pressable';
import {elevacao, espacamento, raios, type ChaveEspaco} from '../../tokens';
import type {CoresSemanticas} from '../../tokens/colors';
import {useTheme} from '../../themes/useTheme';

type Variante = 'plain' | 'outlined' | 'elevated' | 'interactive' | 'status';
type TomStatus = keyof CoresSemanticas;

type Props = {
  children: React.ReactNode;
  variante?: Variante;
  onPress?: () => void;
  /** Cor do filete à esquerda na variante 'status'. */
  status?: TomStatus;
  padding?: ChaveEspaco;
  /** Rótulo acessível quando interativo (senão o leitor lê o conteúdo). */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function Card({
  children,
  variante = 'plain',
  onPress,
  status = 'brand',
  padding = 4,
  accessibilityLabel,
  style,
}: Props): React.JSX.Element {
  const {cores} = useTheme();
  const composto: StyleProp<ViewStyle> = [
    {
      backgroundColor: cores.surface,
      borderRadius: raios.lg,
      padding: espacamento[padding],
    },
    variante === 'outlined' ||
    variante === 'interactive' ||
    variante === 'status' ||
    variante === 'elevated'
      ? {borderWidth: 2, borderColor: cores.borderStrong}
      : null,
    variante === 'elevated' ? elevacao.dura : null,
    variante === 'status'
      ? {borderLeftWidth: 4, borderLeftColor: cores[status]}
      : null,
    style,
  ];

  if (variante === 'interactive' && onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        style={composto}>
        {children}
      </Pressable>
    );
  }
  return <View style={composto}>{children}</View>;
}
