/**
 * Face procedural do jogador — avatar flat/cartoon gerado DETERMINISTICAMENTE
 * a partir do id (mesma seed => mesma cara, para sempre, inclusive para
 * novatos criados pela engine). Zero assets, zero risco de licença, 100%
 * offline. Camadas SVG: pele, orelhas, cabelo (6 estilos), barba (4 níveis),
 * olhos/sobrancelhas/boca com pequenas variações e camisa na cor do clube.
 *
 * Preparado para o futuro "facepack" (ROADMAP): quem quiser fotos reais
 * poderá sobrepor uma imagem importada; este componente é o padrão seguro.
 */
import React, {useMemo} from 'react';
import {StyleSheet, View} from 'react-native';
import Svg, {Circle, Ellipse, Path, Rect} from 'react-native-svg';

import {criarRNGComSeed, hashString} from '../../engine/simulation/rng';
import {cores} from '../../theme';

/** Tons de pele brasileiros (flat) — do mais escuro ao mais claro. */
const TONS_PELE = [
  '#6B4423',
  '#8D5524',
  '#A5673F',
  '#C68642',
  '#E0AC69',
  '#F1C27D',
  '#FFDBAC',
];

const CORES_CABELO = [
  '#181A1B',
  '#1C1310',
  '#2E1D12',
  '#4A2F1B',
  '#6E4B26',
  '#5A5A5A',
];

type Visual = {
  pele: string;
  peleSombra: string;
  cabelo: string;
  estiloCabelo: number;
  barba: number;
  olhoDx: number;
  sorriso: boolean;
  sobrancelhaGrossa: boolean;
};

/** Escurece um hex (%) para sombras/contornos flat. */
function escurecer(hex: string, fator: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const canal = (v: number) => Math.max(0, Math.round(v * (1 - fator)));
  const r = canal(Math.floor(n / 65536) % 256);
  const g = canal(Math.floor(n / 256) % 256);
  const b = canal(n % 256);
  return `#${(r * 65536 + g * 256 + b).toString(16).padStart(6, '0')}`;
}

function sortearVisual(seed: string): Visual {
  const rng = criarRNGComSeed(hashString(seed));
  const pele = TONS_PELE[Math.floor(rng() * TONS_PELE.length)] ?? '#C68642';
  const cabelo =
    CORES_CABELO[Math.floor(rng() * CORES_CABELO.length)] ?? '#1C1310';
  return {
    pele,
    peleSombra: escurecer(pele, 0.18),
    cabelo,
    // 0 careca · 1 raspado · 2 curto · 3 volume/black · 4 moicano · 5 franja
    estiloCabelo: Math.floor(rng() * 6),
    // 0 nada · 1 sombra rala · 2 cavanhaque · 3 cheia (metade sem barba)
    barba: rng() < 0.5 ? 0 : 1 + Math.floor(rng() * 3),
    olhoDx: Math.floor(rng() * 3) - 1,
    sorriso: rng() < 0.35,
    sobrancelhaGrossa: rng() < 0.5,
  };
}

function CabeloSvg({visual}: {visual: Visual}): React.JSX.Element | null {
  const c = visual.cabelo;
  switch (visual.estiloCabelo) {
    case 0:
      return null; // careca
    case 1: // raspado (linha rente ao couro)
      return (
        <Path d="M26 38 Q50 14 74 38 L74 32 Q50 10 26 32 Z" fill={c} opacity={0.85} />
      );
    case 2: // curto clássico
      return <Path d="M25 40 Q50 8 75 40 Q75 26 50 18 Q25 26 25 40 Z" fill={c} />;
    case 3: // volume/black power
      return (
        <Path
          d="M23 40 Q18 16 50 12 Q82 16 77 40 Q78 24 50 20 Q22 24 23 40 Z"
          fill={c}
          strokeWidth={6}
          stroke={c}
        />
      );
    case 4: // moicano
      return <Rect x={43} y={10} width={14} height={22} rx={6} fill={c} />;
    default: // franja
      return (
        <Path d="M25 42 Q50 10 75 42 L75 34 Q64 30 58 36 Q50 26 40 34 Q30 30 25 36 Z" fill={c} />
      );
  }
}

function BarbaSvg({visual}: {visual: Visual}): React.JSX.Element | null {
  const c = visual.cabelo;
  switch (visual.barba) {
    case 1: // sombra rala
      return (
        <Path
          d="M31 58 Q50 82 69 58 Q66 74 50 77 Q34 74 31 58 Z"
          fill={c}
          opacity={0.25}
        />
      );
    case 2: // cavanhaque
      return <Path d="M44 68 Q50 74 56 68 Q56 76 50 78 Q44 76 44 68 Z" fill={c} />;
    case 3: // cheia
      return (
        <Path
          d="M29 54 Q50 86 71 54 Q70 78 50 82 Q30 78 29 54 Z"
          fill={c}
          opacity={0.9}
        />
      );
    default:
      return null;
  }
}

type FaceJogadorProps = {
  /** Semente estável — use o id do jogador. */
  seed: string;
  tamanho?: number;
  /** Cor da camisa (ex.: corDoTime(clubeId)); padrão cinza neutro. */
  corCamisa?: string;
  /** Cor de fundo do medalhão; padrão superfície alternativa do tema. */
  corFundo?: string;
};

export function FaceJogador({
  seed,
  tamanho = 44,
  corCamisa,
  corFundo,
}: FaceJogadorProps): React.JSX.Element {
  const visual = useMemo(() => sortearVisual(seed), [seed]);
  const camisa = corCamisa ?? '#9AA4B5';

  return (
    <View
      style={[
        styles.medalhao,
        {
          backgroundColor: corFundo ?? cores.superficieAlt,
          borderRadius: tamanho / 2,
          height: tamanho,
          width: tamanho,
        },
      ]}>
      <Svg width={tamanho} height={tamanho} viewBox="0 0 100 100">
        {/* camisa/ombros */}
        <Path
          d="M18 100 Q20 76 50 76 Q80 76 82 100 Z"
          fill={camisa}
        />
        <Rect x={43} y={66} width={14} height={14} fill={visual.peleSombra} />
        {/* orelhas */}
        <Circle cx={24} cy={48} r={5.5} fill={visual.pele} />
        <Circle cx={76} cy={48} r={5.5} fill={visual.pele} />
        {/* cabeça */}
        <Ellipse cx={50} cy={46} rx={27} ry={31} fill={visual.pele} />
        <BarbaSvg visual={visual} />
        <CabeloSvg visual={visual} />
        {/* sobrancelhas */}
        <Rect
          x={33 + visual.olhoDx}
          y={38}
          width={12}
          height={visual.sobrancelhaGrossa ? 3.5 : 2}
          rx={1.5}
          fill={visual.cabelo}
        />
        <Rect
          x={55 + visual.olhoDx}
          y={38}
          width={12}
          height={visual.sobrancelhaGrossa ? 3.5 : 2}
          rx={1.5}
          fill={visual.cabelo}
        />
        {/* olhos */}
        <Circle cx={39 + visual.olhoDx} cy={47} r={2.8} fill="#1C2430" />
        <Circle cx={61 + visual.olhoDx} cy={47} r={2.8} fill="#1C2430" />
        {/* nariz */}
        <Path
          d="M50 50 L48 58 Q50 60 52 58 Z"
          fill={visual.peleSombra}
          opacity={0.7}
        />
        {/* boca */}
        {visual.sorriso ? (
          <Path
            d="M42 66 Q50 72 58 66"
            stroke="#5A2E22"
            strokeWidth={2.4}
            strokeLinecap="round"
            fill="none"
          />
        ) : (
          <Rect x={43} y={66} width={14} height={2.4} rx={1.2} fill="#5A2E22" />
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  medalhao: {
    overflow: 'hidden',
  },
});

export default FaceJogador;
