import React from 'react';
import {StyleSheet, View} from 'react-native';

import {Card, Icon, Pressable, Text, espacamento} from '../../design-system';
import type {IconeNome} from '../Icone';

export type TipoAlerta = 'lesao' | 'suspensao' | 'saldo';

export interface Alerta {
  id: string;
  tipo: TipoAlerta;
  texto: string;
  jogadorId?: string;
}

type AlertasCardProps = {
  alertas: Alerta[];
  onAbrirJogador?: (jogadorId: string) => void;
};

const ICONE_POR_TIPO: Record<TipoAlerta, IconeNome> = {
  lesao: 'lesao',
  suspensao: 'cartao',
  saldo: 'dinheiro',
};

/** Card de avisos (lesões, suspensões, saldo negativo). Só renderiza se houver. */
function AlertasCard({
  alertas,
  onAbrirJogador,
}: AlertasCardProps): React.JSX.Element | null {
  if (alertas.length === 0) {
    return null;
  }
  return (
    <Card variante="status" status="danger" padding={4} style={styles.conteudo}>
      <View style={styles.header}>
        <Icon nome="apito" size={16} color="danger" />
        <Text variant="labelM" color="danger" style={styles.caps}>
          Avisos
        </Text>
      </View>
      {alertas.map(alerta => {
        const conteudo = (
          <View style={styles.linha}>
            <Icon nome={ICONE_POR_TIPO[alerta.tipo]} size={16} color="danger" />
            <Text variant="bodyM" style={styles.flex}>
              {alerta.texto}
            </Text>
          </View>
        );
        if (alerta.jogadorId && onAbrirJogador) {
          const jogadorId = alerta.jogadorId;
          return (
            <Pressable
              key={alerta.id}
              onPress={() => onAbrirJogador(jogadorId)}
              accessibilityLabel={alerta.texto}>
              {conteudo}
            </Pressable>
          );
        }
        return <View key={alerta.id}>{conteudo}</View>;
      })}
    </Card>
  );
}

export default AlertasCard;

const styles = StyleSheet.create({
  conteudo: {gap: espacamento[2]},
  header: {alignItems: 'center', flexDirection: 'row', gap: espacamento[1]},
  caps: {textTransform: 'uppercase', letterSpacing: 1},
  linha: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espacamento[2],
    paddingVertical: 3,
  },
  flex: {flex: 1},
});
