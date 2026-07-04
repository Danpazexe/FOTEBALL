/**
 * Emblema da marca FOTEBALL — o escudo oficial (campo verde, borda dourada,
 * monograma "F" e bola). Imagem com fundo transparente, usada na tela inicial e
 * na de carregamento. Mesmo asset que gera o ícone do app.
 */
import React from 'react';
import {Image, StyleSheet} from 'react-native';

const LOGO = require('../../assets/brand/logo.png');
const TAMANHO = 128;

function LogoFoteball(): React.JSX.Element {
  return <Image source={LOGO} style={styles.logo} resizeMode="contain" />;
}

export default LogoFoteball;

const styles = StyleSheet.create({
  logo: {
    width: TAMANHO,
    height: TAMANHO,
  },
});
