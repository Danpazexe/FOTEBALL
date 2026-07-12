/**
 * Pressable — área tocável acessível (alvo mínimo 44/48), com feedback de press
 * e `accessibilityRole="button"` por padrão. Base dos elementos interativos.
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
  /** Alvo de toque: 44 (mín.) ou 48 (confortável). */
  minSize?: 'min' | 'confortavel';
  /** Esmaece ao pressionar (padrão true). */
  feedback?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Pressable({
  minSize = 'min',
  feedback = true,
  disabled,
  accessibilityRole = 'button',
  style,
  ...rest
}: Props): React.JSX.Element {
  const alvo = tamanhos.toque[minSize];
  return (
    <RNPressable
      {...rest}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityState={{disabled: !!disabled}}
      style={({pressed}) => [
        {
          minHeight: alvo,
          minWidth: alvo,
          justifyContent: 'center',
          alignItems: 'center',
        },
        feedback && pressed && !disabled ? {opacity: 0.7} : null,
        disabled ? {opacity: 0.4} : null,
        style,
      ]}
    />
  );
}
