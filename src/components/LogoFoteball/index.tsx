/**
 * Emblema da marca FOTEBALL: um disco escuro com anel em degradê verde (brilho)
 * e o monograma "F". Tamanho fixo para manter os estilos estáticos (sem estilo
 * inline). Usado na tela inicial e na tela de carregamento.
 */
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Svg, {Circle, Defs, LinearGradient, Stop} from 'react-native-svg';

import {cores, sombra} from '../../theme';

const TAMANHO = 108;

function LogoFoteball(): React.JSX.Element {
  return (
    <View style={styles.wrap}>
      <Svg width={TAMANHO} height={TAMANHO}>
        <Defs>
          <LinearGradient id="ftAnel" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={cores.primariaClara} />
            <Stop offset="1" stopColor={cores.primariaEscura} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={TAMANHO / 2}
          cy={TAMANHO / 2}
          r={TAMANHO / 2 - 7}
          fill={cores.superficie}
          stroke="url(#ftAnel)"
          strokeWidth={4}
        />
        <Circle
          cx={TAMANHO / 2}
          cy={TAMANHO / 2}
          r={TAMANHO / 2 - 13}
          fill="none"
          stroke={cores.borda}
          strokeWidth={1}
        />
      </Svg>
      <View style={styles.centro} pointerEvents="none">
        <Text style={styles.letra}>F</Text>
      </View>
    </View>
  );
}

export default LogoFoteball;

const styles = StyleSheet.create({
  wrap: {
    width: TAMANHO,
    height: TAMANHO,
    alignItems: 'center',
    justifyContent: 'center',
    ...sombra.glow,
  },
  centro: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  letra: {
    color: cores.primaria,
    fontSize: 54,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
