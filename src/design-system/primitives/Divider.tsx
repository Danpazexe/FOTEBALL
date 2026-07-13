/**
 * Divider — separador fino por token `border`. Horizontal por padrão; `vertical`
 * para separar colunas (ex.: célula de estatística). Cor sempre do tema.
 */
import React from 'react';
import {StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';

import {useTheme} from '../themes/useTheme';

type Props = {
  vertical?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Divider({vertical, style}: Props): React.JSX.Element {
  const {cores} = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[
        vertical ? estilos.vertical : estilos.horizontal,
        {backgroundColor: cores.border},
        style,
      ]}
    />
  );
}

const estilos = StyleSheet.create({
  horizontal: {height: StyleSheet.hairlineWidth, alignSelf: 'stretch'},
  vertical: {width: StyleSheet.hairlineWidth, alignSelf: 'stretch'},
});
