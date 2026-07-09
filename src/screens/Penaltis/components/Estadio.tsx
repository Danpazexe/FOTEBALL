/**
 * Cena ESTÁTICA da disputa de pênaltis — visão atrás da bola, estilo doodle:
 * estádio noturno com torcida, gramado em perspectiva (faixas + grande área),
 * gol ao fundo com rede. Goleiro e bola são camadas animadas por cima (ver
 * AlvoGol). Coordenadas no espaço 0..440 (viewBox), escaladas para a largura.
 */
import React from 'react';
import Svg, {
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Polygon,
  Rect,
  Path,
  Stop,
  Circle,
} from 'react-native-svg';

/** Meia-largura da boca do gol (espaço 440) e linhas de referência — expostas
 *  para o AlvoGol mapear mira/goleiro na MESMA geometria da cena. */
export const CENA = {
  lado: 440,
  golCentroX: 222,
  golMeiaLargura: 62,
  golLinhaY: 152, // base (rente ao chão)
  golTravessaoY: 106, // sob o travessão
  goleiroBaseY: 150,
  bolaPontoX: 220,
  bolaPontoY: 360,
} as const;

const TORCIDA: Array<[number, number, string]> = [
  [30, 52, '#e6d2a8'], [58, 58, '#8fb3ff'], [86, 50, '#f4b740'],
  [116, 60, '#ee8888'], [150, 54, '#cceeff'], [300, 54, '#8fb3ff'],
  [330, 50, '#e6d2a8'], [360, 60, '#f4b740'], [392, 54, '#cceeff'],
  [416, 58, '#ee8888'], [48, 76, '#f4b740'], [104, 74, '#cceeff'],
  [336, 76, '#e6d2a8'], [388, 74, '#f4b740'],
];

const REDE_V = [150, 168, 186, 204, 222, 240, 258, 276, 294];
const REDE_H = [110, 126, 142];

function Estadio({largura}: {largura: number}): React.JSX.Element {
  return (
    <Svg width={largura} height={largura} viewBox="0 0 440 440">
      <Defs>
        <LinearGradient id="ceu" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#0c2418" />
          <Stop offset="1" stopColor="#0a1f14" />
        </LinearGradient>
        <LinearGradient id="gramado" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#17703a" />
          <Stop offset="1" stopColor="#1f8f4a" />
        </LinearGradient>
      </Defs>

      <Rect x="0" y="0" width="440" height="440" fill="url(#ceu)" />

      {/* Arquibancada + torcida */}
      <Rect x="0" y="34" width="440" height="60" fill="#0f2c1d" />
      <Rect x="0" y="80" width="440" height="18" fill="#0b2216" />
      <G opacity={0.85}>
        {TORCIDA.map(([cx, cy, cor], i) => (
          <Circle key={i} cx={cx} cy={cy} r={3} fill={cor} />
        ))}
      </G>

      {/* Campo em perspectiva + faixas de corte */}
      <Polygon points="80,150 360,150 470,440 -30,440" fill="url(#gramado)" />
      <Polygon points="80,150 128,150 60,440 -30,440" fill="#178a44" opacity={0.55} />
      <Polygon points="176,150 224,150 235,440 130,440" fill="#178a44" opacity={0.55} />
      <Polygon points="272,150 320,150 445,440 320,440" fill="#178a44" opacity={0.55} />

      {/* Grande área / pequena área / meia-lua / marca do pênalti */}
      <Polygon points="112,152 328,152 388,262 52,262" fill="none" stroke="rgba(255,255,255,0.72)" strokeWidth={2.5} />
      <Polygon points="156,152 284,152 306,196 134,196" fill="none" stroke="rgba(255,255,255,0.72)" strokeWidth={2.5} />
      <Path d="M 182 262 Q 220 286 258 262" fill="none" stroke="rgba(255,255,255,0.72)" strokeWidth={2.5} />
      <Ellipse cx="220" cy="236" rx="4" ry="2.5" fill="#ffffff" />

      {/* Rede */}
      <G stroke="rgba(255,255,255,0.22)" strokeWidth={1}>
        {REDE_V.map(x => (
          <Line key={`v${x}`} x1={x} y1={96} x2={x} y2={152} />
        ))}
        {REDE_H.map(y => (
          <Line key={`h${y}`} x1={146} y1={y} x2={298} y2={y} />
        ))}
      </G>
      {/* Traves + travessão */}
      <Rect x="140" y="94" width="6" height="60" rx="2" fill="#f5f7fa" />
      <Rect x="298" y="94" width="6" height="60" rx="2" fill="#f5f7fa" />
      <Rect x="140" y="92" width="164" height="6" rx="3" fill="#f5f7fa" />
    </Svg>
  );
}

export default Estadio;
