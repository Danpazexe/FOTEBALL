/**
 * CampoFUT — sistema de escalação estilo FIFA Ultimate Team (mobile-first).
 *
 * Compõe, num só componente, tudo que a tela de escalação precisa:
 *  • Cabeçalho do clube (escudo + nome + formação detectada) e OVERALL do time.
 *  • Card do técnico (reputação em estrelas) à direita.
 *  • Campo responsivo com os 11 titulares como CARTAS FUT (tier + anel de encaixe).
 *  • Banco de reservas com SCROLL HORIZONTAL.
 *  • Banner de validação da escalação.
 *
 * Interação (drag-and-drop, item 9 da spec):
 *  • Arrastar um TITULAR sobre outro   -> troca os dois de lugar.
 *  • Arrastar um TITULAR para área livre-> move (recalcula a posição pela coord.).
 *  • Arrastar um RESERVA sobre um titular-> substitui (reserva entra).
 *  • Tocar num card                     -> abre o detalhe (opcional).
 *
 * Toda a REGRA vem dos módulos puros já existentes (nada é reimplementado aqui):
 * geometria (coordenadas), adaptacao (penalidade fora de posição, item 12),
 * defaults (mutadores de formação) e validacao. O visual de tier vem do tema
 * (nivelCarta/corOverall/glowDoTier). O componente é controlado: recebe a
 * formação e devolve a nova via `onAtualizarFormacao` (que valida na store).
 */

import React, {useCallback, useMemo, useRef, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import {moverTitular, trocarTitular} from '../../api/database/seed/defaults';
import {nivelAdaptacao} from '../../engine/tactics/adaptacao';
import type {ForcaTime} from '../../engine/simulation/teamStrength';
import {
  coordenadaDoTitular,
  detectarFormacao,
  preencherCoordenadas,
} from '../../engine/tactics/geometria';
import {validarEscalacao} from '../../engine/tactics/validacao';
import {corAdaptacao, cores, corOverall, espaco, raio, suaves} from '../../theme';
import type {Clube, Formacao, Player, Position} from '../../types';
import CartaJogador from '../CartaJogador';
import Escudo from '../Escudo';
import Icone from '../Icone';

type CampoFUTProps = {
  clube: Clube;
  formacao: Formacao;
  jogadores: Player[];
  forca: ForcaTime | null;
  reputacaoTecnico: number;
  onAtualizarFormacao: (formacao: Formacao) => void;
  onAbrirJogador?: (jogadorId: string) => void;
  /** Avisa a tela quando um arraste começa/termina (trava o scroll externo). */
  onArrastandoChange?: (ativo: boolean) => void;
  largura: number;
};

type Descritor = {tipo: 'titular' | 'reserva'; valor: string};

type SlotTela = {slotIndex: number; jogadorId: string; cx: number; cy: number};

type SharedNum = SharedValue<number>;

/**
 * Gesto reaproveitável por card: arraste (fantasma segue o dedo) + toque.
 * `restringirVertical` liga o `activeOffsetY`: no banco (dentro de um ScrollView
 * horizontal), o arraste só ativa num movimento VERTICAL (puxar pro campo),
 * deixando o gesto horizontal rolar o banco — chave pra fluidez no celular.
 */
function useGestoPeca(
  tipo: Descritor['tipo'],
  valor: string,
  habilitado: boolean,
  restringirVertical: boolean,
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
    let arraste = Gesture.Pan()
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
    if (restringirVertical) {
      arraste = arraste.activeOffsetY([-14, 14]);
    }
    return Gesture.Race(arraste, toque);
  }, [
    tipo,
    valor,
    habilitado,
    restringirVertical,
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

function CampoFUT({
  clube,
  formacao,
  jogadores,
  forca,
  reputacaoTecnico,
  onAtualizarFormacao,
  onAbrirJogador,
  onArrastandoChange,
  largura,
}: CampoFUTProps): React.JSX.Element {
  const altura = Math.round(largura * 1.42);
  // Cartas do campo (11 no gramado) e do banco (um pouco maiores, com folga).
  const cardW = Math.round(largura * 0.172);
  const cardH = Math.round(cardW * 1.42);
  const cardBancoW = Math.round(largura * 0.2);
  // Card "fantasma" que segue o dedo no arraste: a CARTA FUT completa, num
  // tamanho médio, para mostrar o jogador sendo puxado (não uma bolinha).
  const ghostW = Math.min(Math.round(largura * 0.5), 190);
  const ghostH = Math.round(ghostW * 1.42);
  // Margens verticais pra as cartas caberem dentro do gramado sem cortar.
  const padTopo = Math.round(cardH / 2) + 4;
  const padBase = Math.round(cardH / 2) + 6;
  const limiarDrop = cardW * 0.75 + 18;

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

  const validacao = useMemo(
    () => validarEscalacao(formacao, jogadores),
    [formacao, jogadores],
  );
  const formacaoDetectada = useMemo(
    () => detectarFormacao(formacao.titulares),
    [formacao.titulares],
  );

  // Posições de tela de cada slot (centro da carta). Coordenada vem da FONTE
  // ÚNICA (coordenadaDoTitular), a mesma usada pelas outras telas de escalação.
  const slotsTela = useMemo<SlotTela[]>(
    () =>
      titulares.map((titular, slotIndex) => {
        const {x, y} = coordenadaDoTitular(titular);
        return {
          slotIndex,
          jogadorId: titular.jogadorId,
          cx: x * largura,
          cy: padTopo + (1 - y) * (altura - padTopo - padBase),
        };
      }),
    [titulares, largura, altura, padTopo, padBase],
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
      const ignorar = atual?.tipo === 'titular' ? Number(atual.valor) : null;
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
      const ny = Math.min(
        1,
        Math.max(
          0,
          1 - (ay - origem.y - padTopo) / (altura - padTopo - padBase),
        ),
      );
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
      padTopo,
      padBase,
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
    (tipo: string, valor: string) => {
      const id =
        tipo === 'titular' ? titulares[Number(valor)]?.jogadorId : valor;
      if (id && onAbrirJogador) {
        onAbrirJogador(id);
      }
    },
    [titulares, onAbrirJogador],
  );

  // Centraliza o card no dedo na horizontal e o LEVANTA (dedo perto da base do
  // card), pra o polegar não cobrir o jogador que está sendo arrastado.
  const ghostStyle = useAnimatedStyle(() => ({
    opacity: ghostAtivo.value,
    transform: [
      {translateX: ghostX.value - overlayOX.value - ghostW / 2},
      {translateY: ghostY.value - overlayOY.value - ghostH * 0.78},
      {scale: 1.03},
    ],
  }));

  const jogadorArrastado = arrastando
    ? arrastando.tipo === 'titular'
      ? porId.get(titulares[Number(arrastando.valor)]?.jogadorId)
      : porId.get(arrastando.valor)
    : undefined;

  const arrastandoAtivo = arrastando !== null;

  return (
    <View ref={overlayRef} onLayout={medirOverlay} style={styles.overlay}>
      <Cabecalho
        clube={clube}
        forca={forca}
        formacaoDetectada={formacaoDetectada}
        reputacaoTecnico={reputacaoTecnico}
      />

      <BannerValidacao validacao={validacao} />

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
        <View
          style={[
            styles.area,
            styles.areaTopo,
            {width: largura * 0.6, left: largura * 0.2},
          ]}
        />
        <View
          style={[
            styles.area,
            styles.areaBase,
            {width: largura * 0.6, left: largura * 0.2},
          ]}
        />

        {slotsTela.map(slot => {
          const titular = titulares[slot.slotIndex];
          return (
            <PecaCampo
              key={`slot_${slot.slotIndex}`}
              slotIndex={slot.slotIndex}
              jogador={porId.get(slot.jogadorId)}
              posicaoEscalada={titular.posicao}
              cx={slot.cx}
              cy={slot.cy}
              cardW={cardW}
              cardH={cardH}
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
        Arraste um card sobre outro para trocar · reserva sobre titular substitui
      </Text>

      {/* Banco de reservas — SCROLL HORIZONTAL (prioridade mobile). */}
      <View style={styles.bancoHeader}>
        <Text style={styles.bancoTitulo}>Banco de reservas</Text>
        <Text style={styles.bancoContagem}>{banco.length}</Text>
      </View>
      {banco.length === 0 ? (
        <Text style={styles.bancoVazio}>Sem reservas disponíveis.</Text>
      ) : (
        <ScrollView
          horizontal
          scrollEnabled={!arrastandoAtivo}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.bancoConteudo}>
          {banco.map(jogador => (
            <PecaReserva
              key={jogador.id}
              jogador={jogador}
              cardW={cardBancoW}
              habilitado={!jogador.lesionado && !jogador.suspenso}
              arrastandoEste={
                arrastando?.tipo === 'reserva' && arrastando.valor === jogador.id
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
          ))}
        </ScrollView>
      )}

      {/* Card FUT completo que segue o dedo durante o arraste. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.ghost, {width: ghostW, height: ghostH}, ghostStyle]}>
        {jogadorArrastado ? (
          <CartaJogador jogador={jogadorArrastado} largura={ghostW} />
        ) : null}
      </Animated.View>
    </View>
  );
}

/** Cabeçalho: escudo + nome + formação (esq.) · overall · técnico (dir.). */
function Cabecalho({
  clube,
  forca,
  formacaoDetectada,
  reputacaoTecnico,
}: {
  clube: Clube;
  forca: ForcaTime | null;
  formacaoDetectada: string;
  reputacaoTecnico: number;
}): React.JSX.Element {
  const overall = Math.round(forca?.overall ?? 0);
  return (
    <View style={styles.cabecalho}>
      <View style={styles.cabInfo}>
        <Escudo clubeId={clube.id} sigla={clube.sigla} tamanho={40} />
        <View style={styles.cabTextos}>
          <Text style={styles.cabNome} numberOfLines={1}>
            {clube.nome}
          </Text>
          <View style={styles.cabFormacaoChip}>
            <Icone nome="tatica" tamanho={12} cor={cores.primaria} />
            <Text style={styles.cabFormacao}>{formacaoDetectada}</Text>
          </View>
        </View>
      </View>

      <View style={styles.cabDireita}>
        <View style={styles.cabOverall}>
          <Text style={[styles.cabOverallNum, {color: corOverall(overall)}]}>
            {overall}
          </Text>
          <Text style={styles.cabOverallRotulo}>OVR</Text>
        </View>
        <CardTecnico reputacao={reputacaoTecnico} />
      </View>
    </View>
  );
}

/** Card compacto do técnico: reputação em estrelas (0-5) + valor. */
function CardTecnico({reputacao}: {reputacao: number}): React.JSX.Element {
  const estrelas = Math.max(0, Math.min(5, Math.round(reputacao / 20)));
  return (
    <View style={styles.tecnico}>
      <Icone nome="conversa" tamanho={16} cor={cores.secundaria} />
      <Text style={styles.tecnicoEstrelas}>
        {'★'.repeat(estrelas)}
        <Text style={styles.tecnicoEstrelasVazias}>
          {'★'.repeat(5 - estrelas)}
        </Text>
      </Text>
      <Text style={styles.tecnicoRotulo}>Técnico</Text>
    </View>
  );
}

/** Banner compacto de validação: 1ª mensagem de erro/aviso, ou "válida". */
function BannerValidacao({
  validacao,
}: {
  validacao: ReturnType<typeof validarEscalacao>;
}): React.JSX.Element | null {
  if (!validacao.valido) {
    return (
      <View style={[styles.banner, styles.bannerErro]}>
        <Icone nome="fechar" tamanho={14} cor={cores.perigo} />
        <Text style={[styles.bannerTexto, {color: cores.perigo}]}>
          {validacao.erros[0]}
        </Text>
      </View>
    );
  }
  if (validacao.avisos.length > 0) {
    return (
      <View style={[styles.banner, styles.bannerAviso]}>
        <Icone nome="lesao" tamanho={14} cor={cores.secundaria} />
        <Text style={[styles.bannerTexto, {color: cores.secundariaEscura}]}>
          {validacao.avisos[0]}
          {validacao.avisos.length > 1
            ? ` (+${validacao.avisos.length - 1})`
            : ''}
        </Text>
      </View>
    );
  }
  return (
    <View style={[styles.banner, styles.bannerOk]}>
      <Icone nome="check" tamanho={14} cor={cores.primaria} />
      <Text style={[styles.bannerTexto, {color: cores.primariaEscura}]}>
        Escalação válida
      </Text>
    </View>
  );
}

/**
 * Carta FUT compacta (usada no campo e no banco). Fundo = tier do overall;
 * BORDA = anel de encaixe na posição (verde natural → vermelho improviso), que
 * é a penalidade fora de posição já calibrada em `adaptacao`. Quando destacada
 * (alvo de drop), a borda vira verde-marca e a carta cresce um tico.
 */
function CartaFUT({
  jogador,
  posicaoEscalada,
  largura,
  destaque,
  esmaecer,
}: {
  jogador: Player | undefined;
  posicaoEscalada: Position;
  largura: number;
  destaque: boolean;
  esmaecer: boolean;
}): React.JSX.Element {
  const altura = Math.round(largura * 1.42);
  if (!jogador) {
    return (
      <View style={[styles.cartaVazia, {width: largura, height: altura}]}>
        <Text style={styles.cartaVaziaTexto}>{posicaoEscalada}</Text>
      </View>
    );
  }

  const adaptacao = nivelAdaptacao(jogador, posicaoEscalada);
  const indisponivel = jogador.lesionado || jogador.suspenso;

  // Mesma carta do jogo (CartaJogador), em modo compacto: mostra a POSIÇÃO
  // escalada e o % de adaptação (penalidade fora de posição). Destaque = alvo
  // de drop (brilho verde); esmaecer = card sendo arrastado.
  return (
    <View
      style={[
        destaque ? styles.cartaDestaque : null,
        esmaecer ? styles.cartaEsmaecida : null,
      ]}>
      <CartaJogador
        jogador={jogador}
        largura={largura}
        compacto
        posicaoEscalada={posicaoEscalada}
        rendimento={Math.round(adaptacao.fator * 100)}
        corRendimento={corAdaptacao(adaptacao.nivel)}
      />
      {indisponivel ? (
        <View style={styles.cartaStatus}>
          <Icone
            nome={jogador.lesionado ? 'lesao' : 'cartao'}
            tamanho={Math.round(largura * 0.18)}
            cor={cores.contrastePrimaria}
          />
        </View>
      ) : null}
    </View>
  );
}

type PecaCampoProps = {
  slotIndex: number;
  jogador: Player | undefined;
  posicaoEscalada: Position;
  cx: number;
  cy: number;
  cardW: number;
  cardH: number;
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
  slotIndex,
  jogador,
  posicaoEscalada,
  cx,
  cy,
  cardW,
  cardH,
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
    'titular',
    String(slotIndex),
    true,
    false,
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
          styles.slotWrap,
          {left: cx - cardW / 2, top: cy - cardH / 2, width: cardW},
        ]}>
        <CartaFUT
          jogador={jogador}
          posicaoEscalada={posicaoEscalada}
          largura={cardW}
          destaque={hover}
          esmaecer={arrastandoEste}
        />
      </View>
    </GestureDetector>
  );
}

type PecaReservaProps = {
  jogador: Player;
  cardW: number;
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
  cardW,
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
    true,
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
      <View style={!habilitado ? styles.reservaIndisponivel : null}>
        <CartaFUT
          jogador={jogador}
          posicaoEscalada={jogador.posicaoPrincipal}
          largura={cardW}
          destaque={false}
          esmaecer={arrastandoEste}
        />
      </View>
    </GestureDetector>
  );
}

export default CampoFUT;

const VERDE_CAMPO = cores.gramado;
const LINHA = cores.bordaTranslForte;

const styles = StyleSheet.create({
  overlay: {
    gap: espaco.sm,
  },
  cabecalho: {
    alignItems: 'center',
    backgroundColor: cores.superficie,
    borderColor: cores.borda,
    borderRadius: raio.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: espaco.sm,
  },
  cabInfo: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: espaco.sm,
  },
  cabTextos: {
    flex: 1,
    gap: 3,
  },
  cabNome: {
    color: cores.texto,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  cabFormacaoChip: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: cores.superficieAlt,
    borderRadius: raio.sm,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: espaco.sm,
    paddingVertical: 2,
  },
  cabFormacao: {
    color: cores.texto,
    fontSize: 12,
    fontWeight: '800',
  },
  cabDireita: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.sm,
  },
  cabOverall: {
    alignItems: 'center',
  },
  cabOverallNum: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -1,
  },
  cabOverallRotulo: {
    color: cores.textoSecundario,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: -2,
  },
  tecnico: {
    alignItems: 'center',
    backgroundColor: cores.superficieAlt,
    borderColor: cores.borda,
    borderRadius: raio.sm,
    borderWidth: 1,
    gap: 1,
    paddingHorizontal: espaco.sm,
    paddingVertical: espaco.xs,
  },
  tecnicoEstrelas: {
    color: cores.secundaria,
    fontSize: 11,
    letterSpacing: 1,
  },
  tecnicoEstrelasVazias: {
    color: cores.bordaClara,
  },
  tecnicoRotulo: {
    color: cores.textoSecundario,
    fontSize: 9,
    fontWeight: '700',
  },
  banner: {
    alignItems: 'center',
    borderRadius: raio.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: espaco.xs,
    paddingHorizontal: espaco.sm,
    paddingVertical: espaco.xs,
  },
  bannerErro: {
    backgroundColor: suaves.vermelho,
    borderColor: cores.perigo,
  },
  bannerAviso: {
    backgroundColor: suaves.amarelo,
    borderColor: cores.secundaria,
  },
  bannerOk: {
    backgroundColor: suaves.verde,
    borderColor: cores.primaria,
  },
  bannerTexto: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  pitch: {
    alignSelf: 'center',
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
  slotWrap: {
    position: 'absolute',
  },
  cartaDestaque: {
    elevation: 12,
    shadowColor: cores.primaria,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.9,
    shadowRadius: 12,
    transform: [{scale: 1.1}],
  },
  cartaEsmaecida: {
    opacity: 0.35,
  },
  cartaVazia: {
    alignItems: 'center',
    backgroundColor: cores.glassForte,
    borderColor: cores.bordaTransl,
    borderRadius: raio.sm,
    borderStyle: 'dashed',
    borderWidth: 2,
    justifyContent: 'center',
  },
  cartaVaziaTexto: {
    color: cores.textoSecundario,
    fontSize: 11,
    fontWeight: '800',
  },
  cartaStatus: {
    alignItems: 'center',
    backgroundColor: cores.perigo,
    borderRadius: 999,
    height: 18,
    justifyContent: 'center',
    position: 'absolute',
    right: 4,
    top: 4,
    width: 18,
    zIndex: 5,
  },
  dica: {
    color: cores.textoSecundario,
    fontSize: 11,
    textAlign: 'center',
  },
  bancoHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.sm,
  },
  bancoTitulo: {
    color: cores.texto,
    fontSize: 14,
    fontWeight: '800',
  },
  bancoContagem: {
    backgroundColor: cores.superficieAlt,
    borderRadius: 999,
    color: cores.textoSecundario,
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  bancoVazio: {
    color: cores.textoSecundario,
    fontSize: 12,
  },
  bancoConteudo: {
    gap: espaco.sm,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  reservaIndisponivel: {
    opacity: 0.5,
  },
  ghost: {
    elevation: 14,
    left: 0,
    position: 'absolute',
    shadowColor: '#0B1E3F',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.4,
    shadowRadius: 18,
    top: 0,
  },
});
