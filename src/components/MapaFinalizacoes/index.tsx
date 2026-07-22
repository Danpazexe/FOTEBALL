/**
 * MapaFinalizacoes — mapa de chutes (estilo Sofascore), migrado ao Design System
 * v2. Três partes: BALIZA (chutes no alvo), CAMPO (terço de ataque, gramado do
 * jogo) e PAINEL do chute selecionado. Todas as cores vêm de tokens do tema
 * (useTheme/useEstilosDS); o gramado usa o mesmo verde da Tática nova.
 *
 * Recebe uma lista JÁ FILTRADA (time + tempo) de `Finalizacao` — a extração é
 * pura e determinística (`engine/simulation/finalizacoes`). Só desenho aqui.
 */
import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Svg, {Circle, ClipPath, Defs, G, Line, Path, Rect} from 'react-native-svg';

import {
  Icon,
  espacamento,
  raios,
  useEstilosDS,
  useTheme,
  type CoresSemanticas,
  type TemaDS,
} from '../../design-system';
import type {CoresEsporte} from '../../design-system/tokens/colors';
import type {
  Finalizacao,
  ResultadoFinalizacao,
} from '../../engine/simulation/finalizacoes';

// Gramado — mesmo verde da Tática nova (padrão visual atual).
const CAMPO_VERDE = '#2E9E58';
const CAMPO_VERDE_2 = '#2A9151';
const CAL = 'rgba(255, 255, 255, 0.85)';
const CAL_FRACA = 'rgba(255, 255, 255, 0.5)';
const LISTRAS = 6;
const TRANSPARENTE = 'transparent';

/** Cor (token) + preenchimento do dot conforme o desfecho do chute. */
function estiloResultado(
  resultado: ResultadoFinalizacao,
  cores: CoresSemanticas,
  esporte: CoresEsporte,
): {cor: string; preenchido: boolean} {
  switch (resultado) {
    case 'gol':
      return {cor: esporte.match.goal, preenchido: true};
    case 'defesa':
      return {cor: cores.warning, preenchido: true};
    case 'trave':
      return {cor: cores.accent, preenchido: true};
    case 'penalti_perdido':
      return {cor: cores.danger, preenchido: true};
    case 'bloqueada':
      return {cor: cores.textSecondary, preenchido: false};
    default:
      return {cor: cores.textMuted, preenchido: false};
  }
}

const ROTULO_RESULTADO: Record<ResultadoFinalizacao, string> = {
  gol: 'Gol',
  defesa: 'Defendido',
  trave: 'Na trave',
  fora: 'Para fora',
  bloqueada: 'Bloqueado',
  penalti_perdido: 'Pênalti perdido',
};

export default function MapaFinalizacoes({
  finalizacoes,
  largura,
  nomes,
  chaveFiltro,
  vazioTexto = 'Sem finalizações no filtro selecionado.',
}: {
  finalizacoes: Finalizacao[];
  largura: number;
  nomes: Record<string, string>;
  /** Muda quando o filtro (time/tempo) muda → reseta o chute selecionado. */
  chaveFiltro: string;
  vazioTexto?: string;
}): React.JSX.Element {
  const styles = useEstilosDS(criarEstilos);
  const {cores, esporte} = useTheme();
  const [sel, setSel] = useState(0);
  useEffect(() => setSel(0), [chaveFiltro]);

  const total = finalizacoes.length;
  const gols = finalizacoes.filter(f => f.gol).length;
  const noAlvo = finalizacoes.filter(f => f.noAlvo).length;
  const selIdx = total > 0 ? Math.min(sel, total - 1) : 0;
  const atual = total > 0 ? finalizacoes[selIdx] : null;

  const legenda = [
    {rotulo: 'Gol', cor: esporte.match.goal, preenchido: true},
    {rotulo: 'No alvo', cor: cores.warning, preenchido: true},
    {rotulo: 'Trave', cor: cores.accent, preenchido: true},
    {rotulo: 'Para fora', cor: cores.textMuted, preenchido: false},
  ];

  const W = largura;

  return (
    <View style={styles.wrap}>
      <View style={styles.resumo}>
        <Resumo valor={total} rotulo="Finalizações" />
        <Resumo valor={noAlvo} rotulo="No alvo" />
        <Resumo valor={gols} rotulo="Gols" destaque />
      </View>

      <Baliza largura={W} finalizacoes={finalizacoes} selecionado={selIdx} />

      <Campo
        largura={W}
        finalizacoes={finalizacoes}
        selecionado={selIdx}
        aoSelecionar={setSel}
      />

      {total === 0 ? (
        <Text style={styles.vazio}>{vazioTexto}</Text>
      ) : atual ? (
        <PainelChute
          finalizacao={atual}
          nome={nomes[atual.jogadorId] ?? 'Jogador'}
          indice={selIdx}
          total={total}
          aoAnterior={() => setSel((selIdx - 1 + total) % total)}
          aoProximo={() => setSel((selIdx + 1) % total)}
        />
      ) : null}

      <View style={styles.legenda}>
        {legenda.map(item => (
          <View key={item.rotulo} style={styles.legendaItem}>
            <View
              style={[
                styles.legendaDot,
                {
                  borderColor: item.cor,
                  backgroundColor: item.preenchido ? item.cor : TRANSPARENTE,
                },
              ]}
            />
            <Text style={styles.legendaTexto}>{item.rotulo}</Text>
          </View>
        ))}
        <Text style={styles.legendaXg}>tamanho = xG</Text>
      </View>
    </View>
  );
}

/** Baliza (sobre fundo claro): grade cinza + chutes no alvo coloridos. */
function Baliza({
  largura,
  finalizacoes,
  selecionado,
}: {
  largura: number;
  finalizacoes: Finalizacao[];
  selecionado: number;
}): React.JSX.Element {
  const {cores, esporte} = useTheme();
  const W = largura;
  const H = Math.round(W * 0.34);
  const postX = W * 0.2;
  const postW = W * 0.6;
  const topo = 10;
  const base = H - 12;
  const frameH = base - topo;
  const gx = (v: number): number => postX + v * postW;
  const gy = (v: number): number => topo + (1 - v) * frameH;
  const noAlvo = finalizacoes
    .map((f, i) => ({f, i}))
    .filter(({f}) => f.noAlvo && f.golX !== undefined && f.golY !== undefined);

  return (
    <Svg width={W} height={H}>
      {/* Rede (grade). */}
      {Array.from({length: 11}).map((_, i) => (
        <Line
          key={`nv-${i}`}
          x1={postX + (postW / 10) * i}
          y1={topo}
          x2={postX + (postW / 10) * i}
          y2={base}
          stroke={cores.border}
          strokeWidth={0.75}
        />
      ))}
      {Array.from({length: 6}).map((_, i) => (
        <Line
          key={`nh-${i}`}
          x1={postX}
          y1={topo + (frameH / 5) * i}
          x2={postX + postW}
          y2={topo + (frameH / 5) * i}
          stroke={cores.border}
          strokeWidth={0.75}
        />
      ))}
      {/* Trave (postes + travessão) e linha do gol. */}
      <Path
        d={`M${postX} ${base} L${postX} ${topo} L${postX + postW} ${topo} L${
          postX + postW
        } ${base}`}
        fill="none"
        stroke={cores.textMuted}
        strokeWidth={3}
      />
      <Line
        x1={0}
        y1={base}
        x2={W}
        y2={base}
        stroke={cores.border}
        strokeWidth={1.5}
      />
      {/* Chutes no alvo. */}
      {noAlvo.map(({f, i}) => {
        const {cor} = estiloResultado(f.resultado, cores, esporte);
        const ativo = i === selecionado;
        return (
          <Circle
            key={`g-${i}`}
            cx={gx(f.golX ?? 0.5)}
            cy={gy(f.golY ?? 0.2)}
            r={ativo ? 6 : 4}
            fill={cor}
            stroke={ativo ? cores.textPrimary : cor}
            strokeWidth={ativo ? 2 : 1}
            opacity={ativo ? 1 : 0.75}
          />
        );
      })}
    </Svg>
  );
}

/** Campo (terço de ataque) no gramado do jogo; trajetória do selecionado. */
function Campo({
  largura,
  finalizacoes,
  selecionado,
  aoSelecionar,
}: {
  largura: number;
  finalizacoes: Finalizacao[];
  selecionado: number;
  aoSelecionar: (i: number) => void;
}): React.JSX.Element {
  const {cores, esporte} = useTheme();
  const W = largura;
  const H = Math.round(W * 0.82);
  const mx = 8;
  const golY = 6;
  const areaW = W * 0.62;
  const areaH = H * 0.34;
  const pequenaW = W * 0.32;
  const pequenaH = H * 0.13;
  const golW = W * 0.3;
  const pitchBottom = H - 6;
  const depth = pitchBottom - golY;
  const cx = W / 2;
  const penaltiY = golY + depth * 0.19;
  const larguraUtil = W - 2 * mx;
  const px = (x: number): number => mx + x * larguraUtil;
  const py = (y: number): number => golY + y * depth;
  const raioDot = (xG: number): number => 3 + Math.min(1, xG) * 8;

  const sel = finalizacoes[selecionado];

  // Gols por último (ficam por cima). Índice original preservado para o toque.
  const ordenados = finalizacoes
    .map((f, i) => ({f, i}))
    .sort((a, b) => Number(a.f.gol) - Number(b.f.gol));

  return (
    <Svg width={W} height={H}>
      <Defs>
        <ClipPath id="mapaClip">
          <Rect x={mx} y={golY} width={larguraUtil} height={H - golY - 6} rx={12} />
        </ClipPath>
      </Defs>
      <G clipPath="url(#mapaClip)">
        <Rect
          x={mx}
          y={golY}
          width={larguraUtil}
          height={H - golY - 6}
          fill={CAMPO_VERDE}
        />
        {Array.from({length: LISTRAS}).map((_, i) =>
          i % 2 === 1 ? (
            <Rect
              key={`l-${i}`}
              x={mx + (larguraUtil / LISTRAS) * i}
              y={golY}
              width={larguraUtil / LISTRAS}
              height={H - golY - 6}
              fill={CAMPO_VERDE_2}
            />
          ) : null,
        )}
      </G>
      <Rect
        x={mx}
        y={golY}
        width={larguraUtil}
        height={H - golY - 6}
        rx={12}
        fill="none"
        stroke={CAL}
        strokeWidth={1.5}
      />
      {/* Baliza (marca) no topo. */}
      <Rect
        x={cx - golW / 2}
        y={golY - 5}
        width={golW}
        height={5}
        fill="none"
        stroke={CAL}
        strokeWidth={2.5}
      />
      {/* Grande e pequena área + meia-lua. */}
      <Rect
        x={cx - areaW / 2}
        y={golY}
        width={areaW}
        height={areaH}
        fill="none"
        stroke={CAL}
        strokeWidth={1.5}
      />
      <Rect
        x={cx - pequenaW / 2}
        y={golY}
        width={pequenaW}
        height={pequenaH}
        fill="none"
        stroke={CAL}
        strokeWidth={1.2}
      />
      <Path
        d={`M ${cx - areaW * 0.16} ${golY + areaH} Q ${cx} ${
          golY + areaH + H * 0.08
        } ${cx + areaW * 0.16} ${golY + areaH}`}
        fill="none"
        stroke={CAL}
        strokeWidth={1.2}
      />
      <Circle cx={cx} cy={penaltiY} r={2} fill={CAL} />
      {/* Trajetória do chute selecionado (até o centro do gol). */}
      {sel ? (
        <Line
          x1={px(sel.x)}
          y1={py(sel.y)}
          x2={cx}
          y2={golY}
          stroke={CAL}
          strokeWidth={1.4}
          strokeDasharray="5 4"
          opacity={0.85}
        />
      ) : null}
      {/* Dots (com área de toque). */}
      {ordenados.map(({f, i}) => {
        const {cor, preenchido} = estiloResultado(f.resultado, cores, esporte);
        const r = raioDot(f.xG);
        const ativo = i === selecionado;
        return (
          <G key={`s-${i}`} onPress={() => aoSelecionar(i)}>
            <Circle cx={px(f.x)} cy={py(f.y)} r={r + 9} fill={TRANSPARENTE} />
            {ativo ? (
              <Circle
                cx={px(f.x)}
                cy={py(f.y)}
                r={r + 3.5}
                fill={TRANSPARENTE}
                stroke={CAL}
                strokeWidth={2}
              />
            ) : null}
            <Circle
              cx={px(f.x)}
              cy={py(f.y)}
              r={r}
              fill={preenchido ? cor : CAL_FRACA}
              stroke={cor}
              strokeWidth={preenchido ? 1 : 1.6}
              opacity={0.98}
            />
          </G>
        );
      })}
    </Svg>
  );
}

/** Painel do chute selecionado, navegável (‹ ›). */
function PainelChute({
  finalizacao,
  nome,
  indice,
  total,
  aoAnterior,
  aoProximo,
}: {
  finalizacao: Finalizacao;
  nome: string;
  indice: number;
  total: number;
  aoAnterior: () => void;
  aoProximo: () => void;
}): React.JSX.Element {
  const styles = useEstilosDS(criarEstilos);
  const iniciais = nome
    .split(' ')
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <View style={styles.painel}>
      <View style={styles.painelTopo}>
        <Seta nome="voltar" onPress={aoAnterior} rotulo="Chute anterior" />
        <View style={styles.painelJogador}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTexto}>{iniciais}</Text>
          </View>
          <View>
            <Text style={styles.painelNome} numberOfLines={1}>
              {nome}
            </Text>
            <Text style={styles.painelContagem}>
              {indice + 1} de {total}
            </Text>
          </View>
        </View>
        <View style={styles.painelMinuto}>
          <Text style={styles.painelMinutoTexto}>{finalizacao.minuto}'</Text>
        </View>
        <Seta nome="avancar" onPress={aoProximo} rotulo="Próximo chute" />
      </View>

      <View style={styles.painelGrade}>
        <DadoChute rotulo="xG" valor={finalizacao.xG.toFixed(2)} />
        <DadoChute rotulo="xGOT" valor={finalizacao.xGOT.toFixed(2)} />
        <DadoChute
          rotulo="Resultado"
          valor={ROTULO_RESULTADO[finalizacao.resultado]}
        />
        <DadoChute rotulo="Situação" valor={finalizacao.situacao} />
        <DadoChute rotulo="Tipo de chute" valor={finalizacao.pe} />
        <DadoChute
          rotulo="Origem"
          valor={finalizacao.deFora ? 'Fora da área' : 'Na área'}
        />
      </View>
    </View>
  );
}

function Seta({
  nome,
  onPress,
  rotulo,
}: {
  nome: 'voltar' | 'avancar';
  onPress: () => void;
  rotulo: string;
}): React.JSX.Element {
  const styles = useEstilosDS(criarEstilos);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      onPress={onPress}
      hitSlop={8}
      style={styles.seta}>
      <Icon nome={nome} size={18} color="brand" />
    </Pressable>
  );
}

function DadoChute({
  rotulo,
  valor,
}: {
  rotulo: string;
  valor: string;
}): React.JSX.Element {
  const styles = useEstilosDS(criarEstilos);
  return (
    <View style={styles.dado}>
      <Text style={styles.dadoValor} numberOfLines={1}>
        {valor}
      </Text>
      <Text style={styles.dadoRotulo}>{rotulo}</Text>
    </View>
  );
}

function Resumo({
  valor,
  rotulo,
  destaque = false,
}: {
  valor: number;
  rotulo: string;
  destaque?: boolean;
}): React.JSX.Element {
  const styles = useEstilosDS(criarEstilos);
  const {cores} = useTheme();
  return (
    <View style={styles.resumoItem}>
      <Text style={[styles.resumoValor, destaque && {color: cores.success}]}>
        {valor}
      </Text>
      <Text style={styles.resumoRotulo}>{rotulo}</Text>
    </View>
  );
}

const criarEstilos = (t: TemaDS) =>
  StyleSheet.create({
    wrap: {
      alignItems: 'center',
      gap: espacamento[2],
    },
    resumo: {
      flexDirection: 'row',
      gap: espacamento[6],
      justifyContent: 'center',
    },
    resumoItem: {
      alignItems: 'center',
    },
    resumoValor: {
      color: t.cores.textPrimary,
      fontSize: 20,
      fontWeight: '900',
    },
    resumoRotulo: {
      color: t.cores.textSecondary,
      fontSize: 11,
      fontWeight: '700',
    },
    vazio: {
      color: t.cores.textSecondary,
      fontSize: 12,
      paddingVertical: espacamento[3],
      textAlign: 'center',
    },
    painel: {
      backgroundColor: t.cores.surface,
      borderColor: t.cores.border,
      borderRadius: raios.md,
      borderWidth: 1,
      padding: espacamento[2],
      width: '100%',
    },
    painelTopo: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: espacamento[1],
    },
    painelJogador: {
      alignItems: 'center',
      flex: 1,
      flexDirection: 'row',
      gap: espacamento[2],
    },
    avatar: {
      alignItems: 'center',
      backgroundColor: t.cores.brandSoft,
      borderRadius: 999,
      height: 34,
      justifyContent: 'center',
      width: 34,
    },
    avatarTexto: {
      // Iniciais pequenas: no claro o brand puro fica ~3:1 sobre o brandSoft.
      color: t.esquema === 'claro' ? t.cores.brandStrong : t.cores.brand,
      fontSize: 12,
      fontWeight: '900',
    },
    painelNome: {
      color: t.cores.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    painelContagem: {
      color: t.cores.textSecondary,
      fontSize: 11,
      fontWeight: '600',
    },
    painelMinuto: {
      // Texto pequeno sobre preenchimento de ação: brandStrong garante AA
      // (branco sobre o verde-bandeira puro fica 3.6:1 no claro).
      backgroundColor: t.cores.brandStrong,
      borderRadius: raios.sm,
      paddingHorizontal: espacamento[2],
      paddingVertical: 3,
    },
    painelMinutoTexto: {
      color: t.cores.onBrand,
      fontSize: 12,
      fontWeight: '800',
    },
    seta: {
      alignItems: 'center',
      backgroundColor: t.cores.surfaceSubtle,
      borderRadius: 999,
      height: 30,
      justifyContent: 'center',
      width: 30,
    },
    painelGrade: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: espacamento[2],
    },
    dado: {
      alignItems: 'center',
      paddingVertical: espacamento[1],
      width: '33.33%',
    },
    dadoValor: {
      color: t.cores.textPrimary,
      fontSize: 13,
      fontWeight: '800',
    },
    dadoRotulo: {
      color: t.cores.textSecondary,
      fontSize: 10,
      fontWeight: '600',
      marginTop: 1,
    },
    legenda: {
      alignItems: 'center',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: espacamento[2],
      justifyContent: 'center',
    },
    legendaItem: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 4,
    },
    legendaDot: {
      borderRadius: 999,
      borderWidth: 1.6,
      height: 11,
      width: 11,
    },
    legendaTexto: {
      color: t.cores.textSecondary,
      fontSize: 11,
      fontWeight: '700',
    },
    legendaXg: {
      color: t.cores.textMuted,
      fontSize: 10,
      fontStyle: 'italic',
    },
  });
