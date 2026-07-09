/**
 * Goleiro (SVG cartoon) — figura com os pés na base do viewBox (38, 96), braços
 * abertos e luvas. Sem lógica: o AlvoGol posiciona/rotaciona a figura inteira
 * (via Animated.View) para o mergulho decidido pela engine.
 */
import React from 'react';
import Svg, {Circle, Ellipse, G, Path, Rect} from 'react-native-svg';

/** viewBox do goleiro (o AlvoGol usa para centralizar). Pés em (38, 96). */
export const GOLEIRO_VIEWBOX = {largura: 76, altura: 104, pesX: 38, pesY: 96};

type Props = {
  /** Largura renderizada (px); a altura mantém a proporção do viewBox. */
  tamanho: number;
  /** Cor da camisa/mangas (default dourado). */
  corKit?: string;
};

function Goleiro({tamanho, corKit = '#f4b740'}: Props): React.JSX.Element {
  const altura = (tamanho * GOLEIRO_VIEWBOX.altura) / GOLEIRO_VIEWBOX.largura;
  return (
    <Svg width={tamanho} height={altura} viewBox="0 0 76 104">
      <Ellipse cx="38" cy="96" rx="24" ry="5.5" fill="rgba(0,0,0,0.28)" />
      {/* pernas */}
      <Rect x="28" y="72" width="7.5" height="24" rx="3" fill="#0f5a2e" />
      <Rect x="40.5" y="72" width="7.5" height="24" rx="3" fill="#0f5a2e" />
      {/* corpo */}
      <Rect x="24" y="48" width="28" height="28" rx="7" fill={corKit} />
      {/* braços abertos */}
      <G>
        <Rect x="10" y="50" width="15" height="7.5" rx="3.75" fill={corKit} transform="rotate(-22 18 54)" />
        <Rect x="51" y="50" width="15" height="7.5" rx="3.75" fill={corKit} transform="rotate(22 58 54)" />
      </G>
      {/* luvas */}
      <Circle cx="8" cy="46" r="5.5" fill="#ffffff" />
      <Circle cx="68" cy="46" r="5.5" fill="#ffffff" />
      {/* cabeça + cabelo */}
      <Circle cx="38" cy="40" r="8.5" fill="#e8b88a" />
      <Path d="M 29.5 37 A 8.5 8.5 0 0 1 46.5 37 Z" fill="#3a2a1a" />
    </Svg>
  );
}

export default Goleiro;
