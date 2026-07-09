/**
 * AlvoGol — a cena jogável da disputa (visão atrás da bola, arte do doodle).
 * Compõe o fundo do estádio (Estadio) com o gol (PNG) e camadas ANIMADAS por
 * cima: goleiro (mergulha e troca de pose no desfecho), bola (voa em arco até o
 * gol, encolhendo pela perspectiva), mira (segue o dedo) e o "juice" (flash +
 * GOL!).
 *
 * Gesto ÚNICO (fiel ao Mini Cup): arrasta a bola em direção ao gol — o VETOR
 * define a mira (x/y contínuos), a DISTÂNCIA define a potência (só acelera a
 * animação). Ao soltar, avisa `onChutar`; a engine resolve e devolve o `lance`.
 */
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import {REACH_GOLEIRO} from '../../../engine/competitions/knockout/penaltisInterativos';
import {cores} from '../../../theme';
import type {Cobrador, PosicaoChute, ResultadoCobranca} from '../../../types';
import Bola from './Bola';
import Estadio, {ESTADIO_RATIO} from './Estadio';
import Goleiro, {type EstadoGoleiro} from './Goleiro';

const GOL_IMG = require('../assets/goal.png');
/** Proporção do gol (recorte 387x174). */
const GOL_RATIO = 174 / 387;

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
  const sceneW = largura;
  const sceneH = largura * ESTADIO_RATIO;

  // Geometria (px) — gol ao fundo (perto do horizonte), bola no ponto (frente).
  const golCentroX = sceneW / 2;
  const gw = sceneW * 0.74;
  const gh = gw * GOL_RATIO;
  const golBaseY = sceneH * 0.33; // linha do gol
  const golTopY = golBaseY - gh;
  // Pés do goleiro um pouco ABAIXO da linha do gol, para a cabeça não passar do
  // travessão (a caixa da figura é mais alta que a boca do gol).
  const keeperPesY = golBaseY + gh * 0.22;
  const meia = gw * 0.4; // metade útil da boca (dentro das traves)
  const groundY = golBaseY - gh * 0.08;
  const topY = golTopY + gh * 0.18;
  const bolaHomeX = sceneW / 2;
  const bolaHomeY = sceneH * 0.82;
  const ballSize = sceneW * 0.17;
  const arco = sceneH * 0.06;
  // Meia-largura visual do goleiro = REACH_GOLEIRO (x-units), pois meia = gw*0.4.
  // Assim a cobertura do sprite CASA com a área de defesa do engine.
  const keeperW = 0.8 * gw * REACH_GOLEIRO;
  const keeperBoxH = keeperW * 1.15;

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
  const ballOp = useSharedValue(1);
  const keeperX = useSharedValue(golCentroX);
  const keeperY = useSharedValue(keeperPesY);
  const keeperRot = useSharedValue(0);
  const keeperPop = useSharedValue(1); // salto de escala no desfecho
  const aimX = useSharedValue(golCentroX);
  const aimY = useSharedValue(topY);
  const aimVis = useSharedValue(0);
  const flash = useSharedValue(0);
  const golPop = useSharedValue(0);

  const [estado, setEstado] = useState<EstadoGoleiro>('idle');
  const [bolaGirando, setBolaGirando] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sensX = largura * 0.34;
  const sensY = largura * 0.5;
  // Velocidade (px/s) do arrasto para potência MÁXIMA — a força vem do quão
  // RÁPIDO o usuário puxa a bola (flick), não da distância.
  const velMax = largura * 7;

  const gesto = useMemo(
    () =>
      Gesture.Pan()
        .enabled(podeChutar)
        // Ativa com pouco movimento — um flick curto também chuta.
        .minDistance(3)
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
          // Força pela velocidade do flick, com PISO pela distância do arrasto —
          // assim tanto um flick rápido quanto um arrasto lento chutam de fato.
          const vx = e.velocityX || 0;
          const vy = e.velocityY || 0;
          const vel = Math.sqrt(vx * vx + vy * vy);
          const dist = Math.sqrt(
            e.translationX * e.translationX + e.translationY * e.translationY,
          );
          const potVel = vel / velMax;
          const potDist = dist / (largura * 0.55);
          const potencia = Math.min(
            1,
            Math.max(0.3, Math.max(potVel, potDist)),
          );
          aimVis.value = 0;
          runOnJS(onChutar)(x, y, potencia);
        }),
    [
      podeChutar,
      onChutar,
      sensX,
      sensY,
      velMax,
      largura,
      golCentroX,
      meia,
      groundY,
      topY,
      aimX,
      aimY,
      aimVis,
    ],
  );

  // Anima a cobrança resolvida (bola + mergulho) e reage no desfecho.
  useEffect(() => {
    if (!lance) {
      return;
    }
    const dur = 620 - lance.potencia * 260;
    const alvo = alvoPx(lance.posicaoChute.x, lance.posicaoChute.y);
    const kx = golCentroX + lance.goleiroX * meia;
    const kLift = lance.goleiroY * 0.3 * (groundY - topY);
    const rot = lance.goleiroX * 34;

    if (lance.cobrador === 'CPU') {
      ballX.value = bolaHomeX;
      ballY.value = bolaHomeY;
      ballScale.value = 1;
      ballLift.value = 0;
      keeperX.value = golCentroX;
      keeperY.value = keeperPesY;
      keeperRot.value = 0;
    }
    setEstado('dive');
    setBolaGirando(true);
    ballOp.value = 1;

    ballX.value = withTiming(alvo.x, {duration: dur, easing: Easing.out(Easing.quad)});
    ballY.value = withTiming(alvo.y, {duration: dur, easing: Easing.out(Easing.quad)});
    ballScale.value = withTiming(0.4, {duration: dur});
    ballLift.value = withSequence(
      withTiming(arco, {duration: dur * 0.45, easing: Easing.out(Easing.quad)}),
      withTiming(0, {duration: dur * 0.55, easing: Easing.in(Easing.quad)}),
    );
    keeperX.value = withTiming(kx, {duration: dur * 0.8, easing: Easing.out(Easing.cubic)});
    keeperY.value = withTiming(keeperPesY - kLift, {duration: dur * 0.8, easing: Easing.out(Easing.cubic)});
    keeperRot.value = withTiming(rot, {duration: dur * 0.8, easing: Easing.out(Easing.cubic)});

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    const marcou = lance.resultado === 'GOL';
    timerRef.current = setTimeout(() => {
      keeperRot.value = withTiming(0, {duration: 160});
      setBolaGirando(false); // bola aterrissou — para de girar
      keeperPop.value = withSequence(
        withTiming(1.16, {duration: 110}),
        withTiming(1, {duration: 220}),
      );
      if (marcou) {
        setEstado('beaten');
        flash.value = withSequence(
          withTiming(0.4, {duration: 90}),
          withTiming(0, {duration: 320}),
        );
        golPop.value = withSequence(
          withTiming(1, {duration: 150}),
          withTiming(0, {duration: 650}),
        );
      } else {
        setEstado('save');
        ballOp.value = withTiming(0, {duration: 120}); // vira a bola segurada
      }
    }, dur * 0.9);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lance]);

  // Novo turno: volta bola/goleiro ao lugar e à pose inicial.
  useEffect(() => {
    if (!podeChutar) {
      return;
    }
    setEstado('idle');
    setBolaGirando(false);
    ballX.value = withTiming(bolaHomeX, {duration: 220});
    ballY.value = withTiming(bolaHomeY, {duration: 220});
    ballScale.value = withTiming(1, {duration: 220});
    ballLift.value = 0;
    ballOp.value = withTiming(1, {duration: 160});
    keeperX.value = withTiming(golCentroX, {duration: 240});
    keeperY.value = withTiming(keeperPesY, {duration: 240});
    keeperRot.value = withTiming(0, {duration: 240});
    golPop.value = 0;
    flash.value = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podeChutar, bolaHomeX, bolaHomeY, golCentroX, keeperPesY]);

  const estiloBola = useAnimatedStyle(() => ({
    opacity: ballOp.value,
    transform: [
      {translateX: ballX.value - ballSize / 2},
      {translateY: ballY.value - ballLift.value - ballSize / 2},
      {scale: ballScale.value},
    ],
  }));
  const estiloGoleiro = useAnimatedStyle(() => ({
    // Pés plantados: translateY fixo (o balanço de idle vem dos FRAMES, não de
    // mover a figura — senão parece flutuando). Só o "pop" do desfecho escala.
    transform: [
      {translateX: keeperX.value - keeperW / 2},
      {translateY: keeperY.value - keeperBoxH},
      {scale: keeperPop.value},
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
    return {
      opacity: aimVis.value * 0.85,
      width: Math.sqrt(dx * dx + dy * dy),
      transform: [{rotateZ: `${Math.atan2(dy, dx)}rad`}],
    };
  });
  const estiloFlash = useAnimatedStyle(() => ({opacity: flash.value}));
  const estiloGolTexto = useAnimatedStyle(() => ({
    opacity: golPop.value,
    transform: [{scale: 0.6 + golPop.value * 0.6}],
  }));

  return (
    <GestureDetector gesture={gesto}>
      <View style={[styles.cena, {width: sceneW, height: sceneH}]}>
        <Estadio largura={sceneW} altura={sceneH} />

        {/* Gol ao fundo. */}
        <Image
          source={GOL_IMG}
          resizeMode="stretch"
          style={[
            styles.golImg,
            {left: golCentroX - gw / 2, top: golTopY, width: gw, height: gh},
          ]}
        />

        {/* Goleiro (mergulha + troca de pose). */}
        <Animated.View
          pointerEvents="none"
          style={[styles.camada, {width: keeperW, height: keeperBoxH}, estiloGoleiro]}>
          <Goleiro tamanho={keeperW} estado={estado} />
        </Animated.View>

        {/* Mira. */}
        <Animated.View
          pointerEvents="none"
          style={[styles.linhaMira, {left: bolaHomeX, top: bolaHomeY - 1.5}, estiloLinha]}
        />
        <Animated.View pointerEvents="none" style={[styles.mira, estiloMira]}>
          <View style={styles.miraAnel} />
          <View style={styles.miraPonto} />
        </Animated.View>

        {/* Bola. */}
        <Animated.View
          pointerEvents="none"
          style={[styles.camada, {width: ballSize, height: ballSize}, estiloBola]}>
          <Bola tamanho={ballSize} girando={bolaGirando} />
        </Animated.View>

        {/* Juice. */}
        <Animated.View pointerEvents="none" style={[styles.flash, estiloFlash]} />
        <Animated.View pointerEvents="none" style={[styles.golTextoWrap, estiloGolTexto]}>
          <Text style={styles.golTexto}>GOL!</Text>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

export default AlvoGol;

const styles = StyleSheet.create({
  cena: {
    backgroundColor: '#8ec63f',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  camada: {
    left: 0,
    position: 'absolute',
    top: 0,
  },
  golImg: {
    position: 'absolute',
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
    top: '20%',
  },
  golTexto: {
    color: '#FFFFFF',
    fontSize: 54,
    fontWeight: '900',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: {width: 0, height: 3},
    textShadowRadius: 8,
  },
});
