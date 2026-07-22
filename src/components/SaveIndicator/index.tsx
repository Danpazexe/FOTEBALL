/**
 * Indicador global de salvamento ("Salvando… / Salvo ✓"). Aparece nos pontos de
 * commit (fim de partida) quando salvarAgora roda, some sozinho após confirmar.
 * Renderizado uma vez, no topo, sobre todas as telas (App.tsx).
 */
import React, {useEffect} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import Animated, {FadeIn, FadeOut} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Icone from '../Icone';
import {useSaveStatus} from '../../store/useSaveStatus';
import {
  elevacao,
  espacamento,
  raios,
  useEstilosDS,
  useTheme,
  type TemaDS,
} from '../../design-system';

/** Tempo que o "Salvo ✓" fica visível antes de sumir. */
const DURACAO_SALVO_MS = 1600;

export default function SaveIndicator(): React.JSX.Element | null {
  const styles = useEstilosDS(criarEstilos);
  const {cores} = useTheme();
  const insets = useSafeAreaInsets();
  const status = useSaveStatus(state => state.status);
  const ocultar = useSaveStatus(state => state.ocultar);

  // "Salvo" some sozinho após um tempo; "salvando" fica até o save resolver.
  useEffect(() => {
    if (status === 'salvo') {
      const timer = setTimeout(ocultar, DURACAO_SALVO_MS);
      return () => clearTimeout(timer);
    }
  }, [status, ocultar]);

  if (status === 'oculto') {
    return null;
  }
  const salvando = status === 'salvando';

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(240)}
      pointerEvents="none"
      style={[styles.camada, {top: insets.top + espacamento[2]}]}>
      <View style={styles.pill}>
        {salvando ? (
          <ActivityIndicator size="small" color={cores.brand} />
        ) : (
          <Icone nome="check" tamanho={16} cor={cores.success} />
        )}
        <Text style={styles.texto}>{salvando ? 'Salvando…' : 'Salvo'}</Text>
      </View>
    </Animated.View>
  );
}

const criarEstilos = (t: TemaDS) =>
  StyleSheet.create({
    camada: {
      position: 'absolute',
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 50,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacamento[1],
      paddingHorizontal: espacamento[3],
      paddingVertical: espacamento[1],
      borderRadius: raios.full,
      backgroundColor: t.cores.surface,
      borderColor: t.cores.border,
      borderWidth: 1,
      ...elevacao.nivel2,
    },
    texto: {
      color: t.cores.textPrimary,
      fontSize: 13,
      fontWeight: '800',
    },
  });
