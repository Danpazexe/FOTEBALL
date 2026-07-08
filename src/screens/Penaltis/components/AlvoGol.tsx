/**
 * AlvoGol — o gol, a bola e o gesto ÚNICO de cobrança (fiel ao Mini Cup do
 * Google): o usuário arrasta a bola do ponto de pênalti em direção ao gol; o
 * VETOR do arrasto define a mira (x/y contínuos, sem grade visível) e a
 * DISTÂNCIA define a potência (que só acelera a animação, não é risco de errar).
 *
 * Ao soltar, avisa a tela (`onChutar`) com {x, y, potencia}; a tela resolve na
 * engine e devolve o `lance`, que este componente anima (bola até o alvo +
 * mergulho do goleiro). Sem lógica de jogo aqui.
 */
import React, {useEffect, useMemo} from 'react';
import {StyleSheet, View} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import {cores, raio} from '../../../theme';
import type {PosicaoChute, ResultadoCobranca} from '../../../types';
import Batedor from './Batedor';
import Goleiro from './Goleiro';

export type Lance = {
  posicaoChute: PosicaoChute;
  potencia: number;
  /** Mergulho do goleiro (-1..1 em x, 0..1 em y) devolvido pela engine. */
  goleiroX: number;
  goleiroY: number;
  resultado: ResultadoCobranca;
};

type Props = {
  largura: number;
  altura: number;
  /** Habilita o gesto (só na vez do usuário). */
  podeChutar: boolean;
  /** Última cobrança resolvida a animar (null enquanto aguarda o chute). */
  lance: Lance | null;
  onChutar: (x: number, y: number, potencia: number) => void;
};

function AlvoGol({
  largura,
  altura,
  podeChutar,
  lance,
  onChutar,
}: Props): React.JSX.Element {
  const geo = useMemo(() => {
    const GW = largura * 0.84;
    const GH = GW * 0.42;
    const golLeft = (largura - GW) / 2;
    const golTop = altura * 0.16;
    const golBase = golTop + GH; // linha do gol (base das redes)
    const ballR = largura * 0.05;
    const pad = ballR * 1.25;
    const spotX = largura / 2;
    const spotY = golBase + (altura - golBase) * 0.6; // marca da cal
    const keeperW = GW * 0.16;
    return {GW, GH, golLeft, golTop, golBase, ballR, pad, spotX, spotY, keeperW};
  }, [largura, altura]);

  const centroGolX = geo.golLeft + geo.GW / 2;
  const baseGoleiro = geo.golBase - geo.pad;

  // px do alvo dentro do gol a partir das coordenadas contínuas (-1..1, 0..1).
  const alvoPx = useMemo(
    () => (x: number, y: number) => ({
      x: centroGolX + x * (geo.GW / 2 - geo.pad),
      y: geo.golBase - geo.pad - y * (geo.GH - 2 * geo.pad),
    }),
    [centroGolX, geo],
  );

  const aimX = useSharedValue(centroGolX);
  const aimY = useSharedValue(geo.golTop + geo.pad);
  const aimVisivel = useSharedValue(0);
  const ballX = useSharedValue(geo.spotX);
  const ballY = useSharedValue(geo.spotY);
  const ballScale = useSharedValue(1);
  const goleiroX = useSharedValue(centroGolX);
  const goleiroY = useSharedValue(baseGoleiro);
  const chutando = useSharedValue(0);

  // Sensibilidade do gesto (px de arrasto → coordenada / potência).
  const SENS_X = geo.GW * 0.55;
  const SENS_Y = geo.GH * 2.2;
  const DRAG_MAX = altura * 0.42;

  const gesto = useMemo(
    () =>
      Gesture.Pan()
        .enabled(podeChutar)
        .onUpdate(evento => {
          'worklet';
          const x = Math.min(1, Math.max(-1, evento.translationX / SENS_X));
          const y = Math.min(1, Math.max(0, -evento.translationY / SENS_Y));
          aimX.value = centroGolX + x * (geo.GW / 2 - geo.pad);
          aimY.value = geo.golBase - geo.pad - y * (geo.GH - 2 * geo.pad);
          aimVisivel.value = 1;
        })
        .onEnd(evento => {
          'worklet';
          const x = Math.min(1, Math.max(-1, evento.translationX / SENS_X));
          const y = Math.min(1, Math.max(0, -evento.translationY / SENS_Y));
          const dist = Math.sqrt(
            evento.translationX * evento.translationX +
              evento.translationY * evento.translationY,
          );
          const potencia = Math.min(1, Math.max(0.15, dist / DRAG_MAX));
          aimVisivel.value = 0;
          runOnJS(onChutar)(x, y, potencia);
        }),
    [
      podeChutar,
      onChutar,
      SENS_X,
      SENS_Y,
      DRAG_MAX,
      centroGolX,
      geo,
      aimX,
      aimY,
      aimVisivel,
    ],
  );

  // Anima a cobrança resolvida: bola até o alvo + mergulho do goleiro.
  useEffect(() => {
    if (!lance) {
      return;
    }
    const dur = 620 - lance.potencia * 260; // mais potência = animação mais rápida
    const alvo = alvoPx(lance.posicaoChute.x, lance.posicaoChute.y);
    const kp = alvoPx(lance.goleiroX, lance.goleiroY);
    chutando.value = withSequence(
      withTiming(1, {duration: 130}),
      withTiming(0, {duration: 320}),
    );
    ballX.value = withTiming(alvo.x, {duration: dur, easing: Easing.out(Easing.quad)});
    ballY.value = withTiming(alvo.y, {duration: dur, easing: Easing.out(Easing.quad)});
    ballScale.value = withTiming(0.55, {duration: dur});
    goleiroX.value = withTiming(kp.x, {duration: dur * 0.85, easing: Easing.out(Easing.cubic)});
    goleiroY.value = withTiming(kp.y, {duration: dur * 0.85, easing: Easing.out(Easing.cubic)});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lance]);

  // Novo turno do usuário: volta bola e goleiro para a posição inicial.
  useEffect(() => {
    if (!podeChutar) {
      return;
    }
    ballX.value = withTiming(geo.spotX, {duration: 200});
    ballY.value = withTiming(geo.spotY, {duration: 200});
    ballScale.value = withTiming(1, {duration: 200});
    goleiroX.value = withTiming(centroGolX, {duration: 220});
    goleiroY.value = withTiming(baseGoleiro, {duration: 220});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podeChutar]);

  const estiloBola = useAnimatedStyle(() => ({
    transform: [
      {translateX: ballX.value - geo.ballR},
      {translateY: ballY.value - geo.ballR},
      {scale: ballScale.value},
    ],
  }));
  const estiloMira = useAnimatedStyle(() => ({
    opacity: aimVisivel.value,
    transform: [{translateX: aimX.value - 14}, {translateY: aimY.value - 14}],
  }));

  return (
    <GestureDetector gesture={gesto}>
      <View style={[styles.campo, {width: largura, height: altura}]}>
        {/* Gol: traves + travessão + fundo de rede. */}
        <View
          style={[
            styles.gol,
            {
              left: geo.golLeft,
              top: geo.golTop,
              width: geo.GW,
              height: geo.GH,
            },
          ]}
        />
        <View
          style={[
            styles.linhaGol,
            {left: geo.golLeft, top: geo.golBase, width: geo.GW},
          ]}
        />

        <Goleiro x={goleiroX} y={goleiroY} tamanho={geo.keeperW} />

        {/* Mira (some quando não está arrastando). */}
        <Animated.View pointerEvents="none" style={[styles.mira, estiloMira]}>
          <View style={styles.miraInterna} />
        </Animated.View>

        <Batedor
          x={geo.spotX - geo.ballR * 2.4}
          y={geo.spotY + geo.ballR * 0.6}
          tamanho={geo.ballR * 1.5}
          chutando={chutando}
        />

        {/* Bola. */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.bola,
            {width: geo.ballR * 2, height: geo.ballR * 2, borderRadius: geo.ballR},
            estiloBola,
          ]}
        />
      </View>
    </GestureDetector>
  );
}

export default AlvoGol;

const VERDE_CAMPO = '#0F2E1E';
const LINHA = 'rgba(234, 242, 230, 0.75)';

const styles = StyleSheet.create({
  campo: {
    backgroundColor: VERDE_CAMPO,
    borderRadius: raio.md,
    overflow: 'hidden',
    position: 'relative',
  },
  gol: {
    borderColor: LINHA,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderWidth: 4,
    position: 'absolute',
  },
  linhaGol: {
    backgroundColor: LINHA,
    height: 2,
    position: 'absolute',
  },
  mira: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    top: 0,
    width: 28,
  },
  miraInterna: {
    borderColor: cores.secundaria,
    borderRadius: 14,
    borderWidth: 3,
    height: 28,
    width: 28,
  },
  bola: {
    backgroundColor: '#F5F7FA',
    borderColor: '#11161C',
    borderWidth: 2,
    left: 0,
    position: 'absolute',
    top: 0,
  },
});
