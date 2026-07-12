/**
 * StatValue — número esportivo com rótulo. Valor tabular, unidade opcional e
 * tendência (↑ sucesso / ↓ perigo). Rótulo acessível consolidado. Cor por token.
 */
import React from 'react';
import {StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';

import {Icon} from '../../primitives/Icon';
import {Text} from '../../primitives/Text';
import {espacamento} from '../../tokens';

type Tendencia = 'up' | 'down' | 'flat';

type Props = {
  label: string;
  value: string;
  unit?: string;
  tendencia?: Tendencia;
  align?: 'left' | 'center';
  style?: StyleProp<ViewStyle>;
};

export function StatValue({
  label,
  value,
  unit,
  tendencia,
  align = 'left',
  style,
}: Props): React.JSX.Element {
  const rotuloAcessivel = `${label}: ${value}${unit ? ' ' + unit : ''}`;
  return (
    <View
      accessible
      accessibilityLabel={rotuloAcessivel}
      style={[align === 'center' ? estilos.centro : null, style]}>
      <View style={estilos.linhaValor}>
        <Text variant="titleL" tabular>
          {value}
        </Text>
        {unit ? (
          <Text variant="labelM" color="textMuted">
            {unit}
          </Text>
        ) : null}
        {tendencia && tendencia !== 'flat' ? (
          <Icon
            nome={tendencia === 'up' ? 'seta-cima' : 'seta-baixo'}
            size={16}
            color={tendencia === 'up' ? 'success' : 'danger'}
          />
        ) : null}
      </View>
      <Text variant="labelM" color="textSecondary" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  centro: {alignItems: 'center'},
  linhaValor: {flexDirection: 'row', alignItems: 'center', gap: espacamento[1]},
});
