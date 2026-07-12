/**
 * Snackbar — aviso breve com tom (neutral/success/error/info) e ação opcional.
 * Presentacional (posicionamento/fila ficam com o host). Cor por token.
 */
import React from 'react';
import {StyleSheet, View} from 'react-native';

import {Pressable} from '../../primitives/Pressable';
import {Text, type CorTexto} from '../../primitives/Text';
import {elevacao, espacamento, raios} from '../../tokens';
import {useTheme} from '../../themes/useTheme';

type Tom = 'neutral' | 'success' | 'error' | 'info';

type Props = {
  message: string;
  tom?: Tom;
  actionLabel?: string;
  onAction?: () => void;
};

const ACENTO: Record<Tom, CorTexto> = {
  neutral: 'textPrimary',
  success: 'success',
  error: 'danger',
  info: 'info',
};

export function Snackbar({
  message,
  tom = 'neutral',
  actionLabel,
  onAction,
}: Props): React.JSX.Element {
  const {cores} = useTheme();
  return (
    <View
      style={[
        estilos.bar,
        elevacao.nivel2,
        {backgroundColor: cores.surface, borderColor: cores.border},
      ]}>
      <View style={estilos.esquerda}>
        <View style={[estilos.ponto, {backgroundColor: cores[ACENTO[tom]]}]} />
        <Text variant="bodyM" numberOfLines={2} style={estilos.msg}>
          {message}
        </Text>
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityLabel={actionLabel}>
          <Text variant="labelL" color="brand">
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacamento[3],
    padding: espacamento[3],
    borderRadius: raios.md,
    borderWidth: 1,
  },
  esquerda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[2],
    flex: 1,
  },
  ponto: {width: 8, height: 8, borderRadius: raios.full},
  msg: {flex: 1},
});
