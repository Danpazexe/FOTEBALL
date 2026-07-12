/**
 * MatchCard — confronto em UM contrato, com 3 estados: agendado / ao-vivo /
 * encerrado. Compõe TeamCrest + Score. Cor por token.
 */
import React from 'react';
import {StyleSheet, View} from 'react-native';

import {Card} from '../../components/Card';
import {Text} from '../../primitives/Text';
import {espacamento} from '../../tokens';
import {Score} from '../Score';
import {TeamCrest} from '../TeamCrest';

type Status = 'agendado' | 'ao-vivo' | 'encerrado';
type Time = {clubeId: string; sigla: string; nome?: string};

type Props = {
  casa: Time;
  fora: Time;
  status: Status;
  placarCasa?: number;
  placarFora?: number;
  minuto?: number;
  quando?: string;
  competicao?: string;
  onPress?: () => void;
};

export function MatchCard({
  casa,
  fora,
  status,
  placarCasa,
  placarFora,
  minuto,
  quando,
  competicao,
  onPress,
}: Props): React.JSX.Element {
  const centro =
    status === 'agendado' ? (
      <Text variant="labelL" color="textSecondary">
        {quando ?? '—'}
      </Text>
    ) : (
      <View style={estilos.centro}>
        <Score casa={placarCasa} fora={placarFora} />
        {status === 'ao-vivo' ? (
          <Text variant="labelM" color="danger">
            {minuto !== undefined ? `${minuto}'` : 'AO VIVO'}
          </Text>
        ) : (
          <Text variant="caption" color="textMuted">
            Encerrado
          </Text>
        )}
      </View>
    );

  return (
    <Card variante={onPress ? 'interactive' : 'outlined'} onPress={onPress}>
      {competicao ? (
        <Text
          variant="labelM"
          color="textMuted"
          numberOfLines={1}
          style={estilos.comp}>
          {competicao}
        </Text>
      ) : null}
      <View style={estilos.linha}>
        <View style={estilos.time}>
          <TeamCrest
            clubeId={casa.clubeId}
            sigla={casa.sigla}
            nome={casa.nome}
            size={28}
          />
          <Text variant="titleM" numberOfLines={1}>
            {casa.sigla}
          </Text>
        </View>
        <View style={estilos.meio}>{centro}</View>
        <View style={[estilos.time, estilos.timeFora]}>
          <Text variant="titleM" numberOfLines={1}>
            {fora.sigla}
          </Text>
          <TeamCrest
            clubeId={fora.clubeId}
            sigla={fora.sigla}
            nome={fora.nome}
            size={28}
          />
        </View>
      </View>
    </Card>
  );
}

const estilos = StyleSheet.create({
  comp: {marginBottom: espacamento[2]},
  linha: {flexDirection: 'row', alignItems: 'center'},
  time: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: espacamento[2]},
  timeFora: {justifyContent: 'flex-end'},
  meio: {paddingHorizontal: espacamento[3], alignItems: 'center'},
  centro: {alignItems: 'center', gap: 2},
});
