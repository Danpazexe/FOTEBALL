import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import Home from '../../screens/Home';
import type {InicioStackParamList} from '../types';

const Stack = createNativeStackNavigator<InicioStackParamList>();

/** Aba Início: Home (raiz) + Notícias/Notificações/Pendências (fases seguintes). */
export function InicioStack(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="Home" component={Home} />
    </Stack.Navigator>
  );
}
