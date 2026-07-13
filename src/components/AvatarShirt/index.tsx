/**
 * AvatarShirt — camisa VETORIAL recolorível do jogador (camada de baixo do
 * avatar). Fica atrás da face PNG (que tem fundo transparente), aparecendo do
 * pescoço para baixo. Recolorida pela cor real do clube — o mesmo rosto veste a
 * camisa de qualquer time (e troca na hora após uma transferência).
 */
import React, {memo} from 'react';
import Svg, {ClipPath, Defs, G, Path, Rect} from 'react-native-svg';

export type ModeloCamisa =
  | 'lisa'
  | 'faixaVertical'
  | 'faixaHorizontal'
  | 'listrada'
  | 'goleiro';

export interface AvatarShirtProps {
  readonly size?: number;
  readonly corPrimaria: string;
  readonly corSecundaria?: string;
  readonly corGola?: string;
  readonly modelo?: ModeloCamisa;
  readonly testID?: string;
}

const VIEWBOX_SIZE = 209;

// A gola fica abaixo do pescoço da camada PNG/WebP do avatar.
const CAMISA_PATH =
  'M8 209V184C8 165 22 153 46 146L78 136C87 143 96 147 104.5 147C113 147 122 143 131 136L163 146C187 153 201 165 201 184V209Z';

const MANGA_ESQUERDA_PATH = 'M8 209V184C8 165 22 153 46 146L59 142L67 209Z';

const MANGA_DIREITA_PATH =
  'M201 209V184C201 165 187 153 163 146L150 142L142 209Z';

function ConteudoModelo({
  modelo,
  corSecundaria,
}: Readonly<{
  modelo: ModeloCamisa;
  corSecundaria: string;
}>): React.JSX.Element | null {
  switch (modelo) {
    case 'faixaVertical':
      return <Rect x={88} y={132} width={33} height={77} fill={corSecundaria} />;

    case 'faixaHorizontal':
      return <Rect x={8} y={169} width={193} height={21} fill={corSecundaria} />;

    case 'listrada':
      return (
        <>
          <Rect x={43} y={136} width={18} height={73} fill={corSecundaria} />
          <Rect x={78} y={136} width={18} height={73} fill={corSecundaria} />
          <Rect x={113} y={136} width={18} height={73} fill={corSecundaria} />
          <Rect x={148} y={136} width={18} height={73} fill={corSecundaria} />
        </>
      );

    case 'goleiro':
      return (
        <>
          <Path d={MANGA_ESQUERDA_PATH} fill={corSecundaria} />
          <Path d={MANGA_DIREITA_PATH} fill={corSecundaria} />
          <Rect x={96} y={148} width={17} height={61} fill={corSecundaria} />
        </>
      );

    case 'lisa':
      return null;
  }
}

function AvatarShirtComponent({
  size = VIEWBOX_SIZE,
  corPrimaria,
  corSecundaria = '#FFFFFF',
  corGola = corSecundaria,
  modelo = 'lisa',
  testID,
}: AvatarShirtProps): React.JSX.Element {
  return (
    <Svg
      testID={testID}
      accessibilityLabel="Camisa do jogador"
      width={size}
      height={size}
      viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}>
      <Defs>
        <ClipPath id="avatar-shirt-clip">
          <Path d={CAMISA_PATH} />
        </ClipPath>
      </Defs>

      <Path d={CAMISA_PATH} fill={corPrimaria} />

      <G clipPath="url(#avatar-shirt-clip)">
        <ConteudoModelo modelo={modelo} corSecundaria={corSecundaria} />
      </G>

      <Path
        d="M78 136C87 143 96 147 104.5 147C113 147 122 143 131 136L124 153C118 159 112 162 104.5 162C97 162 91 159 85 153Z"
        fill={corGola}
      />

      <Path
        d="M85 143C91 149 97 152 104.5 152C112 152 118 149 124 143"
        fill="none"
        stroke="rgba(0,0,0,0.16)"
        strokeWidth={2}
      />
    </Svg>
  );
}

export const AvatarShirt = memo(AvatarShirtComponent);
