/**
 * SegmentedTabs — abas em PÍLULA segmentada (Todos · Titulares · Reservas),
 * estilo cartaz (v3): a aba ativa é verde-bandeira sólido (`brandStrong`, AA
 * com `onBrand`) com moldura dura 2px na tinta; inativas ficam neutras. Rótulo
 * em caixa alta, peso 800. Segmentos de largura igual. Cor sempre por token.
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
                backgroundColor: sel ? cores.brandStrong : cores.surface,
                borderColor: sel ? cores.borderStrong : cores.border,
              },
            ]}>
            <Text
              variant="labelL"
              color={sel ? 'onBrand' : 'textSecondary'}
              weight="800"
              numberOfLines={1}
              style={estilos.rotulo}>
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
    borderWidth: 2,
  },
  /** Caixa alta de cartaz no rótulo da aba. */
  rotulo: {textTransform: 'uppercase', letterSpacing: 0.5},
});
