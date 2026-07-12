/**
 * AppBar — cabeçalho de tela. Voltar por ÍCONE semântico (não texto), com label
 * acessível e alvo de toque 44. Título/subtítulo + slot à direita.
 */
import React from 'react';
import {StyleSheet, View} from 'react-native';

import {Icon} from '../../primitives/Icon';
import {Pressable} from '../../primitives/Pressable';
import {Text} from '../../primitives/Text';
import {espacamento} from '../../tokens';

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
};

export function AppBar({title, subtitle, onBack, right}: Props): React.JSX.Element {
  return (
    <View style={estilos.appbar}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          minSize="min"
          accessibilityLabel="Voltar"
          style={estilos.back}>
          <Icon nome="voltar" color="textPrimary" />
        </Pressable>
      ) : null}
      <View style={estilos.titulos}>
        <Text variant="titleXL" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="labelM" color="textSecondary" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View>{right}</View> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  appbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[2],
    paddingVertical: espacamento[2],
  },
  back: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -espacamento[2],
  },
  titulos: {flex: 1},
});
