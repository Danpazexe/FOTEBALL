import type {NavigatorScreenParams} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useNavigation} from '@react-navigation/native';

/** Abas inferiores (gestão do clube no dia a dia). */
export type MainTabsParamList = {
  Home: undefined;
  Squad: undefined;
  Tactics: undefined;
  Competition: undefined;
  Club: undefined;
  Settings: undefined;
};

/** Pilha raiz: menu, criação de carreira, app principal e telas modais. */
export type RootStackParamList = {
  MainMenu: undefined;
  LeagueSelect: undefined;
  /** `divisao` filtra os clubes ofertados (Série A/B); ausente = todas. */
  NewCareer: {divisao?: string} | undefined;
  MainTabs: NavigatorScreenParams<MainTabsParamList> | undefined;
  PlayerDetail: {jogadorId: string};
  TransferMarket: undefined;
  MatchSimulation: undefined;
  MatchResult: {partidaId: string};
  PreJogo: undefined;
  Coletiva: undefined;
  Semana: undefined;
  Academia: undefined;
  Gabinete: undefined;
  Calendario: undefined;
  Contratos: undefined;
};

export type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

/** Hook de navegação tipado para uso nas telas. */
export function useAppNavigation(): RootNavigation {
  return useNavigation<RootNavigation>();
}
