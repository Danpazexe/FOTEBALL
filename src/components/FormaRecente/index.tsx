import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {cores, espaco, raio} from '../../theme';

type ResultadoForma = 'V' | 'E' | 'D';

type FormaRecenteProps = {
  resultados: ResultadoForma[];
  titulo?: string;
};

function corResultado(resultado: ResultadoForma): string {
  if (resultado === 'V') {
    return cores.primaria;
  }
  if (resultado === 'D') {
    return cores.perigo;
  }
  return cores.textoSecundario;
}

/** Pílulas dos últimos resultados (V/E/D), do mais antigo ao mais recente. */
function FormaRecente({
  resultados,
  titulo = 'Forma recente',
}: FormaRecenteProps): React.JSX.Element | null {
  if (resultados.length === 0) {
    return null;
  }
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{titulo}</Text>
      <View style={styles.row}>
        {resultados.map((resultado, index) => (
          <View
            key={`${resultado}_${index}`}
            style={[styles.pill, {backgroundColor: corResultado(resultado)}]}>
            <Text
              style={[
                styles.pillTexto,
                resultado === 'E' ? styles.pillTextoEmpate : null,
              ]}>
              {resultado}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default FormaRecente;

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.md,
  },
  label: {
    color: cores.textoSecundario,
    fontSize: 12,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    gap: espaco.xs,
  },
  pill: {
    alignItems: 'center',
    borderRadius: raio.sm,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  pillTexto: {
    color: cores.contrastePrimaria,
    fontSize: 13,
    fontWeight: '900',
  },
  pillTextoEmpate: {
    color: cores.texto,
  },
});
