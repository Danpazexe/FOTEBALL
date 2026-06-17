/**
 * Placar esportivo (estilo Brasfoot) portado de SVG para react-native-svg.
 *
 * Ajustes sobre o template original:
 * - Barras laterais (caps) coloridas com a PALETA do time: faixas com as cores
 *   do mandante à esquerda e do visitante à direita.
 * - Logo da divisão no centro, no lugar da camisa genérica.
 * - Estrutura (barra/painel) e badges usam as DUAS cores da logo da divisão.
 * - Siglas brancas e maiores; placar grande nos badges de destaque.
 *
 * Centralização vertical do texto é feita por y manual (Android não respeita
 * dominantBaseline de forma confiável). viewBox fiel: 0 0 2172 724.
 */

import React from 'react';
import {Dimensions} from 'react-native';
import {
  Svg,
  Rect,
  Circle,
  Path,
  G,
  Defs,
  ClipPath,
  Image as SvgImage,
  Text as SvgText,
} from 'react-native-svg';

import {coresDaDivisao, logoDaDivisao} from '../../assets/escudos';
import {paletaDoTime} from '../../theme';

const BRANCO = '#FFFFFF';

const LARGURA_PADRAO = Dimensions.get('window').width - 24;

type PlacarProps = {
  siglaCasa: string;
  siglaFora: string;
  placarCasa: number;
  placarFora: number;
  tempo: string;
  /** Divisão da partida — define o emblema mostrado no centro do placar. */
  divisao?: string;
  largura?: number;
};

/** Faixas verticais de cor preenchendo um cap (recortado por clipPath). */
function FaixasCap({
  cores,
  x,
  clip,
}: {
  cores: string[];
  x: number;
  clip: string;
}): React.JSX.Element {
  const altura = 205 / cores.length;
  return (
    <G clipPath={clip}>
      {cores.map((cor, i) => (
        <Rect
          key={`${cor}_${i}`}
          x={x}
          y={225 + i * altura}
          width={76}
          height={altura}
          fill={cor}
        />
      ))}
    </G>
  );
}

function Placar({
  siglaCasa,
  siglaFora,
  placarCasa,
  placarFora,
  tempo,
  divisao,
  largura = LARGURA_PADRAO,
}: PlacarProps): React.JSX.Element {
  const altura = (largura * 724) / 2172;
  const paletaCasa = paletaDoTime(siglaCasa);
  const paletaFora = paletaDoTime(siglaFora);

  // Estrutura (NAVY) e destaque (LIME) saem das duas cores da logo da divisão.
  const {escuro: NAVY, destaque: LIME} = coresDaDivisao(divisao);

  // Fonte do tempo: cabe no painel de 500 (margem interna ~460).
  const tempoFontSize = Math.min(
    118,
    Math.floor(460 / Math.max(tempo.length, 1) / 0.62),
  );

  return (
    <Svg viewBox="0 0 2172 724" width={largura} height={altura}>
      <Defs>
        <ClipPath id="capEsq">
          <Path d="M133 225 L191 225 L191 430 L133 430 Q115 430 115 412 L115 243 Q115 225 133 225 Z" />
        </ClipPath>
        <ClipPath id="capDir">
          <Path d="M1981 225 L2039 225 Q2057 225 2057 243 L2057 412 Q2057 430 2039 430 L1981 430 Z" />
        </ClipPath>
      </Defs>

      {/* Barra principal */}
      <Rect x={115} y={225} width={1942} height={205} rx={18} fill={NAVY} />

      {/* Caps laterais com a paleta de cada time */}
      <FaixasCap cores={paletaCasa} x={115} clip="url(#capEsq)" />
      <FaixasCap cores={paletaFora} x={1981} clip="url(#capDir)" />

      {/* Siglas (brancas, grandes) — centro da barra (327) */}
      <SvgText
        x={420}
        y={375}
        textAnchor="middle"
        fontSize={140}
        fontWeight="900"
        fill={BRANCO}>
        {siglaCasa}
      </SvgText>
      <SvgText
        x={1752}
        y={375}
        textAnchor="middle"
        fontSize={140}
        fontWeight="900"
        fill={BRANCO}>
        {siglaFora}
      </SvgText>

      {/* Painel do tempo (pendurado) */}
      <Rect x={836} y={417} width={500} height={187} rx={9} fill={NAVY} />

      {/* Badges de placar (lime), REDONDOS, com número navy */}
      <Circle cx={812} cy={327} r={108} fill={LIME} />
      <SvgText
        x={812}
        y={392}
        textAnchor="middle"
        fontSize={170}
        fontWeight="900"
        fill={NAVY}>
        {placarCasa}
      </SvgText>
      <Circle cx={1360} cy={327} r={108} fill={LIME} />
      <SvgText
        x={1360}
        y={392}
        textAnchor="middle"
        fontSize={170}
        fontWeight="900"
        fill={NAVY}>
        {placarFora}
      </SvgText>

      {/* Logo da divisão no MEIO do placar, entre os dois badges */}
      <SvgImage
        href={logoDaDivisao(divisao)}
        x={871}
        y={80}
        width={430}
        height={430}
        preserveAspectRatio="xMidYMid meet"
      />

      {/* Tempo / rótulo no painel */}
      <SvgText
        x={1086}
        y={552}
        textAnchor="middle"
        fontSize={tempoFontSize}
        fontWeight="900"
        fill={LIME}>
        {tempo}
      </SvgText>
    </Svg>
  );
}

export default Placar;
