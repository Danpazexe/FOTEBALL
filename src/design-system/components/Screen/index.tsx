/**
 * Screen — contêiner de tela do design system: fundo `canvas` do tema ativo +
 * área segura + scroll opcional com margem padrão. Substitui o ScreenContainer
 * antigo (fundo escuro fixo) nas telas migradas.
 */
import React from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {espacamento} from '../../tokens';
import {useTheme} from '../../themes/useTheme';

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
};

export function Screen({children, scroll}: Props): React.JSX.Element {
  const {cores} = useTheme();
  return (
    <View style={[estilos.raiz, {backgroundColor: cores.canvas}]}>
      <SafeAreaView style={estilos.flex} edges={['top', 'left', 'right']}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={estilos.conteudo}
            showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        ) : (
          <View style={estilos.flex}>{children}</View>
        )}
      </SafeAreaView>
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: {flex: 1},
  flex: {flex: 1},
  conteudo: {
    padding: espacamento[4],
    gap: espacamento[3],
    paddingBottom: espacamento[12],
  },
});
