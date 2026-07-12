import React from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';

import LogoFoteball from '../../components/LogoFoteball';
import {Text, espacamento, useTheme} from '../../design-system';

/** Tela de carregamento mostrada enquanto o save é hidratado no boot. */
function Loading(): React.JSX.Element {
  const {cores} = useTheme();
  return (
    <View style={[styles.container, {backgroundColor: cores.canvas}]}>
      <View style={styles.centro}>
        <LogoFoteball />
        <Text variant="display">FOTEBALL</Text>
        <Text variant="labelL" color="accent" style={styles.marca}>
          MANAGER
        </Text>
        <ActivityIndicator
          size="large"
          color={cores.brand}
          style={styles.spinner}
        />
        <Text variant="bodyM" color="textSecondary" style={styles.texto}>
          Carregando carreira...
        </Text>
      </View>
    </View>
  );
}

export default Loading;

const styles = StyleSheet.create({
  container: {flex: 1},
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacamento[2],
  },
  marca: {letterSpacing: 6},
  spinner: {marginTop: espacamento[6]},
  texto: {marginTop: espacamento[2]},
});
