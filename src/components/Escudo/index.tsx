/**
 * Escudo do clube. Mostra o PNG real quando existe; senão cai para um ÍCONE de
 * escudo (shield) na cor do time com a sigla sobreposta — placeholder usado, por
 * exemplo, nos clubes da Série B que ainda não têm imagem de escudo.
 */

import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {escudoDoTime} from '../../assets/escudos';
import {contrasteTexto, corDoTime} from '../../theme';

type EscudoProps = {
  clubeId: string;
  sigla: string;
  tamanho?: number;
};

function Escudo({clubeId, sigla, tamanho = 32}: EscudoProps): React.JSX.Element {
  const fonte = escudoDoTime(clubeId);

  if (fonte) {
    return (
      <Image
        source={fonte}
        style={{width: tamanho, height: tamanho}}
        resizeMode="contain"
      />
    );
  }

  // Sem PNG: ícone de escudo na cor do time + sigla por cima (crest placeholder).
  const cor = corDoTime(clubeId);
  return (
    <View style={[styles.fallback, {height: tamanho, width: tamanho}]}>
      <MaterialCommunityIcons name="shield" size={tamanho} color={cor} />
      <Text
        style={[
          styles.sigla,
          {color: contrasteTexto(cor), fontSize: Math.round(tamanho * 0.28)},
        ]}>
        {sigla}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sigla: {
    fontWeight: '900',
    letterSpacing: 0.3,
    position: 'absolute',
    // O "miolo" do shield fica levemente acima do centro geométrico.
    top: '34%',
  },
});

export default Escudo;
