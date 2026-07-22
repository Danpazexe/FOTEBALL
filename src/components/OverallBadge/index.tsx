import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {faixaCorOverall, useTheme} from '../../design-system';

type OverallBadgeProps = {
  overall: number;
  size?: number;
  /** Mantido por compatibilidade; sem efeito na paleta nova (sem glow de tier). */
  glow?: boolean;
};

function OverallBadge({overall, size = 36}: OverallBadgeProps) {
  const {cores} = useTheme();
  const cor = cores[faixaCorOverall(overall)];
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
