/**
 * Bola — sprite (PNG) da bola do doodle. O AlvoGol a posiciona/escala via
 * Animated.View (voo até o gol, encolhendo pela perspectiva).
 */
import React from 'react';
import {Image} from 'react-native';

const FONTE = require('../assets/bola.png');

function Bola({tamanho}: {tamanho: number}): React.JSX.Element {
  return (
    <Image
      source={FONTE}
      style={{width: tamanho, height: tamanho}}
      resizeMode="contain"
    />
  );
}

export default Bola;
