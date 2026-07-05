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
import {cores, espaco, raio, sombra} from '../../theme';

/** Tempo que o "Salvo ✓" fica visível antes de sumir. */
const DURACAO_SALVO_MS = 1600;

export default function SaveIndicator(): React.JSX.Element | null {
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
      style={[styles.camada, {top: insets.top + espaco.sm}]}>
      <View style={styles.pill}>
        {salvando ? (
          <ActivityIndicator size="small" color={cores.primaria} />
        ) : (
          <Icone nome="check" tamanho={16} cor={cores.sucesso} />
        )}
        <Text style={styles.texto}>{salvando ? 'Salvando…' : 'Salvo'}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
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
    gap: espaco.xs,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.xs,
    borderRadius: raio.pill,
    backgroundColor: cores.superficieElevada,
    borderColor: cores.bordaTransl,
    borderWidth: 1,
    ...sombra.card,
  },
  texto: {
    color: cores.texto,
    fontSize: 13,
    fontWeight: '800',
  },
});
