import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {corOverall} from '../../theme';

type OverallBadgeProps = {
  overall: number;
  size?: number;
};

function OverallBadge({overall, size = 36}: OverallBadgeProps) {
  const cor = corOverall(overall);
  return (
    <View
      style={[
        styles.badge,
        {
          borderColor: cor,
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
