/**
 * ProgressBar — barra fina de progresso (condição física, uso salarial, força).
 * Trilho `surfaceSubtle` + preenchimento na cor informada (default `brand`). A
 * cor vem SEMPRE de token (via prop), nunca hex literal na tela.
 */
import React from 'react';
import {StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';

import {raios} from '../tokens';
import {useTheme} from '../themes/useTheme';

type Props = {
  /** 0–100. */
  valor: number;
  /** Cor do preenchimento (valor de token, ex.: `esporte.fitness.high`). */
  cor?: string;
  altura?: number;
  style?: StyleProp<ViewStyle>;
};

export function ProgressBar({
  valor,
  cor,
  altura = 6,
  style,
}: Props): React.JSX.Element {
  const {cores} = useTheme();
  const pct = Math.max(0, Math.min(100, valor));
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[
        estilos.trilho,
        {height: altura, backgroundColor: cores.surfaceSubtle},
        style,
      ]}>
      <View
        style={[
          estilos.preenchimento,
          {width: `${pct}%`, backgroundColor: cor ?? cores.brand},
        ]}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  trilho: {
    borderRadius: raios.full,
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  preenchimento: {height: '100%', borderRadius: raios.full},
});
