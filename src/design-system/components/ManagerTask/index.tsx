/**
 * ManagerTask — linha de PENDÊNCIA do técnico: ícone em selo colorido + título +
 * subtítulo + chevron. Tom semântico (danger/warning/brand/info) só na cor do
 * selo. Alvo de toque ≥56. Cor por token. Não deriva nada — recebe pronto.
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

type Tom = 'danger' | 'warning' | 'brand' | 'info';

type Props = {
  titulo: string;
  subtitulo?: string;
  icone: IconeNome;
  tom?: Tom;
  onPress?: () => void;
};

const FUNDO_TOM: Record<Tom, keyof CoresSemanticas> = {
  danger: 'dangerSoft',
  warning: 'accentSoft',
  brand: 'brandSoft',
  info: 'infoSoft',
};
const COR_TOM: Record<Tom, keyof CoresSemanticas> = {
  danger: 'danger',
  warning: 'warning',
  brand: 'brand',
  info: 'info',
};

export function ManagerTask({
  titulo,
  subtitulo,
  icone,
  tom = 'info',
  onPress,
}: Props): React.JSX.Element {
  const {cores} = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      feedback={!!onPress}
      style={estilos.linha}
      accessibilityLabel={subtitulo ? `${titulo}. ${subtitulo}` : titulo}>
      <View style={[estilos.selo, {backgroundColor: cores[FUNDO_TOM[tom]]}]}>
        <Icon nome={icone} size={18} color={COR_TOM[tom]} />
      </View>
      <View style={estilos.centro}>
        <Text variant="labelL" numberOfLines={1}>
          {titulo}
        </Text>
        {subtitulo ? (
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {subtitulo}
          </Text>
        ) : null}
      </View>
      {onPress ? <Icon nome="avancar" color="textMuted" /> : null}
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
  selo: {
    width: 36,
    height: 36,
    borderRadius: raios.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centro: {flex: 1, gap: 2},
});
