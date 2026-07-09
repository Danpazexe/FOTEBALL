/**
 * AlvoGol — a cena jogável da disputa (visão atrás da bola, estilo doodle).
 * Compõe o estádio estático (Estadio) com camadas ANIMADAS por cima: goleiro
 * (mergulho), bola (voo em arco até o gol, encolhendo pela perspectiva), mira
 * (segue o dedo) e o "juice" (flash + GOL!). Toda a geometria vive no espaço
 * 0..440 de `CENA`, escalado para a largura real.
 *
 * Gesto ÚNICO (fiel ao Mini Cup): arrasta a bola em direção ao gol — o VETOR
 * define a mira (x/y contínuos), a DISTÂNCIA define a potência (só acelera a
 * animação). Ao soltar, avisa `onChutar`; a engine resolve e devolve o `lance`,
 * que este componente anima.
 */
import React, {useEffect, useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import {cores} from '../../../theme';
import type {Cobrador, PosicaoChute, ResultadoCobranca} from '../../../types';
import Bola, {BOLA_VIEWBOX} from './Bola';
import Estadio, {CENA} from './Estadio';
import Goleiro, {GOLEIRO_VIEWBOX} from './Goleiro';

export type Lance = {
  posicaoChute: PosicaoChute;
  potencia: number;
  goleiroX: number;
  goleiroY: number;
  resultado: ResultadoCobranca;
  cobrador?: Cobrador;
};

type Props = {
  largura: number;
  podeChutar: boolean;
  lance: Lance | null;
  onChutar: (x: number, y: number, potencia: number) => void;
};

function AlvoGol({largura, podeChutar, lance, onChutar}: Props): React.JSX.Element {
  // Escala do espaço da cena (0..440) para px, e pontos-chave em px.
  const esc = largura / CENA.lado;
  const pad = 8 * esc;
  const golCentroX = CENA.golCentroX * esc;
  const meia = CENA.golMeiaLargura * esc - pad;
  const groundY = CENA.golLinhaY * esc;
  const topY = CENA.golTravessaoY * esc + pad;
  const bolaHomeX = CENA.bolaPontoX * esc;
  const bolaHomeY = CENA.bolaPontoY * esc;

  const ballSize = BOLA_VIEWBOX * esc;
  const arco = 30 * esc;
  const keeperW = 76 * esc;
  const keeperH = (keeperW * GOLEIRO_VIEWBOX.altura) / GOLEIRO_VIEWBOX.largura;
  const keeperPesOffY = (GOLEIRO_VIEWBOX.pesY / GOLEIRO_VIEWBOX.altura) * keeperH;

  const alvoPx = useMemo(
    () => (x: number, y: number) => ({
      x: golCentroX + x * meia,
      y: groundY - y * (groundY - topY),
    }),
    [golCentroX, meia, groundY, topY],
  );

  const ballX = useSharedValue(bolaHomeX);
  const ballY = useSharedValue(bolaHomeY);
  const ballScale = useSharedValue(1);
  const ballLift = useSharedValue(0);
  const keeperX = useSharedValue(golCentroX);
  const keeperY = useSharedValue(groundY);
  const keeperRot = useSharedValue(0);
  const aimX = useSharedValue(golCentroX);
  const aimY = useSharedValue(topY);
  const aimVis = useSharedValue(0);
  const flash = useSharedValue(0);
  const golPop = useSharedValue(0);

  // Sensibilidade do gesto.
  const sensX = largura * 0.34;
  const sensY = largura * 0.5;
  const dragMax = largura * 0.5;

  const gesto = useMemo(
    () =>
      Gesture.Pan()
        .enabled(podeChutar)
        .onUpdate(e => {
          'worklet';
          const x = Math.min(1, Math.max(-1, e.translationX / sensX));
          const y = Math.min(1, Math.max(0, -e.translationY / sensY));
          aimX.value = golCentroX + x * meia;
          aimY.value = groundY - y * (groundY - topY);
          aimVis.value = 1;
        })
        .onEnd(e => {
          'worklet';
          const x = Math.min(1, Math.max(-1, e.translationX / sensX));
          const y = Math.min(1, Math.max(0, -e.translationY / sensY));
          const dist = Math.sqrt(
            e.translationX * e.translationX + e.translationY * e.translationY,
          );
          const potencia = Math.min(1, Math.max(0.15, dist / dragMax));
          aimVis.value = 0;
          runOnJS(onChutar)(x, y, potencia);
        }),
    [
      podeChutar,
      onChutar,
      sensX,
      sensY,
      dragMax,
      golCentroX,
      meia,
      groundY,
      topY,
      aimX,
      aimY,
      aimVis,
    ],
  );

  // Anima a cobrança resolvida.
  useEffect(() => {
    if (!lance) {
      return;
    }
    const dur = 620 - lance.potencia * 260;
    const alvo = alvoPx(lance.posicaoChute.x, lance.posicaoChute.y);
    // Mergulho: pés deslocam na horizontal, sobem um pouco, e a figura inclina.
    const kx = golCentroX + lance.goleiroX * meia;
    const ky = groundY - lance.goleiroY * 0.35 * (groundY - topY);
    const rot = lance.goleiroX * 32;

    if (lance.cobrador === 'CPU') {
      // A CPU cobra do ponto: recoloca bola/goleiro antes de animar.
      ballX.value = bolaHomeX;
      ballY.value = bolaHomeY;
      ballScale.value = 1;
      ballLift.value = 0;
      keeperX.value = golCentroX;
      keeperY.value = groundY;
      keeperRot.value = 0;
    }

    ballX.value = withTiming(alvo.x, {duration: dur, easing: Easing.out(Easing.quad)});
    ballY.value = withTiming(alvo.y, {duration: dur, easing: Easing.out(Easing.quad)});
    ballScale.value = withTiming(0.42, {duration: dur});
    ballLift.value = withSequence(
      withTiming(arco, {duration: dur * 0.45, easing: Easing.out(Easing.quad)}),
      withTiming(0, {duration: dur * 0.55, easing: Easing.in(Easing.quad)}),
    );
    keeperX.value = withTiming(kx, {duration: dur * 0.8, easing: Easing.out(Easing.cubic)});
    keeperY.value = withTiming(ky, {duration: dur * 0.8, easing: Easing.out(Easing.cubic)});
    keeperRot.value = withTiming(rot, {duration: dur * 0.8, easing: Easing.out(Easing.cubic)});

    if (lance.resultado === 'GOL') {
      flash.value = withDelay(
        dur * 0.7,
        withSequence(
          withTiming(0.45, {duration: 90}),
          withTiming(0, {duration: 320}),
        ),
      );
      golPop.value = withDelay(
        dur * 0.7,
        withSequence(withTiming(1, {duration: 150}), withTiming(0, {duration: 650})),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lance]);

  // Novo turno: volta bola e goleiro ao lugar (reage à geometria p/ rotação).
  useEffect(() => {
    if (!podeChutar) {
      return;
    }
    ballX.value = withTiming(bolaHomeX, {duration: 220});
    ballY.value = withTiming(bolaHomeY, {duration: 220});
    ballScale.value = withTiming(1, {duration: 220});
    ballLift.value = 0;
    keeperX.value = withTiming(golCentroX, {duration: 240});
    keeperY.value = withTiming(groundY, {duration: 240});
    keeperRot.value = withTiming(0, {duration: 240});
    golPop.value = 0;
    flash.value = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podeChutar, bolaHomeX, bolaHomeY, golCentroX, groundY]);

  const estiloBola = useAnimatedStyle(() => ({
    transform: [
      {translateX: ballX.value - ballSize / 2},
      {translateY: ballY.value - ballLift.value - ballSize / 2},
      {scale: ballScale.value},
    ],
  }));
  const estiloGoleiro = useAnimatedStyle(() => ({
    transform: [
      {translateX: keeperX.value - keeperW / 2},
      {translateY: keeperY.value - keeperPesOffY},
      {rotateZ: `${keeperRot.value}deg`},
    ],
  }));
  const estiloMira = useAnimatedStyle(() => ({
    opacity: aimVis.value,
    transform: [{translateX: aimX.value - 15}, {translateY: aimY.value - 15}],
  }));
  const estiloLinha = useAnimatedStyle(() => {
    const dx = aimX.value - bolaHomeX;
    const dy = aimY.value - bolaHomeY;
    const comprimento = Math.sqrt(dx * dx + dy * dy);
    const angulo = Math.atan2(dy, dx);
    return {
      opacity: aimVis.value * 0.85,
      width: comprimento,
      transform: [{rotateZ: `${angulo}rad`}],
    };
  });
  const estiloFlash = useAnimatedStyle(() => ({opacity: flash.value}));
  const estiloGolTexto = useAnimatedStyle(() => ({
    opacity: golPop.value,
    transform: [{scale: 0.6 + golPop.value * 0.6}],
  }));

  return (
    <GestureDetector gesture={gesto}>
      <View style={[styles.cena, {width: largura, height: largura}]}>
        <Estadio largura={largura} />

        {/* Goleiro (mergulha). */}
        <Animated.View
          pointerEvents="none"
          style={[styles.camada, {width: keeperW, height: keeperH}, estiloGoleiro]}>
          <Goleiro tamanho={keeperW} />
        </Animated.View>

        {/* Linha + alvo da mira. */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.linhaMira,
            {left: bolaHomeX, top: bolaHomeY - 1.5},
            estiloLinha,
          ]}
        />
        <Animated.View pointerEvents="none" style={[styles.mira, estiloMira]}>
          <View style={styles.miraAnel} />
          <View style={styles.miraPonto} />
        </Animated.View>

        {/* Bola (voa até o alvo). */}
        <Animated.View
          pointerEvents="none"
          style={[styles.camada, {width: ballSize, height: ballSize}, estiloBola]}>
          <Bola tamanho={ballSize} />
        </Animated.View>

        {/* Flash do gol. */}
        <Animated.View
          pointerEvents="none"
          style={[styles.flash, estiloFlash]}
        />
        <Animated.View
          pointerEvents="none"
          style={[styles.golTextoWrap, estiloGolTexto]}>
          <Text style={styles.golTexto}>GOL!</Text>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

export default AlvoGol;

const styles = StyleSheet.create({
  cena: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  camada: {
    left: 0,
    position: 'absolute',
    top: 0,
  },
  linhaMira: {
    backgroundColor: cores.secundaria,
    height: 3,
    position: 'absolute',
    transformOrigin: 'left center',
    width: 1,
  },
  mira: {
    alignItems: 'center',
    height: 30,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    top: 0,
    width: 30,
  },
  miraAnel: {
    borderColor: cores.secundaria,
    borderRadius: 15,
    borderWidth: 3,
    height: 30,
    position: 'absolute',
    width: 30,
  },
  miraPonto: {
    backgroundColor: cores.secundaria,
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  flash: {
    backgroundColor: '#FFFFFF',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  golTextoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: '22%',
  },
  golTexto: {
    color: cores.secundaria,
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 6,
  },
});
