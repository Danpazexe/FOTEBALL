/**
 * Text — primitivo tipográfico. Cor SEMPRE por token semântico (nunca hex);
 * variante = papel tipográfico; `tabular` liga dígitos de largura fixa.
 */
import React from 'react';
import {
  Text as RNText,
  type StyleProp,
  type TextProps as RNTextProps,
  type TextStyle,
} from 'react-native';

import {tipografia, tabular as estiloTabular, type PapelTipografico} from '../tokens';
import type {CoresSemanticas} from '../tokens/colors';
import {useTheme} from '../themes/useTheme';

export type CorTexto = keyof CoresSemanticas;

type Props = Omit<RNTextProps, 'style'> & {
  variant?: PapelTipografico;
  color?: CorTexto;
  align?: TextStyle['textAlign'];
  /** Dígitos de largura fixa (placar, dinheiro, tabela). */
  tabular?: boolean;
  weight?: TextStyle['fontWeight'];
  /** Escape hatch de LAYOUT (margens/flex); não usar para cor. */
  style?: StyleProp<TextStyle>;
};

export function Text({
  variant = 'bodyM',
  color = 'textPrimary',
  align,
  tabular,
  weight,
  style,
  ...rest
}: Props): React.JSX.Element {
  const {cores} = useTheme();
  return (
    <RNText
      {...rest}
      style={[
        tipografia[variant],
        {color: cores[color]},
        align ? {textAlign: align} : null,
        tabular ? estiloTabular : null,
        weight ? {fontWeight: weight} : null,
        style,
      ]}
    />
  );
}
