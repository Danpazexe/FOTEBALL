/**
 * Goleiro (placeholder) da disputa de pênaltis. Posição controlada por shared
 * values (centro em px dentro do gol) — o `AlvoGol` anima o mergulho para onde a
 * engine decidiu. Sem lógica de jogo aqui: é só a figura.
 */
import React from 'react';
import {StyleSheet} from 'react-native';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import {cores} from '../../../theme';

type Props = {
  /** Centro X (px) do goleiro dentro do gol. */
  x: SharedValue<number>;
  /** Centro Y (px) do goleiro dentro do gol. */
  y: SharedValue<number>;
  /** Largura da figura (a altura deriva dela). */
  tamanho: number;
};

function Goleiro({x, y, tamanho}: Props): React.JSX.Element {
  const largura = tamanho;
  const altura = tamanho * 1.8;
  const estilo = useAnimatedStyle(() => ({
    transform: [
      {translateX: x.value - largura / 2},
      {translateY: y.value - altura / 2},
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.corpo,
        {width: largura, height: altura, borderRadius: largura / 2},
        estilo,
      ]}>
      <Animated.View
        style={[
          styles.cabeca,
          {
            width: largura * 0.62,
            height: largura * 0.62,
            borderRadius: largura * 0.31,
            top: -largura * 0.34,
          },
        ]}
      />
    </Animated.View>
  );
}

export default Goleiro;

const styles = StyleSheet.create({
  corpo: {
    alignItems: 'center',
    backgroundColor: cores.secundaria,
    left: 0,
    position: 'absolute',
    top: 0,
  },
  cabeca: {
    backgroundColor: cores.secundariaClara,
    position: 'absolute',
  },
});
