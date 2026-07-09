/**
 * Bola de futebol (SVG) — desenhada num viewBox 0..56 com a bola centrada em
 * (28,28). O AlvoGol a posiciona/escala via Animated.View (voo até o gol).
 */
import React from 'react';
import Svg, {Circle, Ellipse, Polygon} from 'react-native-svg';

/** Lado do viewBox — o AlvoGol usa para centralizar/escalar a bola. */
export const BOLA_VIEWBOX = 56;

function Bola({tamanho}: {tamanho: number}): React.JSX.Element {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 56 56">
      <Ellipse cx="28" cy="52" rx="20" ry="5" fill="rgba(0,0,0,0.28)" />
      <Circle cx="28" cy="26" r="26" fill="#f5f7fa" stroke="#c7cdd6" strokeWidth={1} />
      <Polygon points="28,16 38,23 34,36 22,36 18,23" fill="#12181f" />
      <Polygon points="28,0 35,10 28,16 21,10" fill="#12181f" opacity={0.92} />
      <Polygon points="38,23 52,19 53,31 42,37 34,36" fill="#12181f" opacity={0.92} />
      <Polygon points="18,23 22,36 14,37 3,31 4,19" fill="#12181f" opacity={0.92} />
    </Svg>
  );
}

export default Bola;
