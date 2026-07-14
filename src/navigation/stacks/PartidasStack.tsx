import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import Competition from '../../screens/Competition';
import Calendario from '../../screens/Calendario';
import PreJogo from '../../screens/PreJogo';
import MatchResult from '../../screens/MatchResult';
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
      <Stack.Screen name="PreJogo" component={PreJogo} />
      <Stack.Screen name="MatchResult" component={MatchResult} />
    </Stack.Navigator>
  );
}
