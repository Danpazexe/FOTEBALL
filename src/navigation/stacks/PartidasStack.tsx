import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import Competition from '../../screens/Competition';
import Calendario from '../../screens/Calendario';
import type {PartidasStackParamList} from '../types';

const Stack = createNativeStackNavigator<PartidasStackParamList>();

/** Aba Partidas: Calendário (raiz, os JOGOS) + Classificação/Pré-jogo/Relatório.
 * A tabela (Competition) é interna, acessível pelo header do Calendário. */
export function PartidasStack(): React.JSX.Element {
  return (
    <Stack.Navigator
      initialRouteName="Calendario"
      screenOptions={{headerShown: false}}>
      <Stack.Screen name="Calendario" component={Calendario} />
      <Stack.Screen name="Competition" component={Competition} />
    </Stack.Navigator>
  );
}
