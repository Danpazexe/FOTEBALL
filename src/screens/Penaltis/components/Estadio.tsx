/**
 * Fundo da cena de pênaltis — arte do estádio (torcida + parede + gramado em
 * perspectiva) do estilo doodle, empacotada como PNG pelo Metro. É só a imagem
 * de fundo; gol, goleiro e bola são camadas por cima (ver AlvoGol).
 */
import React from 'react';
import {Image} from 'react-native';

const FUNDO = require('../assets/estadio.png');

/** Proporção altura/largura da arte do estádio (recorte 420x503). */
export const ESTADIO_RATIO = 503 / 420;

function Estadio({
  largura,
  altura,
}: {
  largura: number;
  altura: number;
}): React.JSX.Element {
  return (
    <Image
      source={FUNDO}
      style={{width: largura, height: altura}}
      resizeMode="stretch"
    />
  );
}

export default Estadio;
