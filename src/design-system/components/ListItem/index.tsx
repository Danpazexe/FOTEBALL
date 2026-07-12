/**
 * ListItem — linha de lista densa e escaneável. Slots leading/title/subtitle/
 * meta/trailing. Alvo de toque ≥56 quando tocável. Cor por token.
 */
import React from 'react';
import {StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';

import {Pressable} from '../../primitives/Pressable';
import {Text} from '../../primitives/Text';
import {espacamento} from '../../tokens';

type Props = {
  title: string;
  subtitle?: string;
  meta?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function ListItem({
  title,
  subtitle,
  meta,
  leading,
  trailing,
  onPress,
  style,
}: Props): React.JSX.Element {
  const filhos = (
    <>
      {leading ? <View>{leading}</View> : null}
      <View style={estilos.centro}>
        <Text variant="titleM" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodyM" color="textSecondary" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {meta ? (
        <Text variant="labelM" color="textMuted" tabular>
          {meta}
        </Text>
      ) : null}
      {trailing ? <View>{trailing}</View> : null}
    </>
  );
  const st: StyleProp<ViewStyle> = [estilos.linha, style];

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={st}>
        {filhos}
      </Pressable>
    );
  }
  return <View style={st}>{filhos}</View>;
}

const estilos = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[3],
    minHeight: 56,
    paddingVertical: espacamento[2],
  },
  centro: {flex: 1, gap: 2},
});
