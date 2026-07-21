import {useCallback} from 'react';
import type {
  CompositeNavigationProp,
  NavigationProp,
  NavigatorScreenParams,
  ParamListBase,
  RouteProp,
} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useNavigation, useRoute} from '@react-navigation/native';

import type {DisputaPenaltisCopa} from '../store/useGameStore';

// ─── Stacks internos de cada aba ────────────────────────────────────────────
// Cada área da tab bar tem seu próprio Stack Navigator; as telas internas rolam
// por baixo com a tab bar VISÍVEL e o ícone da área selecionado. As telas ainda
// não migradas para os stacks seguem no RootStack (cobrindo a barra) e serão
// movidas nas fases seguintes.

export type InicioStackParamList = {
  Home: undefined;
  Noticias: undefined;
};

export type ElencoStackParamList = {
  Squad: undefined;
  PlayerDetail: {jogadorId: string};
  Semana: undefined;
  Academia: undefined;
  DepartamentoMedico: undefined;
  Performance: undefined;
  Desenvolvimento: undefined;
};

export type PartidasStackParamList = {
  Competition: undefined;
  Calendario: undefined;
  PreJogo: undefined;
  MatchResult: {partidaId: string};
};

export type MercadoStackParamList = {
  TransferMarket: undefined;
  Negociacao: {jogadorId: string};
  CentralOlheiro: undefined;
};

/** Aba Clube: abre a CENTRAL DO CLUBE (hub); a visão geral é uma tela interna. */
export type ClubeStackParamList = {
  CentralClube: undefined;
  Club: undefined;
  Financas: undefined;
  Carreira: undefined;
  Patrocinios: undefined;
};

/** Abas inferiores (ordem): Elenco · Partidas · Início · Mercado · Clube. Cada
 * uma hospeda um Stack Navigator próprio. */
export type MainTabsParamList = {
  Elenco: NavigatorScreenParams<ElencoStackParamList> | undefined;
  /** "Partidas" — Stack com Competition/Calendário/Pré-jogo/… */
  Competition: NavigatorScreenParams<PartidasStackParamList> | undefined;
  Home: NavigatorScreenParams<InicioStackParamList> | undefined;
  /** "Mercado" — Stack com TransferMarket/Olheiro/Negociação/… */
  TransferMarket: NavigatorScreenParams<MercadoStackParamList> | undefined;
  Club: NavigatorScreenParams<ClubeStackParamList> | undefined;
};

/** Pilha raiz: menu, criação de carreira, app principal e telas modais. */
export type RootStackParamList = {
  MainMenu: undefined;
  LeagueSelect: undefined;
  /** `divisao` filtra os clubes ofertados (Série A/B); ausente = todas. */
  NewCareer: {divisao?: string} | undefined;
  MainTabs: NavigatorScreenParams<MainTabsParamList> | undefined;
  PlayerDetail: {jogadorId: string};
  /** Ficha de elenco de um clube qualquer (ex.: tocar um time na Classificação). */
  ElencoClube: {clubeId: string};
  /** `copa: true` joga o confronto da Copa do usuário (em vez do jogo da liga). */
  MatchSimulation: {copa?: boolean} | undefined;
  MatchResult: {partidaId: string};
  PreJogo: undefined;
  Copa: undefined;
  /** Acompanhamento ao vivo da disputa de pênaltis da Copa (resultado já commitado). */
  DisputaPenaltis: {disputa: DisputaPenaltisCopa};
  /** Chaveamento da Série D (carreira na D): grupos → mata-mata. */
  SerieD: undefined;
  Semana: undefined;
  Academia: undefined;
  Gabinete: undefined;
  Calendario: undefined;
  Contratos: undefined;
  Tactics: undefined;
  Demissao: undefined;
  /** Ajustes saiu da tab bar; agora é tela de stack (acessível pela Home). */
  Settings: undefined;
};

export type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

/** Navegação da aba Clube: navega dentro do ClubeStack E sobe para o RootStack
 * (telas ainda não migradas). Tipagem composta, sem `any`. */
export type ClubeNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<ClubeStackParamList>,
  RootNavigation
>;

/** Navegação da aba Partidas: PartidasStack + RootStack. */
export type PartidasNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<PartidasStackParamList>,
  RootNavigation
>;

/** Navegação da aba Mercado: MercadoStack + RootStack. */
export type MercadoNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<MercadoStackParamList>,
  RootNavigation
>;

/** Navegação da aba Início: InicioStack + RootStack. */
export type InicioNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<InicioStackParamList>,
  RootNavigation
>;

/** Navegação da aba Elenco: ElencoStack + RootStack. */
export type ElencoNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<ElencoStackParamList>,
  RootNavigation
>;

/** Hook de navegação tipado para uso nas telas. */
export function useAppNavigation(): RootNavigation {
  return useNavigation<RootNavigation>();
}

/** Hook de navegação da aba Clube (ClubeStack + RootStack). */
export function useClubeNavigation(): ClubeNavigation {
  return useNavigation<ClubeNavigation>();
}

/** Hook de navegação da aba Partidas (PartidasStack + RootStack). */
export function usePartidasNavigation(): PartidasNavigation {
  return useNavigation<PartidasNavigation>();
}

/** Hook de navegação da aba Mercado (MercadoStack + RootStack). */
export function useMercadoNavigation(): MercadoNavigation {
  return useNavigation<MercadoNavigation>();
}

/** Hook de navegação da aba Início (InicioStack + RootStack). */
export function useInicioNavigation(): InicioNavigation {
  return useNavigation<InicioNavigation>();
}

/** Hook de navegação da aba Elenco (ElencoStack + RootStack). */
export function useElencoNavigation(): ElencoNavigation {
  return useNavigation<ElencoNavigation>();
}

// ─── Voltar com fallback ────────────────────────────────────────────────────

/** Interseção dos param lists dos stacks (chaves repetidas têm o MESMO tipo).
 * Exclui MainTabsParamList, cujas chaves colidem com tipos diferentes. */
type IntersecaoStacks = RootStackParamList &
  InicioStackParamList &
  ElencoStackParamList &
  PartidasStackParamList &
  MercadoStackParamList &
  ClubeStackParamList;

/** Achata a interseção num objeto único para valer como ParamList. */
type ParamListApp = {[K in keyof IntersecaoStacks]: IntersecaoStacks[K]};

/** Rotas SEM parâmetros — as únicas aceitas como fallback do voltar. */
type RotaVoltarFallback = {
  [R in keyof ParamListApp]: ParamListApp[R] extends undefined ? R : never;
}[keyof ParamListApp];

/** Voltar com fallback: volta na pilha se houver histórico; senão navega para
 * `rotaFallback` (tela aberta como raiz do stack, ex.: por atalho/reset).
 * O parâmetro trava nas rotas reais SEM params; por baixo o navigate é por
 * nome e sobe até o navigator dono da rota (mesmo runtime do padrão inline). */
export function useVoltarOu(rotaFallback: RotaVoltarFallback): () => void {
  const nav = useNavigation<NavigationProp<ParamListBase>>();
  return useCallback(() => {
    if (nav.canGoBack()) {
      nav.goBack();
      return;
    }
    // Alarga a união de literais para string: o navigate do v7 não aceita
    // união no nome; a validade da rota já foi garantida pelo tipo acima.
    const rota: string = rotaFallback;
    nav.navigate(rota);
  }, [nav, rotaFallback]);
}

/** Hook de rota tipado (acessa `route.params` da tela atual). */
export function useAppRoute<T extends keyof RootStackParamList>(): RouteProp<
  RootStackParamList,
  T
> {
  return useRoute<RouteProp<RootStackParamList, T>>();
}
