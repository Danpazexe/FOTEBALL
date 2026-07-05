/**
 * Disco de vinil flutuante (só na tela inicial). Gira enquanto a música toca e
 * para quando muda/muta. Ao tocar, abre um mini-player para escolher a faixa,
 * mutar e ajustar o volume — tudo persistido em `config` (a música em si é
 * contínua e vive em src/audio/musica.ts, dirigida pelo App).
 */
import React, {useEffect, useState} from 'react';
import {Modal, Pressable, StyleSheet, Switch, Text, View} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Botao} from '../ui';
import Icone from '../Icone';
import {FAIXAS_MUSICA} from '../../audio/musica';
import {useGameStore} from '../../store/useGameStore';
import {cores, espaco, raio, sombra} from '../../theme';

/** Níveis de volume (sem lib de slider — controle em degraus). */
const NIVEIS_VOLUME = [0, 0.25, 0.5, 0.75, 1] as const;

export default function DiscoVinil(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [aberto, setAberto] = useState(false);

  const habilitada = useGameStore(state => state.config.musicaHabilitada);
  const selecionada = useGameStore(state => state.config.musicaSelecionada);
  const volumeMusica = useGameStore(state => state.config.volumeMusica);
  const atualizarConfig = useGameStore(state => state.atualizarConfig);

  // Gira enquanto a música está ligada; congela quando muta.
  const angulo = useSharedValue(0);
  useEffect(() => {
    if (habilitada) {
      angulo.value = 0;
      angulo.value = withRepeat(
        withTiming(360, {duration: 3200, easing: Easing.linear}),
        -1,
        false,
      );
    } else {
      cancelAnimation(angulo);
    }
  }, [habilitada, angulo]);
  const discoStyle = useAnimatedStyle(() => ({
    transform: [{rotate: `${angulo.value}deg`}],
  }));

  const faixaAtual = FAIXAS_MUSICA[selecionada]?.titulo ?? 'Música';

  return (
    <>
      <Pressable
        style={[styles.flutuante, {top: insets.top + 10}]}
        onPress={() => setAberto(true)}
        accessibilityRole="button"
        accessibilityLabel={`Música: ${habilitada ? faixaAtual : 'mutada'}`}
      >
        <Animated.View
          style={[styles.disco, discoStyle, !habilitada && styles.discoMudo]}
        >
          <View style={styles.groove1} />
          <View style={styles.groove2} />
          <View style={styles.label} />
          <View style={styles.furo} />
        </Animated.View>
      </Pressable>

      <Modal
        visible={aberto}
        transparent
        animationType="fade"
        onRequestClose={() => setAberto(false)}
        statusBarTranslucent
      >
        <Pressable style={styles.backdrop} onPress={() => setAberto(false)}>
          <Pressable
            style={[styles.folha, {paddingBottom: insets.bottom + espaco.lg}]}
            onPress={() => {}}
          >
            <View style={styles.folhaTopo}>
              <Text style={styles.folhaTitulo}>Música</Text>
              <Pressable
                onPress={() => setAberto(false)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Fechar"
              >
                <Icone nome="fechar" tamanho={22} cor={cores.textoSecundario} />
              </Pressable>
            </View>

            <View style={styles.linhaSwitch}>
              <View style={styles.flex1}>
                <Text style={styles.linhaRotulo}>Tocar música</Text>
                <Text style={styles.descricao}>
                  {habilitada ? `Tocando: ${faixaAtual}` : 'Mutada'}
                </Text>
              </View>
              <Switch
                value={habilitada}
                onValueChange={valor =>
                  atualizarConfig({musicaHabilitada: valor})
                }
                trackColor={{false: cores.borda, true: cores.primaria}}
                thumbColor={cores.contrastePrimaria}
              />
            </View>

            <Text style={styles.secao}>Faixa</Text>
            <View style={styles.chipRow}>
              {FAIXAS_MUSICA.map(faixa => (
                <View key={faixa.id} style={styles.flex1}>
                  <Botao
                    titulo={faixa.titulo}
                    variante={
                      selecionada === faixa.id ? 'primaria' : 'secundaria'
                    }
                    onPress={() =>
                      atualizarConfig({musicaSelecionada: faixa.id})
                    }
                  />
                </View>
              ))}
            </View>

            <Text style={styles.secao}>Volume</Text>
            <View style={styles.volumeRow}>
              {NIVEIS_VOLUME.map(nivel => {
                const ativo = Math.abs(volumeMusica - nivel) < 0.01;
                return (
                  <Pressable
                    key={nivel}
                    onPress={() => atualizarConfig({volumeMusica: nivel})}
                    accessibilityRole="button"
                    accessibilityLabel={
                      nivel === 0
                        ? 'Mudo'
                        : `${Math.round(nivel * 100)} por cento`
                    }
                    style={[styles.volumeChip, ativo && styles.volumeChipAtivo]}
                  >
                    <Text
                      style={[styles.volumeTxt, ativo && styles.volumeTxtAtivo]}
                    >
                      {nivel === 0 ? 'Mudo' : `${Math.round(nivel * 100)}%`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const TAM_DISCO = 56;

const styles = StyleSheet.create({
  flutuante: {
    position: 'absolute',
    right: espaco.lg,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...sombra.card,
  },
  disco: {
    width: TAM_DISCO,
    height: TAM_DISCO,
    borderRadius: TAM_DISCO / 2,
    backgroundColor: '#161616',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: cores.bordaTransl,
  },
  groove1: {
    position: 'absolute',
    top: 7,
    left: 7,
    right: 7,
    bottom: 7,
    borderRadius: TAM_DISCO / 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  groove2: {
    position: 'absolute',
    top: 13,
    left: 13,
    right: 13,
    bottom: 13,
    borderRadius: TAM_DISCO / 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  label: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: cores.primaria,
  },
  furo: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#161616',
  },
  // Mutado: disco apagado (e sem girar).
  discoMudo: {
    opacity: 0.4,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  folha: {
    backgroundColor: cores.superficie,
    borderTopLeftRadius: raio.xl,
    borderTopRightRadius: raio.xl,
    paddingHorizontal: espaco.lg,
    paddingTop: espaco.lg,
    gap: espaco.md,
  },
  folhaTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  folhaTitulo: {
    color: cores.texto,
    fontSize: 18,
    fontWeight: '800',
  },
  linhaSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaco.md,
  },
  flex1: {
    flex: 1,
  },
  linhaRotulo: {
    color: cores.texto,
    fontSize: 15,
    fontWeight: '800',
  },
  descricao: {
    color: cores.textoSecundario,
    fontSize: 13,
    marginTop: 2,
  },
  secao: {
    color: cores.texto,
    fontSize: 13,
    fontWeight: '800',
  },
  chipRow: {
    flexDirection: 'row',
    gap: espaco.sm,
  },
  volumeRow: {
    flexDirection: 'row',
    gap: espaco.xs,
  },
  volumeChip: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    backgroundColor: cores.superficieElevada,
    borderColor: cores.bordaClara,
    borderWidth: 1,
    borderRadius: raio.md,
  },
  volumeChipAtivo: {
    backgroundColor: cores.primaria,
    borderColor: cores.primaria,
  },
  volumeTxt: {
    color: cores.textoSecundario,
    fontSize: 12,
    fontWeight: '800',
  },
  volumeTxtAtivo: {
    color: cores.contrastePrimaria,
  },
});
