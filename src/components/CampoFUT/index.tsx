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
 * defaults (mutadores de formação) e validacao. Cores e espaçamento vêm do
 * Design System v2 (tokens). O componente é controlado: recebe a
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
import Svg, {Ellipse, Line, Rect} from 'react-native-svg';

import {trocarTitular} from '../../api/database/seed/defaults';
import type {ForcaTime} from '../../engine/simulation/teamStrength';
import {
  coordenadaDoTitular,
  detectarFormacao,
  preencherCoordenadas,
} from '../../engine/tactics/geometria';
import {validarEscalacao} from '../../engine/tactics/validacao';
import {
  espacamento,
  raios,
  useEstilosDS,
  useTheme,
  type CorTexto,
  type TemaDS,
} from '../../design-system';
import type {Clube, Formacao, Player, Position, Tatica} from '../../types';
import Escudo from '../Escudo';
import Icone from '../Icone';

/**
 * Nome curto para caber sob a ficha (estilo Sofascore): apelido de uma palavra
 * fica como está (Neymar, Rafael); nome composto vira o ÚLTIMO sobrenome
 * (Deivid Washington → Washington). Evita que rótulos vizinhos colidam.
 */
function nomeCampo(jogador: Player): string {
  const base = (jogador.apelido ?? jogador.nome).trim();
  const partes = base.split(/\s+/);
  return partes.length <= 1 ? base : partes[partes.length - 1];
}

/** Faixa de cor do overall — mesma régua do OverallBadge (DS). */
function faixaCorOverall(overall: number): CorTexto {
  if (overall >= 75) {
    return 'success';
  }
  if (overall >= 60) {
    return 'warning';
  }
  return 'danger';
}

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

// Tabuleiro tático CHAPADO (visto de cima). As fichas são posicionadas por
// projetarSlot num retângulo plano; o MESMO mapa alimenta desenho e hit-test.
// Margens (fração) para as fichas + nomes caberem dentro das linhas.
// Margem lateral do tabuleiro. Menor = a linha de 4 se ESPALHA mais (antes 0.12
// apertava os 4 do meio até os círculos se encostarem). Fica ≥ metade da ficha
// pra não clipar o jogador mais aberto na borda.
const MARGEM_X = 0.075;
const MARGEM_Y = 0.05;

/**
 * Projeta (x,y ∈ 0..1) → centro da FICHA na tela. Mapa LINEAR (sem perspectiva):
 * x=0 esquerda … x=1 direita; y=0 nosso gol (base/baixo) … y=1 ataque (topo). A
 * escala é constante (tabuleiro plano) — todas as fichas do mesmo tamanho.
 */
function projetarSlot(
  x: number,
  y: number,
  largura: number,
  altura: number,
): {cx: number; cy: number; escala: number} {
  const mx = largura * MARGEM_X;
  const my = altura * MARGEM_Y;
  return {
    cx: mx + x * (largura - 2 * mx),
    cy: altura - my - y * (altura - 2 * my),
    escala: 1,
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
  // Tabuleiro CHAPADO (retrato). As fichas são CÍRCULOS (quadrado = diâmetro).
  const altura = Math.round(largura * 1.42);
  const cardW = Math.round(largura * 0.122); // diâmetro do círculo (folga na linha de 4/5)
  const cardH = cardW; // ficha quadrada → círculo centrado no slot
  const cardBancoW = Math.round(largura * 0.16);
  // Ficha "fantasma" que segue o dedo no arraste (círculo um pouco maior).
  const ghostW = Math.min(Math.round(largura * 0.28), 120);
  const ghostH = ghostW;
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

      <View
        ref={pitchRef}
        onLayout={medirPitch}
        style={[styles.pitch, {width: largura, height: altura}]}>
        <PitchEstadio largura={largura} altura={altura} />

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

      {/* Ficha circular que segue o dedo durante o arraste. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.ghost, {width: ghostW, height: ghostH}, ghostStyle]}>
        {jogadorArrastado ? (
          <CartaFUT
            jogador={jogadorArrastado}
            posicaoEscalada={jogadorArrastado.posicaoPrincipal}
            largura={ghostW}
            destaque={false}
            esmaecer={false}
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
          <Text
            style={[
              styles.cabOverallNum,
              {color: cores[faixaCorOverall(overall)]},
            ]}>
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
 * Ficha CIRCULAR do jogador no tabuleiro: círculo azul com o OVERALL e o nome
 * embaixo. Destaque (alvo de drop) = anel âmbar + cresce; esmaecer = card sendo
 * arrastado. Slot vazio = círculo tracejado com a posição.
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
  const raio2 = largura / 2;
  // Rótulo estreito e centrado sob a ficha (largura ~1.6× a ficha), com o nome
  // curto + reticências — antes 2.2× e nome inteiro faziam os nomes colidirem.
  const nomeStyle = {
    width: largura * 1.6,
    left: -largura * 0.3,
    top: largura + 2,
    fontSize: Math.max(9, Math.round(largura * 0.22)),
  };

  if (!jogador) {
    return (
      <View
        style={[
          styles.fichaVazia,
          {width: largura, height: largura, borderRadius: raio2},
        ]}>
        <Text
          style={[styles.fichaVaziaTexto, {fontSize: Math.round(largura * 0.3)}]}>
          {posicaoEscalada}
        </Text>
      </View>
    );
  }

  const indisponivel = jogador.lesionado || jogador.suspenso;
  const badge = Math.round(largura * 0.42);

  return (
    <View>
      <View
        style={[
          styles.ficha,
          {width: largura, height: largura, borderRadius: raio2},
          destaque ? styles.fichaDestaque : null,
          esmaecer ? styles.fichaEsmaecida : null,
        ]}>
        <Text
          style={[styles.fichaOverall, {fontSize: Math.round(largura * 0.42)}]}>
          {jogador.overall}
        </Text>
        {ehCapitao ? (
          <Text
            style={[styles.fichaCapitao, {fontSize: Math.round(largura * 0.28)}]}>
            C
          </Text>
        ) : null}
        {indisponivel ? (
          <View
            style={[
              styles.fichaStatus,
              {width: badge, height: badge, borderRadius: badge / 2},
            ]}>
            <Icone
              nome={jogador.lesionado ? 'lesao' : 'cartao'}
              tamanho={Math.round(largura * 0.24)}
              cor={cores.onBrand}
            />
          </View>
        ) : null}
      </View>
      <Text
        style={[styles.fichaNome, nomeStyle]}
        numberOfLines={1}
        ellipsizeMode="tail">
        {nomeCampo(jogador)}
      </Text>
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
 * Campo tático CHAPADO (visto de cima): gramado com listras + linhas de cal
 * brancas (borda, meio, círculo central, áreas). viewBox proporcional ao
 * container (sem distorção), SVG puro — sem perspectiva.
 */
function PitchEstadio({
  largura,
  altura,
}: {
  largura: number;
  altura: number;
}): React.JSX.Element {
  const VH = Math.round((altura / largura) * 100);
  const M = 3.5;
  const meio = VH / 2;
  const areaH = Math.round(VH * 0.13);
  const golH = Math.round(VH * 0.05);
  const raioC = 9;
  const faixas = 8;
  const fh = VH / faixas;
  const sw = 0.7;
  return (
    <Svg
      width={largura}
      height={altura}
      viewBox={`0 0 100 ${VH}`}
      preserveAspectRatio="none"
      pointerEvents="none"
      style={StyleSheet.absoluteFill}>
      <Rect x={0} y={0} width={100} height={VH} fill={CAMPO_VERDE} />
      {Array.from({length: faixas}).map((_, i) =>
        i % 2 === 0 ? (
          <Rect
            key={i}
            x={0}
            y={i * fh}
            width={100}
            height={fh}
            fill={CAMPO_VERDE_2}
          />
        ) : null,
      )}
      <Rect
        x={M}
        y={M}
        width={100 - 2 * M}
        height={VH - 2 * M}
        fill="none"
        stroke={LINHA_CAMPO}
        strokeWidth={sw}
      />
      <Line
        x1={M}
        y1={meio}
        x2={100 - M}
        y2={meio}
        stroke={LINHA_CAMPO}
        strokeWidth={sw}
      />
      <Ellipse
        cx={50}
        cy={meio}
        rx={raioC}
        ry={raioC}
        fill="none"
        stroke={LINHA_CAMPO}
        strokeWidth={sw}
      />
      <Ellipse cx={50} cy={meio} rx={0.9} ry={0.9} fill={LINHA_CAMPO} />
      {/* Área de ataque (topo) */}
      <Rect
        x={25}
        y={M}
        width={50}
        height={areaH}
        fill="none"
        stroke={LINHA_CAMPO}
        strokeWidth={sw}
      />
      <Rect
        x={37}
        y={M}
        width={26}
        height={golH}
        fill="none"
        stroke={LINHA_CAMPO}
        strokeWidth={sw}
      />
      {/* Área de defesa (base) */}
      <Rect
        x={25}
        y={VH - M - areaH}
        width={50}
        height={areaH}
        fill="none"
        stroke={LINHA_CAMPO}
        strokeWidth={sw}
      />
      <Rect
        x={37}
        y={VH - M - golH}
        width={26}
        height={golH}
        fill="none"
        stroke={LINHA_CAMPO}
        strokeWidth={sw}
      />
    </Svg>
  );
}

export default CampoFUT;

// Cores do gramado (tabuleiro chapado): verde base + verde da listra ceifada e
// linhas de cal brancas. Objeto de campo — fixo nos dois temas.
const CAMPO_VERDE = '#2E9E58';
const CAMPO_VERDE_2 = '#2A9151';
const LINHA_CAMPO = 'rgba(255, 255, 255, 0.85)';

const criarEstilos = (t: TemaDS) =>
  StyleSheet.create({
    overlay: {
      gap: espacamento[2],
    },
    cabecalho: {
      alignItems: 'center',
      backgroundColor: t.cores.surface,
      borderColor: t.cores.border,
      borderRadius: raios.md,
      borderWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: espacamento[2],
    },
    cabInfo: {
      alignItems: 'center',
      flex: 1,
      flexDirection: 'row',
      gap: espacamento[2],
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
      borderRadius: raios.sm,
      flexDirection: 'row',
      gap: 4,
      paddingHorizontal: espacamento[2],
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
      gap: espacamento[2],
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
      borderRadius: raios.sm,
      borderWidth: 1,
      gap: 1,
      paddingHorizontal: espacamento[2],
      paddingVertical: espacamento[1],
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
      borderRadius: raios.sm,
      borderWidth: 1,
      flexDirection: 'row',
      gap: espacamento[1],
      paddingHorizontal: espacamento[2],
      paddingVertical: espacamento[1],
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
    ficha: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.cores.brand,
      borderWidth: 2,
      borderColor: t.cores.onBrand,
    },
    fichaOverall: {
      color: t.cores.onBrand,
      fontWeight: '900',
    },
    fichaNome: {
      position: 'absolute',
      textAlign: 'center',
      color: t.cores.onBrand,
      fontSize: 10,
      fontWeight: '800',
      textShadowColor: 'rgba(0, 0, 0, 0.55)',
      textShadowOffset: {width: 0, height: 1},
      textShadowRadius: 2,
    },
    fichaDestaque: {
      borderColor: t.cores.accent,
      borderWidth: 3,
      elevation: 8,
      shadowColor: t.cores.accent,
      shadowOffset: {width: 0, height: 0},
      shadowOpacity: 0.85,
      shadowRadius: 8,
      transform: [{scale: 1.14}],
    },
    fichaEsmaecida: {
      opacity: 0.35,
    },
    fichaVazia: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.16)',
      borderColor: 'rgba(255, 255, 255, 0.7)',
      borderStyle: 'dashed',
      borderWidth: 2,
    },
    fichaVaziaTexto: {
      color: t.cores.onBrand,
      fontWeight: '800',
      textShadowColor: 'rgba(0, 0, 0, 0.5)',
      textShadowOffset: {width: 0, height: 1},
      textShadowRadius: 2,
    },
    fichaCapitao: {
      position: 'absolute',
      top: -2,
      right: 0,
      color: t.cores.accent,
      fontWeight: '900',
      textShadowColor: 'rgba(0, 0, 0, 0.6)',
      textShadowOffset: {width: 0, height: 1},
      textShadowRadius: 2,
    },
    fichaStatus: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.cores.danger,
      borderWidth: 1.5,
      borderColor: t.cores.onBrand,
      position: 'absolute',
      right: -2,
      bottom: -2,
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
      gap: espacamento[1],
      justifyContent: 'center',
    },
    taticaChip: {
      backgroundColor: t.cores.surfaceSubtle,
      borderColor: t.cores.border,
      borderRadius: raios.sm,
      borderWidth: 1,
      paddingHorizontal: espacamento[2],
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
      gap: espacamento[2],
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
      gap: espacamento[2],
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
