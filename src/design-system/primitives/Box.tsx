/**
 * Box — View com espaçamento/superfície/raio por token. Reduz o StyleSheet
 * boilerplate de layout e garante que fundo/borda venham do tema.
 */
import React from 'react';
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

import {espacamento, raios, type ChaveEspaco, type ChaveRaio} from '../tokens';
import type {CoresSemanticas} from '../tokens/colors';
import {useTheme} from '../themes/useTheme';

type Props = Omit<ViewProps, 'style'> & {
  padding?: ChaveEspaco;
  px?: ChaveEspaco;
  py?: ChaveEspaco;
  gap?: ChaveEspaco;
  bg?: keyof CoresSemanticas;
  radius?: ChaveRaio;
  /** Aplica borda com a cor `border` do tema. */
  bordered?: boolean;
  direction?: ViewStyle['flexDirection'];
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  flex?: number;
  style?: StyleProp<ViewStyle>;
};

export function Box({
  padding,
  px,
  py,
  gap,
  bg,
  radius,
  bordered,
  direction,
  align,
  justify,
  flex,
  style,
  ...rest
}: Props): React.JSX.Element {
  const {cores} = useTheme();
  return (
    <View
      {...rest}
      style={[
        padding !== undefined ? {padding: espacamento[padding]} : null,
        px !== undefined ? {paddingHorizontal: espacamento[px]} : null,
        py !== undefined ? {paddingVertical: espacamento[py]} : null,
        gap !== undefined ? {gap: espacamento[gap]} : null,
        bg ? {backgroundColor: cores[bg]} : null,
        radius !== undefined ? {borderRadius: raios[radius]} : null,
        bordered ? [estilos.bordered, {borderColor: cores.border}] : null,
        direction ? {flexDirection: direction} : null,
        align ? {alignItems: align} : null,
        justify ? {justifyContent: justify} : null,
        flex !== undefined ? {flex} : null,
        style,
      ]}
    />
  );
}

const estilos = StyleSheet.create({
  bordered: {borderWidth: 1},
});
