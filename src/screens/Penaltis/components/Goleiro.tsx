/**
 * Goleiro — sprite do personagem do doodle, UM frame por estado (`idle`, `dive`,
 * `save`, `beaten`). O movimento (balanço de idle, mergulho, "pop" no desfecho)
 * é SUAVE, feito no reanimated pelo AlvoGol — não por troca de frames, que com
 * poses não-consecutivas ficava travado.
 */
import React from 'react';
import {Image, type ImageSourcePropType} from 'react-native';

export type EstadoGoleiro = 'idle' | 'dive' | 'save' | 'beaten';

const READY = require('../assets/keeper_ready.png');
const DIVE = require('../assets/keeper_dive.png');
const SAVE = require('../assets/keeper_save.png');
const BEATEN = require('../assets/keeper_beaten.png');

/** Proporção da caixa do goleiro (altura/largura). */
export const GOLEIRO_RATIO = 1.15;

function fonteDe(estado: EstadoGoleiro): ImageSourcePropType {
  if (estado === 'dive') {
    return DIVE;
  }
  if (estado === 'save') {
    return SAVE;
  }
  if (estado === 'beaten') {
    return BEATEN;
  }
  return READY;
}

function Goleiro({
  tamanho,
  estado,
}: {
  tamanho: number;
  estado: EstadoGoleiro;
}): React.JSX.Element {
  return (
    <Image
      source={fonteDe(estado)}
      style={{width: tamanho, height: tamanho * GOLEIRO_RATIO}}
      resizeMode="contain"
    />
  );
}

export default Goleiro;
