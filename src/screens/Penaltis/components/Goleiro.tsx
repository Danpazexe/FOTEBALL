/**
 * Goleiro — sprite (PNG) do personagem do doodle em 3 poses: `ready` (parado /
 * mergulhando), `save` (segurou a bola) e `beaten` (levou o gol). O AlvoGol
 * posiciona/rotaciona a figura (Animated.View) e troca a pose no desfecho.
 */
import React from 'react';
import {Image} from 'react-native';

export type PoseGoleiro = 'ready' | 'save' | 'beaten';

// require estático por pose (Metro empacota os três) — sem índice dinâmico.
const READY = require('../assets/keeper_ready.png');
const SAVE = require('../assets/keeper_save.png');
const BEATEN = require('../assets/keeper_beaten.png');

/** Proporção da caixa do goleiro (altura/largura). */
export const GOLEIRO_RATIO = 1.15;

function fonteDe(pose: PoseGoleiro) {
  if (pose === 'save') {
    return SAVE;
  }
  if (pose === 'beaten') {
    return BEATEN;
  }
  return READY;
}

function Goleiro({
  tamanho,
  pose,
}: {
  tamanho: number;
  pose: PoseGoleiro;
}): React.JSX.Element {
  return (
    <Image
      source={fonteDe(pose)}
      style={{width: tamanho, height: tamanho * GOLEIRO_RATIO}}
      resizeMode="contain"
    />
  );
}

export default Goleiro;
