/**
 * Placar esportivo portado de SVG para react-native-svg.
 *
 * Fidelidade: preserva todas as coordenadas, raios, cores e a ordem de desenho
 * do SVG fonte (viewBox 0 0 2172 724). O filtro de sombra (feDropShadow) foi
 * omitido por suporte instavel no react-native-svg.
 *
 * Centralizacao vertical do texto e feita manualmente ajustando a coordenada y
 * (baseline ~ centro_do_elemento + fontSize * 0.34), pois o Android nao respeita
 * dominantBaseline de forma confiavel.
 */

import React from 'react';
import {
  Svg,
  Rect,
  Ellipse,
  Path,
  Polygon,
  Circle,
  G,
  Text as SvgText,
} from 'react-native-svg';

const NAVY = '#061431';
const LIME = '#D6FF00';
const VB_W = 2172;
const VB_H = 724;

type PlacarProps = {
  siglaCasa: string;
  siglaFora: string;
  placarCasa: number;
  placarFora: number;
  tempo: string;
  largura?: number;
};

function Placar({
  siglaCasa,
  siglaFora,
  placarCasa,
  placarFora,
  tempo,
  largura = 340,
}: PlacarProps): React.JSX.Element {
  const altura = (largura * VB_H) / VB_W;

  // Fonte dinamica para o tempo caber no painel de 500 de largura
  // (margem interna ~460). Ex.: "45'", "INTERVALO", "FINAL".
  const tempoFontSize = Math.min(
    118,
    Math.floor(460 / Math.max(tempo.length, 1) / 0.62),
  );

  // Centro vertical do painel (417..604 => ~510); baseline acompanha a fonte.
  const tempoBaselineY = 510 + tempoFontSize * 0.34;

  return (
    <Svg viewBox={`0 0 ${VB_W} ${VB_H}`} width={largura} height={altura}>
      <G>
        {/* main-bar */}
        <Rect x={115} y={225} width={1942} height={205} rx={18} fill={NAVY} />
        {/* left-cap + mask */}
        <Rect x={115} y={225} width={76} height={205} rx={18} fill={LIME} />
        <Rect x={153} y={225} width={38} height={205} fill={LIME} />
        {/* right-cap + mask */}
        <Rect x={1981} y={225} width={76} height={205} rx={18} fill={LIME} />
        <Rect x={1981} y={225} width={38} height={205} fill={LIME} />

        {/* team-left -> siglaCasa (centro da barra 327 => baseline ~358) */}
        <SvgText
          x={405}
          y={358}
          textAnchor="middle"
          fontSize={92}
          fontWeight="900"
          fill={LIME}>
          {siglaCasa}
        </SvgText>
        {/* team-right -> siglaFora */}
        <SvgText
          x={1767}
          y={358}
          textAnchor="middle"
          fontSize={92}
          fontWeight="900"
          fill={LIME}>
          {siglaFora}
        </SvgText>

        {/* timer-panel */}
        <Rect x={836} y={417} width={500} height={187} rx={9} fill={NAVY} />

        {/* score-left badge + score-left -> placarCasa (cy=327 => baseline ~390) */}
        <Ellipse cx={812} cy={327} rx={133} ry={108} fill={LIME} />
        <SvgText
          x={812}
          y={390}
          textAnchor="middle"
          fontSize={178}
          fontWeight="900"
          fill={NAVY}>
          {placarCasa}
        </SvgText>

        {/* score-right badge + score-right -> placarFora */}
        <Ellipse cx={1360} cy={327} rx={133} ry={108} fill={LIME} />
        <SvgText
          x={1360}
          y={390}
          textAnchor="middle"
          fontSize={178}
          fontWeight="900"
          fill={NAVY}>
          {placarFora}
        </SvgText>

        {/* center-jersey */}
        <G>
          <Path
            fill={NAVY}
            d="M972 94 L1086 139 L1201 94 L1268 130 L1213 276 C1240 341 1220 411 1160 451 L1013 451 C953 411 933 341 960 276 L905 130 Z"
          />
          <Path
            fill={LIME}
            d="M997 127 L1086 163 L1176 127 L1230 153 L1183 276 C1209 336 1189 392 1142 421 L1031 421 C984 392 964 336 989 276 L943 153 Z"
          />
          <Path
            d="M1006 139 C1028 223 1060 255 1086 257 C1113 255 1145 223 1166 139"
            fill="none"
            stroke={NAVY}
            strokeWidth={12}
            strokeLinecap="round"
          />
          <Path
            d="M985 283 C961 337 979 389 1025 421"
            fill="none"
            stroke={NAVY}
            strokeWidth={12}
            strokeLinecap="round"
          />
          <Path
            d="M1188 283 C1211 337 1194 389 1148 421"
            fill="none"
            stroke={NAVY}
            strokeWidth={12}
            strokeLinecap="round"
          />
          <Circle
            cx={1086}
            cy={330}
            r={45}
            fill={LIME}
            stroke={NAVY}
            strokeWidth={10}
          />
          <Polygon
            points="1086,305 1107,320 1099,345 1073,345 1065,320"
            fill={NAVY}
          />
          <Path
            d="M1065 320 L1045 310 M1107 320 L1127 310 M1073 345 L1058 365 M1099 345 L1115 365 M1086 305 L1086 285"
            fill="none"
            stroke={NAVY}
            strokeWidth={8}
            strokeLinecap="round"
          />
        </G>

        {/* match-time -> tempo (centro do painel ~510, fontSize dinamico) */}
        <SvgText
          x={1086}
          y={tempoBaselineY}
          textAnchor="middle"
          fontSize={tempoFontSize}
          fontWeight="900"
          fill={LIME}>
          {tempo}
        </SvgText>
      </G>
    </Svg>
  );
}

export default Placar;
