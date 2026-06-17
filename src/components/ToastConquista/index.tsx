import React, {useEffect} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, {SlideInUp, SlideOutUp} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useAchievementsStore} from '../../store/useAchievementsStore';
import {cores, espaco, raio} from '../../theme';

const DURACAO_MS = 3200;

/** Toast deslizante mostrado quando uma conquista é desbloqueada (Módulo 15). */
function ToastConquista(): React.JSX.Element | null {
  const novas = useAchievementsStore(state => state.novasNaoVistas);
  const conquistas = useAchievementsStore(state => state.conquistas);
  const marcarComoVistas = useAchievementsStore(state => state.marcarComoVistas);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (novas.length === 0) {
      return;
    }
    const timer = setTimeout(() => marcarComoVistas(), DURACAO_MS);
    return () => clearTimeout(timer);
  }, [novas, marcarComoVistas]);

  const atual =
    novas.length > 0
      ? conquistas.find(conquista => conquista.id === novas[0])
      : undefined;
  if (!atual) {
    return null;
  }

  return (
    <Animated.View
      entering={SlideInUp}
      exiting={SlideOutUp}
      pointerEvents="none"
      style={[styles.wrap, {top: insets.top + espaco.sm}]}>
      <View style={[styles.iconeBox, {borderColor: atual.corIcone}]}>
        <MaterialCommunityIcons
          name={atual.icone}
          size={28}
          color={atual.corIcone}
        />
      </View>
      <View style={styles.texto}>
        <Text style={styles.cabecalho}>Conquista desbloqueada!</Text>
        <Text style={styles.nome}>{atual.nome}</Text>
        <Text style={styles.descricao}>{atual.descricao}</Text>
      </View>
    </Animated.View>
  );
}

export default ToastConquista;

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    backgroundColor: cores.superficie,
    borderColor: cores.secundaria,
    borderRadius: raio.md,
    borderWidth: 1,
    elevation: 12,
    flexDirection: 'row',
    gap: espaco.md,
    left: espaco.md,
    padding: espaco.md,
    position: 'absolute',
    right: espaco.md,
    zIndex: 999,
  },
  iconeBox: {
    alignItems: 'center',
    backgroundColor: cores.fundo,
    borderRadius: 30,
    borderWidth: 2,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  texto: {
    flex: 1,
  },
  cabecalho: {
    color: cores.secundaria,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  nome: {
    color: cores.texto,
    fontSize: 16,
    fontWeight: '900',
  },
  descricao: {
    color: cores.textoSecundario,
    fontSize: 12,
  },
});
