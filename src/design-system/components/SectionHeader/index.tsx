/**
 * SectionHeader — cabeçalho de SEÇÃO (não de tela): título + ação opcional
 * ("Ver tabela") e um slot `trailing` (ex.: Badge de contagem). Cor por token.
 */
import React from 'react';
import {StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';

import {Icon} from '../../primitives/Icon';
import {Pressable} from '../../primitives/Pressable';
import {Text} from '../../primitives/Text';
import {espacamento} from '../../tokens';

type Props = {
  titulo: string;
  /** Rótulo da ação à direita (ex.: "Ver tabela"). Requer `onAcao`. */
  acaoLabel?: string;
  onAcao?: () => void;
  /** Conteúdo à direita do título (ex.: <Badge count={2} />). */
  trailing?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function SectionHeader({
  titulo,
  acaoLabel,
  onAcao,
  trailing,
  style,
}: Props): React.JSX.Element {
  return (
    <View style={[estilos.linha, style]}>
      <Text variant="titleM" numberOfLines={1} style={estilos.titulo}>
        {titulo}
      </Text>
      {trailing ?? null}
      {acaoLabel && onAcao ? (
        <Pressable
          onPress={onAcao}
          minSize="min"
          accessibilityLabel={acaoLabel}
          style={estilos.acao}>
          <Text variant="labelM" color="brand">
            {acaoLabel}
          </Text>
          <Icon nome="avancar" size={16} color="brand" />
        </Pressable>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[2],
    minHeight: 32,
  },
  titulo: {flex: 1},
  acao: {flexDirection: 'row', alignItems: 'center', gap: 2},
});
