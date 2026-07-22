/**
 * Screen — contêiner de tela do design system: fundo `canvas` do tema ativo +
 * área segura + scroll opcional com margem padrão. Substitui o ScreenContainer
 * antigo (fundo escuro fixo) nas telas migradas.
 */
import React, {useContext} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

import {espacamento} from '../../tokens';
import {useTheme} from '../../themes/useTheme';

/**
 * Marca as telas que vivem SOB a tab bar (o TabNavigator provê `true`): ali a
 * própria TabBar já consome o inset inferior do sistema, então o Screen não
 * deve duplicá-lo. Fora das abas (default `false`) o Screen aplica o inset.
 */
export const ScreenSobTabBarContext = React.createContext(false);

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  /**
   * Habilita/desabilita a rolagem (só com `scroll`). Usado para TRAVAR o scroll
   * durante um arraste em curso (ex.: escalação estilo FUT). Default: `true`.
   */
  scrollEnabled?: boolean;
  /**
   * Cabeçalho FIXO (fora da rolagem) — ex.: marca/AppBar. Fica ancorado no topo
   * enquanto o conteúdo rola por baixo.
   */
  header?: React.ReactNode;
};

export function Screen({
  children,
  scroll,
  scrollEnabled = true,
  header,
}: Props): React.JSX.Element {
  const {cores} = useTheme();
  // Edge-to-edge (Android 15+/targetSdk 35+ desenha SOB as barras do sistema):
  // o inset inferior (gesture/nav bar) precisa ser aplicado aqui. Sob a tab
  // bar a própria TabBar já consome o inset; fora dela (telas de stack:
  // PreJogo, Settings, MatchSimulation…) é o Screen que afasta o conteúdo da
  // barra. No iOS vale o mesmo para o home indicator.
  const sobTabBar = useContext(ScreenSobTabBarContext);
  const insets = useSafeAreaInsets();
  const insetInferior = sobTabBar ? 0 : insets.bottom;
  return (
    <View style={[estilos.raiz, {backgroundColor: cores.canvas}]}>
      <SafeAreaView style={estilos.flex} edges={['top', 'left', 'right']}>
        {header ? <View style={estilos.header}>{header}</View> : null}
        {scroll ? (
          <ScrollView
            contentContainerStyle={[
              estilos.conteudo,
              // No modo scroll o inset entra como padding do CONTEÚDO: a lista
              // rola até o fim sem nada preso atrás da barra de gestos.
              {paddingBottom: espacamento[12] + insetInferior},
            ]}
            scrollEnabled={scrollEnabled}
            showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        ) : (
          <View style={[estilos.flex, {paddingBottom: insetInferior}]}>
            {children}
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: {flex: 1},
  flex: {flex: 1},
  header: {
    paddingHorizontal: espacamento[4],
    paddingVertical: espacamento[2],
  },
  conteudo: {
    padding: espacamento[4],
    gap: espacamento[3],
    // paddingBottom vem inline: espacamento[12] + inset inferior (edge-to-edge).
  },
});
