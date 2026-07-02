/**
 * Fundo em degradê "azul-noite" com um brilho verde sutil no topo (luzes de
 * estádio). Camada absoluta e sem captura de toque — fica ATRÁS do conteúdo das
 * telas. Usa react-native-svg (já é dependência do app). Identidade premium do
 * FOTEBALL sem custo de layout para o conteúdo por cima.
 */
import React from 'react';
import {StyleSheet, useWindowDimensions, View} from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import {cores, gradientes} from '../../theme';

function GradienteFundo(): React.JSX.Element {
  const {width, height} = useWindowDimensions();

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="ftFundo" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={gradientes.fundo[0]} />
            <Stop offset="0.5" stopColor={gradientes.fundo[1]} />
            <Stop offset="1" stopColor={gradientes.fundo[2]} />
          </LinearGradient>
          <RadialGradient id="ftBrilho" cx="50%" cy="-2%" rx="80%" ry="42%">
            <Stop offset="0" stopColor={cores.primaria} stopOpacity="0.08" />
            <Stop offset="1" stopColor={cores.primaria} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="url(#ftFundo)" />
        <Rect x="0" y="0" width={width} height={height} fill="url(#ftBrilho)" />
      </Svg>
    </View>
  );
}

export default GradienteFundo;
