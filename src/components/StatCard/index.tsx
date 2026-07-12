/**
 * StatCard — tile de estado no relance: rótulo em caixa-alta, VALOR grande
 * tabular e uma linha de apoio. Migrado ao Design System v2.
 */

import React from 'react';
import {StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';

import {Icon, Pressable, Text, espacamento, raios, useTheme} from '../../design-system';
import type {IconeNome} from '../Icone';

type StatCardProps = {
  label: string;
  valor: string;
  /** Linha de apoio abaixo do valor. */
  sub?: string;
  /** Cor do valor (override cru; padrão texto). */
  corValor?: string;
  /** Cor da linha de apoio (override cru). */
  corSub?: string;
  icone?: IconeNome;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

function StatCard({
  label,
  valor,
  sub,
  corValor,
  corSub,
  icone,
  onPress,
  style,
}: StatCardProps): React.JSX.Element {
  const {cores} = useTheme();
  const cartao: StyleProp<ViewStyle> = [
    styles.card,
    {backgroundColor: cores.surface, borderColor: cores.border},
    style,
  ];

  const conteudo = (
    <>
      <View style={styles.topo}>
        <Text variant="labelM" color="textMuted" style={styles.caps}>
          {label}
        </Text>
        {icone ? <Icon nome={icone} size={14} color="textMuted" /> : null}
      </View>
      <Text
        variant="titleL"
        tabular
        numberOfLines={1}
        adjustsFontSizeToFit
        style={corValor ? {color: corValor} : undefined}>
        {valor}
      </Text>
      {sub ? (
        <Text
          variant="caption"
          color="textSecondary"
          numberOfLines={1}
          style={corSub ? {color: corSub} : undefined}>
          {sub}
        </Text>
      ) : null}
    </>
  );

  if (!onPress) {
    return <View style={cartao}>{conteudo}</View>;
  }
  return (
    <Pressable onPress={onPress} style={cartao}>
      {conteudo}
    </Pressable>
  );
}

export default StatCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: raios.lg,
    borderWidth: 1,
    flex: 1,
    gap: espacamento[1],
    justifyContent: 'center',
    minHeight: 82,
    padding: espacamento[3],
  },
  topo: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  caps: {textTransform: 'uppercase', letterSpacing: 1},
});
