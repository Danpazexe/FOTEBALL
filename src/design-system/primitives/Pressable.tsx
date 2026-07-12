/**
 * Pressable — base tocável: feedback de press, `accessibilityRole="button"` e
 * estado disabled. NÃO força tamanho por padrão; passe `minSize` para garantir
 * alvo de toque (44/48) ou use `hitSlop` em elementos compactos. Cada componente
 * decide sua altura (Button ≥44, ListItem ≥56, Chip compacto + hitSlop).
 */
import React from 'react';
import {
  Pressable as RNPressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import {tamanhos} from '../tokens';

type Props = Omit<PressableProps, 'style'> & {
  /** Garante alvo de toque mínimo (44) ou confortável (48). Ausente = livre. */
  minSize?: 'min' | 'confortavel';
  /** Esmaece ao pressionar (padrão true). */
  feedback?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Pressable({
  minSize,
  feedback = true,
  disabled,
  accessibilityRole = 'button',
  style,
  ...rest
}: Props): React.JSX.Element {
  const alvo = minSize ? tamanhos.toque[minSize] : undefined;
  return (
    <RNPressable
      {...rest}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityState={{disabled: !!disabled}}
      style={({pressed}) => [
        alvo ? {minHeight: alvo, minWidth: alvo} : null,
        feedback && pressed && !disabled ? {opacity: 0.7} : null,
        disabled ? {opacity: 0.4} : null,
        style,
      ]}
    />
  );
}
