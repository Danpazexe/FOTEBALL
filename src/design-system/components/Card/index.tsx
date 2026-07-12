/**
 * Card — superfície do design system. Variantes plain/outlined/elevated/
 * interactive/status. Sem card-dentro-de-card nem glow. Cor por token.
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
  style?: StyleProp<ViewStyle>;
};

export function Card({
  children,
  variante = 'plain',
  onPress,
  status = 'brand',
  padding = 4,
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
    variante === 'status'
      ? {borderWidth: 1, borderColor: cores.border}
      : null,
    variante === 'elevated' ? elevacao.nivel1 : null,
    variante === 'status'
      ? {borderLeftWidth: 3, borderLeftColor: cores[status]}
      : null,
    style,
  ];

  if (variante === 'interactive' && onPress) {
    return (
      <Pressable onPress={onPress} style={composto}>
        {children}
      </Pressable>
    );
  }
  return <View style={composto}>{children}</View>;
}
