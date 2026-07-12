/**
 * IconButton — botão só de ícone. `accessibilityLabel` OBRIGATÓRIO, alvo de
 * toque 44. Variante `soft` adiciona fundo sutil. Cor por token.
 */
import React from 'react';
import {StyleSheet, type StyleProp, type ViewStyle} from 'react-native';

import type {IconeNome} from '../../../components/Icone';
import {Icon} from '../../primitives/Icon';
import {Pressable} from '../../primitives/Pressable';
import {raios} from '../../tokens';
import type {CoresSemanticas} from '../../tokens/colors';
import {useTheme} from '../../themes/useTheme';

type Props = {
  icone: IconeNome;
  onPress: () => void;
  accessibilityLabel: string;
  tom?: keyof CoresSemanticas;
  disabled?: boolean;
  variante?: 'plain' | 'soft';
  style?: StyleProp<ViewStyle>;
};

export function IconButton({
  icone,
  onPress,
  accessibilityLabel,
  tom = 'textPrimary',
  disabled,
  variante = 'plain',
  style,
}: Props): React.JSX.Element {
  const {cores} = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      minSize="min"
      accessibilityLabel={accessibilityLabel}
      style={[
        estilos.base,
        variante === 'soft' ? {backgroundColor: cores.surfaceSubtle} : null,
        style,
      ]}>
      <Icon nome={icone} color={disabled ? 'textMuted' : tom} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: raios.full,
  },
});
