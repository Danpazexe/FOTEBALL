/** Peça de titular no campo: ficha arrastável com anel por encaixe de posição. */
import React from 'react';
import {Text, View} from 'react-native';
import {GestureDetector} from 'react-native-gesture-handler';

import {corAdaptacao} from '../../../theme';
import {useEstilosDS, useTheme} from '../../../design-system';
import {nivelAdaptacao} from '../../../engine/tactics/adaptacao';
import type {Player} from '../../../types';
import {DIAM, SLOT_W} from './constantes';
import {criarEstilos} from './estilos';
import type {PecaCompartilhada, SlotPos} from './tipos';
import {useGestoPeca} from './useGestoPeca';

type PecaTitularProps = PecaCompartilhada & {
  slot: SlotPos;
  jogador: Player | undefined;
  nome: string;
  selecionado: boolean;
  hover: boolean;
  arrastandoEste: boolean;
};

function PecaTitular({
  slot,
  jogador,
  nome,
  selecionado,
  hover,
  arrastandoEste,
  ghostX,
  ghostY,
  ghostAtivo,
  aoIniciar,
  aoArrastar,
  aoSoltar,
  aoTocar,
  aoFinalizar,
}: PecaTitularProps): React.JSX.Element {
  const styles = useEstilosDS(criarEstilos);
  const {cores} = useTheme();
  const gesto = useGestoPeca(
    'titular',
    String(slot.slotIndex),
    true,
    ghostX,
    ghostY,
    ghostAtivo,
    aoIniciar,
    aoArrastar,
    aoSoltar,
    aoTocar,
    aoFinalizar,
  );
  // Anel por ENCAIXE de posição (verde natural → vermelho improviso), a mesma
  // semântica/cor do DraggablePitch — as telas de escalação seguem um padrão só.
  const adaptacao = jogador ? nivelAdaptacao(jogador, slot.posicao) : null;
  const corEncaixe = adaptacao
    ? corAdaptacao(adaptacao.nivel)
    : cores.textSecondary;
  const corBorda = hover
    ? cores.accent
    : selecionado
      ? cores.brand
      : corEncaixe;
  const pct = adaptacao ? Math.round(adaptacao.fator * 100) : 100;
  return (
    <GestureDetector gesture={gesto}>
      <View
        style={[
          styles.slotWrap,
          {left: slot.x - SLOT_W / 2, top: slot.y - DIAM / 2 - 6},
          arrastandoEste ? styles.arrastandoEste : null,
        ]}>
        <View
          style={[
            styles.ficha,
            {borderColor: corBorda},
            hover || selecionado ? styles.fichaDestacada : null,
            hover ? styles.fichaHover : null,
          ]}>
          <Text style={[styles.fichaOverall, {color: corBorda}]}>
            {jogador ? jogador.overall : '--'}
          </Text>
        </View>
        <Text style={styles.slotPos}>{slot.posicao}</Text>
        <Text numberOfLines={1} style={styles.slotNome}>
          {nome}
        </Text>
        {adaptacao && adaptacao.nivel !== 'natural' ? (
          <Text style={[styles.slotPct, {color: corBorda}]}>{pct}%</Text>
        ) : null}
      </View>
    </GestureDetector>
  );
}

export default PecaTitular;
