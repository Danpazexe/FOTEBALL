import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import Squad from '../../screens/Squad';
import PlayerDetail from '../../screens/PlayerDetail';
import Semana from '../../screens/Semana';
import Academia from '../../screens/Academia';
import type {ElencoStackParamList} from '../types';

const Stack = createNativeStackNavigator<ElencoStackParamList>();

/** Aba Elenco: Plantel (raiz) + Perfil/Tática/Treino/Médico/Base/Comissão. */
export function ElencoStack(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="Squad" component={Squad} />
      <Stack.Screen name="PlayerDetail" component={PlayerDetail} />
      <Stack.Screen name="Semana" component={Semana} />
      <Stack.Screen name="Academia" component={Academia} />
    </Stack.Navigator>
  );
}
