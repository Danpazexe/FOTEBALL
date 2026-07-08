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
import type {Cobrador, PosicaoChute, ResultadoCobranca} from '../../../types';
import Batedor from './Batedor';
import Goleiro from './Goleiro';

export type Lance = {
  posicaoChute: PosicaoChute;
  potencia: number;
  /** Mergulho do goleiro (-1..1 em x, 0..1 em y) devolvido pela engine. */
  goleiroX: number;
  goleiroY: number;
  resultado: ResultadoCobranca;
  /** Quem cobrou (default USUÁRIO). A CPU cobra do ponto (recoloca a bola). */
  cobrador?: Cobrador;
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
  // Geometria (primitivos — capturados por valor nos worklets do reanimated).
  const GW = largura * 0.84; // largura do gol
  const GH = GW * 0.42; // altura do gol
  const golLeft = (largura - GW) / 2;
  const golTop = altura * 0.16;
  const golBase = golTop + GH; // linha do gol (base das redes)
  const ballR = largura * 0.05;
  const pad = ballR * 1.25; // mantém a bola dentro das traves
  const spotX = largura / 2;
  const spotY = golBase + (altura - golBase) * 0.6; // marca da cal
  const keeperW = GW * 0.16;
  const centroGolX = golLeft + GW / 2;
  const baseGoleiro = golBase - pad;

  // px do alvo dentro do gol a partir das coordenadas contínuas (-1..1, 0..1).
  const alvoPx = useMemo(
    () => (x: number, y: number) => ({
      x: centroGolX + x * (GW / 2 - pad),
      y: golBase - pad - y * (GH - 2 * pad),
    }),
    [centroGolX, GW, GH, golBase, pad],
  );

  const aimX = useSharedValue(centroGolX);
  const aimY = useSharedValue(golTop + pad);
  const aimVisivel = useSharedValue(0);
  const ballX = useSharedValue(spotX);
  const ballY = useSharedValue(spotY);
  const ballScale = useSharedValue(1);
  const goleiroX = useSharedValue(centroGolX);
  const goleiroY = useSharedValue(baseGoleiro);
  const chutando = useSharedValue(0);

  // Sensibilidade do gesto (px de arrasto → coordenada / potência).
  const sensX = GW * 0.55;
  const sensY = GH * 2.2;
  const dragMax = altura * 0.42;
  const meiaLargUtil = GW / 2 - pad;
  const alturaUtil = GH - 2 * pad;

  const gesto = useMemo(
    () =>
      Gesture.Pan()
        .enabled(podeChutar)
        .onUpdate(evento => {
          'worklet';
          const x = Math.min(1, Math.max(-1, evento.translationX / sensX));
          const y = Math.min(1, Math.max(0, -evento.translationY / sensY));
          aimX.value = centroGolX + x * meiaLargUtil;
          aimY.value = golBase - pad - y * alturaUtil;
          aimVisivel.value = 1;
        })
        .onEnd(evento => {
          'worklet';
          const x = Math.min(1, Math.max(-1, evento.translationX / sensX));
          const y = Math.min(1, Math.max(0, -evento.translationY / sensY));
          const dist = Math.sqrt(
            evento.translationX * evento.translationX +
              evento.translationY * evento.translationY,
          );
          const potencia = Math.min(1, Math.max(0.15, dist / dragMax));
          aimVisivel.value = 0;
          runOnJS(onChutar)(x, y, potencia);
        }),
    [
      podeChutar,
      onChutar,
      sensX,
      sensY,
      dragMax,
      centroGolX,
      golBase,
      pad,
      meiaLargUtil,
      alturaUtil,
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
    if (lance.cobrador === 'CPU') {
      // A CPU cobra do ponto: recoloca bola/goleiro antes de animar (a bola do
      // usuário tinha ficado "no gol" da cobrança anterior).
      ballX.value = spotX;
      ballY.value = spotY;
      ballScale.value = 1;
      goleiroX.value = centroGolX;
      goleiroY.value = baseGoleiro;
    } else {
      chutando.value = withSequence(
        withTiming(1, {duration: 130}),
        withTiming(0, {duration: 320}),
      );
    }
    ballX.value = withTiming(alvo.x, {duration: dur, easing: Easing.out(Easing.quad)});
    ballY.value = withTiming(alvo.y, {duration: dur, easing: Easing.out(Easing.quad)});
    ballScale.value = withTiming(0.55, {duration: dur});
    goleiroX.value = withTiming(kp.x, {duration: dur * 0.85, easing: Easing.out(Easing.cubic)});
    goleiroY.value = withTiming(kp.y, {duration: dur * 0.85, easing: Easing.out(Easing.cubic)});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lance]);

  // Novo turno do usuário: volta bola e goleiro para a posição inicial. Reage
  // também à geometria (largura/altura) para reancorar após mudança de dimensão
  // (ex.: rotação) enquanto o usuário está para bater.
  useEffect(() => {
    if (!podeChutar) {
      return;
    }
    ballX.value = withTiming(spotX, {duration: 200});
    ballY.value = withTiming(spotY, {duration: 200});
    ballScale.value = withTiming(1, {duration: 200});
    goleiroX.value = withTiming(centroGolX, {duration: 220});
    goleiroY.value = withTiming(baseGoleiro, {duration: 220});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podeChutar, spotX, spotY, centroGolX, baseGoleiro]);

  const estiloBola = useAnimatedStyle(() => ({
    transform: [
      {translateX: ballX.value - ballR},
      {translateY: ballY.value - ballR},
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
        {/* Gol: traves + travessão + linha do gol. */}
        <View
          style={[
            styles.gol,
            {left: golLeft, top: golTop, width: GW, height: GH},
          ]}
        />
        <View
          style={[styles.linhaGol, {left: golLeft, top: golBase, width: GW}]}
        />

        <Goleiro x={goleiroX} y={goleiroY} tamanho={keeperW} />

        {/* Mira (some quando não está arrastando). */}
        <Animated.View pointerEvents="none" style={[styles.mira, estiloMira]}>
          <View style={styles.miraInterna} />
        </Animated.View>

        <Batedor
          x={spotX - ballR * 2.4}
          y={spotY + ballR * 0.6}
          tamanho={ballR * 1.5}
          chutando={chutando}
        />

        {/* Bola. */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.bola,
            {width: ballR * 2, height: ballR * 2, borderRadius: ballR},
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
