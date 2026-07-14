import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import TransferMarket from '../../screens/TransferMarket';
import Negociacao from '../../screens/Negociacao';
import CentralOlheiro from '../../screens/CentralOlheiro';
import type {MercadoStackParamList} from '../types';

const Stack = createNativeStackNavigator<MercadoStackParamList>();

/** Aba Mercado: TransferMarket (raiz) + Negociação/Olheiro (fases seguintes). */
export function MercadoStack(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="TransferMarket" component={TransferMarket} />
      <Stack.Screen name="Negociacao" component={Negociacao} />
      <Stack.Screen name="CentralOlheiro" component={CentralOlheiro} />
    </Stack.Navigator>
  );
}
