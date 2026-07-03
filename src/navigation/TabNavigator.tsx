import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';

import {cores} from '../theme';
import {useGameStore} from '../store/useGameStore';
import Icone, {type IconeNome} from '../components/Icone';
import Home from '../screens/Home';
import Squad from '../screens/Squad';
import Tactics from '../screens/Tactics';
import Competition from '../screens/Competition';
import Club from '../screens/Club';
import Settings from '../screens/Settings';
import type {MainTabsParamList} from './types';

const Tab = createBottomTabNavigator<MainTabsParamList>();

const ICONES: Record<keyof MainTabsParamList, IconeNome> = {
  Home: 'inicio',
  Squad: 'elenco',
  Tactics: 'tatica',
  Competition: 'tabela',
  Club: 'clube',
  Settings: 'ajustes',
};

const ROTULOS: Record<keyof MainTabsParamList, string> = {
  Home: 'Início',
  Squad: 'Elenco',
  Tactics: 'Tática',
  Competition: 'Tabela',
  Club: 'Clube',
  Settings: 'Ajustes',
};

export function TabNavigator() {
  const propostas = useGameStore(state => state.propostasRecebidas.length);
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarActiveTintColor: cores.primaria,
        tabBarInactiveTintColor: cores.textoSecundario,
        tabBarStyle: {
          // Tab bar clara (modelo SofaScore): superfície branca + fio sutil.
          backgroundColor: cores.superficieElevada,
          borderTopColor: cores.bordaTransl,
          borderTopWidth: 1,
          elevation: 0,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '800',
          letterSpacing: 0.5,
        },
        tabBarLabel: ROTULOS[route.name],
        tabBarIcon: ({color}) => (
          <Icone nome={ICONES[route.name]} tamanho={22} cor={color} />
        ),
      })}>
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Squad" component={Squad} />
      <Tab.Screen name="Tactics" component={Tactics} />
      <Tab.Screen name="Competition" component={Competition} />
      <Tab.Screen
        name="Club"
        component={Club}
        options={{tabBarBadge: propostas > 0 ? propostas : undefined}}
      />
      <Tab.Screen name="Settings" component={Settings} />
    </Tab.Navigator>
  );
}
