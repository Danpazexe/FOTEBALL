import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {useTheme, type CorTexto} from '../../design-system';

type OverallBadgeProps = {
  overall: number;
  size?: number;
  /** Mantido por compatibilidade; sem efeito na paleta nova (sem glow de tier). */
  glow?: boolean;
};

/** Faixa de cor por overall — mesma lógica do anel (alto/verde, médio/âmbar). */
function faixaCor(overall: number): CorTexto {
  if (overall >= 75) {
    return 'success';
  }
  if (overall >= 60) {
    return 'warning';
  }
  return 'danger';
}

function OverallBadge({overall, size = 36}: OverallBadgeProps) {
  const {cores} = useTheme();
  const cor = cores[faixaCor(overall)];
  return (
    <View
      style={[
        styles.badge,
        {
          borderColor: cor,
          backgroundColor: cores.surface,
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}>
      <Text style={[styles.texto, {color: cor, fontSize: size * 0.42}]}>
        {overall}
      </Text>
    </View>
  );
}

export default OverallBadge;

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    borderWidth: 2,
    justifyContent: 'center',
  },
  texto: {
    fontWeight: '900',
  },
});
