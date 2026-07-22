/**
 * Chip — pílula de seleção/filtro, estilo cartaz (v3): selecionado ganha fundo
 * suave do tom + moldura dura 2px na tinta (`borderStrong`) e texto na tinta
 * (`textPrimary`), garantindo AA em qualquer tom (inclusive amarelo);
 * não-selecionado é neutro. Compacto com `hitSlop` (alvo de toque preservado).
 * Cor por token.
 */
import React from 'react';
import {StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';

import type {IconeNome} from '../../../components/Icone';
import {Icon} from '../../primitives/Icon';
import {Pressable} from '../../primitives/Pressable';
import {Text, type CorTexto} from '../../primitives/Text';
import {espacamento, raios} from '../../tokens';
import {useTheme} from '../../themes/useTheme';

type Tom = 'neutral' | 'brand' | 'accent' | 'info' | 'danger';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tom?: Tom;
  icone?: IconeNome;
  style?: StyleProp<ViewStyle>;
};

export function Chip({
  label,
  selected,
  onPress,
  tom = 'brand',
  icone,
  style,
}: Props): React.JSX.Element {
  const {cores} = useTheme();
  const soft: Record<Tom, string> = {
    neutral: cores.surfaceSubtle,
    brand: cores.brandSoft,
    accent: cores.accentSoft,
    info: cores.infoSoft,
    danger: cores.dangerSoft,
  };
  const st: StyleProp<ViewStyle> = [
    estilos.chip,
    {
      backgroundColor: selected ? soft[tom] : cores.surface,
      borderColor: selected ? cores.borderStrong : cores.border,
    },
    style,
  ];
  const txt: CorTexto = selected ? 'textPrimary' : 'textSecondary';
  const filhos = (
    <>
      {icone ? <Icon nome={icone} size={16} color={txt} /> : null}
      <Text variant="labelM" color={txt} numberOfLines={1}>
        {label}
      </Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        hitSlop={8}
        accessibilityState={{selected: !!selected}}
        style={st}>
        {filhos}
      </Pressable>
    );
  }
  return <View style={st}>{filhos}</View>;
}

const estilos = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacamento[1],
    paddingHorizontal: espacamento[3],
    minHeight: 34,
    borderRadius: raios.full,
    borderWidth: 2,
  },
});
