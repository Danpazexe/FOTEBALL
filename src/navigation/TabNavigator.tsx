import React from 'react';
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';

import {ScreenSobTabBarContext} from '../design-system';
import {useGameStore} from '../store/useGameStore';
import TabBar from '../components/TabBar';
import {InicioStack} from './stacks/InicioStack';
import {ElencoStack} from './stacks/ElencoStack';
import {PartidasStack} from './stacks/PartidasStack';
import {MercadoStack} from './stacks/MercadoStack';
import {ClubeStack} from './stacks/ClubeStack';
import type {MainTabsParamList} from './types';

const Tab = createBottomTabNavigator<MainTabsParamList>();

// Estável (fora do render) — evita recriar o componente da tab bar a cada frame.
const renderTabBar = (props: BottomTabBarProps): React.JSX.Element => (
  <TabBar {...props} />
);

// Abas: Elenco · Partidas · Início · Mercado · Clube (Início ao CENTRO). Cada
// aba hospeda seu PRÓPRIO Stack Navigator: as telas internas rolam por baixo com
// a tab bar visível e o ícone da área selecionado. Clube abre a Central do Clube.
export function TabNavigator() {
  const propostas = useGameStore(state => state.propostasRecebidas.length);
  return (
    // Sob a tab bar o inset inferior do sistema já é consumido pela TabBar —
    // o contexto avisa o Screen do DS para não duplicá-lo (edge-to-edge).
    <ScreenSobTabBarContext.Provider value={true}>
      <Tab.Navigator
        initialRouteName="Home"
        tabBar={renderTabBar}
        screenOptions={{headerShown: false}}>
        <Tab.Screen name="Elenco" component={ElencoStack} />
        <Tab.Screen name="Competition" component={PartidasStack} />
        <Tab.Screen name="Home" component={InicioStack} />
        <Tab.Screen
          name="TransferMarket"
          component={MercadoStack}
          options={{tabBarBadge: propostas > 0 ? propostas : undefined}}
        />
        <Tab.Screen name="Club" component={ClubeStack} />
      </Tab.Navigator>
    </ScreenSobTabBarContext.Provider>
  );
}
