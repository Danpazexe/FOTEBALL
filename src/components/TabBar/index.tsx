/**
 * Tab bar customizada e animada (react-native-reanimated). Ao focar uma aba, o
 * ícone SOBE e cresce com mola, uma pílula verde surge atrás dele e o rótulo
 * ganha cor/opacidade — transições suaves em vez do troca-seca padrão.
 */
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import type {BottomTabBarProps} from '@react-navigation/bottom-tabs';

import Icone, {type IconeNome} from '../Icone';
import {cores, raio, sombra, suaves} from '../../theme';

const ICONES: Record<string, IconeNome> = {
  Central: 'central',
  Competition: 'tabela',
  Home: 'inicio',
  Club: 'clube',
  Settings: 'ajustes',
};

const ROTULOS: Record<string, string> = {
  Central: 'Central',
  Competition: 'Tabela',
  Home: 'Início',
  Club: 'Clube',
  Settings: 'Ajustes',
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

  const cor = focado ? cores.primaria : cores.textoSecundario;

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
        style={[styles.rotulo, {color: cor}, rotuloStyle]}
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
  return (
    <View style={[styles.barra, {paddingBottom: Math.max(insets.bottom, 10)}]}>
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
          if (!focado && !evento.defaultPrevented) {
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

const styles = StyleSheet.create({
  barra: {
    alignItems: 'center',
    backgroundColor: cores.superficieElevada,
    borderTopColor: cores.bordaTransl,
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingTop: 10,
    ...sombra.suave,
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
    backgroundColor: suaves.verde,
    borderRadius: raio.pill,
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
    backgroundColor: cores.perigo,
    borderRadius: 999,
    minWidth: 16,
    paddingHorizontal: 4,
    position: 'absolute',
    right: 6,
    top: -2,
  },
  badgeTxt: {
    color: cores.superficie,
    fontSize: 10,
    fontWeight: '800',
  },
});
