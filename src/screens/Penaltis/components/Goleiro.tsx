/**
 * Goleiro — sprite ANIMADO do personagem do doodle. Cicla frames por estado:
 *  - `idle`  : balanço de pronto (loop sutil)
 *  - `dive`  : reação de mergulho (o AlvoGol translada/rotaciona a figura)
 *  - `save`  : agarra → segura a bola (toca uma vez)
 *  - `beaten`: sequência de choque, levou o gol (toca uma vez)
 * Sem lógica de jogo: só troca de frame no tempo.
 */
import React, {useEffect, useState} from 'react';
import {Image, type ImageSourcePropType} from 'react-native';

export type EstadoGoleiro = 'idle' | 'dive' | 'save' | 'beaten';

// require estático de cada frame (Metro empacota todos).
const IDLE: ImageSourcePropType[] = [
  require('../assets/keeper_idle_0.png'),
  require('../assets/keeper_idle_1.png'),
  require('../assets/keeper_idle_2.png'),
  require('../assets/keeper_idle_3.png'),
  require('../assets/keeper_idle_4.png'),
];
const DIVE: ImageSourcePropType[] = [require('../assets/keeper_dive_0.png')];
const SAVE: ImageSourcePropType[] = [
  require('../assets/keeper_save_0.png'),
  require('../assets/keeper_save_1.png'),
];
const BEATEN: ImageSourcePropType[] = [
  require('../assets/keeper_beaten_0.png'),
  require('../assets/keeper_beaten_1.png'),
  require('../assets/keeper_beaten_2.png'),
  require('../assets/keeper_beaten_3.png'),
  require('../assets/keeper_beaten_4.png'),
];

type Sequencia = {frames: ImageSourcePropType[]; fps: number; loop: boolean};

const SEQS: Record<EstadoGoleiro, Sequencia> = {
  idle: {frames: IDLE, fps: 3.5, loop: true},
  dive: {frames: DIVE, fps: 1, loop: false},
  save: {frames: SAVE, fps: 9, loop: false},
  beaten: {frames: BEATEN, fps: 10, loop: false},
};

/** Proporção da caixa do goleiro (altura/largura). */
export const GOLEIRO_RATIO = 1.15;

function Goleiro({
  tamanho,
  estado,
}: {
  tamanho: number;
  estado: EstadoGoleiro;
}): React.JSX.Element {
  const seq = SEQS[estado];
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    setIndice(0);
    if (seq.frames.length <= 1) {
      return undefined;
    }
    const id = setInterval(() => {
      setIndice(anterior => {
        const proximo = anterior + 1;
        if (proximo >= seq.frames.length) {
          if (seq.loop) {
            return 0;
          }
          clearInterval(id); // toca uma vez e segura o último frame
          return anterior;
        }
        return proximo;
      });
    }, 1000 / seq.fps);
    return () => clearInterval(id);
  }, [estado, seq]);

  const frame = seq.frames[Math.min(indice, seq.frames.length - 1)];
  return (
    <Image
      source={frame}
      style={{width: tamanho, height: tamanho * GOLEIRO_RATIO}}
      resizeMode="contain"
    />
  );
}

export default Goleiro;
