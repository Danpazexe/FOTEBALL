/** Peça do banco: reserva arrastável/tocável, bloqueada sem subs ou inapta. */
import React from 'react';
import {Text, View} from 'react-native';
import {GestureDetector} from 'react-native-gesture-handler';

import {corOverall} from '../../../theme';
import {useEstilosDS} from '../../../design-system';
import type {Player} from '../../../types';
import {criarEstilos} from './estilos';
import type {PecaCompartilhada} from './tipos';
import {useGestoPeca} from './useGestoPeca';

type ReservaPecaProps = PecaCompartilhada & {
  jogador: Player;
  nome: string;
  selecionado: boolean;
  arrastandoEste: boolean;
  habilitado: boolean;
};

function ReservaPeca({
  jogador,
  nome,
  selecionado,
  arrastandoEste,
  habilitado,
  ghostX,
  ghostY,
  ghostAtivo,
  aoIniciar,
  aoArrastar,
  aoSoltar,
  aoTocar,
  aoFinalizar,
}: ReservaPecaProps): React.JSX.Element {
  const styles = useEstilosDS(criarEstilos);
  const gesto = useGestoPeca(
    'reserva',
    jogador.id,
    habilitado,
    ghostX,
    ghostY,
    ghostAtivo,
    aoIniciar,
    aoArrastar,
    aoSoltar,
    aoTocar,
    aoFinalizar,
  );
  const cor = corOverall(jogador.overall);
  return (
    <GestureDetector gesture={gesto}>
      <View
        style={[
          styles.reservaWrap,
          selecionado ? styles.reservaSel : null,
          !habilitado ? styles.reservaBloqueada : null,
          arrastandoEste ? styles.arrastandoEste : null,
        ]}>
        <View style={[styles.fichaBanco, {borderColor: cor}]}>
          <Text style={[styles.fichaOverall, {color: cor}]}>
            {jogador.overall}
          </Text>
        </View>
        <Text
          numberOfLines={1}
          style={[
            styles.reservaNome,
            jogador.lesionado || jogador.suspenso ? styles.reservaLesionado : null,
          ]}>
          {nome}
        </Text>
        <Text style={styles.reservaPos}>
          {jogador.posicaoPrincipal}
          {jogador.lesionado ? ' · LES' : jogador.suspenso ? ' · SUS' : ''}
        </Text>
      </View>
    </GestureDetector>
  );
}

export default ReservaPeca;
