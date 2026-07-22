import React, {useEffect} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Animated, {SlideInUp, SlideOutUp} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {IconeGlifo} from '../Icone';
import {useAchievementsStore} from '../../store/useAchievementsStore';
import {
  espacamento,
  raios,
  useEstilosDS,
  type TemaDS,
} from '../../design-system';

const DURACAO_MS = 3200;

/** Toast deslizante mostrado quando uma conquista é desbloqueada (Módulo 15). */
function ToastConquista(): React.JSX.Element | null {
  const styles = useEstilosDS(criarEstilos);
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
      style={[styles.wrap, {top: insets.top + espacamento[2]}]}>
      <View style={[styles.iconeBox, {borderColor: atual.corIcone}]}>
        <IconeGlifo nome={atual.icone} tamanho={28} cor={atual.corIcone} />
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

const criarEstilos = (t: TemaDS) =>
  StyleSheet.create({
    wrap: {
      alignItems: 'center',
      backgroundColor: t.cores.surface,
      // Âmbar de conquista (token accent: "gol, craque, conquista").
      borderColor: t.cores.accent,
      borderRadius: raios.md,
      borderWidth: 1,
      elevation: 12,
      flexDirection: 'row',
      gap: espacamento[3],
      left: espacamento[3],
      padding: espacamento[3],
      position: 'absolute',
      right: espacamento[3],
      zIndex: 999,
    },
    iconeBox: {
      alignItems: 'center',
      backgroundColor: t.cores.canvas,
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
      color: t.cores.accent,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    nome: {
      color: t.cores.textPrimary,
      fontSize: 16,
      fontWeight: '900',
    },
    descricao: {
      color: t.cores.textSecondary,
      fontSize: 12,
    },
  });
