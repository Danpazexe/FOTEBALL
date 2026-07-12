/**
 * Tabs — abas internas simples (Visão geral · Jogos · Tabela…). Aba ativa com
 * sublinhado + texto na marca; role/estado acessível. `scrollable` para >4 itens.
 * Cor por token.
 */
import React from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';

import {Pressable} from '../../primitives/Pressable';
import {Text} from '../../primitives/Text';
import {espacamento} from '../../tokens';
import {useTheme} from '../../themes/useTheme';

export type Aba = {chave: string; rotulo: string};

type Props = {
  abas: Aba[];
  ativa: string;
  onSelect: (chave: string) => void;
  scrollable?: boolean;
};

export function Tabs({abas, ativa, onSelect, scrollable}: Props): React.JSX.Element {
  const {cores} = useTheme();

  const itens = abas.map(aba => {
    const sel = aba.chave === ativa;
    return (
      <Pressable
        key={aba.chave}
        onPress={() => onSelect(aba.chave)}
        accessibilityRole="tab"
        accessibilityState={{selected: sel}}
        style={[estilos.aba, sel ? {borderBottomColor: cores.brand} : null]}>
        <Text variant="labelL" color={sel ? 'brand' : 'textSecondary'}>
          {aba.rotulo}
        </Text>
      </Pressable>
    );
  });

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[estilos.borda, {borderBottomColor: cores.border}]}
        contentContainerStyle={estilos.linha}>
        {itens}
      </ScrollView>
    );
  }
  return (
    <View style={[estilos.linha, estilos.borda, {borderBottomColor: cores.border}]}>
      {itens}
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: {flexDirection: 'row', gap: espacamento[4]},
  borda: {borderBottomWidth: 1},
  aba: {
    paddingVertical: espacamento[3],
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    minHeight: 44,
    justifyContent: 'center',
  },
});
