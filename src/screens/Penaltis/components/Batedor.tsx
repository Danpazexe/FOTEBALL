/**
 * Batedor (placeholder) — figura do cobrador ao lado da bola no ponto de
 * pênalti. `chutando` (0→1) dá o "baque" do chute; sem lógica de jogo aqui.
 */
import React from 'react';
import {StyleSheet} from 'react-native';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import {cores} from '../../../theme';

type Props = {
  /** Centro X (px) do batedor. */
  x: number;
  /** Base Y (px) — os pés do batedor. */
  y: number;
  /** Largura da figura. */
  tamanho: number;
  /** 0 = parado, 1 = no instante do chute (dá um leve avanço/inclinação). */
  chutando: SharedValue<number>;
};

function Batedor({x, y, tamanho, chutando}: Props): React.JSX.Element {
  const largura = tamanho;
  const altura = tamanho * 1.9;
  const estilo = useAnimatedStyle(() => ({
    transform: [
      {translateX: x - largura / 2 + chutando.value * largura * 0.3},
      {translateY: y - altura},
      {rotateZ: `${chutando.value * 10}deg`},
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
            width: largura * 0.6,
            height: largura * 0.6,
            borderRadius: largura * 0.3,
            top: -largura * 0.32,
          },
        ]}
      />
    </Animated.View>
  );
}

export default Batedor;

const styles = StyleSheet.create({
  corpo: {
    alignItems: 'center',
    backgroundColor: cores.primaria,
    left: 0,
    position: 'absolute',
    top: 0,
  },
  cabeca: {
    backgroundColor: cores.primariaClara,
    position: 'absolute',
  },
});
