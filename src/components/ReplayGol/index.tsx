/**
 * ReplayGol — card de replay de gol, estilo Sofascore "Goal Action Animation".
 *
 * Recebe um `LanceGol` JÁ reconstruído (puro e determinístico, ver
 * `engine/simulation/lances`) e SÓ desenha/anima: campo INTEIRO vertical com
 * ataque para cima (gol alvo no topo), bolinhas dos jogadores passo a passo,
 * setas tracejadas entre os passos e a bola percorrendo os segmentos até a
 * rede. Mesma partida ⇒ mesmo replay — nenhum sorteio aqui.
 *
 * A PROGRESSÃO do lance (ordem/tempos dos passos) é conduzida por timer JS —
 * ver `sequenciaReplay.ts` — porque é informação, não decoração; o Reanimated
 * faz apenas a suavização entre um passo e o próximo. Com redução de movimento
 * do sistema (no Android inclui "Escala de animação de transição" = 0), a
 * suavização e o pulso somem, mas a sequência passo a passo continua.
 *
 * Cores por token do tema; os verdes do gramado e a cal são constantes locais,
 * mesmo precedente do MapaFinalizacoes/CampoFUT (objeto de campo, fixo nos dois
 * temas). O componente é o CARD — quem apresenta (modal/tela) é o chamador.
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, {Circle, ClipPath, Defs, G, Line, Path, Rect} from 'react-native-svg';

import {
  Card,
  Icon,
  IconButton,
  Text,
  espacamento,
  raios,
  useEstilosDS,
  useTheme,
  type TemaDS,
} from '../../design-system';
import {
  ROTULO_PASSO,
  type LanceGol,
  type TipoPassoLance,
} from '../../engine/simulation/lances';
import {
  DURACAO_SEGMENTO_MS,
  criarSequenciadorReplay,
  type SequenciadorReplay,
} from './sequenciaReplay';

type Props = {
  lance: LanceGol;
  nomes: Record<string, string>;
  /** Rótulo do time que marcou (ex.: sigla) — usado no header. */
  siglaTime?: string;
};

// Gramado — mesmos verdes da Tática/MapaFinalizacoes (objeto de campo, fixo
// nos dois temas). A cal e a bola também são "mobília" do campo.
const CAMPO_VERDE = '#2E9E58';
const CAMPO_VERDE_2 = '#2A9151';
const CAL = 'rgba(255, 255, 255, 0.85)';
const CAL_FRACA = 'rgba(255, 255, 255, 0.5)';
const BOLA_COR = '#FFFFFF';
const BOLA_BORDA = 'rgba(16, 24, 32, 0.7)';

const LISTRAS = 8;
const MARGEM_CAMPO = 8;
const ALTURA_REDE = 12;
const BOLA_TAMANHO = 12;
const LARGURA_ROTULO = 72;

/** Passo já projetado em pixels do campo. */
type Ponto = {
  tipo: TipoPassoLance;
  jogadorId: string;
  x: number;
  y: number;
  /** Desenha bolinha+nome? (o ponto final na rede é só o destino da bola). */
  marcador: boolean;
};

type Geometria = {
  topoCampo: number;
  campoW: number;
  campoH: number;
  golX0: number;
  golW: number;
  alvo: {x: number; y: number};
  pontos: Ponto[];
  totalSegmentos: number;
};

/**
 * Projeta os passos do lance no campo em pixels. Contrato de coordenadas
 * (`PassoLance`): x 0=esq…1=dir; y 0=linha do gol ADVERSÁRIO (topo)…1=próprio
 * gol (base). O último ponto é SEMPRE a bola na boca do gol (`golX`).
 */
function criarGeometria(lance: LanceGol, largura: number, altura: number): Geometria {
  const topoCampo = ALTURA_REDE + 4;
  const campoW = largura - 2 * MARGEM_CAMPO;
  const campoH = altura - topoCampo - 6;
  const golW = campoW * 0.3;
  const golX0 = largura / 2 - golW / 2;
  const px = (x: number): number => MARGEM_CAMPO + x * campoW;
  const py = (y: number): number => topoCampo + y * campoH;
  const alvo = {x: golX0 + lance.golX * golW, y: topoCampo - 5};

  const brutos: Ponto[] = lance.passos.map(p => ({
    tipo: p.tipo,
    jogadorId: p.jogadorId,
    x: px(p.x),
    y: py(p.y),
    marcador: true,
  }));

  const ultimo = brutos[brutos.length - 1];
  let pontos: Ponto[];
  if (ultimo && ultimo.tipo === 'gol') {
    // O passo "gol" É a bola na rede: vira o destino, sem bolinha de jogador.
    pontos = [
      ...brutos.slice(0, -1),
      {...ultimo, x: alvo.x, y: alvo.y, marcador: false},
    ];
  } else {
    // Demais desfechos (incluindo GOL CONTRA, cujo passo final é o DEFENSOR na
    // posição ancorada do desvio — o mesmo dot do mapa de chutes): mantém o
    // marcador em campo e anexa o destino sintético na rede; a bola passa pelo
    // ponto do desvio antes de entrar.
    pontos = [
      ...brutos,
      {tipo: 'gol', jogadorId: lance.autorId, x: alvo.x, y: alvo.y, marcador: false},
    ];
  }

  return {
    topoCampo,
    campoW,
    campoH,
    golX0,
    golW,
    alvo,
    pontos,
    totalSegmentos: Math.max(0, pontos.length - 1),
  };
}

export default function ReplayGol({
  lance,
  nomes,
  siglaTime,
}: Props): React.JSX.Element {
  const styles = useEstilosDS(criarEstilos);
  const {cores} = useTheme();
  const {width: larguraJanela, height: alturaJanela} = useWindowDimensions();

  // Largura fluida por onLayout, com fallback (janela − paddings usuais).
  const [larguraMedida, setLarguraMedida] = useState(0);
  const W =
    larguraMedida > 0
      ? larguraMedida
      : Math.max(240, larguraJanela - 4 * espacamento[4]);
  // Altura limitada TAMBÉM pela janela (paisagem/telas baixas: o card do modal
  // precisa caber inteiro com header + rodapé — sem clipar o botão Fechar).
  const H = Math.round(
    Math.min(440, Math.max(300, Math.min(W * 1.3, alturaJanela * 0.55))),
  );

  const aoMedir = useCallback((e: LayoutChangeEvent) => {
    setLarguraMedida(Math.round(e.nativeEvent.layout.width));
  }, []);

  const geo = useMemo(() => criarGeometria(lance, W, H), [lance, W, H]);

  // Progresso da bola em ÍNDICES de ponto (0..totalSegmentos) — independe do
  // layout, então redimensionar não reinicia o replay.
  const avanco = useSharedValue(0);
  const pulso = useSharedValue(1);
  const sequenciador = useRef<SequenciadorReplay | null>(null);

  // O AVANÇO da sequência é conduzido por timer JS (sequenciaReplay): com
  // "redução de movimento" do sistema — que no Android um withSequence
  // conduzido pelo Reanimated (ReduceMotion.System) saltaria direto pro gol —
  // cada withTiming abaixo vira um salto de passo em passo, mas a progressão
  // (passe → chute → gol) acontece sempre.
  const reproduzir = useCallback(() => {
    sequenciador.current?.parar();
    cancelAnimation(avanco);
    avanco.value = 0;
    pulso.value = 1;
    const cfg = {duration: DURACAO_SEGMENTO_MS, easing: Easing.inOut(Easing.quad)};
    sequenciador.current = criarSequenciadorReplay({
      totalSegmentos: geo.totalSegmentos,
      duracaoSegmentoMs: DURACAO_SEGMENTO_MS,
      aoAvancar: indice => {
        // Só SUAVIZAÇÃO até o índice-alvo; quem avança é o sequenciador.
        avanco.value = withTiming(indice, cfg);
      },
      aoConcluir: () => {
        // Floreio decorativo — pode ser reduzido pelo sistema.
        pulso.value = withSequence(
          withTiming(1.18, {duration: 180}),
          withTiming(1, {duration: 220}),
        );
      },
    });
    sequenciador.current.iniciar();
  }, [avanco, pulso, geo.totalSegmentos]);

  const pararReplay = useCallback(() => {
    sequenciador.current?.parar();
    cancelAnimation(avanco);
  }, [avanco]);

  // Auto-play ao montar (e ao trocar de lance).
  useEffect(() => {
    reproduzir();
    return pararReplay;
    // lance.id nas deps: trocar de lance (mesmo nº de segmentos) reinicia o replay.
  }, [reproduzir, pararReplay, lance.id]);

  const ehGolContra = lance.origem === 'gol_contra';
  const nomeAutor = nomes[lance.autorId] ?? '?';
  const nomeAssistente =
    lance.assistenteId !== undefined ? nomes[lance.assistenteId] ?? '?' : undefined;
  const titulo = `${ehGolContra ? 'GOL CONTRA' : 'GOL'} — ${nomeAutor} ${lance.minuto}'`;
  const sequencia = lance.passos.map(p => ROTULO_PASSO[p.tipo]).join(' → ');
  const rotuloA11y = ehGolContra
    ? `Gol contra de ${nomeAutor} aos ${lance.minuto} minutos`
    : `Gol de ${nomeAutor} aos ${lance.minuto} minutos${
        nomeAssistente !== undefined ? `, assistência de ${nomeAssistente}` : ''
      }`;

  return (
    <Card variante="outlined" padding={3}>
      {/* Header */}
      <View style={styles.headerLinha}>
        <Icon nome="bola" size={20} color="brand" />
        <Text variant="titleM" weight="700" tabular numberOfLines={1} style={styles.titulo}>
          {titulo}
        </Text>
        {siglaTime !== undefined ? (
          <Text variant="labelM" color="textSecondary" tabular>
            {siglaTime}
          </Text>
        ) : null}
      </View>
      {nomeAssistente !== undefined ? (
        <Text variant="caption" color="textSecondary" style={styles.assistencia}>
          Assistência: {nomeAssistente}
        </Text>
      ) : null}

      {/* Campo + animação */}
      <View
        style={[styles.campoWrap, {height: H}]}
        onLayout={aoMedir}
        accessible
        accessibilityRole="image"
        accessibilityLabel={rotuloA11y}>
        <CampoVertical largura={W} altura={H} geo={geo} />

        {/* Trajetos (aparecem conforme a bola percorre cada segmento) */}
        {geo.pontos.slice(0, -1).map((p, i) => {
          const proximo = geo.pontos[i + 1];
          const final = i === geo.totalSegmentos - 1;
          const cor = final ? CAL : p.tipo === 'assistencia' ? cores.brand : CAL;
          return (
            <Aparicao key={`seg-${i}`} avanco={avanco} de={i + 0.45} ate={i + 1}>
              <Svg width={W} height={H}>
                <Segmento
                  x1={p.x}
                  y1={p.y}
                  x2={proximo.x}
                  y2={proximo.y}
                  cor={cor}
                  forte={final}
                />
              </Svg>
            </Aparicao>
          );
        })}

        {/* Jogadores (bolinha + nome curto) */}
        {geo.pontos.map((p, i) =>
          p.marcador ? (
            <Marcador
              key={`passo-${i}`}
              ponto={p}
              indice={i}
              avanco={avanco}
              autor={p.jogadorId === lance.autorId}
              nome={nomes[p.jogadorId] ?? '?'}
            />
          ) : null,
        )}

        <TextoGol
          avanco={avanco}
          pulso={pulso}
          total={geo.totalSegmentos}
          x={Math.min(Math.max(geo.alvo.x, 48), W - 48)}
          y={geo.topoCampo + espacamento[2]}
        />

        <Bola avanco={avanco} pontos={geo.pontos} />
      </View>

      {/* Rodapé: sequência do lance + repetir */}
      <View style={styles.rodape}>
        <Text
          variant="caption"
          color="textSecondary"
          numberOfLines={2}
          style={styles.sequencia}>
          {sequencia}
        </Text>
        <IconButton
          icone="simular"
          onPress={reproduzir}
          accessibilityLabel="Repetir replay do gol"
          tom="brand"
          variante="soft"
        />
      </View>
    </Card>
  );
}

/** Campo inteiro vertical (gol alvo no TOPO, com mini-baliza e rede). */
function CampoVertical({
  largura,
  altura,
  geo,
}: {
  largura: number;
  altura: number;
  geo: Geometria;
}): React.JSX.Element {
  const {topoCampo, campoW, campoH, golX0, golW} = geo;
  const cx = largura / 2;
  const meioY = topoCampo + campoH / 2;
  const areaW = campoW * 0.6;
  const areaH = campoH * 0.16;
  const pequenaW = campoW * 0.3;
  const pequenaH = campoH * 0.065;
  const raioCirculo = Math.min(campoW * 0.15, campoH * 0.09);
  const faixaH = campoH / LISTRAS;
  const topoRede = topoCampo - ALTURA_REDE + 1;

  return (
    <Svg width={largura} height={altura}>
      <Defs>
        <ClipPath id="replayGolClip">
          <Rect x={MARGEM_CAMPO} y={topoCampo} width={campoW} height={campoH} rx={12} />
        </ClipPath>
      </Defs>

      {/* Gramado com listras alternadas */}
      <G clipPath="url(#replayGolClip)">
        <Rect
          x={MARGEM_CAMPO}
          y={topoCampo}
          width={campoW}
          height={campoH}
          fill={CAMPO_VERDE}
        />
        {Array.from({length: LISTRAS}).map((_, i) =>
          i % 2 === 1 ? (
            <Rect
              key={`listra-${i}`}
              x={MARGEM_CAMPO}
              y={topoCampo + faixaH * i}
              width={campoW}
              height={faixaH}
              fill={CAMPO_VERDE_2}
            />
          ) : null,
        )}
      </G>
      <Rect
        x={MARGEM_CAMPO}
        y={topoCampo}
        width={campoW}
        height={campoH}
        rx={12}
        fill="none"
        stroke={CAL}
        strokeWidth={1.5}
      />

      {/* Mini-baliza com rede (gol alvo, no topo) */}
      {Array.from({length: 7}).map((_, i) => (
        <Line
          key={`rede-${i}`}
          x1={golX0 + (golW / 6) * i}
          y1={topoRede}
          x2={golX0 + (golW / 6) * i}
          y2={topoCampo}
          stroke={CAL_FRACA}
          strokeWidth={0.8}
        />
      ))}
      <Line
        x1={golX0}
        y1={(topoRede + topoCampo) / 2}
        x2={golX0 + golW}
        y2={(topoRede + topoCampo) / 2}
        stroke={CAL_FRACA}
        strokeWidth={0.8}
      />
      <Path
        d={`M ${golX0} ${topoCampo} L ${golX0} ${topoRede} L ${golX0 + golW} ${topoRede} L ${
          golX0 + golW
        } ${topoCampo}`}
        fill="none"
        stroke={CAL}
        strokeWidth={2.5}
      />

      {/* Meio-campo */}
      <Line
        x1={MARGEM_CAMPO}
        y1={meioY}
        x2={MARGEM_CAMPO + campoW}
        y2={meioY}
        stroke={CAL}
        strokeWidth={1.2}
      />
      <Circle
        cx={cx}
        cy={meioY}
        r={raioCirculo}
        fill="none"
        stroke={CAL}
        strokeWidth={1.2}
      />
      <Circle cx={cx} cy={meioY} r={2} fill={CAL} />

      {/* Área de ataque (topo) */}
      <Rect
        x={cx - areaW / 2}
        y={topoCampo}
        width={areaW}
        height={areaH}
        fill="none"
        stroke={CAL}
        strokeWidth={1.2}
      />
      <Rect
        x={cx - pequenaW / 2}
        y={topoCampo}
        width={pequenaW}
        height={pequenaH}
        fill="none"
        stroke={CAL}
        strokeWidth={1}
      />
      <Path
        d={`M ${cx - areaW * 0.16} ${topoCampo + areaH} Q ${cx} ${
          topoCampo + areaH + campoH * 0.05
        } ${cx + areaW * 0.16} ${topoCampo + areaH}`}
        fill="none"
        stroke={CAL}
        strokeWidth={1}
      />
      <Circle cx={cx} cy={topoCampo + campoH * 0.115} r={1.6} fill={CAL} />

      {/* Área própria (base) */}
      <Rect
        x={cx - areaW / 2}
        y={topoCampo + campoH - areaH}
        width={areaW}
        height={areaH}
        fill="none"
        stroke={CAL}
        strokeWidth={1.2}
      />
      <Rect
        x={cx - pequenaW / 2}
        y={topoCampo + campoH - pequenaH}
        width={pequenaW}
        height={pequenaH}
        fill="none"
        stroke={CAL}
        strokeWidth={1}
      />
      <Path
        d={`M ${cx - areaW * 0.16} ${topoCampo + campoH - areaH} Q ${cx} ${
          topoCampo + campoH - areaH - campoH * 0.05
        } ${cx + areaW * 0.16} ${topoCampo + campoH - areaH}`}
        fill="none"
        stroke={CAL}
        strokeWidth={1}
      />
      <Circle cx={cx} cy={topoCampo + campoH * 0.885} r={1.6} fill={CAL} />
    </Svg>
  );
}

/** Linha tracejada + chevron de direção entre dois passos. */
function Segmento({
  x1,
  y1,
  x2,
  y2,
  cor,
  forte,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  cor: string;
  forte: boolean;
}): React.JSX.Element {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const angulo = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  return (
    <>
      <Line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={cor}
        strokeWidth={forte ? 2.4 : 1.6}
        strokeDasharray={forte ? '7 5' : '5 4'}
        opacity={forte ? 1 : 0.9}
      />
      <Path
        d="M -6 -4.5 L 1.5 0 L -6 4.5"
        transform={`translate(${mx} ${my}) rotate(${angulo})`}
        fill="none"
        stroke={cor}
        strokeWidth={2}
      />
    </>
  );
}

/** Camada que aparece (opacidade) quando `avanco` cruza [de, ate]. */
function Aparicao({
  avanco,
  de,
  ate,
  children,
}: {
  avanco: SharedValue<number>;
  de: number;
  ate: number;
  children: React.ReactNode;
}): React.JSX.Element {
  const estilo = useAnimatedStyle(() => ({
    opacity: interpolate(avanco.value, [de, ate], [0, 1], Extrapolation.CLAMP),
  }));
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, estilo]}>
      {children}
    </Animated.View>
  );
}

/** Bolinha do jogador + nome curto; o autor ganha borda brand mais grossa. */
function Marcador({
  ponto,
  indice,
  avanco,
  autor,
  nome,
}: {
  ponto: Ponto;
  indice: number;
  avanco: SharedValue<number>;
  autor: boolean;
  nome: string;
}): React.JSX.Element {
  const styles = useEstilosDS(criarEstilos);
  const diametro = autor ? 22 : 18;
  const estilo = useAnimatedStyle(() => ({
    opacity: interpolate(
      avanco.value,
      [indice - 0.3, indice],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.marcador,
        {left: ponto.x - LARGURA_ROTULO / 2, top: ponto.y - diametro / 2},
        estilo,
      ]}>
      <View
        style={[
          styles.marcadorCirculo,
          autor ? styles.marcadorAutor : null,
          {borderRadius: diametro / 2, height: diametro, width: diametro},
        ]}
      />
      <View style={styles.marcadorPill}>
        <Text variant="caption" color="textPrimary" numberOfLines={1}>
          {nome}
        </Text>
      </View>
    </Animated.View>
  );
}

/** "GOL" perto da baliza: aparece no fim do lance, com leve pulso. */
function TextoGol({
  avanco,
  pulso,
  total,
  x,
  y,
}: {
  avanco: SharedValue<number>;
  pulso: SharedValue<number>;
  total: number;
  x: number;
  y: number;
}): React.JSX.Element {
  const styles = useEstilosDS(criarEstilos);
  const estilo = useAnimatedStyle(() => ({
    opacity:
      total > 0
        ? interpolate(avanco.value, [total - 0.2, total], [0, 1], Extrapolation.CLAMP)
        : 1,
    transform: [{scale: pulso.value}],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.golTexto, {left: x - 40, top: y}, estilo]}>
      <View style={styles.golPill}>
        <Text variant="titleM" weight="800" color="success">
          GOL
        </Text>
      </View>
    </Animated.View>
  );
}

/** Bola: percorre os segmentos em sequência (posição interpolada por índice). */
function Bola({
  avanco,
  pontos,
}: {
  avanco: SharedValue<number>;
  pontos: Ponto[];
}): React.JSX.Element {
  const styles = useEstilosDS(criarEstilos);
  const meio = BOLA_TAMANHO / 2;
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
  return <Animated.View pointerEvents="none" style={[styles.bola, estilo]} />;
}

const criarEstilos = (t: TemaDS) =>
  StyleSheet.create({
    headerLinha: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: espacamento[2],
    },
    titulo: {
      flex: 1,
    },
    assistencia: {
      // Alinha sob o título (ícone 20 + gap 8).
      marginLeft: espacamento[6] + espacamento[1],
      marginTop: 2,
    },
    campoWrap: {
      marginTop: espacamento[3],
      width: '100%',
    },
    rodape: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: espacamento[2],
      marginTop: espacamento[3],
    },
    sequencia: {
      flex: 1,
    },
    marcador: {
      alignItems: 'center',
      position: 'absolute',
      width: LARGURA_ROTULO,
    },
    marcadorCirculo: {
      backgroundColor: t.cores.surface,
      borderColor: t.cores.borderStrong,
      borderWidth: 1.5,
    },
    marcadorAutor: {
      borderColor: t.cores.brand,
      borderWidth: 2.5,
    },
    marcadorPill: {
      backgroundColor: t.cores.surface,
      borderRadius: raios.sm,
      marginTop: 2,
      maxWidth: LARGURA_ROTULO,
      opacity: 0.95,
      paddingHorizontal: espacamento[1],
    },
    golTexto: {
      alignItems: 'center',
      position: 'absolute',
      width: 80,
    },
    golPill: {
      backgroundColor: t.cores.surface,
      borderRadius: raios.sm,
      paddingHorizontal: espacamento[2],
    },
    // A bola é "mobília" do campo (branca com borda escura), fixa nos 2 temas.
    bola: {
      backgroundColor: BOLA_COR,
      borderColor: BOLA_BORDA,
      borderRadius: BOLA_TAMANHO / 2,
      borderWidth: 1.5,
      height: BOLA_TAMANHO,
      left: 0,
      position: 'absolute',
      top: 0,
      width: BOLA_TAMANHO,
    },
  });
