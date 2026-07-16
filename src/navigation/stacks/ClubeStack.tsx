import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import CentralClube from '../../screens/CentralClube';
import Club from '../../screens/Club';
import Financas from '../../screens/Financas';
import Carreira from '../../screens/Carreira';
import Patrocinios from '../../screens/Patrocinios';
import type {ClubeStackParamList} from '../types';

const Stack = createNativeStackNavigator<ClubeStackParamList>();

/** Aba Clube: abre a Central do Clube (hub); Visão geral e demais áreas são
 * telas internas navegadas a partir do hub. */
export function ClubeStack(): React.JSX.Element {
  return (
    <Stack.Navigator
      initialRouteName="CentralClube"
      screenOptions={{headerShown: false}}>
      <Stack.Screen name="CentralClube" component={CentralClube} />
      <Stack.Screen name="Club" component={Club} />
      <Stack.Screen name="Financas" component={Financas} />
      <Stack.Screen name="Carreira" component={Carreira} />
      <Stack.Screen name="Patrocinios" component={Patrocinios} />
    </Stack.Navigator>
  );
}
