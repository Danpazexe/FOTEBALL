/**
 * SegmentedTabs — abas em PÍLULA segmentada (Todos · Titulares · Reservas). A aba
 * ativa é TINTA na marca (fundo brand + texto onBrand); as inativas ficam neutras
 * com borda. Segmentos de largura igual. Cor sempre por token.
 *
 * Diferente de `Tabs` (sublinhado) — usar quando o mockup pede o controle em
 * pílula (Elenco, Mercado).
 */
import React from 'react';
import {StyleSheet, View} from 'react-native';

import {Pressable} from '../../primitives/Pressable';
import {Text} from '../../primitives/Text';
import {espacamento, raios} from '../../tokens';
import {useTheme} from '../../themes/useTheme';
import type {Aba} from '../Tabs';

type Props = {
  abas: Aba[];
  ativa: string;
  onSelect: (chave: string) => void;
};

export function SegmentedTabs({
  abas,
  ativa,
  onSelect,
}: Props): React.JSX.Element {
  const {cores} = useTheme();
  return (
    <View style={estilos.linha}>
      {abas.map(aba => {
        const sel = aba.chave === ativa;
        return (
          <Pressable
            key={aba.chave}
            onPress={() => onSelect(aba.chave)}
            accessibilityRole="tab"
            accessibilityState={{selected: sel}}
            style={[
              estilos.pilula,
              {
                backgroundColor: sel ? cores.brand : cores.surface,
                borderColor: sel ? cores.brand : cores.border,
              },
            ]}>
            <Text
              variant="labelL"
              color={sel ? 'onBrand' : 'textSecondary'}
              numberOfLines={1}>
              {aba.rotulo}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: {flexDirection: 'row', gap: espacamento[2]},
  pilula: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: espacamento[2],
    borderRadius: raios.full,
    borderWidth: 1,
  },
});
