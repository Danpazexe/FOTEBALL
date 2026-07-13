/**
 * Badge — selo compacto de contagem/estado, ou ponto (`dot`). Cor por token,
 * combinada com texto (nunca só cor). Números usam tabular.
 */
import React from 'react';
import {StyleSheet, View} from 'react-native';

import {Text, type CorTexto} from '../../primitives/Text';
import {espacamento, raios} from '../../tokens';
import {useTheme} from '../../themes/useTheme';

type Tom = 'neutral' | 'brand' | 'accent' | 'info' | 'success' | 'danger';

type Props = {
  label?: string;
  count?: number;
  tom?: Tom;
  /** Só um ponto colorido (ex.: indicador de status). */
  dot?: boolean;
  /** Selo PREENCHIDO (fundo `tom`, texto branco) — ex.: contador de alerta. */
  solido?: boolean;
};

const COR_TOM: Record<Tom, CorTexto> = {
  neutral: 'textSecondary',
  brand: 'brand',
  accent: 'accent',
  info: 'info',
  success: 'success',
  danger: 'danger',
};

export function Badge({
  label,
  count,
  tom = 'brand',
  dot,
  solido,
}: Props): React.JSX.Element {
  const {cores} = useTheme();
  const corTom = COR_TOM[tom];

  if (dot) {
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={[estilos.dot, {backgroundColor: cores[corTom]}]}
      />
    );
  }

  const soft: Record<Tom, string> = {
    neutral: cores.surfaceSubtle,
    brand: cores.brandSoft,
    accent: cores.accentSoft,
    info: cores.infoSoft,
    success: cores.brandSoft,
    danger: cores.dangerSoft,
  };
  const texto =
    count !== undefined ? (count > 99 ? '99+' : String(count)) : label ?? '';

  return (
    <View
      style={[
        estilos.badge,
        {backgroundColor: solido ? cores[corTom] : soft[tom]},
      ]}>
      <Text
        variant="labelM"
        color={solido ? 'onBrand' : corTom}
        tabular={count !== undefined}>
        {texto}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  badge: {
    minWidth: 20,
    paddingHorizontal: espacamento[2],
    paddingVertical: 2,
    borderRadius: raios.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: raios.full,
  },
});
