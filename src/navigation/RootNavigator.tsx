import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import MainMenu from '../screens/MainMenu';
import LeagueSelect from '../screens/LeagueSelect';
import NewCareer from '../screens/NewCareer';
import PlayerDetail from '../screens/PlayerDetail';
import TransferMarket from '../screens/TransferMarket';
import MatchSimulation from '../screens/MatchSimulation';
import MatchResult from '../screens/MatchResult';
import PreJogo from '../screens/PreJogo';
import Copa from '../screens/Copa';
import Penaltis from '../screens/Penaltis';
import SerieD from '../screens/SerieD';
import Semana from '../screens/Semana';
import Academia from '../screens/Academia';
import Gabinete from '../screens/Gabinete';
import Calendario from '../screens/Calendario';
import Contratos from '../screens/Contratos';
import Squad from '../screens/Squad';
import Tactics from '../screens/Tactics';
import Demissao from '../screens/Demissao';
import {TabNavigator} from './TabNavigator';
import type {RootStackParamList} from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="MainMenu"
      screenOptions={{headerShown: false}}>
      <Stack.Screen name="MainMenu" component={MainMenu} />
      <Stack.Screen name="LeagueSelect" component={LeagueSelect} />
      <Stack.Screen name="NewCareer" component={NewCareer} />
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen
        name="PlayerDetail"
        component={PlayerDetail}
        options={{presentation: 'modal'}}
      />
      <Stack.Screen name="TransferMarket" component={TransferMarket} />
      <Stack.Screen
        name="MatchSimulation"
        component={MatchSimulation}
        options={{gestureEnabled: false}}
      />
      <Stack.Screen name="MatchResult" component={MatchResult} />
      <Stack.Screen name="PreJogo" component={PreJogo} />
      <Stack.Screen name="Copa" component={Copa} />
      <Stack.Screen
        name="Penaltis"
        component={Penaltis}
        options={{gestureEnabled: false}}
      />
      <Stack.Screen name="SerieD" component={SerieD} />
      <Stack.Screen name="Semana" component={Semana} />
      <Stack.Screen name="Academia" component={Academia} />
      <Stack.Screen name="Gabinete" component={Gabinete} />
      <Stack.Screen name="Calendario" component={Calendario} />
      <Stack.Screen name="Contratos" component={Contratos} />
      <Stack.Screen name="Squad" component={Squad} />
      <Stack.Screen name="Tactics" component={Tactics} />
      <Stack.Screen
        name="Demissao"
        component={Demissao}
        options={{gestureEnabled: false}}
      />
    </Stack.Navigator>
  );
}
