import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {corOverall, glowDoTier, nivelCarta} from '../../theme';

type OverallBadgeProps = {
  overall: number;
  size?: number;
  /** Brilho do tier por trás do disco (v0.0.2). Desligue em listas densas. */
  glow?: boolean;
};

function OverallBadge({overall, size = 36, glow = true}: OverallBadgeProps) {
  const cor = corOverall(overall);
  const tier = nivelCarta(overall);
  return (
    <View
      style={[
        styles.badge,
        glow ? glowDoTier(overall) : null,
        {
          borderColor: cor,
          backgroundColor: tier.background,
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
