import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import TransferMarket from '../../screens/TransferMarket';
import type {MercadoStackParamList} from '../types';

const Stack = createNativeStackNavigator<MercadoStackParamList>();

/** Aba Mercado: TransferMarket (raiz) + Olheiro/Negociação (fases seguintes). */
export function MercadoStack(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="TransferMarket" component={TransferMarket} />
    </Stack.Navigator>
  );
}
