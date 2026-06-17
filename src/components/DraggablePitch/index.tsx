/**
 * Campo tático com ARRASTE LIVRE. Diferente do PitchView (que só posiciona por
 * linha) e do AjustesPartida (que troca em slots fixos durante a partida), aqui o
 * técnico pode soltar cada jogador em QUALQUER região do gramado:
 *
 *  • Arrastar um TITULAR para uma área vazia    -> move (recalcula a posição pela
 *    coordenada: um meia puxado à frente vira meia ofensivo, etc.).
 *  • Arrastar um TITULAR sobre outro            -> troca os dois de lugar.
 *  • Arrastar um RESERVA sobre um titular       -> substitui (reserva entra).
 *  • Tocar num jogador                          -> abre o detalhe (opcional).
 *
 * Cada ficha mostra a posição detectada e o % de rendimento na posição (queda
 * por improviso, via `adaptacao`). O componente é controlado: recebe a formação
 * e devolve a nova via `onAtualizarFormacao`. Toda a regra de posição/coordenada
 * vem dos módulos puros (`geometria`, `adaptacao`, `defaults`).
 */

import React, {useCallback, useMemo, useRef, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import {moverTitular, trocarTitular} from '../../api/database/seed/defaults';
import {nivelAdaptacao, type NivelAdaptacao} from '../../engine/tactics/adaptacao';
import {preencherCoordenadas} from '../../engine/tactics/geometria';
import {cores, corOverall, espaco, raio} from '../../theme';
import type {Formacao, Player} from '../../types';

type DraggablePitchProps = {
  formacao: Formacao;
  jogadores: Player[];
  onAtualizarFormacao: (formacao: Formacao) => void;
  onAbrirJogador?: (jogadorId: string) => void;
  /** Avisa a tela quando um arraste começa/termina (para travar o scroll). */
  onArrastandoChange?: (ativo: boolean) => void;
  largura: number;
};

type Descritor = {tipo: 'titular' | 'reserva'; valor: string};

type SlotTela = {slotIndex: number; jogadorId: string; cx: number; cy: number};

const GHOST = 80;

/** Cor que comunica o rendimento na posição (verde = natural, vermelho = improviso). */
export function corAdaptacao(nivel: NivelAdaptacao): string {
  if (nivel === 'natural') {
    return cores.primaria;
  }
  if (nivel === 'similar') {
    return '#6FD0FF';
  }
  if (nivel === 'adaptado') {
    return cores.secundaria;
  }
  return cores.perigo;
}

function primeiroNome(jogador: Player): string {
  if (jogador.apelido) {
    return jogador.apelido;
  }
  const partes = jogador.nome.split(' ');
  return partes[partes.length - 1] ?? jogador.nome;
}

type SharedNum = SharedValue<number>;

/** Gesto reaproveitável por ficha: arraste (fantasma segue o dedo) + toque. */
function useGestoPeca(
  tipo: Descritor['tipo'],
  valor: string,
  habilitado: boolean,
  ghostX: SharedNum,
  ghostY: SharedNum,
  ghostAtivo: SharedNum,
  aoIniciar: (tipo: string, valor: string) => void,
  aoArrastar: (ax: number, ay: number) => void,
  aoSoltar: (ax: number, ay: number, tipo: string, valor: string) => void,
  aoTocar: (tipo: string, valor: string) => void,
  aoFinalizar: () => void,
) {
  return useMemo(() => {
    const toque = Gesture.Tap()
      .enabled(habilitado)
      .onStart(() => {
        runOnJS(aoTocar)(tipo, valor);
      });
    const arraste = Gesture.Pan()
      .enabled(habilitado)
      .onStart(evento => {
        ghostAtivo.value = 1;
        ghostX.value = evento.absoluteX;
        ghostY.value = evento.absoluteY;
        runOnJS(aoIniciar)(tipo, valor);
      })
      .onUpdate(evento => {
        ghostX.value = evento.absoluteX;
        ghostY.value = evento.absoluteY;
        runOnJS(aoArrastar)(evento.absoluteX, evento.absoluteY);
      })
      .onEnd(evento => {
        ghostAtivo.value = 0;
        runOnJS(aoSoltar)(evento.absoluteX, evento.absoluteY, tipo, valor);
        runOnJS(aoFinalizar)();
      });
    return Gesture.Race(arraste, toque);
  }, [
    tipo,
    valor,
    habilitado,
    ghostX,
    ghostY,
    ghostAtivo,
    aoIniciar,
    aoArrastar,
    aoSoltar,
    aoTocar,
    aoFinalizar,
  ]);
}

function DraggablePitch({
  formacao,
  jogadores,
  onAtualizarFormacao,
  onAbrirJogador,
  onArrastandoChange,
  largura,
}: DraggablePitchProps): React.JSX.Element {
  const altura = Math.round(largura * 1.42);
  const raioFicha = Math.round(largura * 0.062);
  const limiarDrop = raioFicha + 26;

  const overlayRef = useRef<View>(null);
  const pitchRef = useRef<View>(null);
  const pitchOrigemRef = useRef({x: 0, y: 0});
  const hoverRef = useRef<number | null>(null);
  const arrastandoRef = useRef<Descritor | null>(null);

  const ghostX = useSharedValue(0);
  const ghostY = useSharedValue(0);
  const ghostAtivo = useSharedValue(0);
  const overlayOX = useSharedValue(0);
  const overlayOY = useSharedValue(0);

  const [arrastando, setArrastando] = useState<Descritor | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const porId = useMemo(
    () => new Map(jogadores.map(j => [j.id, j])),
    [jogadores],
  );

  // Garante x/y em todos os titulares (saves antigos / formações por linha).
  const titulares = useMemo(
    () => preencherCoordenadas(formacao.titulares),
    [formacao.titulares],
  );

  const titularIds = useMemo(
    () => new Set(titulares.map(t => t.jogadorId)),
    [titulares],
  );

  const banco = useMemo(
    () => jogadores.filter(j => !titularIds.has(j.id)),
    [jogadores, titularIds],
  );

  // Posições de tela de cada slot (centro da ficha).
  const slotsTela = useMemo<SlotTela[]>(
    () =>
      titulares.map((titular, slotIndex) => ({
        slotIndex,
        jogadorId: titular.jogadorId,
        cx: (titular.x ?? 0.5) * largura,
        cy: (1 - (titular.y ?? 0.5)) * altura,
      })),
    [titulares, largura, altura],
  );

  const medirOverlay = useCallback(() => {
    overlayRef.current?.measureInWindow((x, y) => {
      overlayOX.value = x;
      overlayOY.value = y;
    });
  }, [overlayOX, overlayOY]);
  const medirPitch = useCallback(() => {
    pitchRef.current?.measureInWindow((x, y) => {
      pitchOrigemRef.current = {x, y};
    });
  }, []);

  /** Slot titular mais próximo do ponto absoluto (ou null fora do limiar). */
  const slotMaisProximo = useCallback(
    (ax: number, ay: number, ignorarSlot: number | null): number | null => {
      const origem = pitchOrigemRef.current;
      if (origem.x === 0 && origem.y === 0) {
        return null;
      }
      let melhor: number | null = null;
      let melhorDist = limiarDrop;
      for (const slot of slotsTela) {
        if (slot.slotIndex === ignorarSlot) {
          continue;
        }
        const cx = origem.x + slot.cx;
        const cy = origem.y + slot.cy;
        const dist = Math.sqrt((ax - cx) ** 2 + (ay - cy) ** 2);
        if (dist < melhorDist) {
          melhorDist = dist;
          melhor = slot.slotIndex;
        }
      }
      return melhor;
    },
    [slotsTela, limiarDrop],
  );

  const aoIniciar = useCallback(
    (tipo: string, valor: string) => {
      medirPitch();
      medirOverlay();
      const descritor: Descritor = {tipo: tipo as Descritor['tipo'], valor};
      arrastandoRef.current = descritor;
      setArrastando(descritor);
      onArrastandoChange?.(true);
    },
    [medirPitch, medirOverlay, onArrastandoChange],
  );

  const aoArrastar = useCallback(
    (ax: number, ay: number) => {
      const atual = arrastandoRef.current;
      const ignorar =
        atual?.tipo === 'titular' ? Number(atual.valor) : null;
      const alvo = slotMaisProximo(ax, ay, ignorar);
      if (alvo !== hoverRef.current) {
        hoverRef.current = alvo;
        setHover(alvo);
      }
    },
    [slotMaisProximo],
  );

  const aoSoltar = useCallback(
    (ax: number, ay: number, tipo: string, valor: string) => {
      const origem = pitchOrigemRef.current;

      if (tipo === 'reserva') {
        // Reserva só entra caindo sobre um titular (substituição).
        const alvo = slotMaisProximo(ax, ay, null);
        if (alvo === null) {
          return;
        }
        const entrante = porId.get(valor);
        if (!entrante || entrante.lesionado || entrante.suspenso) {
          return;
        }
        onAtualizarFormacao(trocarTitular(formacao, alvo, valor));
        return;
      }

      // Titular sendo arrastado.
      const slotOrigem = Number(valor);
      const alvo = slotMaisProximo(ax, ay, slotOrigem);
      if (alvo !== null) {
        // Soltou sobre outro titular: troca os dois de lugar.
        const outroId = titulares[alvo]?.jogadorId;
        if (outroId) {
          onAtualizarFormacao(trocarTitular(formacao, slotOrigem, outroId));
        }
        return;
      }

      // Área livre: move o jogador (recalcula a posição pela coordenada).
      const nx = Math.min(1, Math.max(0, (ax - origem.x) / largura));
      const ny = Math.min(1, Math.max(0, 1 - (ay - origem.y) / altura));
      onAtualizarFormacao(moverTitular(formacao, slotOrigem, nx, ny));
    },
    [
      slotMaisProximo,
      porId,
      onAtualizarFormacao,
      formacao,
      titulares,
      largura,
      altura,
    ],
  );

  const aoFinalizar = useCallback(() => {
    arrastandoRef.current = null;
    setArrastando(null);
    hoverRef.current = null;
    setHover(null);
    onArrastandoChange?.(false);
  }, [onArrastandoChange]);

  const aoTocar = useCallback(
    (_tipo: string, valor: string) => {
      const id = _tipo === 'titular' ? titulares[Number(valor)]?.jogadorId : valor;
      if (id && onAbrirJogador) {
        onAbrirJogador(id);
      }
    },
    [titulares, onAbrirJogador],
  );

  const ghostStyle = useAnimatedStyle(() => ({
    opacity: ghostAtivo.value,
    transform: [
      {translateX: ghostX.value - overlayOX.value - GHOST / 2},
      {translateY: ghostY.value - overlayOY.value - GHOST / 2},
    ],
  }));

  const jogadorArrastado = arrastando
    ? arrastando.tipo === 'titular'
      ? porId.get(titulares[Number(arrastando.valor)]?.jogadorId)
      : porId.get(arrastando.valor)
    : undefined;

  return (
    <View ref={overlayRef} onLayout={medirOverlay} style={styles.overlay}>
      <View
        ref={pitchRef}
        onLayout={medirPitch}
        style={[styles.pitch, {width: largura, height: altura}]}>
        {/* Marcações do campo */}
        <View style={styles.linhaCentral} />
        <View
          style={[
            styles.circuloCentral,
            {
              width: largura * 0.26,
              height: largura * 0.26,
              borderRadius: largura * 0.13,
              left: largura * 0.37,
              top: altura / 2 - largura * 0.13,
            },
          ]}
        />
        <View style={[styles.area, styles.areaTopo, {width: largura * 0.6, left: largura * 0.2}]} />
        <View style={[styles.area, styles.areaBase, {width: largura * 0.6, left: largura * 0.2}]} />

        {slotsTela.map(slot => {
          const titular = titulares[slot.slotIndex];
          const jogador = porId.get(slot.jogadorId);
          const descritor: Descritor = {
            tipo: 'titular',
            valor: String(slot.slotIndex),
          };
          return (
            <PecaCampo
              key={`slot_${slot.slotIndex}`}
              descritor={descritor}
              jogador={jogador}
              posicaoEscalada={titular.posicao}
              cx={slot.cx}
              cy={slot.cy}
              raioFicha={raioFicha}
              habilitado
              hover={hover === slot.slotIndex}
              arrastandoEste={
                arrastando?.tipo === 'titular' &&
                Number(arrastando.valor) === slot.slotIndex
              }
              ghostX={ghostX}
              ghostY={ghostY}
              ghostAtivo={ghostAtivo}
              aoIniciar={aoIniciar}
              aoArrastar={aoArrastar}
              aoSoltar={aoSoltar}
              aoTocar={aoTocar}
              aoFinalizar={aoFinalizar}
            />
          );
        })}
      </View>

      <Text style={styles.dica}>
        Arraste para reposicionar · solte sobre outro jogador para trocar
      </Text>

      <Text style={styles.bancoTitulo}>Reservas</Text>
      <View style={styles.banco}>
        {banco.length === 0 ? (
          <Text style={styles.bancoVazio}>Sem reservas disponíveis.</Text>
        ) : (
          banco.map(jogador => {
            const indisponivel = jogador.lesionado || jogador.suspenso;
            return (
              <PecaReserva
                key={jogador.id}
                jogador={jogador}
                habilitado={!indisponivel}
                arrastandoEste={
                  arrastando?.tipo === 'reserva' &&
                  arrastando.valor === jogador.id
                }
                ghostX={ghostX}
                ghostY={ghostY}
                ghostAtivo={ghostAtivo}
                aoIniciar={aoIniciar}
                aoArrastar={aoArrastar}
                aoSoltar={aoSoltar}
                aoTocar={aoTocar}
                aoFinalizar={aoFinalizar}
              />
            );
          })
        )}
      </View>

      {/* Fantasma que segue o dedo durante o arraste. */}
      <Animated.View pointerEvents="none" style={[styles.ghost, ghostStyle]}>
        {jogadorArrastado ? (
          <View
            style={[
              styles.ghostFicha,
              {borderColor: corOverall(jogadorArrastado.overall)},
            ]}>
            <Text style={styles.ghostOverall}>{jogadorArrastado.overall}</Text>
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

type PecaCampoProps = {
  descritor: Descritor;
  jogador: Player | undefined;
  posicaoEscalada: Player['posicaoPrincipal'];
  cx: number;
  cy: number;
  raioFicha: number;
  habilitado: boolean;
  hover: boolean;
  arrastandoEste: boolean;
  ghostX: SharedNum;
  ghostY: SharedNum;
  ghostAtivo: SharedNum;
  aoIniciar: (tipo: string, valor: string) => void;
  aoArrastar: (ax: number, ay: number) => void;
  aoSoltar: (ax: number, ay: number, tipo: string, valor: string) => void;
  aoTocar: (tipo: string, valor: string) => void;
  aoFinalizar: () => void;
};

function PecaCampo({
  descritor,
  jogador,
  posicaoEscalada,
  cx,
  cy,
  raioFicha,
  habilitado,
  hover,
  arrastandoEste,
  ghostX,
  ghostY,
  ghostAtivo,
  aoIniciar,
  aoArrastar,
  aoSoltar,
  aoTocar,
  aoFinalizar,
}: PecaCampoProps): React.JSX.Element {
  const gesto = useGestoPeca(
    descritor.tipo,
    descritor.valor,
    habilitado,
    ghostX,
    ghostY,
    ghostAtivo,
    aoIniciar,
    aoArrastar,
    aoSoltar,
    aoTocar,
    aoFinalizar,
  );

  const adaptacao = jogador ? nivelAdaptacao(jogador, posicaoEscalada) : null;
  const corBorda = adaptacao ? corAdaptacao(adaptacao.nivel) : cores.textoSecundario;
  const pct = adaptacao ? Math.round(adaptacao.fator * 100) : 100;
  const diam = raioFicha * 2;

  return (
    <GestureDetector gesture={gesto}>
      <View
        style={[
          styles.pecaWrap,
          {
            left: cx - raioFicha,
            top: cy - raioFicha - 6,
            width: diam,
          },
        ]}>
        <View
          style={[
            styles.ficha,
            {
              width: diam,
              height: diam,
              borderRadius: raioFicha,
              borderColor: corBorda,
            },
            hover ? styles.fichaHover : null,
            arrastandoEste ? styles.fichaArrastando : null,
          ]}>
          <Text style={[styles.fichaOverall, {color: corBorda}]}>
            {jogador ? jogador.overall : '--'}
          </Text>
        </View>
        <Text style={styles.fichaPos}>{posicaoEscalada}</Text>
        <Text style={styles.fichaNome} numberOfLines={1}>
          {jogador ? primeiroNome(jogador) : 'Vazio'}
        </Text>
        {adaptacao && adaptacao.nivel !== 'natural' ? (
          <Text style={[styles.fichaPct, {color: corBorda}]}>{pct}%</Text>
        ) : null}
      </View>
    </GestureDetector>
  );
}

type PecaReservaProps = {
  jogador: Player;
  habilitado: boolean;
  arrastandoEste: boolean;
  ghostX: SharedNum;
  ghostY: SharedNum;
  ghostAtivo: SharedNum;
  aoIniciar: (tipo: string, valor: string) => void;
  aoArrastar: (ax: number, ay: number) => void;
  aoSoltar: (ax: number, ay: number, tipo: string, valor: string) => void;
  aoTocar: (tipo: string, valor: string) => void;
  aoFinalizar: () => void;
};

function PecaReserva({
  jogador,
  habilitado,
  arrastandoEste,
  ghostX,
  ghostY,
  ghostAtivo,
  aoIniciar,
  aoArrastar,
  aoSoltar,
  aoTocar,
  aoFinalizar,
}: PecaReservaProps): React.JSX.Element {
  const gesto = useGestoPeca(
    'reserva',
    jogador.id,
    habilitado,
    ghostX,
    ghostY,
    ghostAtivo,
    aoIniciar,
    aoArrastar,
    aoSoltar,
    aoTocar,
    aoFinalizar,
  );

  return (
    <GestureDetector gesture={gesto}>
      <View
        style={[
          styles.reserva,
          !habilitado ? styles.reservaIndisponivel : null,
          arrastandoEste ? styles.fichaArrastando : null,
        ]}>
        <View
          style={[styles.reservaBadge, {borderColor: corOverall(jogador.overall)}]}>
          <Text
            style={[styles.reservaOverall, {color: corOverall(jogador.overall)}]}>
            {jogador.overall}
          </Text>
        </View>
        <View style={styles.reservaInfo}>
          <Text style={styles.reservaNome} numberOfLines={1}>
            {primeiroNome(jogador)}
          </Text>
          <Text style={styles.reservaPos}>
            {jogador.posicaoPrincipal}
            {jogador.lesionado ? ' · lesão' : jogador.suspenso ? ' · susp.' : ''}
          </Text>
        </View>
      </View>
    </GestureDetector>
  );
}

export default DraggablePitch;

const VERDE_CAMPO = '#123524';
const LINHA = 'rgba(240,244,255,0.5)';

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    gap: espaco.sm,
  },
  pitch: {
    backgroundColor: VERDE_CAMPO,
    borderColor: LINHA,
    borderRadius: raio.md,
    borderWidth: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  linhaCentral: {
    backgroundColor: LINHA,
    height: 1.5,
    left: 0,
    position: 'absolute',
    right: 0,
    top: '50%',
  },
  circuloCentral: {
    borderColor: LINHA,
    borderWidth: 1.5,
    position: 'absolute',
  },
  area: {
    borderColor: LINHA,
    borderWidth: 1.5,
    height: 44,
    position: 'absolute',
  },
  areaTopo: {
    top: 0,
  },
  areaBase: {
    bottom: 0,
  },
  pecaWrap: {
    alignItems: 'center',
    position: 'absolute',
  },
  ficha: {
    alignItems: 'center',
    backgroundColor: '#0A0E1A',
    borderWidth: 2.5,
    justifyContent: 'center',
  },
  fichaHover: {
    backgroundColor: '#1d2c22',
  },
  fichaArrastando: {
    opacity: 0.35,
  },
  fichaOverall: {
    fontSize: 13,
    fontWeight: '900',
  },
  fichaPos: {
    color: 'rgba(240,244,255,0.85)',
    fontSize: 9,
    fontWeight: '800',
    marginTop: 2,
  },
  fichaNome: {
    color: cores.texto,
    fontSize: 10,
    fontWeight: '600',
    maxWidth: 64,
    textAlign: 'center',
  },
  fichaPct: {
    fontSize: 9,
    fontWeight: '900',
  },
  dica: {
    color: cores.textoSecundario,
    fontSize: 11,
    textAlign: 'center',
  },
  bancoTitulo: {
    alignSelf: 'flex-start',
    color: cores.texto,
    fontSize: 14,
    fontWeight: '800',
    marginTop: espaco.sm,
  },
  banco: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaco.sm,
  },
  bancoVazio: {
    color: cores.textoSecundario,
    fontSize: 12,
  },
  reserva: {
    alignItems: 'center',
    backgroundColor: cores.superficieAlt,
    borderColor: cores.borda,
    borderRadius: raio.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: espaco.xs,
    paddingHorizontal: espaco.sm,
    paddingVertical: espaco.xs,
  },
  reservaIndisponivel: {
    opacity: 0.5,
  },
  reservaBadge: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 2,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  reservaOverall: {
    fontSize: 12,
    fontWeight: '900',
  },
  reservaInfo: {
    maxWidth: 92,
  },
  reservaNome: {
    color: cores.texto,
    fontSize: 12,
    fontWeight: '700',
  },
  reservaPos: {
    color: cores.textoSecundario,
    fontSize: 10,
  },
  ghost: {
    height: GHOST,
    left: 0,
    position: 'absolute',
    top: 0,
    width: GHOST,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostFicha: {
    alignItems: 'center',
    backgroundColor: '#0A0E1A',
    borderRadius: 26,
    borderWidth: 3,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  ghostOverall: {
    color: cores.texto,
    fontSize: 16,
    fontWeight: '900',
  },
});
