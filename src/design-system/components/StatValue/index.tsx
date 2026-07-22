/**
 * StatValue — número esportivo com rótulo. Valor tabular, unidade opcional,
 * tendência (↑ sucesso / ↓ perigo), ícone opcional acima do valor e `tom` do
 * valor por token. Rótulo acessível consolidado. Cor por token.
 */
import React from 'react';
import {StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';

import type {IconeNome} from '../../../components/Icone';
import {Icon} from '../../primitives/Icon';
import {Text, type CorTexto} from '../../primitives/Text';
import {espacamento} from '../../tokens';

type Tendencia = 'up' | 'down' | 'flat';

type Props = {
  label: string;
  value: string;
  unit?: string;
  tendencia?: Tendencia;
  /** Ícone acima do valor (ex.: medalha na reputação). */
  icone?: IconeNome;
  /** Cor do VALOR por token (ex.: success em vitórias, danger em derrotas). */
  tom?: CorTexto;
  align?: 'left' | 'center';
  style?: StyleProp<ViewStyle>;
};

export function StatValue({
  label,
  value,
  unit,
  tendencia,
  icone,
  tom = 'textPrimary',
  align = 'left',
  style,
}: Props): React.JSX.Element {
  const rotuloAcessivel = `${label}: ${value}${unit ? ' ' + unit : ''}`;
  return (
    <View
      accessible
      accessibilityLabel={rotuloAcessivel}
      style={[align === 'center' ? estilos.centro : null, style]}>
      {icone ? <Icon nome={icone} size={16} color="textSecondary" /> : null}
      <View style={estilos.linhaValor}>
        <Text variant="titleL" color={tom} tabular>
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
