import React from 'react';
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';

import {useGameStore} from '../store/useGameStore';
import TabBar from '../components/TabBar';
import Home from '../screens/Home';
import Competition from '../screens/Competition';
import TransferMarket from '../screens/TransferMarket';
import Squad from '../screens/Squad';
import Club from '../screens/Club';
import type {MainTabsParamList} from './types';

const Tab = createBottomTabNavigator<MainTabsParamList>();

// Estável (fora do render) — evita recriar o componente da tab bar a cada frame.
const renderTabBar = (props: BottomTabBarProps): React.JSX.Element => (
  <TabBar {...props} />
);

// Abas: Elenco · Partidas · Início · Mercado · Clube (Início ao CENTRO). Elenco
// reusa a tela Squad; "Partidas" reusa Competition e "Mercado" reusa
// TransferMarket. Central e Ajustes saíram da barra (telas de stack).
export function TabNavigator() {
  const propostas = useGameStore(state => state.propostasRecebidas.length);
  return (
    <Tab.Navigator
      initialRouteName="Home"
      tabBar={renderTabBar}
      screenOptions={{headerShown: false}}>
      <Tab.Screen name="Elenco" component={Squad} />
      <Tab.Screen name="Competition" component={Competition} />
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen
        name="TransferMarket"
        component={TransferMarket}
        options={{tabBarBadge: propostas > 0 ? propostas : undefined}}
      />
      <Tab.Screen name="Club" component={Club} />
    </Tab.Navigator>
  );
}
