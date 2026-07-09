/**
 * Goleiro — sprite (PNG) do personagem do doodle em 3 poses: `ready` (parado /
 * mergulhando), `save` (segurou a bola) e `beaten` (levou o gol). O AlvoGol
 * posiciona/rotaciona a figura (Animated.View) e troca a pose no desfecho.
 */
import React from 'react';
import {Image} from 'react-native';

export type PoseGoleiro = 'ready' | 'save' | 'beaten';

const FONTES = {
  ready: require('../assets/keeper_ready.png'),
  save: require('../assets/keeper_save.png'),
  beaten: require('../assets/keeper_beaten.png'),
};

/** Proporção da caixa do goleiro (altura/largura). */
export const GOLEIRO_RATIO = 1.15;

function Goleiro({
  tamanho,
  pose,
}: {
  tamanho: number;
  pose: PoseGoleiro;
}): React.JSX.Element {
  return (
    <Image
      source={FONTES[pose]}
      style={{width: tamanho, height: tamanho * GOLEIRO_RATIO}}
      resizeMode="contain"
    />
  );
}

export default Goleiro;
