/**
 * EmptyState — vazio/erro padronizado. Explica o que não existe, por quê e qual
 * ação existe. `variant='error'` pinta o ícone de perigo. Cor por token.
 */
import React from 'react';
import {StyleSheet, View} from 'react-native';

import type {IconeNome} from '../../../components/Icone';
import {Icon} from '../../primitives/Icon';
import {Text} from '../../primitives/Text';
import {espacamento} from '../../tokens';
import {Button} from '../Button';

type Props = {
  title: string;
  description?: string;
  icone?: IconeNome;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'empty' | 'error';
};

export function EmptyState({
  title,
  description,
  icone,
  actionLabel,
  onAction,
  variant = 'empty',
}: Props): React.JSX.Element {
  return (
    <View style={estilos.wrap}>
      {icone ? (
        <Icon
          nome={icone}
          size="xl"
          color={variant === 'error' ? 'danger' : 'textMuted'}
        />
      ) : null}
      <Text variant="titleM" align="center">
        {title}
      </Text>
      {description ? (
        <Text variant="bodyM" color="textSecondary" align="center">
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button titulo={actionLabel} onPress={onAction} variante="secondary" />
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacamento[3],
    padding: espacamento[6],
  },
});
