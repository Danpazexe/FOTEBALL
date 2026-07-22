/**
 * Tab bar customizada e animada (react-native-reanimated). Ao focar uma aba, o
 * ícone SOBE e cresce com mola, uma pílula surge atrás dele e o rótulo ganha
 * cor/opacidade. Migrada ao Design System v2 (superfície clara, ação azul).
 */
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {StackActions} from '@react-navigation/native';
import type {BottomTabBarProps} from '@react-navigation/bottom-tabs';

import Icone, {type IconeNome} from '../Icone';
import {raios, useEstilosDS, useTheme, type TemaDS} from '../../design-system';

const ICONES: Record<string, IconeNome> = {
  Home: 'inicio',
  Elenco: 'elenco',
  Competition: 'calendario',
  TransferMarket: 'mercado',
  Club: 'clube',
};

const ROTULOS: Record<string, string> = {
  Home: 'Início',
  Elenco: 'Elenco',
  Competition: 'Partidas',
  TransferMarket: 'Mercado',
  Club: 'Clube',
};

const MOLA = {damping: 15, stiffness: 170, mass: 0.6};

function TabItem({
  nome,
  focado,
  badge,
  onPress,
}: {
  nome: string;
  focado: boolean;
  badge?: number | string;
  onPress: () => void;
}): React.JSX.Element {
  const {cores, esquema} = useTheme();
  const styles = useEstilosDS(criarEstilos);
  const p = useDerivedValue(() => withSpring(focado ? 1 : 0, MOLA), [focado]);

  const pilulaStyle = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{scale: 0.5 + p.value * 0.5}],
  }));
  const iconeStyle = useAnimatedStyle(() => ({
    transform: [{translateY: -p.value * 4}, {scale: 1 + p.value * 0.12}],
  }));
  const rotuloStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + p.value * 0.45,
    transform: [{translateY: -p.value * 3}],
  }));

  const cor = focado ? cores.brand : cores.textSecondary;
  // Rótulo pequeno (10.5px): no tema claro o verde-bandeira puro fica ~3.4:1
  // sobre a superfície — texto usa brandStrong (AA); o ícone mantém o brand.
  const corRotulo = focado
    ? esquema === 'claro'
      ? cores.brandStrong
      : cores.brand
    : cores.textSecondary;

  return (
    <Pressable
      style={styles.item}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{selected: focado}}
      accessibilityLabel={ROTULOS[nome]}>
      <View style={styles.iconeWrap}>
        <Animated.View style={[styles.pilula, pilulaStyle]} />
        <Animated.View style={iconeStyle}>
          <Icone nome={ICONES[nome] ?? 'inicio'} tamanho={23} cor={cor} />
        </Animated.View>
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeTxt}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Animated.Text
        style={[styles.rotulo, {color: corRotulo}, rotuloStyle]}
        numberOfLines={1}>
        {ROTULOS[nome] ?? nome}
      </Animated.Text>
    </Pressable>
  );
}

export default function TabBar({
  state,
  navigation,
  descriptors,
}: BottomTabBarProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const styles = useEstilosDS(criarEstilos);
  // Edge-to-edge: SOMA o inset da gesture/nav bar ao respiro próprio — os
  // ícones e rótulos nunca ficam atrás da barra do sistema.
  return (
    <View style={[styles.barra, {paddingBottom: insets.bottom + 10}]}>
      {state.routes.map((route, index) => {
        const focado = state.index === index;
        const badge = descriptors[route.key]?.options.tabBarBadge as
          | number
          | string
          | undefined;
        const onPress = () => {
          const evento = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (evento.defaultPrevented) {
            return;
          }
          if (focado) {
            // Re-toque na aba ativa → volta ao topo do stack daquela área.
            const nested = route.state;
            if (nested && 'key' in nested && (nested.index ?? 0) > 0) {
              navigation.dispatch({
                ...StackActions.popToTop(),
                target: nested.key,
              });
            }
          } else {
            navigation.navigate(route.name);
          }
        };
        return (
          <TabItem
            key={route.key}
            nome={route.name}
            focado={focado}
            badge={badge}
            onPress={onPress}
          />
        );
      })}
    </View>
  );
}

const criarEstilos = (t: TemaDS) =>
  StyleSheet.create({
    barra: {
      alignItems: 'center',
      backgroundColor: t.cores.surface,
      borderTopColor: t.cores.border,
      borderTopWidth: 1,
      flexDirection: 'row',
      paddingTop: 10,
    },
    item: {
      alignItems: 'center',
      flex: 1,
      gap: 3,
      justifyContent: 'center',
    },
    iconeWrap: {
      alignItems: 'center',
      height: 34,
      justifyContent: 'center',
      width: 56,
    },
    pilula: {
      backgroundColor: t.cores.brandSoft,
      borderRadius: raios.full,
      bottom: 0,
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
    },
    rotulo: {
      fontSize: 10.5,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    badge: {
      alignItems: 'center',
      backgroundColor: t.cores.danger,
      borderRadius: 999,
      minWidth: 16,
      paddingHorizontal: 4,
      position: 'absolute',
      right: 6,
      top: -2,
    },
    badgeTxt: {
      color: t.cores.onBrand,
      fontSize: 10,
      fontWeight: '800',
    },
  });
