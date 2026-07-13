import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import Squad from '../../screens/Squad';
import type {ElencoStackParamList} from '../types';

const Stack = createNativeStackNavigator<ElencoStackParamList>();

/** Aba Elenco: Plantel (raiz) + Perfil/Tática/Treino/Médico/Base/Comissão. */
export function ElencoStack(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="Squad" component={Squad} />
    </Stack.Navigator>
  );
}
