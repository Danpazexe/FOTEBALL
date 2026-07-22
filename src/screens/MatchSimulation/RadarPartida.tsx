/**
 * RadarPartida — mini-campo HORIZONTAL ao vivo (estilo Sofascore, visual
 * cartaz: moldura 2px de tinta + sombra dura). Fica em cena a partida inteira,
 * acima do feed, e é colapsável para não roubar espaço do feed/CTA.
 *
 * O JOGO ACONTECE NO RADAR (estilo EA FC/eFootball): os 22 jogadores em campo
 * aparecem como pontos na cor de cada time, ancorados na FORMAÇÃO REAL vigente
 * (slot por `coordenadaDoTitular` — a mesma fonte da tela de tática), o bloco
 * desliza para o lado que ataca conforme o momento do minuto e a bola viaja de
 * jogador REAL a jogador REAL (`reconstruirLanceMinuto` — reconstrução
 * DERIVADA, nunca persistida), acendendo quem toca. Nunca flutua sozinha.
 *
 * REGRA DE OURO (nada inventado — só o que a engine produz):
 *  • LANCE DO MINUTO: posse/profundidade pelo momento REAL do minuto;
 *    participantes reais da escalação vigente; chute no ponto REAL do ledger.
 *  • FUNDO: faixa de pressão sutil pela série `momentumPorMinuto` (a mesma do
 *    MomentoChart). É leitura de PRESSÃO, não posição de bola — o
 *    accessibilityLabel deixa isso explícito.
 *  • EVENTOS: chutes pingam no ponto REAL (`chuteId` → ledger); cartão/lesão/
 *    substituição pingam na posição NATURAL do jogador envolvido.
 *  • GOL: replay do lance reconstruído por `reconstruirLancesGol` (a MESMA
 *    reconstrução determinística do pós-jogo — mesma partida ⇒ mesmo lance).
 *
 * PROGRESSÃO conduzida por JS/estado (lição do replay): o avanço de lance e
 * replay vem do sequenciador (`sequenciaReplay`) e a zona muda por prop a cada
 * minuto simulado; o Reanimated APENAS suaviza (com redução de movimento do
 * sistema, a suavização vira salto — a informação continua chegando).
 *
 * Verdes do gramado/cal são constantes locais — mesmo precedente do
 * MapaFinalizacoes/ReplayGol/CampoFUT (mobília de campo, fixa nos dois temas).
 */
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, {Circle, ClipPath, Defs, G, Line, Path, Rect} from 'react-native-svg';

import type {IconeNome} from '../../components/Icone';
import {
  criarSequenciadorReplay,
  type SequenciadorReplay,
} from '../../components/ReplayGol/sequenciaReplay';
import {
  Icon,
  Text,
  elevacao,
  espacamento,
  raios,
  useTheme,
  type CorTexto,
} from '../../design-system';
import {reconstruirLancesGol} from '../../engine/simulation/lanceReplay';
import type {
  LanceGol,
  PosicoesElenco,
  TipoPassoLance,
} from '../../engine/simulation/lances';
import type {PontoJogadorRadar} from '../../engine/simulation/reconstruirLanceMinuto';
import {
  ehEventoGol,
  type ChutePartida,
  type EventoPartida,
  type Partida,
  type ResultadoChute,
} from '../../types';
import type {MundoRadar} from './mundoRadar';
import {
  contornoPorContraste,
  pontoPassoNoRadar,
  resumoRadar,
  type PontoRadar,
  type ZonaPressao,
} from './radarCampo';

// Mobília do campo (fixa nos 2 temas) — mesmos valores do MapaFinalizacoes/
// ReplayGol/CampoFUT.
const CAMPO_VERDE = '#2E9E58';
const CAMPO_VERDE_2 = '#2A9151';
const CAL = 'rgba(255, 255, 255, 0.85)';
const CAL_FRACA = 'rgba(255, 255, 255, 0.5)';
const BOLA_COR = '#FFFFFF';
const BOLA_BORDA = 'rgba(16, 24, 32, 0.7)';

const LISTRAS = 8;
/** Margem interna do gramado no SVG. */
const M = 8;
/** Proporção altura/largura do mini-campo (mais achatado que o real p/ caber). */
const PROPORCAO = 0.5;
/** Zona de pressão neutra antes do primeiro minuto simulado (mundo nulo). */
const ZONA_NEUTRA: ZonaPressao = {x: 0.5, intensidade: 0, lado: 'neutro'};
/**
 * Duração da viagem da bola até cada tipo de toque: chute é RÁPIDO e reto,
 * cruzamento/escanteio voam mais alto (arco, mais lentos), desarme é seco.
 */
const DURACAO_TOQUE_MS: Partial<Record<TipoPassoLance, number>> = {
  finalizacao: 150,
  gol: 160,
  gol_contra: 160,
  cruzamento: 460,
  escanteio: 460,
  drible: 380,
  desarme: 240,
  interceptacao: 240,
  recuperacao: 260,
};
const LANCE_SEGMENTO_MS = 300;
/** Duração de cada segmento do replay de GOL no radar. */
const RADAR_SEGMENTO_MS = 550;
/** Pausa (ms) com o lance completo em cena antes de limpar o replay de gol. */
const RADAR_POS_REPLAY_MS = 1600;
/** Só reproduz o replay de gol se ele saiu "agora" (pulo de tempo não vira rajada). */
const REPLAY_JANELA_MIN = 2;
/** Diâmetro do ponto de jogador (os 22 em campo). */
const PONTO_D = 9;
/** Diâmetro do anel de destaque do toque do lance. */
const ANEL_D = 19;

type Props = {
  partidaId: string;
  timeCasaId: string;
  timeForaId: string;
  siglaCasa: string;
  siglaFora: string;
  nomeCasa: string;
  nomeFora: string;
  corCasa: string;
  corFora: string;
  /** Minuto atual do relógio (não do evento). */
  minuto: number;
  posseCasa: number;
  /** Ledger causal de chutes (só para reconstruir o REPLAY de gol). */
  chutes: ChutePartida[];
  /** Eventos da partida até agora (só para reconstruir o REPLAY de gol). */
  eventos: EventoPartida[];
  /**
   * WORLDSTATE do radar (`derivarMundoRadar`): elencos, lance, dots, ícones,
   * pressão e destaques inteligentes. O componente SÓ desenha o que vem aqui.
   */
  mundo: MundoRadar | null;
  /** Snapshot dos titulares no apito (p/ a construção do replay de gol). */
  titularesCasa: string[];
  titularesFora: string[];
  /** jogadorId → posição natural (mesmo formato do MatchResult). */
  posicoes: PosicoesElenco;
};

/** Cor do dot persistente de chute por desfecho (mesma régua do MapaFinalizacoes). */
function corDoChute(
  resultado: ResultadoChute,
  cores: {warning: string; accent: string; danger: string; textMuted: string; textSecondary: string},
  corGol: string,
): string {
  switch (resultado) {
    case 'gol':
      return corGol;
    case 'defesa':
      return cores.warning;
    case 'trave':
      return cores.accent;
    case 'bloqueado':
      return cores.textSecondary;
    default:
      return cores.textMuted;
  }
}

/** Ícone + cor (token) do marcador transitório por tipo de evento. */
function visualEvento(
  evento: Pick<EventoPartida, 'tipo' | 'anuladoVAR'>,
): {icone: IconeNome; cor: CorTexto} | {cartao: 'amarelo' | 'vermelho'} | null {
  switch (evento.tipo) {
    case 'cartao_amarelo':
      return {cartao: 'amarelo'};
    case 'cartao_vermelho':
      return {cartao: 'vermelho'};
    case 'substituicao':
      return {icone: 'substituicao', cor: 'brand'};
    case 'lesao':
      return {icone: 'lesao', cor: 'danger'};
    case 'penalti':
      return {icone: 'penalti', cor: 'warning'};
    case 'falta_cobranca':
      return {icone: 'apito', cor: 'warning'};
    case 'bola_trave':
      return {icone: 'chance', cor: 'accent'};
    case 'chance_perdida':
      return evento.anuladoVAR === true
        ? {icone: 'chance', cor: 'info'}
        : {icone: 'chance', cor: 'textMuted'};
    default:
      // Gol/gol contra têm dot persistente + replay; demais tipos não plotam.
      return null;
  }
}

function RadarPartida({
  partidaId,
  timeCasaId,
  timeForaId,
  siglaCasa,
  siglaFora,
  nomeCasa,
  nomeFora,
  corCasa,
  corFora,
  minuto,
  posseCasa,
  chutes,
  eventos,
  mundo,
  titularesCasa,
  titularesFora,
  posicoes,
}: Props): React.JSX.Element {
  const {cores, esporte} = useTheme();
  const [aberto, setAberto] = useState(true);
  // Linha de impedimento (visualização broadcast) — liga/desliga no header.
  const [impedimentoVisivel, setImpedimentoVisivel] = useState(false);

  // Tudo que o campo desenha vem do MUNDO derivado (SRP: a tela orquestra, o
  // mundoRadar deriva, este componente desenha).
  const lanceMinuto = mundo?.lance ?? null;
  const elencos = mundo?.elencos ?? null;
  const noVermelho = new Set(mundo?.jogadoresNoVermelho ?? []);
  const alertaPressao = mundo?.alertaPressao ?? null;

  // Largura do CONTÊINER medido (onLayout no wrapper do campo) — NUNCA da
  // janela e NUNCA um fallback fixo: o campo só desenha depois de medido
  // (antes disso o wrapper fica vazio), então nada estoura o card em nenhuma
  // largura de tela (iPhone SE ao Pro Max/Android).
  const [larguraMedida, setLarguraMedida] = useState(0);
  const aoMedir = useCallback((e: LayoutChangeEvent) => {
    setLarguraMedida(Math.round(e.nativeEvent.layout.width));
  }, []);
  const W = larguraMedida;
  const campoPronto = W > 0;
  // Altura proporcional com teto: em telas largas o campo não cresce além de
  // 168px — o card expandido continua deixando feed + CTA visíveis em
  // aparelhos baixos.
  const H = campoPronto ? Math.round(Math.min(W * PROPORCAO, 168)) : 0;
  const utilW = Math.max(0, W - 2 * M);
  const utilH = Math.max(0, H - 2 * M);
  const px = (x: number): number => M + x * utilW;
  const py = (y: number): number => M + y * utilH;

  // ── FUNDO: faixa de pressão sutil (momentum real, mesma régua do gráfico) ──
  const zona = mundo?.pressao ?? ZONA_NEUTRA;
  const zonaXSv = useSharedValue(0.5);
  const intensidadeSv = useSharedValue(0);
  useEffect(() => {
    // A CONDUÇÃO é o prop (novo valor a cada minuto simulado); o withTiming só
    // suaviza o deslize até a nova posição real.
    const cfg = {duration: 650, easing: Easing.out(Easing.quad)};
    zonaXSv.value = withTiming(zona.x, cfg);
    intensidadeSv.value = withTiming(zona.intensidade, cfg);
  }, [zona.x, zona.intensidade, zonaXSv, intensidadeSv]);

  const estiloBandaCasa = useAnimatedStyle(() => {
    const cx = M + utilW / 2;
    const x = M + zonaXSv.value * utilW;
    return {
      left: cx,
      width: Math.max(0, x - cx),
      opacity: 0.08 + 0.18 * intensidadeSv.value,
    };
  });
  const estiloBandaFora = useAnimatedStyle(() => {
    const cx = M + utilW / 2;
    const x = M + zonaXSv.value * utilW;
    return {
      left: Math.min(x, cx),
      width: Math.max(0, cx - x),
      opacity: 0.08 + 0.18 * intensidadeSv.value,
    };
  });

  // ── LANCE DO MINUTO: bola tocando de jogador REAL a jogador REAL ───────────
  const avancoLanceSv = useSharedValue(0);
  const sequenciadorLanceRef = useRef<SequenciadorReplay | null>(null);
  useEffect(() => {
    if (lanceMinuto === null || lanceMinuto.toques.length < 2) {
      return;
    }
    sequenciadorLanceRef.current?.parar();
    cancelAnimation(avancoLanceSv);
    avancoLanceSv.value = 0;
    // Ritmo POR AÇÃO: passe cadenciado, chute seco, cruzamento no ar.
    const duracoes = lanceMinuto.toques
      .slice(1)
      .map(t => DURACAO_TOQUE_MS[t.tipo] ?? LANCE_SEGMENTO_MS);
    // PROGRESSÃO por sequenciador JS (informação); withTiming só suaviza.
    sequenciadorLanceRef.current = criarSequenciadorReplay({
      totalSegmentos: lanceMinuto.toques.length - 1,
      duracaoSegmentoMs: duracoes,
      aoAvancar: indice => {
        avancoLanceSv.value = withTiming(indice, {
          duration: duracoes[indice - 1] ?? LANCE_SEGMENTO_MS,
          easing: Easing.inOut(Easing.quad),
        });
      },
      aoConcluir: () => {},
    });
    sequenciadorLanceRef.current.iniciar();
  }, [lanceMinuto, avancoLanceSv]);

  // ── POR EVENTO: marcadores transitórios (janela derivada no mundoRadar) ────
  const marcadores = (mundo?.iconesEvento ?? []).filter(
    icone => visualEvento(icone) !== null,
  );

  // ── GOL: replay do lance reconstruído (mesma reconstrução do pós-jogo) ─────
  const [replay, setReplay] = useState<LanceGol | null>(null);
  const avancoSv = useSharedValue(0);
  const sequenciadorRef = useRef<SequenciadorReplay | null>(null);
  const limparReplayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const golsVistosRef = useRef(0);
  const totalGols = eventos.filter(e => ehEventoGol(e.tipo)).length;

  useEffect(() => {
    if (totalGols > golsVistosRef.current) {
      // Partida "em andamento" no shape persistido: a reconstrução é pura e
      // determinística por (id, minuto, autor) — o replay ao vivo é IDÊNTICO
      // ao que o MatchResult mostrará depois. Nenhum RNG da simulação é tocado.
      const partidaParcial: Partida = {
        id: partidaId,
        competicaoId: '',
        rodada: 0,
        data: '',
        timeCasa: timeCasaId,
        timeFora: timeForaId,
        eventos,
        jogada: false,
        modoJogado: 'interativo',
        titularesCasa,
        titularesFora,
        chutes,
      };
      const lances = reconstruirLancesGol(partidaParcial, posicoes);
      const lance = lances[totalGols - 1];
      // Só toca o lance de gol "de agora" (ao pular tempo não vira rajada).
      if (
        lance &&
        lance.passos.length >= 2 &&
        minuto - lance.minuto <= REPLAY_JANELA_MIN
      ) {
        if (limparReplayRef.current !== null) {
          clearTimeout(limparReplayRef.current);
          limparReplayRef.current = null;
        }
        sequenciadorRef.current?.parar();
        cancelAnimation(avancoSv);
        avancoSv.value = 0;
        setReplay(lance);
        // PROGRESSÃO por sequenciador JS (informação); withTiming só suaviza.
        sequenciadorRef.current = criarSequenciadorReplay({
          totalSegmentos: lance.passos.length - 1,
          duracaoSegmentoMs: RADAR_SEGMENTO_MS,
          aoAvancar: indice => {
            avancoSv.value = withTiming(indice, {
              duration: RADAR_SEGMENTO_MS,
              easing: Easing.inOut(Easing.quad),
            });
          },
          aoConcluir: () => {
            limparReplayRef.current = setTimeout(() => {
              limparReplayRef.current = null;
              setReplay(null);
            }, RADAR_POS_REPLAY_MS);
          },
        });
        sequenciadorRef.current.iniciar();
      }
    }
    golsVistosRef.current = totalGols;
  }, [
    totalGols,
    minuto,
    partidaId,
    timeCasaId,
    timeForaId,
    eventos,
    chutes,
    titularesCasa,
    titularesFora,
    posicoes,
    avancoSv,
  ]);

  // Desmontagem: cancela sequenciadores e timer de limpeza.
  useEffect(() => {
    return () => {
      sequenciadorRef.current?.parar();
      sequenciadorLanceRef.current?.parar();
      if (limparReplayRef.current !== null) {
        clearTimeout(limparReplayRef.current);
      }
    };
  }, []);

  const pontosReplay: PontoRadar[] =
    replay !== null
      ? replay.passos.map(p =>
          pontoPassoNoRadar(p, replay.timeId === timeCasaId),
        )
      : [];

  const rotuloA11y =
    `Radar da partida — lances com os jogadores envolvidos; a faixa de fundo é pressão, não a posição real da bola. ${resumoRadar(
      nomeCasa,
      nomeFora,
      posseCasa,
      zona.lado,
    )}.` +
    (alertaPressao !== null
      ? ` Pressão sustentada do ${
          alertaPressao.lado === 'casa' ? nomeCasa : nomeFora
        }.`
      : '') +
    (noVermelho.size > 0
      ? ` ${noVermelho.size} do seu time no vermelho físico.`
      : '');

  const mostrarLance = replay === null && lanceMinuto !== null;
  // Contraste dos pontos: se as cores dos times colidem (ou colam no verde do
  // gramado), o contorno de tinta entra — regra determinística, sem sorteio.
  const contorno = contornoPorContraste(corCasa, corFora);

  return (
    <View
      style={[
        styles.cartaz,
        {backgroundColor: cores.surface, borderColor: cores.borderStrong},
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Radar da partida, ${aberto ? 'recolher' : 'expandir'}`}
        onPress={() => setAberto(v => !v)}
        style={styles.header}>
        <Icon nome="bola" size={16} color="brand" />
        <Text variant="labelL" weight="800" style={styles.headerTitulo}>
          Radar da partida
        </Text>
        <Text variant="caption" color="textSecondary" tabular>
          {siglaCasa} {posseCasa}% · {100 - posseCasa}% {siglaFora}
        </Text>
        {aberto ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{selected: impedimentoVisivel}}
            accessibilityLabel={
              impedimentoVisivel
                ? 'Ocultar linha de impedimento'
                : 'Mostrar linha de impedimento'
            }
            hitSlop={8}
            onPress={() => setImpedimentoVisivel(v => !v)}>
            <Icon
              nome="bandeirinha"
              size={16}
              color={impedimentoVisivel ? 'brand' : 'textMuted'}
            />
          </Pressable>
        ) : null}
        <Icon
          nome={aberto ? 'seta-cima' : 'seta-baixo'}
          size={16}
          color="textSecondary"
        />
      </Pressable>

      {aberto ? (
        <View
          onLayout={aoMedir}
          accessible
          accessibilityRole="image"
          accessibilityLabel={rotuloA11y}
          style={[styles.campoWrap, campoPronto ? {height: H} : null]}
          pointerEvents="none">
          {campoPronto ? (
            <>
          <CampoHorizontal largura={W} altura={H} />

          {/* Faixa de pressão SUTIL de fundo (casa=verde, visitante=vermelho —
              mesma régua do MomentoChart). */}
          <Animated.View
            style={[
              styles.banda,
              {top: M, height: utilH, backgroundColor: esporte.match.goal},
              estiloBandaCasa,
            ]}
          />
          <Animated.View
            style={[
              styles.banda,
              {top: M, height: utilH, backgroundColor: esporte.match.cardRed},
              estiloBandaFora,
            ]}
          />

          {/* ZONA PERIGOSA (destaque derivado): mancha discreta na cor do time
              onde chutes REAIS se acumulam — embaixo dos dots, nunca grita. */}
          {/* Dots persistentes: TODOS os chutes reais da partida até agora. */}
          <View style={StyleSheet.absoluteFill}>
            <Svg width={W} height={H}>
              {(mundo?.zonasPerigo ?? []).map((zp, i) => (
                <Circle
                  key={`zp_${i}_${zp.ladoCasa ? 'c' : 'f'}`}
                  cx={px(zp.x)}
                  cy={py(zp.y)}
                  r={9 + 8 * zp.intensidade}
                  fill={zp.ladoCasa ? corCasa : corFora}
                  opacity={0.1 + 0.14 * zp.intensidade}
                />
              ))}
              {(mundo?.dotsChute ?? []).map(dot => {
                const ehGol = dot.resultado === 'gol';
                // Shotmap legível a partida inteira: chute antigo esmaece
                // (determinístico pela idade em minutos); gol fica forte.
                const opacidade = ehGol
                  ? 0.95
                  : dot.idade <= 10
                    ? 0.9
                    : dot.idade <= 25
                      ? 0.6
                      : 0.4;
                return (
                  <G key={dot.id}>
                    {ehGol ? (
                      <Circle
                        cx={px(dot.x)}
                        cy={py(dot.y)}
                        r={6}
                        fill="none"
                        stroke={CAL}
                        strokeWidth={1.5}
                      />
                    ) : null}
                    <Circle
                      cx={px(dot.x)}
                      cy={py(dot.y)}
                      r={ehGol ? 4 : 2.8}
                      fill={corDoChute(dot.resultado, cores, esporte.match.goal)}
                      opacity={opacidade}
                    />
                  </G>
                );
              })}
            </Svg>
          </View>

          {/* LINHA DE IMPEDIMENTO (toggle da bandeirinha): o último defensor
              DE LINHA adversário, estilo broadcast; junto, as linhas de
              defesa/meio do SEU bloco (compactação) — tudo derivado dos
              pontos reais do minuto, nada inventado. */}
          {impedimentoVisivel && mundo !== null && mundo.linhaImpedimento !== null ? (
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <Svg width={W} height={H}>
                <Line
                  x1={px(mundo.linhaImpedimento)}
                  y1={M}
                  x2={px(mundo.linhaImpedimento)}
                  y2={M + utilH}
                  stroke={CAL}
                  strokeWidth={1.4}
                  strokeDasharray="7 4"
                />
                {mundo.linhaDefensiva !== null
                  ? [mundo.linhaDefensiva.xDefesa, mundo.linhaDefensiva.xMeio].map(
                      (x, i) => (
                        <Line
                          key={`ld_${i}`}
                          x1={px(x)}
                          y1={M}
                          x2={px(x)}
                          y2={M + utilH}
                          stroke={
                            mundo.ladoUsuario === 'casa' ? corCasa : corFora
                          }
                          strokeWidth={1}
                          strokeDasharray="3 5"
                          opacity={0.5}
                        />
                      ),
                    )
                  : null}
              </Svg>
            </View>
          ) : null}

          {/* OS 22 EM CAMPO: pontos na cor de cada time, ancorados na
              formação REAL e deslizando com o momento (o campo inteiro vive). */}
          {elencos !== null ? (
            <>
              {elencos.casa.map(ponto => (
                <PontoJogador
                  key={ponto.id}
                  ponto={ponto}
                  x={px(ponto.x)}
                  y={py(ponto.y)}
                  cor={corCasa}
                  contorno={contorno.casa}
                  corContorno={
                    // JOGADOR NO VERMELHO (só do usuário): aro na cor de perigo
                    // — mesmos cortes físicos do rodízio; a troca é nos Ajustes.
                    mundo?.ladoUsuario === 'casa' && noVermelho.has(ponto.id)
                      ? cores.danger
                      : cores.borderStrong
                  }
                  alerta={
                    mundo?.ladoUsuario === 'casa' && noVermelho.has(ponto.id)
                  }
                />
              ))}
              {elencos.fora.map(ponto => (
                <PontoJogador
                  key={ponto.id}
                  ponto={ponto}
                  x={px(ponto.x)}
                  y={py(ponto.y)}
                  cor={corFora}
                  contorno={contorno.fora}
                  corContorno={
                    mundo?.ladoUsuario === 'fora' && noVermelho.has(ponto.id)
                      ? cores.danger
                      : cores.borderStrong
                  }
                  alerta={
                    mundo?.ladoUsuario === 'fora' && noVermelho.has(ponto.id)
                  }
                />
              ))}
            </>
          ) : null}

          {/* LANCE DO MINUTO: a bola toca de jogador REAL a jogador REAL, com
              vocabulário visual — passe tracejado, cruzamento/escanteio em
              arco, chute reto e rápido, desarme trocando o lado (anel na cor
              do time de quem toca). */}
          {mostrarLance && lanceMinuto.toques.length > 0 ? (
            <>
              <View style={StyleSheet.absoluteFill}>
                {lanceMinuto.toques.slice(0, -1).map((toque, i) => {
                  const destino = lanceMinuto.toques[i + 1];
                  return (
                    <SegmentoLance
                      key={`${lanceMinuto.minuto}_seg_${i}`}
                      avanco={avancoLanceSv}
                      indice={i}
                      largura={W}
                      altura={H}
                      x1={px(toque.x)}
                      y1={py(toque.y)}
                      x2={px(destino.x)}
                      y2={py(destino.y)}
                      tipoDestino={destino.tipo}
                    />
                  );
                })}
              </View>
              {lanceMinuto.toques.map((toque, i) =>
                toque.tipo === 'gol' ? null : (
                  <AnelToque
                    key={`${lanceMinuto.minuto}_${i}_${toque.jogadorId}`}
                    avanco={avancoLanceSv}
                    indice={i}
                    x={px(toque.x)}
                    y={py(toque.y)}
                    cor={toque.timeId === timeCasaId ? corCasa : corFora}
                  />
                ),
              )}
              <BolaRadar
                avanco={avancoLanceSv}
                pontos={lanceMinuto.toques.map(t => ({x: px(t.x), y: py(t.y)}))}
              />
            </>
          ) : null}

          {/* Marcadores transitórios dos eventos recentes (janela derivada). */}
          {marcadores.map(icone => (
            <MarcadorEvento
              key={icone.chave}
              evento={icone}
              x={px(icone.x)}
              y={py(icone.y)}
              corCartaoAmarelo={esporte.match.cardYellow}
              corCartaoVermelho={esporte.match.cardRed}
              fundo={cores.surface}
              borda={cores.border}
            />
          ))}

          {/* Replay do GOL: passes → chute → gol sobre o radar. */}
          {replay !== null && pontosReplay.length >= 2 ? (
            <>
              <View style={StyleSheet.absoluteFill}>
                {pontosReplay.slice(0, -1).map((p, i) => {
                  const proximo = pontosReplay[i + 1];
                  return (
                    <SegmentoReplay
                      key={`${replay.id}_seg_${i}`}
                      avanco={avancoSv}
                      indice={i}
                      largura={W}
                      altura={H}
                      x1={px(p.x)}
                      y1={py(p.y)}
                      x2={px(proximo.x)}
                      y2={py(proximo.y)}
                    />
                  );
                })}
              </View>
              {replay.passos.map((passo, i) =>
                passo.tipo === 'gol' ? null : (
                  <AnelToque
                    key={`${replay.id}_j_${i}`}
                    avanco={avancoSv}
                    indice={i}
                    x={px(pontosReplay[i].x)}
                    y={py(pontosReplay[i].y)}
                    cor={replay.timeId === timeCasaId ? corCasa : corFora}
                  />
                ),
              )}
              <BolaRadar
                avanco={avancoSv}
                pontos={pontosReplay.map(p => ({x: px(p.x), y: py(p.y)}))}
              />
            </>
          ) : null}
            </>
          ) : null}
        </View>
      ) : null}

      {/* PRESSÃO SUSTENTADA (destaque derivado): aviso discreto — vira alerta
          (warning) quando quem pressiona é o ADVERSÁRIO do usuário. */}
      {aberto && alertaPressao !== null ? (
        <View style={styles.alertaLinha}>
          <View
            style={[
              styles.alertaDot,
              {
                backgroundColor:
                  alertaPressao.lado === 'casa' ? corCasa : corFora,
              },
            ]}
          />
          <Text
            variant="caption"
            color={alertaPressao.doAdversario ? 'warning' : 'textSecondary'}>
            Pressão sustentada ·{' '}
            {alertaPressao.lado === 'casa' ? siglaCasa : siglaFora}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** Gramado horizontal: listras, moldura, meio-campo, círculo e áreas. */
function CampoHorizontal({
  largura,
  altura,
}: {
  largura: number;
  altura: number;
}): React.JSX.Element {
  const W = largura;
  const H = altura;
  const utilW = W - 2 * M;
  const utilH = H - 2 * M;
  const cx = W / 2;
  const cy = M + utilH / 2;
  const areaW = utilW * 0.16;
  const areaH = utilH * 0.6;
  const pequenaW = utilW * 0.07;
  const pequenaH = utilH * 0.32;
  const raioCirculo = Math.min(utilH * 0.22, utilW * 0.12);
  const faixaW = utilW / LISTRAS;

  return (
    <Svg width={W} height={H}>
      <Defs>
        <ClipPath id="radarClip">
          <Rect x={M} y={M} width={utilW} height={utilH} rx={10} />
        </ClipPath>
      </Defs>
      <G clipPath="url(#radarClip)">
        <Rect x={M} y={M} width={utilW} height={utilH} fill={CAMPO_VERDE} />
        {Array.from({length: LISTRAS}).map((_, i) =>
          i % 2 === 1 ? (
            <Rect
              key={`listra-${i}`}
              x={M + faixaW * i}
              y={M}
              width={faixaW}
              height={utilH}
              fill={CAMPO_VERDE_2}
            />
          ) : null,
        )}
      </G>
      <Rect
        x={M}
        y={M}
        width={utilW}
        height={utilH}
        rx={10}
        fill="none"
        stroke={CAL}
        strokeWidth={1.5}
      />
      {/* Meio-campo */}
      <Line x1={cx} y1={M} x2={cx} y2={M + utilH} stroke={CAL} strokeWidth={1.2} />
      <Circle cx={cx} cy={cy} r={raioCirculo} fill="none" stroke={CAL} strokeWidth={1.2} />
      <Circle cx={cx} cy={cy} r={1.6} fill={CAL} />
      {/* Áreas (casa à esquerda, visitante à direita) */}
      <Rect
        x={M}
        y={cy - areaH / 2}
        width={areaW}
        height={areaH}
        fill="none"
        stroke={CAL_FRACA}
        strokeWidth={1.2}
      />
      <Rect
        x={M}
        y={cy - pequenaH / 2}
        width={pequenaW}
        height={pequenaH}
        fill="none"
        stroke={CAL_FRACA}
        strokeWidth={1}
      />
      <Rect
        x={M + utilW - areaW}
        y={cy - areaH / 2}
        width={areaW}
        height={areaH}
        fill="none"
        stroke={CAL_FRACA}
        strokeWidth={1.2}
      />
      <Rect
        x={M + utilW - pequenaW}
        y={cy - pequenaH / 2}
        width={pequenaW}
        height={pequenaH}
        fill="none"
        stroke={CAL_FRACA}
        strokeWidth={1}
      />
    </Svg>
  );
}

/**
 * Ponto de UM jogador em campo (sem texto — só a cor do time; goleiro ganha
 * miolo de cal). A POSIÇÃO nova chega por prop a cada minuto simulado
 * (condução por estado); o withTiming apenas suaviza o deslocamento.
 */
function PontoJogador({
  ponto,
  x,
  y,
  cor,
  contorno,
  corContorno,
  alerta,
}: {
  ponto: PontoJogadorRadar;
  x: number;
  y: number;
  cor: string;
  contorno: boolean;
  corContorno: string;
  /** Jogador do usuário no VERMELHO físico (cortes do rodízio) — aro de perigo. */
  alerta: boolean;
}): React.JSX.Element {
  const sx = useSharedValue(x);
  const sy = useSharedValue(y);
  useEffect(() => {
    const cfg = {duration: 550, easing: Easing.out(Easing.quad)};
    sx.value = withTiming(x, cfg);
    sy.value = withTiming(y, cfg);
  }, [x, y, sx, sy]);
  const estilo = useAnimatedStyle(() => ({
    transform: [
      {translateX: sx.value - PONTO_D / 2},
      {translateY: sy.value - PONTO_D / 2},
    ],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pontoJogador,
        contorno || alerta ? styles.pontoContornoForte : null,
        {
          backgroundColor: cor,
          borderColor: alerta || contorno ? corContorno : CAL_FRACA,
        },
        estilo,
      ]}>
      {ponto.goleiro ? <View style={styles.pontoGoleiro} /> : null}
    </Animated.View>
  );
}

/**
 * Anel de destaque: "acende" o jogador quando a bola chega nele, na COR do
 * time de quem toca — no desarme o anel muda de cor, mostrando a bola
 * trocando de lado.
 */
function AnelToque({
  avanco,
  indice,
  x,
  y,
  cor,
}: {
  avanco: SharedValue<number>;
  indice: number;
  x: number;
  y: number;
  cor: string;
}): React.JSX.Element {
  const estilo = useAnimatedStyle(() => ({
    opacity: interpolate(
      avanco.value,
      [indice - 0.35, indice],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.anelToque,
        {borderColor: cor, left: x - ANEL_D / 2, top: y - ANEL_D / 2},
        estilo,
      ]}
    />
  );
}

/**
 * Traço do lance do minuto, com vocabulário visual por ação: passe/condução
 * tracejado fino; CRUZAMENTO/ESCANTEIO em ARCO; CHUTE reto, sólido e grosso.
 * Aparece conforme a bola percorre o trecho.
 */
function SegmentoLance({
  avanco,
  indice,
  largura,
  altura,
  x1,
  y1,
  x2,
  y2,
  tipoDestino,
}: {
  avanco: SharedValue<number>;
  indice: number;
  largura: number;
  altura: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  tipoDestino: TipoPassoLance;
}): React.JSX.Element {
  const estilo = useAnimatedStyle(() => ({
    opacity: interpolate(
      avanco.value,
      [indice + 0.3, indice + 0.9],
      [0, 0.9],
      Extrapolation.CLAMP,
    ),
  }));
  const ehChute =
    tipoDestino === 'finalizacao' ||
    tipoDestino === 'gol' ||
    tipoDestino === 'gol_contra';
  const ehArco = tipoDestino === 'cruzamento' || tipoDestino === 'escanteio';
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const distancia = Math.hypot(x2 - x1, y2 - y1);
  const flecha = Math.min(28, distancia * 0.35);
  // O arco boja em direção ao centro do campo (bola alçada, vista de cima).
  const controleY = my > altura / 2 ? my - flecha : my + flecha;
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, estilo]}>
      <Svg width={largura} height={altura}>
        {ehArco ? (
          <Path
            d={`M ${x1} ${y1} Q ${mx} ${controleY} ${x2} ${y2}`}
            fill="none"
            stroke={CAL}
            strokeWidth={1.6}
            strokeDasharray="6 4"
          />
        ) : (
          <Line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={CAL}
            strokeWidth={ehChute ? 2.4 : 1.3}
            strokeDasharray={ehChute ? undefined : '4 4'}
          />
        )}
      </Svg>
    </Animated.View>
  );
}

/** Marcador transitório de evento: pill com ícone/cartão, pop de entrada. */
function MarcadorEvento({
  evento,
  x,
  y,
  corCartaoAmarelo,
  corCartaoVermelho,
  fundo,
  borda,
}: {
  evento: Pick<EventoPartida, 'tipo' | 'anuladoVAR'>;
  x: number;
  y: number;
  corCartaoAmarelo: string;
  corCartaoVermelho: string;
  fundo: string;
  borda: string;
}): React.JSX.Element | null {
  // Pop de entrada (decorativo — pode ser reduzido pelo sistema).
  const escala = useSharedValue(0.4);
  useEffect(() => {
    escala.value = withTiming(1, {duration: 220, easing: Easing.out(Easing.back(1.6))});
  }, [escala]);
  const estilo = useAnimatedStyle(() => ({
    opacity: interpolate(escala.value, [0.4, 1], [0, 1], Extrapolation.CLAMP),
    transform: [{scale: escala.value}],
  }));

  const visual = visualEvento(evento);
  if (visual === null) {
    return null;
  }
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.marcador,
        {left: x - 11, top: y - 11, backgroundColor: fundo, borderColor: borda},
        estilo,
      ]}>
      {'cartao' in visual ? (
        <View
          style={[
            styles.marcadorCartao,
            {
              backgroundColor:
                visual.cartao === 'amarelo' ? corCartaoAmarelo : corCartaoVermelho,
            },
          ]}
        />
      ) : (
        <Icon nome={visual.icone} size={12} color={visual.cor} />
      )}
    </Animated.View>
  );
}

/** Segmento do replay de gol: aparece quando a bola percorre o trecho. */
function SegmentoReplay({
  avanco,
  indice,
  largura,
  altura,
  x1,
  y1,
  x2,
  y2,
}: {
  avanco: SharedValue<number>;
  indice: number;
  largura: number;
  altura: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}): React.JSX.Element {
  const estilo = useAnimatedStyle(() => ({
    opacity: interpolate(
      avanco.value,
      [indice + 0.45, indice + 1],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, estilo]}>
      <Svg width={largura} height={altura}>
        <Line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={CAL}
          strokeWidth={1.6}
          strokeDasharray="5 4"
        />
      </Svg>
    </Animated.View>
  );
}

/** Bola: percorre os pontos em sequência (interpolada por índice). */
function BolaRadar({
  avanco,
  pontos,
}: {
  avanco: SharedValue<number>;
  pontos: Array<{x: number; y: number}>;
}): React.JSX.Element {
  const meio = 5;
  const indices: number[] = [];
  const xs: number[] = [];
  const ys: number[] = [];
  pontos.forEach((p, i) => {
    indices.push(i);
    xs.push(p.x - meio);
    ys.push(p.y - meio);
  });
  if (indices.length === 1) {
    indices.push(1);
    xs.push(xs[0]);
    ys.push(ys[0]);
  }
  const estilo = useAnimatedStyle(() => ({
    transform: [
      {translateX: interpolate(avanco.value, indices, xs, Extrapolation.CLAMP)},
      {translateY: interpolate(avanco.value, indices, ys, Extrapolation.CLAMP)},
    ],
  }));
  return <Animated.View pointerEvents="none" style={[styles.bolaRadar, estilo]} />;
}

const styles = StyleSheet.create({
  // Tratamento de cartaz: moldura 2px de tinta + sombra dura (mesma linguagem
  // do placar permanente da tela).
  cartaz: {
    borderRadius: raios.lg,
    borderWidth: 2,
    overflow: 'hidden',
    ...elevacao.dura,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espacamento[2],
    paddingHorizontal: espacamento[3],
    paddingVertical: espacamento[2],
  },
  headerTitulo: {flex: 1},
  // Wrapper do campo: altura explícita quando medido + clipping próprio
  // (cinto de segurança — NADA do radar extrapola o card, com qualquer
  // largura de tela).
  campoWrap: {
    borderRadius: 10,
    marginBottom: espacamento[2],
    marginHorizontal: espacamento[2],
    overflow: 'hidden',
  },
  banda: {
    borderRadius: raios.sm,
    position: 'absolute',
  },
  // Ponto de jogador: só cor do time (sem texto); a identidade fica no lado
  // do campo + formação. `left/top` fixos em 0 — a posição anda por transform.
  pontoJogador: {
    alignItems: 'center',
    borderRadius: PONTO_D / 2,
    borderWidth: 1,
    height: PONTO_D,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    top: 0,
    width: PONTO_D,
  },
  // Contorno de tinta quando as cores dos times/gramado colidem.
  pontoContornoForte: {borderWidth: 1.5},
  // Goleiro levemente distinto: miolo de cal dentro do ponto.
  pontoGoleiro: {
    backgroundColor: CAL,
    borderRadius: 1.5,
    height: 3,
    width: 3,
  },
  // Anel que acende o jogador quando a bola chega nele.
  anelToque: {
    borderColor: CAL,
    borderRadius: ANEL_D / 2,
    borderWidth: 2,
    height: ANEL_D,
    position: 'absolute',
    width: ANEL_D,
  },
  marcador: {
    alignItems: 'center',
    borderRadius: raios.full,
    borderWidth: 1,
    height: 22,
    justifyContent: 'center',
    position: 'absolute',
    width: 22,
  },
  // Aviso discreto de pressão sustentada (abaixo do campo, sem card interno).
  alertaLinha: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espacamento[1],
    paddingBottom: espacamento[2],
    paddingHorizontal: espacamento[3],
  },
  alertaDot: {borderRadius: 3, height: 6, width: 6},
  marcadorCartao: {borderRadius: 1.5, height: 12, width: 9},
  bolaRadar: {
    backgroundColor: BOLA_COR,
    borderColor: BOLA_BORDA,
    borderRadius: 5,
    borderWidth: 1.5,
    height: 10,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 10,
  },
});

export default RadarPartida;
