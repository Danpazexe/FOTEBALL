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
 * Interação (drag-and-drop, estilo EA FC — posições TRAVADAS na formação):
 *  • Arrastar um TITULAR sobre outro    -> troca os dois de lugar.
 *  • Arrastar um RESERVA sobre um titular-> substitui (reserva entra).
 *  • Tocar num card                     -> abre o detalhe (opcional).
 * O campo é desenhado em PERSPECTIVA (gramado em trapézio; cards menores ao fundo).
 *
 * Toda a REGRA vem dos módulos puros já existentes (nada é reimplementado aqui):
 * geometria (coordenadas), adaptacao (penalidade fora de posição, item 12),
 * defaults (mutadores de formação) e validacao. O visual de tier vem do tema
 * (nivelCarta/corOverall/glowDoTier). O componente é controlado: recebe a
 * formação e devolve a nova via `onAtualizarFormacao` (que valida na store).
 */

import React, {useCallback, useMemo, useRef, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

import {trocarTitular} from '../../api/database/seed/defaults';
import type {ForcaTime} from '../../engine/simulation/teamStrength';
import {
  coordenadaDoTitular,
  detectarFormacao,
  preencherCoordenadas,
} from '../../engine/tactics/geometria';
import {validarEscalacao} from '../../engine/tactics/validacao';
import {cores, corOverall, espaco, raio, suaves} from '../../theme';
import type {Clube, Formacao, Player, Position, Tatica} from '../../types';
import Escudo from '../Escudo';
import FichaCamisa from '../FichaCamisa';
import Icone from '../Icone';

type CampoFUTProps = {
  clube: Clube;
  formacao: Formacao;
  jogadores: Player[];
  tatica: Tatica;
  forca: ForcaTime | null;
  reputacaoTecnico: number;
  onAtualizarFormacao: (formacao: Formacao) => void;
  onAbrirJogador?: (jogadorId: string) => void;
  /** Avisa a tela quando um arraste começa/termina (trava o scroll externo). */
  onArrastandoChange?: (ativo: boolean) => void;
  largura: number;
};

type Descritor = {tipo: 'titular' | 'reserva'; valor: string};

type SlotTela = {
  slotIndex: number;
  jogadorId: string;
  cx: number;
  cy: number;
  escala: number;
};

type SharedNum = SharedValue<number>;

// O card-fantasma é "levantado" acima do dedo: seu TOPO fica a ghostH*LEVANTA
// acima do toque, então o CENTRO visual fica a ghostH*(LEVANTA-0.5) acima. O
// hit-test do drop compensa esse offset para capturar o slot SOB a carta (e não
// sob o dedo) — senão, mirando pela carta, o drop cai fora do alvo.
const GHOST_LEVANTA = 0.78;

/**
 * Perspectiva do campo (estádio 3D). O fundo (gol de ataque, longe) fica no TOPO
 * — estreito e com cartas menores; a frente (nosso gol/GK, perto) fica na BASE —
 * larga e com cartas maiores. A MESMA projeção alimenta o desenho do campo, a
 * posição das peças e o hit-test do drag-drop (coerência = arraste não quebra).
 */
const PERSP = {
  /** Fração da largura ocupada pelas peças no fundo (longe) e na frente (perto).
   * SUAVE (estilo Sofascore): peças quase na largura toda, só um leve afunilar
   * ao fundo. */
  larguraTopo: 0.86,
  larguraBase: 0.94,
  /** Escala das cartas por profundidade (levemente menores ao fundo). */
  escalaTopo: 0.9,
  escalaBase: 1.0,
};

/** Projeta (x,y ∈ 0..1) → centro da carta na tela + escala por profundidade. */
function projetarSlot(
  x: number,
  y: number,
  largura: number,
  altura: number,
  padTopo: number,
  padBase: number,
): {cx: number; cy: number; escala: number} {
  const t = 1 - y; // 0 = fundo (topo/longe), 1 = frente (base/perto)
  const cy = padTopo + t * (altura - padTopo - padBase);
  const larguraFrac =
    PERSP.larguraTopo + (PERSP.larguraBase - PERSP.larguraTopo) * t;
  const cx = largura / 2 + (x - 0.5) * largura * larguraFrac;
  const escala = PERSP.escalaTopo + (PERSP.escalaBase - PERSP.escalaTopo) * t;
  return {cx, cy, escala};
}

/**
 * Gesto reaproveitável por card: SEGURAR-e-arrastar (fantasma segue o dedo) +
 * toque. O arraste ativa por LONG-PRESS (segurar ~0,2s) para NÃO competir com o
 * scroll: um deslize simples rola a página/banco; segurar levanta a carta e aí
 * o arraste vence a rolagem. `arrastavel` liga/desliga o arraste (modo edição).
 */
function useGestoPeca(
  tipo: Descritor['tipo'],
  valor: string,
  arrastavel: boolean,
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
    // O TOQUE (abrir detalhe) fica SEMPRE ativo; só o ARRASTE depende do modo.
    const toque = Gesture.Tap().onStart(() => {
      runOnJS(aoTocar)(tipo, valor);
    });
    const arraste = Gesture.Pan()
      .enabled(arrastavel)
      // Segurar ~0,2s para pegar — desempata do scroll (vertical e do banco).
      .activateAfterLongPress(200)
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
    arrastavel,
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
  tatica,
  forca,
  reputacaoTecnico,
  onAtualizarFormacao,
  onAbrirJogador,
  onArrastandoChange,
  largura,
}: CampoFUTProps): React.JSX.Element {
  const altura = Math.round(largura * 1.52);
  // Cartas do campo (11 no gramado) e do banco — maiores pra leitura no celular.
  const cardW = Math.round(largura * 0.212);
  const cardH = Math.round(cardW * 1.2);
  const cardBancoW = Math.round(largura * 0.24);
  // Card "fantasma" que segue o dedo no arraste: a CARTA FUT completa, num
  // tamanho médio, para mostrar o jogador sendo puxado (não uma bolinha).
  const ghostW = Math.min(Math.round(largura * 0.5), 190);
  const ghostH = Math.round(ghostW * 1.2);
  // Quanto o centro visual do fantasma fica ACIMA do dedo (compensado no drop).
  const ghostOffset = Math.round(ghostH * (GHOST_LEVANTA - 0.5));
  // Margens verticais pra as cartas caberem dentro do gramado sem cortar.
  const padTopo = Math.round(cardH / 2) + 6;
  const padBase = Math.round(cardH / 2) + 10;
  // Raio de captura do drop: >= metade da distância vertical entre slots
  // vizinhos, pra não existir "zona morta" entre as cartas maiores.
  const limiarDrop = Math.round(cardH * 0.75);

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
  // Modo treinador: campo abre em VER (só toque/detalhe); o olho entra em EDITAR
  // (arraste/troca liberados e banco visível).
  const [modoEdicao, setModoEdicao] = useState(false);

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

  // Posições de tela de cada slot (centro da carta) EM PERSPECTIVA. Coordenada vem
  // da FONTE ÚNICA (coordenadaDoTitular); `projetarSlot` é o MESMO cálculo do
  // desenho do campo e do hit-test do drop.
  const slotsTela = useMemo<SlotTela[]>(
    () =>
      titulares.map((titular, slotIndex) => {
        const {x, y} = coordenadaDoTitular(titular);
        const {cx, cy, escala} = projetarSlot(
          x,
          y,
          largura,
          altura,
          padTopo,
          padBase,
        );
        return {slotIndex, jogadorId: titular.jogadorId, cx, cy, escala};
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
      const alvo = slotMaisProximo(ax, ay - ghostOffset, ignorar);
      if (alvo !== hoverRef.current) {
        hoverRef.current = alvo;
        setHover(alvo);
      }
    },
    [slotMaisProximo, ghostOffset],
  );

  const aoSoltar = useCallback(
    (ax: number, ay: number, tipo: string, valor: string) => {
      if (tipo === 'reserva') {
        // Reserva só entra caindo sobre um titular (substituição).
        const alvo = slotMaisProximo(ax, ay - ghostOffset, null);
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

      // Titular: SÓ troca ao soltar sobre outro slot. Fora de um slot não faz
      // nada (posições travadas na formação, estilo EA FC — sem arraste livre).
      const slotOrigem = Number(valor);
      const alvo = slotMaisProximo(ax, ay - ghostOffset, slotOrigem);
      if (alvo !== null) {
        const outroId = titulares[alvo]?.jogadorId;
        if (outroId) {
          onAtualizarFormacao(trocarTitular(formacao, slotOrigem, outroId));
        }
      }
    },
    [slotMaisProximo, porId, onAtualizarFormacao, formacao, titulares, ghostOffset],
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
      {translateY: ghostY.value - overlayOY.value - ghostH * GHOST_LEVANTA},
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

      <PlacaPublicidade largura={largura} />

      <View
        ref={pitchRef}
        onLayout={medirPitch}
        style={[styles.pitch, {width: largura, height: altura}]}>
        <PitchEstadio
          largura={largura}
          altura={altura}
          linhaDefensiva={tatica.linhaDefensiva}
          ladoAtaque={tatica.ladoAtaque ?? 'Ambos'}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={modoEdicao ? 'Concluir edição' : 'Editar escalação'}
          onPress={() => setModoEdicao(m => !m)}
          style={[styles.botaoOlho, modoEdicao ? styles.botaoOlhoAtivo : null]}>
          <Icone
            nome={modoEdicao ? 'check' : 'olho'}
            tamanho={18}
            cor={modoEdicao ? cores.contrastePrimaria : cores.primaria}
          />
        </Pressable>

        {slotsTela.map(slot => {
          const titular = titulares[slot.slotIndex];
          return (
            <PecaCampo
              key={`slot_${slot.slotIndex}`}
              slotIndex={slot.slotIndex}
              jogador={porId.get(slot.jogadorId)}
              posicaoEscalada={titular.posicao}
              ehCapitao={clube.capitaoId === slot.jogadorId}
              cx={slot.cx}
              cy={slot.cy}
              cardW={Math.round(cardW * slot.escala)}
              cardH={Math.round(cardH * slot.escala)}
              arrastavel={modoEdicao}
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

      <TaticaStrip tatica={tatica} />

      {!modoEdicao ? (
        <Text style={styles.dica}>Toque no olho para editar a escalação.</Text>
      ) : (
        <>
          <Text style={styles.dica}>
            Segure e arraste para trocar · segure um reserva e solte sobre um
            titular
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
              ))}
            </ScrollView>
          )}
        </>
      )}

      {/* Card FUT completo que segue o dedo durante o arraste. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.ghost, {width: ghostW, height: ghostH}, ghostStyle]}>
        {jogadorArrastado ? (
          <FichaCamisa
            jogador={jogadorArrastado}
            posicaoEscalada={jogadorArrastado.posicaoPrincipal}
            largura={ghostW}
          />
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
 * Placa de publicidade (LED) na borda do campo — a marca do jogo repetida numa
 * faixa escura, como o painel de patrocínio atrás do gol nos apps de futebol.
 */
function PlacaPublicidade({largura}: {largura: number}): React.JSX.Element {
  const repeticoes = Math.max(4, Math.round(largura / 90));
  return (
    <View style={[styles.placa, {width: largura}]}>
      {Array.from({length: repeticoes}).map((_, i) => (
        <Text key={i} style={styles.placaTexto} numberOfLines={1}>
          FOTEBALL
        </Text>
      ))}
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
  ehCapitao = false,
}: {
  jogador: Player | undefined;
  posicaoEscalada: Position;
  largura: number;
  destaque: boolean;
  esmaecer: boolean;
  ehCapitao?: boolean;
}): React.JSX.Element {
  const altura = Math.round(largura * 1.2);
  if (!jogador) {
    return (
      <View style={[styles.cartaVazia, {width: largura, height: altura}]}>
        <Text style={styles.cartaVaziaTexto}>{posicaoEscalada}</Text>
      </View>
    );
  }

  const indisponivel = jogador.lesionado || jogador.suspenso;

  // Camisa na cor viva do time (FichaCamisa): destaque = alvo de drop (brilho
  // verde); esmaecer = card sendo arrastado.
  return (
    <View
      style={[
        destaque ? styles.cartaDestaque : null,
        esmaecer ? styles.cartaEsmaecida : null,
      ]}>
      <FichaCamisa
        jogador={jogador}
        posicaoEscalada={posicaoEscalada}
        largura={largura}
        ehCapitao={ehCapitao}
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
  ehCapitao: boolean;
  cx: number;
  cy: number;
  cardW: number;
  cardH: number;
  arrastavel: boolean;
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
  ehCapitao,
  cx,
  cy,
  cardW,
  cardH,
  arrastavel,
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
    arrastavel,
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
          ehCapitao={ehCapitao}
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

/** Resumo tático ao vivo (chips): estilo, linha, ritmo, marcação. */
function TaticaStrip({tatica}: {tatica: Tatica}): React.JSX.Element {
  const chips = [
    tatica.estiloOfensivo,
    `Linha ${tatica.linhaDefensiva.toLowerCase()}`,
    `Ritmo ${tatica.ritmo.toLowerCase()}`,
    tatica.marcacao,
    `Ataque ${(tatica.ladoAtaque ?? 'Ambos').toLowerCase()}`,
    `Largura ${(tatica.amplidao ?? 'Normal').toLowerCase()}`,
  ];
  return (
    <View style={styles.taticaStrip}>
      {chips.map(texto => (
        <View key={texto} style={styles.taticaChip}>
          <Text style={styles.taticaChipTexto}>{texto}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Campo estilo Sofascore: gramado VERDE ocupando a largura toda (retângulo
 * arredondado, listras ceifadas), com a BALIZA + grande área do FUNDO desenhadas
 * em PERSPECTIVA (trapézio afunilando ao topo) — o único toque 3D, como no
 * Sofascore. Linha defensiva e setas de lado de ataque preservadas. SVG puro.
 */
function PitchEstadio({
  largura,
  altura,
  linhaDefensiva,
  ladoAtaque,
}: {
  largura: number;
  altura: number;
  linhaDefensiva: Tatica['linhaDefensiva'];
  ladoAtaque: NonNullable<Tatica['ladoAtaque']>;
}): React.JSX.Element {
  const cx = largura / 2;
  const m = 6;
  const topY = altura * 0.03;
  const baseY = altura * 0.99;
  const w = largura - m * 2;
  const h = baseY - topY;
  const yMeio = topY + h / 2;
  const raioCirc = w * 0.16;

  // FUNDO (longe) em perspectiva: grande/pequena área afunilando ao topo + gol.
  const areaFarTopW = w * 0.34;
  const areaFarBotW = w * 0.52;
  const areaFarY = topY + h * 0.13;
  const areaFar = `M${cx - areaFarTopW / 2} ${topY} L${cx + areaFarTopW / 2} ${topY} L${
    cx + areaFarBotW / 2
  } ${areaFarY} L${cx - areaFarBotW / 2} ${areaFarY} Z`;
  const peqFarTopW = w * 0.18;
  const peqFarBotW = w * 0.26;
  const peqFarY = topY + h * 0.06;
  const peqFar = `M${cx - peqFarTopW / 2} ${topY} L${cx + peqFarTopW / 2} ${topY} L${
    cx + peqFarBotW / 2
  } ${peqFarY} L${cx - peqFarBotW / 2} ${peqFarY} Z`;
  const golW = w * 0.12;
  const golFar = `M${cx - golW / 2} ${topY} L${cx - golW * 0.4} ${topY - 8} L${
    cx + golW * 0.4
  } ${topY - 8} L${cx + golW / 2} ${topY} Z`;

  // NOSSO gol (base/perto): áreas top-down.
  const areaNearW = w * 0.5;
  const areaNearH = h * 0.13;
  const peqNearW = w * 0.24;
  const peqNearH = h * 0.055;
  const golNearW = w * 0.16;

  const fracLinha =
    linhaDefensiva === 'Adiantada'
      ? 0.42
      : linhaDefensiva === 'Recuada'
      ? 0.66
      : 0.55;
  const yLinha = topY + h * fracLinha;

  const setaY = topY + h * 0.055;
  const setaTip = topY + h * 0.02;
  const seta = (ax: number): string =>
    `M${ax - 3} ${setaY} L${ax - 3} ${setaTip + 7} L${ax - 7} ${
      setaTip + 7
    } L${ax} ${setaTip} L${ax + 7} ${setaTip + 7} L${ax + 3} ${
      setaTip + 7
    } L${ax + 3} ${setaY} Z`;
  const xsSeta =
    ladoAtaque === 'Esquerda'
      ? [cx - w * 0.22]
      : ladoAtaque === 'Direita'
      ? [cx + w * 0.22]
      : ladoAtaque === 'Centro'
      ? [cx]
      : [cx - w * 0.22, cx + w * 0.22];

  const listras = 8;

  return (
    <Svg
      width={largura}
      height={altura}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}>
      <Defs>
        <ClipPath id="campoClip">
          <Rect x={m} y={topY} width={w} height={h} rx={16} />
        </ClipPath>
        <LinearGradient id="turfaGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={TURFA_LONGE} />
          <Stop offset="1" stopColor={TURFA} />
        </LinearGradient>
      </Defs>

      {/* Fundo escuro (aparece só na margem arredondada). */}
      <Rect x={0} y={0} width={largura} height={altura} fill={ARQ_FUNDO} />
      {/* Gramado full-width + listras ceifadas (clipadas). */}
      <Rect x={m} y={topY} width={w} height={h} rx={16} fill="url(#turfaGrad)" />
      <G clipPath="url(#campoClip)">
        {Array.from({length: listras}).map((_, i) =>
          i % 2 === 1 ? (
            <Rect
              key={`faixa-${i}`}
              x={m}
              y={topY + (h / listras) * i}
              width={w}
              height={h / listras}
              fill={TURFA_LISTRA}
              opacity={0.45}
            />
          ) : null,
        )}
      </G>
      {/* Contorno + meio-campo. */}
      <Rect
        x={m}
        y={topY}
        width={w}
        height={h}
        rx={16}
        fill="none"
        stroke={LINHA}
        strokeWidth={2}
      />
      <Line x1={m} y1={yMeio} x2={largura - m} y2={yMeio} stroke={LINHA} strokeWidth={1.5} />
      <Ellipse
        cx={cx}
        cy={yMeio}
        rx={raioCirc}
        ry={raioCirc * 0.62}
        fill="none"
        stroke={LINHA}
        strokeWidth={1.5}
      />
      <Circle cx={cx} cy={yMeio} r={2} fill={LINHA} />

      {/* FUNDO (longe) em perspectiva. */}
      <Path d={golFar} fill="rgba(234,242,230,0.10)" stroke={LINHA} strokeWidth={1.5} />
      <Path d={areaFar} fill="none" stroke={LINHA} strokeWidth={1.5} />
      <Path d={peqFar} fill="none" stroke={LINHA} strokeWidth={1.2} />
      <Path
        d={`M${cx - areaFarBotW * 0.22} ${areaFarY} Q ${cx} ${
          areaFarY + h * 0.05
        } ${cx + areaFarBotW * 0.22} ${areaFarY}`}
        fill="none"
        stroke={LINHA}
        strokeWidth={1.2}
      />

      {/* NOSSO gol (base) top-down. */}
      <Line
        x1={cx - golNearW / 2}
        y1={baseY}
        x2={cx + golNearW / 2}
        y2={baseY}
        stroke={LINHA_FORTE}
        strokeWidth={3}
      />
      <Rect
        x={cx - areaNearW / 2}
        y={baseY - areaNearH}
        width={areaNearW}
        height={areaNearH}
        fill="none"
        stroke={LINHA}
        strokeWidth={1.5}
      />
      <Rect
        x={cx - peqNearW / 2}
        y={baseY - peqNearH}
        width={peqNearW}
        height={peqNearH}
        fill="none"
        stroke={LINHA}
        strokeWidth={1.2}
      />
      <Path
        d={`M${cx - areaNearW * 0.22} ${baseY - areaNearH} Q ${cx} ${
          baseY - areaNearH - h * 0.05
        } ${cx + areaNearW * 0.22} ${baseY - areaNearH}`}
        fill="none"
        stroke={LINHA}
        strokeWidth={1.2}
      />

      {/* Linha defensiva tática (tracejada) + setas de lado de ataque. */}
      <Line
        x1={m + 10}
        y1={yLinha}
        x2={largura - m - 10}
        y2={yLinha}
        stroke={cores.primariaClara}
        strokeWidth={3}
        strokeDasharray="10 7"
      />
      {xsSeta.map(ax => (
        <Path key={ax} d={seta(ax)} fill={cores.secundaria} opacity={0.95} />
      ))}
    </Svg>
  );
}

export default CampoFUT;

// Cal (linhas do campo) e turfa noturna com listras ceifadas — visual "noite de
// estádio" do mockup. Turfa fixa (o campo fica noturno mesmo no modo dia por
// enquanto); as fichas e o resto seguem os tokens do tema.
const LINHA = 'rgba(234, 242, 230, 0.5)';
const LINHA_FORTE = 'rgba(234, 242, 230, 0.85)';
// Verde vivo estilo Sofascore (amostrado do app ~#055228), com fundo levemente
// mais escuro (perspectiva) e listra ceifada mais clara.
const TURFA = '#0A5A2E';
const TURFA_LONGE = '#07421F';
const TURFA_LISTRA = '#0C6234';
// Moldura escura que aparece só na margem arredondada do gramado.
const ARQ_FUNDO = '#0A140D';

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
    position: 'relative',
  },
  placa: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#081009',
    borderColor: cores.bordaClara,
    borderRadius: raio.sm,
    borderWidth: 1,
    flexDirection: 'row',
    height: 22,
    justifyContent: 'space-around',
    marginBottom: -espaco.xs,
    overflow: 'hidden',
  },
  placaTexto: {
    color: cores.secundaria,
    fontSize: 11,
    fontStyle: 'italic',
    fontWeight: '900',
    letterSpacing: 1.5,
    opacity: 0.8,
  },
  botaoOlho: {
    alignItems: 'center',
    backgroundColor: cores.superficie,
    borderColor: cores.borda,
    borderRadius: 999,
    borderWidth: 1,
    elevation: 3,
    height: 38,
    justifyContent: 'center',
    left: 6,
    position: 'absolute',
    shadowColor: '#0F1E3D',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.12,
    shadowRadius: 5,
    top: 6,
    width: 38,
    zIndex: 999,
  },
  botaoOlhoAtivo: {
    backgroundColor: cores.primaria,
    borderColor: cores.primaria,
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
  taticaStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaco.xs,
    justifyContent: 'center',
  },
  taticaChip: {
    backgroundColor: cores.superficieAlt,
    borderColor: cores.borda,
    borderRadius: raio.sm,
    borderWidth: 1,
    paddingHorizontal: espaco.sm,
    paddingVertical: 3,
  },
  taticaChipTexto: {
    color: cores.textoSecundario,
    fontSize: 11,
    fontWeight: '700',
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
