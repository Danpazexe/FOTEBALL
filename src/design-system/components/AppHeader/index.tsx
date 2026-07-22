/**
 * AppHeader — cabeçalho FIXO das telas internas (fora da rolagem). Título
 * CENTRALIZADO, botão voltar à esquerda (ícone semântico Lucide 'voltar', alvo
 * 44×44, accessibilityLabel "Voltar") e ação opcional à direita. Filete
 * inferior duro na tinta (cartaz v3); título herda a caixa alta de `titleM`.
 * Cor por token. Renderizar no slot `header` do <Screen>.
 *
 * O fallback de voltar (quando não há histórico) é responsabilidade do chamador
 * via `onBack`.
 */
import React from 'react';
import {StyleSheet, View} from 'react-native';

import {Icon} from '../../primitives/Icon';
import {Pressable} from '../../primitives/Pressable';
import {Text} from '../../primitives/Text';
import {espacamento} from '../../tokens';
import {useTheme} from '../../themes/useTheme';

type Props = {
  readonly title: string;
  readonly showBackButton?: boolean;
  readonly onBack?: () => void;
  readonly rightAction?: React.ReactNode;
};

export function AppHeader({
  title,
  showBackButton = true,
  onBack,
  rightAction,
}: Props): React.JSX.Element {
  const {cores} = useTheme();
  return (
    <View style={[estilos.header, {borderBottomColor: cores.borderStrong}]}>
      <View style={estilos.lado}>
        {showBackButton && onBack ? (
          <Pressable
            onPress={onBack}
            minSize="min"
            accessibilityLabel="Voltar"
            style={estilos.back}>
            <Icon nome="voltar" color="textPrimary" />
          </Pressable>
        ) : null}
      </View>
      <Text
        variant="titleM"
        align="center"
        numberOfLines={1}
        style={estilos.titulo}>
        {title}
      </Text>
      <View style={[estilos.lado, estilos.ladoDir]}>{rightAction}</View>
    </View>
  );
}

const estilos = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    // Filete de cartaz: linha dura na tinta sob o cabeçalho.
    borderBottomWidth: 2,
    paddingBottom: espacamento[1],
  },
  lado: {minWidth: 44, justifyContent: 'center'},
  ladoDir: {alignItems: 'flex-end'},
  back: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -espacamento[2],
  },
  titulo: {flex: 1},
});
