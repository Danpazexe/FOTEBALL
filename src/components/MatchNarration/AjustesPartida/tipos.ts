/** Tipos compartilhados entre os módulos do painel de ajustes. */
import type {SharedValue} from 'react-native-reanimated';

import type {ResultadoAdaptacao} from '../../../engine/tactics/adaptacao';
import type {Player, Position} from '../../../types';

/** Identifica a peça de um gesto: reserva (id do jogador) ou titular (slot). */
export type Descritor = {tipo: 'reserva' | 'titular'; valor: string};

/** Posição de TELA de um titular no campo do painel. */
export type SlotPos = {slotIndex: number; x: number; y: number; posicao: Position};

export type SharedNum = SharedValue<number>;

/** Reserva apto a entrar, com o encaixe calculado para a vaga. */
export type CandidatoTroca = {jogador: Player; adaptacao: ResultadoAdaptacao};

/** Props que o campo repassa igual para toda peça arrastável. */
export type PecaCompartilhada = {
  ghostX: SharedNum;
  ghostY: SharedNum;
  ghostAtivo: SharedNum;
  aoIniciar: (tipo: string, valor: string) => void;
  aoArrastar: (ax: number, ay: number) => void;
  aoSoltar: (ax: number, ay: number, tipo: string, valor: string) => void;
  aoTocar: (tipo: string, valor: string) => void;
  aoFinalizar: () => void;
};
