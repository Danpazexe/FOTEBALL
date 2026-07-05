import React from 'react';
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';

import {useGameStore} from '../store/useGameStore';
import TabBar from '../components/TabBar';
import Home from '../screens/Home';
import Central from '../screens/Central';
import Competition from '../screens/Competition';
import Club from '../screens/Club';
import Settings from '../screens/Settings';
import type {MainTabsParamList} from './types';

const Tab = createBottomTabNavigator<MainTabsParamList>();

// Estável (fora do render) — evita recriar o componente da tab bar a cada frame.
const renderTabBar = (props: BottomTabBarProps): React.JSX.Element => (
  <TabBar {...props} />
);

export function TabNavigator() {
  const propostas = useGameStore(state => state.propostasRecebidas.length);
  return (
    <Tab.Navigator
      initialRouteName="Home"
      tabBar={renderTabBar}
      screenOptions={{headerShown: false}}>
      <Tab.Screen name="Central" component={Central} />
      <Tab.Screen name="Competition" component={Competition} />
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen
        name="Club"
        component={Club}
        options={{tabBarBadge: propostas > 0 ? propostas : undefined}}
      />
      <Tab.Screen name="Settings" component={Settings} />
    </Tab.Navigator>
  );
}
