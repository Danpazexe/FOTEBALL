import React from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';

import GradienteFundo from '../../components/GradienteFundo';
import LogoFoteball from '../../components/LogoFoteball';
import {cores, espaco} from '../../theme';

/** Tela de carregamento mostrada enquanto o save é hidratado no boot. */
function Loading(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <GradienteFundo />
      <View style={styles.centro}>
        <LogoFoteball />
        <Text style={styles.logo}>FOTEBALL</Text>
        <Text style={styles.marca}>MANAGER</Text>
        <ActivityIndicator
          size="large"
          color={cores.primaria}
          style={styles.spinner}
        />
        <Text style={styles.texto}>Carregando carreira...</Text>
      </View>
    </View>
  );
}

export default Loading;

const styles = StyleSheet.create({
  container: {
    backgroundColor: cores.fundoBase,
    flex: 1,
  },
  centro: {
    alignItems: 'center',
    flex: 1,
    gap: espaco.sm,
    justifyContent: 'center',
  },
  logo: {
    color: cores.texto,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: espaco.lg,
  },
  marca: {
    color: cores.secundaria,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 6,
    marginTop: -espaco.xs,
  },
  spinner: {
    marginTop: espaco.xl,
  },
  texto: {
    color: cores.textoSecundario,
    fontSize: 14,
    marginTop: espaco.sm,
  },
});
