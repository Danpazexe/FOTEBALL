/**
 * TextField — campo de texto temático. Encapsula a tripla de cores do tema
 * (fundo `surfaceSubtle`, borda `border`, texto `textPrimary`) e o
 * `placeholderTextColor` (`textMuted`), para nenhuma tela repetir cor em
 * TextInput manual. `variante` define a aparência do campo; layout
 * (margem/flex) fica na tela via `style`.
 */
import React from 'react';
import {
  StyleSheet,
  TextInput,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
} from 'react-native';

import {espacamento, raios} from '../tokens';
import {useTheme} from '../themes/useTheme';

/** Papel do campo: busca/texto corrido, valor em formulário ou valor destaque. */
export type VarianteTextField = 'busca' | 'valor' | 'valorDestaque';

type Props = Omit<TextInputProps, 'placeholderTextColor' | 'style'> & {
  variante?: VarianteTextField;
  /** Escape hatch de LAYOUT (margens/flex); não usar para cor. */
  style?: StyleProp<TextStyle>;
};

export function TextField({
  variante = 'busca',
  style,
  ...rest
}: Props): React.JSX.Element {
  const {cores} = useTheme();
  return (
    <TextInput
      {...rest}
      placeholderTextColor={cores.textMuted}
      style={[
        estilos.base,
        estilos[variante],
        {
          backgroundColor: cores.surfaceSubtle,
          borderColor: cores.border,
          color: cores.textPrimary,
        },
        style,
      ]}
    />
  );
}

const estilos = StyleSheet.create({
  base: {borderWidth: 1, paddingHorizontal: espacamento[3]},
  /** Busca/entrada de texto corrido (Elenco, Mercado). */
  busca: {
    borderRadius: raios.md,
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: espacamento[2],
  },
  /** Valor numérico em formulário/modal (ex.: salário na renovação). */
  valor: {
    borderRadius: raios.sm,
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: espacamento[2],
  },
  /** Valor numérico protagonista da tela (ex.: proposta na negociação). */
  valorDestaque: {
    borderRadius: raios.md,
    fontSize: 18,
    fontWeight: '800',
    paddingVertical: espacamento[3],
  },
});
