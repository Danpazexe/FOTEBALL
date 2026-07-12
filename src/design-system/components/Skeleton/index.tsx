/**
 * Skeleton — placeholder de carregamento (bloco em superfície sutil). Estático
 * neste primeiro passo; pulso via Reanimated pode entrar depois. Cor por token.
 */
import React from 'react';
import {
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import {raios, type ChaveRaio} from '../../tokens';
import {useTheme} from '../../themes/useTheme';

type Props = {
  width?: DimensionValue;
  height?: number;
  radius?: ChaveRaio;
  style?: StyleProp<ViewStyle>;
};

export function Skeleton({
  width = '100%',
  height = 16,
  radius = 'sm',
  style,
}: Props): React.JSX.Element {
  const {cores} = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[
        {
          width,
          height,
          borderRadius: raios[radius],
          backgroundColor: cores.surfaceSubtle,
        },
        style,
      ]}
    />
  );
}
