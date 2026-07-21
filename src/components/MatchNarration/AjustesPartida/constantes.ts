/**
 * Medidas de layout e listas fixas do painel de ajustes durante a partida.
 * Derivadas da tela no momento do import — mesmo comportamento do arquivo
 * original único.
 */
import {Dimensions} from 'react-native';

import type {FormacaoPreset, Tatica} from '../../../types';

const {width: LARGURA_TELA, height: ALTURA_TELA} = Dimensions.get('window');
// Largura útil do conteúdo = tela − padding do scroll (md×2) − padding do card
// (lg×2). Sem descontar os dois, as seções ficavam mais largas que a área
// interna do card e encostavam nas bordas (padding lateral inconsistente).
const PAD_SCROLL = 12; // espacamento[3]
const PAD_CARD = 16; // espacamento[4]
export const LARGURA = Math.min(LARGURA_TELA - (PAD_SCROLL + PAD_CARD) * 2, 400);
// Limita a altura do campo pela tela para o painel caber também em telas baixas.
export const ALTURA = Math.round(Math.min(LARGURA * 0.92, ALTURA_TELA * 0.42));
export const RAIO = Math.round(LARGURA * 0.056);
export const DIAM = RAIO * 2;
export const LIMIAR_DROP = RAIO + 30;
export const SLOT_W = 74;
// Margem vertical dentro do campo: deixa espaço para a ficha (topo) e para os
// rótulos posição+nome (embaixo de cada peça), senão o GOL/atacantes cortam.
export const PAD_TOPO = RAIO + 6;
export const PAD_BASE = RAIO + 32;
export const GHOST_W = 78;
export const GHOST_H = 90;

// Gramado — mesmo verde da Tática nova (CampoFUT/MapaFinalizacoes). Objeto de
// campo FIXO nos dois temas: verde base + linhas/rótulos em cal branca.
export const CAMPO_VERDE = '#2E9E58';
export const CAL = 'rgba(255, 255, 255, 0.85)';
export const CAL_FRACA = 'rgba(255, 255, 255, 0.5)';

export const FORMACOES: FormacaoPreset[] = [
  '4-4-2',
  '4-3-3',
  '4-2-3-1',
  '3-5-2',
  '5-3-2',
  '4-5-1',
];

export const OPCOES_ESTILO: Tatica['estiloOfensivo'][] = [
  'Equilibrado',
  'Posse de bola',
  'Contra-ataque',
  'Ataque direto',
];
export const OPCOES_MARCACAO: Tatica['marcacao'][] = [
  'Zona',
  'Individual',
  'Pressão alta',
];
export const OPCOES_LINHA: Tatica['linhaDefensiva'][] = [
  'Recuada',
  'Normal',
  'Adiantada',
];
export const OPCOES_RITMO: Tatica['ritmo'][] = ['Lento', 'Normal', 'Intenso'];
