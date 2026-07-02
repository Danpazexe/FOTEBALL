import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import type {ForcaTime} from '../../engine/simulation/teamStrength';
import {cores, espaco, raio} from '../../theme';

type BarrasForcaProps = {
  casa: ForcaTime;
  fora: ForcaTime;
  corCasa: string;
  corFora: string;
};

const LINHAS: Array<{rotulo: string; chave: keyof ForcaTime}> = [
  {rotulo: 'ATA', chave: 'ataque'},
  {rotulo: 'MEI', chave: 'meio'},
  {rotulo: 'DEF', chave: 'defesa'},
];

/**
 * Barras comparativas casa x fora (ataque/meio/defesa), em linha legível:
 *   RÓTULO   nºCasa  [barra casa | barra fora]  nºFora
 * O rótulo fica à esquerda (não mais sobre a divisão das barras); os números
 * de cada time ladeiam a barra. A barra é um "cabo de guerra": cada lado cresce
 * proporcionalmente à sua força.
 */
function BarrasForca({
  casa,
  fora,
  corCasa,
  corFora,
}: BarrasForcaProps): React.JSX.Element {
  return (
    <View style={styles.wrap}>
      {LINHAS.map(linha => {
        const valorCasa = Math.round(casa[linha.chave]);
        const valorFora = Math.round(fora[linha.chave]);
        const total = Math.max(1, valorCasa + valorFora);
        const fracCasa = valorCasa / total;
        return (
          <View key={linha.chave} style={styles.linha}>
            <Text style={styles.rotulo}>{linha.rotulo}</Text>
            <Text style={[styles.numero, styles.numeroCasa]}>{valorCasa}</Text>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  {flex: fracCasa, backgroundColor: corCasa},
                ]}
              />
              <View
                style={[
                  styles.fill,
                  {flex: 1 - fracCasa, backgroundColor: corFora},
                ]}
              />
            </View>
            <Text style={[styles.numero, styles.numeroFora]}>{valorFora}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default BarrasForca;

const styles = StyleSheet.create({
  wrap: {
    gap: espaco.sm,
    width: '100%',
  },
  linha: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.sm,
  },
  rotulo: {
    color: cores.textoSecundario,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    width: 30,
  },
  numero: {
    color: cores.texto,
    fontSize: 13,
    fontWeight: '800',
    minWidth: 22,
  },
  numeroCasa: {
    textAlign: 'right',
  },
  numeroFora: {
    textAlign: 'left',
  },
  track: {
    backgroundColor: cores.fundoBase,
    borderRadius: raio.pill,
    flex: 1,
    flexDirection: 'row',
    gap: 2,
    height: 10,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
