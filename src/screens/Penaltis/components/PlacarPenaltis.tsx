/**
 * Placar da disputa de pênaltis: bolinhas por lado (5 regulares + as extras da
 * morte súbita) e o total de gols. Componente puramente apresentacional.
 */
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {cores, espaco, raio, tabular} from '../../../theme';
import type {CobrancaPenalti, Cobrador} from '../../../types';

const REGULARES = 5;

type Props = {
  cobrancas: CobrancaPenalti[];
  marcadosUsuario: number;
  marcadosCpu: number;
  nomeUsuario: string;
  nomeAdversario: string;
};

function Bolinhas({
  cobrancas,
}: {
  cobrancas: CobrancaPenalti[];
}): React.JSX.Element {
  const total = Math.max(REGULARES, cobrancas.length);
  const itens = Array.from({length: total}, (_, i) => cobrancas[i]);
  return (
    <View style={styles.bolinhas}>
      {itens.map((c, i) => (
        <View
          key={i}
          style={[
            styles.bola,
            !c
              ? styles.pendente
              : c.resultado === 'GOL'
              ? styles.gol
              : styles.defesa,
            i >= REGULARES ? styles.sudden : null,
          ]}
        />
      ))}
    </View>
  );
}

function Linha({
  nome,
  cobrancas,
  cobrador,
  gols,
}: {
  nome: string;
  cobrancas: CobrancaPenalti[];
  cobrador: Cobrador;
  gols: number;
}): React.JSX.Element {
  return (
    <View style={styles.linha}>
      <Text style={styles.nome} numberOfLines={1}>
        {nome}
      </Text>
      <Bolinhas cobrancas={cobrancas.filter(c => c.cobrador === cobrador)} />
      <Text style={styles.gols}>{gols}</Text>
    </View>
  );
}

function PlacarPenaltis({
  cobrancas,
  marcadosUsuario,
  marcadosCpu,
  nomeUsuario,
  nomeAdversario,
}: Props): React.JSX.Element {
  return (
    <View style={styles.card}>
      <Linha
        nome={nomeUsuario}
        cobrancas={cobrancas}
        cobrador="USUARIO"
        gols={marcadosUsuario}
      />
      <View style={styles.divisor} />
      <Linha
        nome={nomeAdversario}
        cobrancas={cobrancas}
        cobrador="CPU"
        gols={marcadosCpu}
      />
    </View>
  );
}

export default PlacarPenaltis;

const styles = StyleSheet.create({
  card: {
    backgroundColor: cores.superficieElevada,
    borderColor: cores.bordaTransl,
    borderRadius: raio.lg,
    borderWidth: 1,
    gap: espaco.sm,
    padding: espaco.md,
  },
  linha: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.sm,
  },
  nome: {
    color: cores.texto,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  bolinhas: {
    flexDirection: 'row',
    gap: 4,
  },
  bola: {
    borderRadius: 6,
    height: 12,
    width: 12,
  },
  pendente: {
    backgroundColor: 'transparent',
    borderColor: cores.borda,
    borderWidth: 1.5,
  },
  gol: {
    backgroundColor: cores.primaria,
  },
  defesa: {
    backgroundColor: cores.perigo,
  },
  sudden: {
    borderColor: cores.secundaria,
    borderWidth: 1.5,
  },
  divisor: {
    backgroundColor: cores.bordaTransl,
    height: 1,
  },
  gols: {
    ...tabular,
    color: cores.texto,
    fontSize: 20,
    fontWeight: '900',
    minWidth: 26,
    textAlign: 'right',
  },
});
