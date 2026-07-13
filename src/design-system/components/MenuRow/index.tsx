/**
 * MenuRow — linha de navegação de um HUB (ex.: Central do Clube): ícone em quadro
 * suave, título + descrição, contador opcional (Badge) e chevron. Alvo de toque
 * ≥56. Cor por token.
 */
import React from 'react';
import {StyleSheet, View} from 'react-native';

import type {IconeNome} from '../../../components/Icone';
import {Icon} from '../../primitives/Icon';
import {Pressable} from '../../primitives/Pressable';
import {Text} from '../../primitives/Text';
import {espacamento, raios} from '../../tokens';
import type {CoresSemanticas} from '../../tokens/colors';
import {useTheme} from '../../themes/useTheme';
import {Badge} from '../Badge';

type Props = {
  readonly icone: IconeNome;
  readonly titulo: string;
  readonly descricao?: string;
  readonly count?: number;
  readonly countTom?: 'brand' | 'accent' | 'danger' | 'success';
  readonly onPress: () => void;
  readonly tomIcone?: keyof CoresSemanticas;
};

export function MenuRow({
  icone,
  titulo,
  descricao,
  count,
  countTom = 'brand',
  onPress,
  tomIcone = 'brand',
}: Props): React.JSX.Element {
  const {cores} = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={titulo}
      style={estilos.linha}>
      <View style={[estilos.quadro, {backgroundColor: cores.brandSoft}]}>
        <Icon nome={icone} size="md" color={tomIcone} />
      </View>
      <View style={estilos.info}>
        <Text variant="titleM" numberOfLines={1}>
          {titulo}
        </Text>
        {descricao ? (
          <Text variant="labelM" color="textSecondary" numberOfLines={1}>
            {descricao}
          </Text>
        ) : null}
      </View>
      {count !== undefined && count > 0 ? (
        <Badge count={count} tom={countTom} solido />
      ) : null}
      <Icon nome="avancar" size="md" color="textMuted" />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[3],
    minHeight: 56,
    paddingVertical: espacamento[2],
  },
  quadro: {
    width: 44,
    height: 44,
    borderRadius: raios.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {flex: 1, gap: 1},
});
