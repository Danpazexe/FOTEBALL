import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import MainMenu from '../screens/MainMenu';
import LeagueSelect from '../screens/LeagueSelect';
import NewCareer from '../screens/NewCareer';
import PlayerDetail from '../screens/PlayerDetail';
import ElencoClube from '../screens/ElencoClube';
import Central from '../screens/Central';
import PendenciasClube from '../screens/PendenciasClube';
import MatchSimulation from '../screens/MatchSimulation';
import MatchResult from '../screens/MatchResult';
import PreJogo from '../screens/PreJogo';
import Copa from '../screens/Copa';
import DisputaPenaltis from '../screens/DisputaPenaltis';
import SerieD from '../screens/SerieD';
import Semana from '../screens/Semana';
import Academia from '../screens/Academia';
import Gabinete from '../screens/Gabinete';
import Calendario from '../screens/Calendario';
import Contratos from '../screens/Contratos';
import Settings from '../screens/Settings';
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
      <Stack.Screen name="ElencoClube" component={ElencoClube} />
      <Stack.Screen name="Central" component={Central} />
      <Stack.Screen name="PendenciasClube" component={PendenciasClube} />
      <Stack.Screen
        name="MatchSimulation"
        component={MatchSimulation}
        options={{gestureEnabled: false}}
      />
      <Stack.Screen name="MatchResult" component={MatchResult} />
      <Stack.Screen name="PreJogo" component={PreJogo} />
      <Stack.Screen name="Copa" component={Copa} />
      <Stack.Screen
        name="DisputaPenaltis"
        component={DisputaPenaltis}
        options={{gestureEnabled: false}}
      />
      <Stack.Screen name="SerieD" component={SerieD} />
      <Stack.Screen name="Semana" component={Semana} />
      <Stack.Screen name="Academia" component={Academia} />
      <Stack.Screen name="Gabinete" component={Gabinete} />
      <Stack.Screen name="Calendario" component={Calendario} />
      <Stack.Screen name="Contratos" component={Contratos} />
      <Stack.Screen name="Settings" component={Settings} />
      <Stack.Screen name="Tactics" component={Tactics} />
      <Stack.Screen
        name="Demissao"
        component={Demissao}
        options={{gestureEnabled: false}}
      />
    </Stack.Navigator>
  );
}
