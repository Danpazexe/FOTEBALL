/**
 * Goleiro — sprite do doodle. O `idle` é uma ANIMAÇÃO de 4 frames CONSECUTIVOS
 * (balanço de pronto — as pernas/braços se mexem de propósito), tocada em
 * ping-pong (laço suave, sem pulo). `dive`/`save`/`beaten` são frames únicos; o
 * movimento deles (mergulho, "pop") vem do reanimated no AlvoGol.
 */
import React, {useEffect, useState} from 'react';
import {Image, type ImageSourcePropType} from 'react-native';

export type EstadoGoleiro = 'idle' | 'dive' | 'save' | 'beaten';

const IDLE: ImageSourcePropType[] = [
  require('../assets/keeper_idle_0.png'),
  require('../assets/keeper_idle_1.png'),
  require('../assets/keeper_idle_2.png'),
  require('../assets/keeper_idle_3.png'),
];
const DIVE = require('../assets/keeper_dive.png');
const SAVE = require('../assets/keeper_save.png');
const BEATEN = require('../assets/keeper_beaten.png');

/** Proporção da caixa do goleiro (altura/largura). */
export const GOLEIRO_RATIO = 1.15;

// Ordem ping-pong (0→3→volta) e cadência do balanço.
const ORDEM_IDLE = [0, 1, 2, 3, 2, 1];
const MS_POR_FRAME = 150;

function Goleiro({
  tamanho,
  estado,
}: {
  tamanho: number;
  estado: EstadoGoleiro;
}): React.JSX.Element {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (estado !== 'idle') {
      return undefined;
    }
    let k = 0;
    setI(ORDEM_IDLE[0]);
    const id = setInterval(() => {
      k = (k + 1) % ORDEM_IDLE.length;
      setI(ORDEM_IDLE[k]);
    }, MS_POR_FRAME);
    return () => clearInterval(id);
  }, [estado]);

  const src =
    estado === 'dive'
      ? DIVE
      : estado === 'save'
      ? SAVE
      : estado === 'beaten'
      ? BEATEN
      : IDLE[i];

  return (
    <Image
      source={src}
      style={{width: tamanho, height: tamanho * GOLEIRO_RATIO}}
      resizeMode="contain"
    />
  );
}

export default Goleiro;
