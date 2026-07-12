/**
 * Score — placar tabular "2 – 1" (ou "– – –" quando indefinido). Rótulo
 * acessível "dois a um". Cor por token.
 */
import React from 'react';
import {StyleSheet, View} from 'react-native';

import {Text} from '../../primitives/Text';
import type {PapelTipografico} from '../../tokens';

type Props = {
  casa?: number;
  fora?: number;
  size?: 'md' | 'lg';
};

export function Score({casa, fora, size = 'md'}: Props): React.JSX.Element {
  const pendente = casa === undefined || fora === undefined;
  const variante: PapelTipografico = size === 'lg' ? 'scoreXL' : 'titleL';
  const acessivel = pendente ? 'Placar indefinido' : `${casa} a ${fora}`;

  return (
    <View accessible accessibilityLabel={acessivel} style={estilos.linha}>
      <Text variant={variante} tabular>
        {pendente ? '–' : String(casa)}
      </Text>
      <Text variant={variante} color="textMuted">
        {'  –  '}
      </Text>
      <Text variant={variante} tabular>
        {pendente ? '–' : String(fora)}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: {flexDirection: 'row', alignItems: 'center'},
});
