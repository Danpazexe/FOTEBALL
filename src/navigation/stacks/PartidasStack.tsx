import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import Competition from '../../screens/Competition';
import Calendario from '../../screens/Calendario';
import type {PartidasStackParamList} from '../types';

const Stack = createNativeStackNavigator<PartidasStackParamList>();

/** Aba Partidas: Competition (raiz) + Calendário/Pré-jogo/Relatório (fases). */
export function PartidasStack(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="Competition" component={Competition} />
      <Stack.Screen name="Calendario" component={Calendario} />
    </Stack.Navigator>
  );
}
