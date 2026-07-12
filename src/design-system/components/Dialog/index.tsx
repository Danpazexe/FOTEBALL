/**
 * Dialog — diálogo modal de confirmação. Ação destrutiva usa variante danger.
 * Overlay por token, foco preso ao modal. Presentacional (o FeedbackProvider
 * pode adotá-lo numa migração futura). Cor por token.
 */
import React from 'react';
import {Modal, StyleSheet, View} from 'react-native';

import {Text} from '../../primitives/Text';
import {espacamento, raios} from '../../tokens';
import {useTheme} from '../../themes/useTheme';
import {Button} from '../Button';

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  destructive?: boolean;
};

export function Dialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  destructive,
}: Props): React.JSX.Element {
  const {cores} = useTheme();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}>
      <View style={[estilos.overlay, {backgroundColor: cores.overlay}]}>
        <View
          accessibilityViewIsModal
          style={[
            estilos.card,
            {backgroundColor: cores.surface, borderColor: cores.border},
          ]}>
          <Text variant="titleL">{title}</Text>
          {message ? (
            <Text variant="bodyM" color="textSecondary">
              {message}
            </Text>
          ) : null}
          <View style={estilos.acoes}>
            {cancelLabel && onCancel ? (
              <View style={estilos.flex}>
                <Button
                  titulo={cancelLabel}
                  onPress={onCancel}
                  variante="secondary"
                  fullWidth
                />
              </View>
            ) : null}
            <View style={estilos.flex}>
              <Button
                titulo={confirmLabel}
                onPress={onConfirm}
                variante={destructive ? 'danger' : 'primary'}
                fullWidth
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: espacamento[6],
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: raios.lg,
    borderWidth: 1,
    padding: espacamento[5],
    gap: espacamento[3],
  },
  acoes: {flexDirection: 'row', gap: espacamento[3], marginTop: espacamento[2]},
  flex: {flex: 1},
});
