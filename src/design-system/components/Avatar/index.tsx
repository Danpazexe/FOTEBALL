/**
 * Avatar — círculo com INICIAIS (o jogo não tem fotos de jogador). Fundo neutro
 * por padrão; `tom` colore o selo. Cor por token. Rótulo acessível opcional.
 */
import React from 'react';
import {StyleSheet, View} from 'react-native';

import {Text} from '../../primitives/Text';
import {raios} from '../../tokens';
import type {CoresSemanticas} from '../../tokens/colors';
import {useTheme} from '../../themes/useTheme';

type Tom = 'neutral' | 'brand' | 'accent';

type Props = {
  nome: string;
  tamanho?: number;
  tom?: Tom;
};

const FUNDO_TOM: Record<Tom, keyof CoresSemanticas> = {
  neutral: 'surfaceSubtle',
  brand: 'brandSoft',
  accent: 'accentSoft',
};
const COR_TOM: Record<Tom, keyof CoresSemanticas> = {
  neutral: 'textSecondary',
  brand: 'brand',
  accent: 'accent',
};

/** Iniciais: 1ª letra do primeiro nome + 1ª do último (ou 2 primeiras). */
function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) {
    return '?';
  }
  if (partes.length === 1) {
    return partes[0].slice(0, 2).toUpperCase();
  }
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function Avatar({nome, tamanho = 40, tom = 'neutral'}: Props): React.JSX.Element {
  const {cores} = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[
        estilos.circulo,
        {
          width: tamanho,
          height: tamanho,
          borderRadius: raios.full,
          backgroundColor: cores[FUNDO_TOM[tom]],
        },
      ]}>
      <Text
        variant="labelM"
        color={COR_TOM[tom]}
        weight="800"
        style={{fontSize: Math.round(tamanho * 0.36)}}>
        {iniciais(nome)}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  circulo: {alignItems: 'center', justifyContent: 'center'},
});
