/**
 * Bola — sprite do doodle. Parada mostra o frame 0 (bola "de frente"); no ar,
 * cicla os 12 frames de rotação (efeito de giro). O voo/escala vem do reanimated
 * no AlvoGol; aqui só troca o frame do giro.
 */
import React, {useEffect, useState} from 'react';
import {Image, type ImageSourcePropType} from 'react-native';

const FRAMES: ImageSourcePropType[] = [
  require('../assets/ball_0.png'),
  require('../assets/ball_1.png'),
  require('../assets/ball_2.png'),
  require('../assets/ball_3.png'),
  require('../assets/ball_4.png'),
  require('../assets/ball_5.png'),
  require('../assets/ball_6.png'),
  require('../assets/ball_7.png'),
  require('../assets/ball_8.png'),
  require('../assets/ball_9.png'),
  require('../assets/ball_10.png'),
  require('../assets/ball_11.png'),
];

/** Cadência do giro (ms por frame). */
const MS_POR_FRAME = 45;

function Bola({
  tamanho,
  girando,
}: {
  tamanho: number;
  girando: boolean;
}): React.JSX.Element {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!girando) {
      setI(0);
      return undefined;
    }
    const id = setInterval(() => {
      setI(anterior => (anterior + 1) % FRAMES.length);
    }, MS_POR_FRAME);
    return () => clearInterval(id);
  }, [girando]);

  return (
    <Image
      source={girando ? FRAMES[i] : FRAMES[0]}
      style={{width: tamanho, height: tamanho}}
      resizeMode="contain"
    />
  );
}

export default Bola;
