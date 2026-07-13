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
  Ellipse,
  G,
  Line,
  Path,
  Polygon,
  Rect,
} from 'react-native-svg';

import {trocarTitular} from '../../api/database/seed/defaults';
import type {ForcaTime} from '../../engine/simulation/teamStrength';
import {
  coordenadaDoTitular,
  detectarFormacao,
  preencherCoordenadas,
} from '../../engine/tactics/geometria';
import {validarEscalacao} from '../../engine/tactics/validacao';
import {useEstilosDS, useTheme, type TemaDS} from '../../design-system';
import {corOverall, espaco, raio} from '../../theme';
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
 * Trapézio do campo em coordenadas NATIVAS do SVG do Sofascore (viewBox
 * 2232×1790). O fundo (gol de ataque, longe) fica no TOPO — estreito; a frente
 * (nosso gol/GK, perto) na BASE — larga. Valores medidos das linhas laterais do
 * SVG: linha de fundo em y≈115 (meia-largura ~675), base em y≈1790 (meia-largura
 * ~1164), centro x≈1110. A MESMA projeção alimenta desenho, peças e hit-test.
 */
const VB_LARGURA = 2232;
const VB_ALTURA = 1790;
const CAMPO_SVG = {
  centroX: 1110,
  topoY: 115,
  baseY: 1790,
  hwTopo: 675, // meia-largura da linha de fundo (topo/longe)
  hwBase: 1164, // meia-largura na base (perto)
  jogTopoY: 320, // faixa vertical das peças (margem p/ carta caber)
  jogBaseY: 1700,
  insetX: 0.82, // peças um pouco dentro das laterais
};

/**
 * Projeta (x,y ∈ 0..1) → centro da carta na tela + escala por profundidade. As
 * coordenadas nativas do SVG são mapeadas para o container (largura×altura), então
 * o campo pode ser esticado (preserveAspectRatio="none") que as peças acompanham.
 */
function projetarSlot(
  x: number,
  y: number,
  largura: number,
  altura: number,
): {cx: number; cy: number; escala: number} {
  // y=1 (ataque) → topo/longe; y=0 (GK) → base/perto.
  const nativaY = CAMPO_SVG.jogBaseY - y * (CAMPO_SVG.jogBaseY - CAMPO_SVG.jogTopoY);
  const frac =
    (nativaY - CAMPO_SVG.topoY) / (CAMPO_SVG.baseY - CAMPO_SVG.topoY);
  const meiaLargura =
    CAMPO_SVG.hwTopo + (CAMPO_SVG.hwBase - CAMPO_SVG.hwTopo) * frac;
  const nativaX = CAMPO_SVG.centroX + (x - 0.5) * 2 * meiaLargura * CAMPO_SVG.insetX;
  const escala = 0.72 + 0.42 * frac;
  return {
    cx: (nativaX / VB_LARGURA) * largura,
    cy: (nativaY / VB_ALTURA) * altura,
    escala,
  };
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
  const styles = useEstilosDS(criarEstilos);
  const {cores} = useTheme();
  // Campo do SVG do Sofascore (viewBox 2232×1790), LARGO/BAIXO como no print do
  // usuário (não esticado alto). preserveAspectRatio="none" + as peças acompanham
  // via projetarSlot.
  const altura = Math.round(largura * 0.85);
  const cardW = Math.round(largura * 0.15);
  const cardH = Math.round(cardW * 1.2);
  const cardBancoW = Math.round(largura * 0.24);
  // Card "fantasma" que segue o dedo no arraste: a CARTA FUT completa, num
  // tamanho médio, para mostrar o jogador sendo puxado (não uma bolinha).
  const ghostW = Math.min(Math.round(largura * 0.5), 190);
  const ghostH = Math.round(ghostW * 1.2);
  // Quanto o centro visual do fantasma fica ACIMA do dedo (compensado no drop).
  const ghostOffset = Math.round(ghostH * (GHOST_LEVANTA - 0.5));
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
        const {cx, cy, escala} = projetarSlot(x, y, largura, altura);
        return {slotIndex, jogadorId: titular.jogadorId, cx, cy, escala};
      }),
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
            cor={modoEdicao ? cores.onBrand : cores.brand}
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
  const styles = useEstilosDS(criarEstilos);
  const {cores} = useTheme();
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
            <Icone nome="tatica" tamanho={12} cor={cores.brand} />
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
  const styles = useEstilosDS(criarEstilos);
  const {cores} = useTheme();
  const estrelas = Math.max(0, Math.min(5, Math.round(reputacao / 20)));
  return (
    <View style={styles.tecnico}>
      <Icone nome="conversa" tamanho={16} cor={cores.accent} />
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
  const styles = useEstilosDS(criarEstilos);
  const {cores} = useTheme();
  if (!validacao.valido) {
    return (
      <View style={[styles.banner, styles.bannerErro]}>
        <Icone nome="fechar" tamanho={14} cor={cores.danger} />
        <Text style={[styles.bannerTexto, {color: cores.danger}]}>
          {validacao.erros[0]}
        </Text>
      </View>
    );
  }
  if (validacao.avisos.length > 0) {
    return (
      <View style={[styles.banner, styles.bannerAviso]}>
        <Icone nome="lesao" tamanho={14} cor={cores.accent} />
        <Text style={[styles.bannerTexto, {color: cores.warning}]}>
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
      <Icone nome="check" tamanho={14} cor={cores.brand} />
      <Text style={[styles.bannerTexto, {color: cores.brandStrong}]}>
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
  const styles = useEstilosDS(criarEstilos);
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
  const styles = useEstilosDS(criarEstilos);
  const {cores} = useTheme();
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
            cor={cores.onBrand}
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
          estilosFixos.slotWrap,
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
      <View style={!habilitado ? estilosFixos.reservaIndisponivel : null}>
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
  const styles = useEstilosDS(criarEstilos);
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
 * Campo TRANSCRITO do SVG oficial do Sofascore (viewBox 2232×1790): gramado
 * trapezoidal em perspectiva, listras ceifadas trapezoidais, grande/pequena área
 * do fundo, meia-lua, círculo central (elipse) e linhas laterais — coordenadas
 * NATIVAS do SVG, escaladas pelo viewBox (= idêntico). A linha defensiva e as
 * setas de lado de ataque (extras do jogo) usam as mesmas coordenadas nativas
 * via `CAMPO_SVG`. SVG puro.
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
  const {cores} = useTheme();
  const hwEmY = (yy: number): number =>
    CAMPO_SVG.hwTopo +
    (CAMPO_SVG.hwBase - CAMPO_SVG.hwTopo) *
      ((yy - CAMPO_SVG.topoY) / (CAMPO_SVG.baseY - CAMPO_SVG.topoY));

  const fracLinha =
    linhaDefensiva === 'Adiantada'
      ? 0.42
      : linhaDefensiva === 'Recuada'
      ? 0.66
      : 0.55;
  const yLinha = CAMPO_SVG.topoY + fracLinha * (CAMPO_SVG.baseY - CAMPO_SVG.topoY);
  const hwLinha = hwEmY(yLinha);

  const setaBaseY = 360;
  const setaTip = 150;
  const hwSeta = hwEmY(setaBaseY);
  const seta = (ax: number): string =>
    `M${ax - 22} ${setaBaseY} L${ax - 22} ${setaTip + 70} L${ax - 62} ${
      setaTip + 70
    } L${ax} ${setaTip} L${ax + 62} ${setaTip + 70} L${ax + 22} ${
      setaTip + 70
    } L${ax + 22} ${setaBaseY} Z`;
  const xsSeta =
    ladoAtaque === 'Esquerda'
      ? [CAMPO_SVG.centroX - hwSeta * 0.5]
      : ladoAtaque === 'Direita'
      ? [CAMPO_SVG.centroX + hwSeta * 0.5]
      : ladoAtaque === 'Centro'
      ? [CAMPO_SVG.centroX]
      : [CAMPO_SVG.centroX - hwSeta * 0.5, CAMPO_SVG.centroX + hwSeta * 0.5];

  return (
    <Svg
      width={largura}
      height={altura}
      viewBox="0 0 2232 1790"
      preserveAspectRatio="none"
      pointerEvents="none"
      style={StyleSheet.absoluteFill}>
      {/* Fundo escuro (cantos do topo, atrás do trapézio). */}
      <Rect x={0} y={0} width={2232} height={1790} fill={FUNDO} />

      {/* GRAMADO trapezoidal + listras ceifadas (coords do SVG do Sofascore). */}
      <G transform="translate(-101.5 57.927)">
        <Polygon fill={GRAMA} points="527.028 0 0 1732.074 2433 1732.074 1899.971 0" />
        <Polygon fill={GRAMA_ESCURA} points="207.778 1202.112 2216.367 1202.112 2287 1448.074 131 1448.074" />
        <Polygon fill={GRAMA} points="258.98 1022.719 2165.28 1022.719 2217.888 1202.112 206.365 1202.112" />
        <Polygon fill={GRAMA_ESCURA} points="306.886 859.361 2119.917 859.361 2170.055 1022.719 258.055 1022.719" />
        <Polygon fill={GRAMA} points="350.576 711.035 2074.885 711.035 2117.9 859.361 307.462 859.361" />
        <Polygon fill={GRAMA_ESCURA} points="387.793 575.739 2036.14 575.739 2075.578 711.035 351.459 711.035" />
        <Polygon fill={GRAMA} points="424.133 452.468 2000.064 452.468 2036.433 575.739 389.395 575.739" />
        <Polygon fill={GRAMA_ESCURA} points="457.92 340.222 1970.335 340.222 2003.357 452.468 425.357 452.468" />
        <Polygon fill={GRAMA} points="487.706 237.998 1937.524 237.998 1964.557 340.222 461.069 340.222" />
        <Polygon fill={GRAMA_ESCURA} points="514.747 144.794 1914.915 144.794 1941.022 237.998 489.022 237.998" />
        <Polygon fill={GRAMA} points="539.521 58.604 1887.269 58.604 1910.166 144.794 516.361 144.794" />
      </G>

      {/* LINHAS do campo (brancas) — coords do SVG do Sofascore. */}
      <G transform="translate(-101.5 0)">
        <G transform="translate(45.697 115)">
          <G transform="translate(670.803 0)">
            <Path
              stroke={LINHA_CAMPO}
              strokeWidth={5}
              fill="none"
              d="M965.07147 2.5 L1005.00042 220.462 L2.93778 220.462 L38.25713 2.5296 L965.07147 2.5 Z"
            />
            <Path
              stroke={LINHA_CAMPO}
              strokeWidth={5}
              fill="none"
              d="M747.754858 2.5050774 L757.500562 89.2346 L239.67786 89.2346 L247.766856 2.5050774 L747.754858 2.5050774 Z M295.001085 221.526983 C426.053217 300.824339 563.304447 300.824339 706.754778 221.526983"
            />
            <Ellipse cx={496.894} cy={149.948} rx={11.261} ry={5.796} fill={LINHA_CAMPO} />
          </G>
          <G transform="translate(189.803 857)">
            <Rect width={1959} height={6.867} y={192.492} fill={LINHA_CAMPO} />
            <Ellipse cx={980.458} cy={196.138} rx={26.32} ry={22.904} fill={LINHA_CAMPO} />
            <Ellipse
              cx={980.303}
              cy={203.5}
              rx={235.696}
              ry={199.5}
              stroke={LINHA_CAMPO}
              strokeWidth={8}
              fill="none"
            />
          </G>
          <Path
            stroke={LINHA_CAMPO}
            strokeWidth={4}
            fill="none"
            transform="translate(490.803 3)"
            d="M0 15 C13.398 13.453 21.325 8.775 23.782 0.968 M1360 14.648 C1352.075 14.344 1347.024 13.491 1344.848 12.09 C1337.704 7.489 1337.256 0 1337.256 0"
          />
          <Polygon fill={LINHA_CAMPO} points="491.955 0.001 499 0 7.029 1674.992 0 1675" />
          <Polygon fill={LINHA_CAMPO} points="1842.58 0.005 1849.467 0.005 2328.584 1674.991 2321.694 1675.005" />
          <Polygon fill={LINHA_CAMPO} points="498.879 0.005 1844.078 0.005 1844.078 5.054 497.441 5.054" />
        </G>
      </G>

      {/* EXTRAS do jogo: linha defensiva (tracejada) + setas de lado de ataque. */}
      <Line
        x1={CAMPO_SVG.centroX - hwLinha + 60}
        y1={yLinha}
        x2={CAMPO_SVG.centroX + hwLinha - 60}
        y2={yLinha}
        stroke={cores.brand}
        strokeWidth={16}
        strokeDasharray="60 42"
      />
      {xsSeta.map(ax => (
        <Path key={ax} d={seta(ax)} fill={cores.accent} opacity={0.95} />
      ))}
    </Svg>
  );
}

export default CampoFUT;

// Cores do gramado e linhas transcritas do SVG do Sofascore: verde base e verde
// escuro das listras ceifadas, linhas de cal claras, e fundo escuro nos cantos.
const GRAMA = '#015c2d';
const GRAMA_ESCURA = '#014522';
const LINHA_CAMPO = 'rgba(240, 245, 238, 0.9)';
const FUNDO = '#0A140D';

const criarEstilos = (t: TemaDS) =>
  StyleSheet.create({
    overlay: {
      gap: espaco.sm,
    },
    cabecalho: {
      alignItems: 'center',
      backgroundColor: t.cores.surface,
      borderColor: t.cores.border,
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
      color: t.cores.textPrimary,
      fontSize: 15,
      fontWeight: '900',
      letterSpacing: -0.3,
    },
    cabFormacaoChip: {
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: t.cores.surfaceSubtle,
      borderRadius: raio.sm,
      flexDirection: 'row',
      gap: 4,
      paddingHorizontal: espaco.sm,
      paddingVertical: 2,
    },
    cabFormacao: {
      color: t.cores.textPrimary,
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
      color: t.cores.textSecondary,
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 1,
      marginTop: -2,
    },
    tecnico: {
      alignItems: 'center',
      backgroundColor: t.cores.surfaceSubtle,
      borderColor: t.cores.border,
      borderRadius: raio.sm,
      borderWidth: 1,
      gap: 1,
      paddingHorizontal: espaco.sm,
      paddingVertical: espaco.xs,
    },
    tecnicoEstrelas: {
      color: t.cores.accent,
      fontSize: 11,
      letterSpacing: 1,
    },
    tecnicoEstrelasVazias: {
      color: t.cores.borderStrong,
    },
    tecnicoRotulo: {
      color: t.cores.textSecondary,
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
      backgroundColor: t.cores.dangerSoft,
      borderColor: t.cores.danger,
    },
    bannerAviso: {
      backgroundColor: t.cores.accentSoft,
      borderColor: t.cores.accent,
    },
    bannerOk: {
      backgroundColor: t.cores.brandSoft,
      borderColor: t.cores.brand,
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
      borderColor: t.cores.borderStrong,
      borderRadius: raio.sm,
      borderWidth: 1,
      flexDirection: 'row',
      height: 22,
      justifyContent: 'space-around',
      marginBottom: -espaco.xs,
      overflow: 'hidden',
    },
    placaTexto: {
      color: t.cores.accent,
      fontSize: 11,
      fontStyle: 'italic',
      fontWeight: '900',
      letterSpacing: 1.5,
      opacity: 0.8,
    },
    botaoOlho: {
      alignItems: 'center',
      backgroundColor: t.cores.surface,
      borderColor: t.cores.border,
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
      backgroundColor: t.cores.brand,
      borderColor: t.cores.brand,
    },
    cartaDestaque: {
      elevation: 12,
      shadowColor: t.cores.brand,
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
      backgroundColor: t.cores.surfaceSubtle,
      borderColor: t.cores.border,
      borderRadius: raio.sm,
      borderStyle: 'dashed',
      borderWidth: 2,
      justifyContent: 'center',
    },
    cartaVaziaTexto: {
      color: t.cores.textSecondary,
      fontSize: 11,
      fontWeight: '800',
    },
    cartaStatus: {
      alignItems: 'center',
      backgroundColor: t.cores.danger,
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
      color: t.cores.textSecondary,
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
      backgroundColor: t.cores.surfaceSubtle,
      borderColor: t.cores.border,
      borderRadius: raio.sm,
      borderWidth: 1,
      paddingHorizontal: espaco.sm,
      paddingVertical: 3,
    },
    taticaChipTexto: {
      color: t.cores.textSecondary,
      fontSize: 11,
      fontWeight: '700',
    },
    bancoHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: espaco.sm,
    },
    bancoTitulo: {
      color: t.cores.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    bancoContagem: {
      backgroundColor: t.cores.surfaceSubtle,
      borderRadius: 999,
      color: t.cores.textSecondary,
      fontSize: 11,
      fontWeight: '800',
      overflow: 'hidden',
      paddingHorizontal: 7,
      paddingVertical: 1,
    },
    bancoVazio: {
      color: t.cores.textSecondary,
      fontSize: 12,
    },
    bancoConteudo: {
      gap: espaco.sm,
      paddingHorizontal: 2,
      paddingVertical: 2,
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

/**
 * Estilos SEM cor (geometria/estado) das peças de gesto. Estáticos de propósito:
 * PecaCampo/PecaReserva não dependem do tema, então não precisam do hook e a
 * lógica de drag-drop fica intocada.
 */
const estilosFixos = StyleSheet.create({
  slotWrap: {
    position: 'absolute',
  },
  reservaIndisponivel: {
    opacity: 0.5,
  },
});
