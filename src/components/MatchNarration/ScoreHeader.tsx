import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, Text, View} from 'react-native';

import Escudo from '../Escudo';
import {cores, espaco, raio} from '../../theme';

type ScoreHeaderProps = {
  nomeCasa: string;
  nomeFora: string;
  placarCasa: number;
  placarFora: number;
  rotulo: string;
  clubeIdCasa?: string;
  clubeIdFora?: string;
  siglaCasa?: string;
  siglaFora?: string;
  corCasa?: string;
  corFora?: string;
};

/**
 * Cabeçalho de placar para a narração de partida.
 * Badge da sigla (na cor do time) de cada lado + placar em destaque + rótulo
 * (ex.: "67'", "INTERVALO" ou "FINAL"). Faz um pulse no placar a cada gol.
 */
export function ScoreHeader({
  nomeCasa,
  nomeFora,
  placarCasa,
  placarFora,
  rotulo,
  clubeIdCasa,
  clubeIdFora,
  siglaCasa,
  siglaFora,
}: ScoreHeaderProps): React.JSX.Element {
  const escala = useRef(new Animated.Value(1)).current;
  const totalGols = placarCasa + placarFora;
  const primeiraRenderizacao = useRef(true);

  useEffect(() => {
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false;
      return;
    }
    Animated.sequence([
      Animated.timing(escala, {
        toValue: 1.3,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(escala, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [totalGols, escala]);

  return (
    <View style={styles.container}>
      <Text style={styles.rotulo}>{rotulo}</Text>
      <View style={styles.linhaPlacar}>
        <View style={styles.timeWrap}>
          {clubeIdCasa ? (
            <Escudo
              clubeId={clubeIdCasa}
              sigla={siglaCasa ?? ''}
              tamanho={30}
            />
          ) : null}
          <Text style={styles.nomeTime} numberOfLines={1}>
            {nomeCasa}
          </Text>
        </View>
        <Animated.Text style={[styles.placar, {transform: [{scale: escala}]}]}>
          {placarCasa} x {placarFora}
        </Animated.Text>
        <View style={[styles.timeWrap, styles.timeWrapFora]}>
          <Text style={[styles.nomeTime, styles.nomeTimeFora]} numberOfLines={1}>
            {nomeFora}
          </Text>
          {clubeIdFora ? (
            <Escudo
              clubeId={clubeIdFora}
              sigla={siglaFora ?? ''}
              tamanho={30}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: cores.superficieAlt,
    borderColor: cores.borda,
    borderRadius: raio.md,
    borderWidth: 1,
    gap: espaco.xs,
    padding: espaco.md,
  },
  rotulo: {
    color: cores.textoSecundario,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  linhaPlacar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.sm,
  },
  timeWrap: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: espaco.sm,
  },
  timeWrapFora: {
    flexDirection: 'row-reverse',
  },
  nomeTime: {
    color: cores.texto,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  nomeTimeFora: {
    textAlign: 'right',
  },
  placar: {
    color: cores.primaria,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
