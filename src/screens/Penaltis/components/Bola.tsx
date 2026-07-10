/**
 * Bola — sprite do doodle (frame único, estático). O GIRO no ar e o voo em arco
 * vêm do reanimated no AlvoGol (rotate + translate/scale), NÃO de troca de frame
 * por setState: no Android+Fabric, re-renderizar o frame durante a animação
 * sobrescrevia o transform animado (a bola "teleportava" pro gol). Sem estado
 * aqui, a trajetória anima limpa.
 */
import React from 'react';
import {Image} from 'react-native';

const BOLA = require('../assets/ball_0.png');

function Bola({tamanho}: {tamanho: number}): React.JSX.Element {
  return (
    <Image
      source={BOLA}
      // Sem fade do Fresco (Android) — troca instantânea, consistente com iOS.
      fadeDuration={0}
      style={{width: tamanho, height: tamanho}}
      resizeMode="contain"
    />
  );
}

export default Bola;
