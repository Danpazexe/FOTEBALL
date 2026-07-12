import React from 'react';
import {StyleSheet, View} from 'react-native';

import {Text, espacamento, raios, useTheme} from '../../design-system';

type ResultadoForma = 'V' | 'E' | 'D';

type FormaRecenteProps = {
  resultados: ResultadoForma[];
  titulo?: string;
  /** Só as pílulas, menores e sem rótulo — para linhas de status apertadas. */
  compacto?: boolean;
};

/** Pílulas dos últimos resultados (V/E/D), do mais antigo ao mais recente. */
function FormaRecente({
  resultados,
  titulo = 'Forma recente',
  compacto = false,
}: FormaRecenteProps): React.JSX.Element | null {
  const {esporte} = useTheme();
  if (resultados.length === 0) {
    return null;
  }
  const fundo = (r: ResultadoForma): string =>
    r === 'V' ? esporte.form.win : r === 'D' ? esporte.form.loss : esporte.form.draw;

  return (
    <View style={styles.wrap}>
      {compacto ? null : (
        <Text variant="labelM" color="textSecondary">
          {titulo}
        </Text>
      )}
      <View style={styles.row}>
        {resultados.map((resultado, index) => (
          <View
            key={`${resultado}_${index}`}
            style={[
              compacto ? styles.pillCompacta : styles.pill,
              {backgroundColor: fundo(resultado)},
            ]}>
            <Text variant={compacto ? 'labelM' : 'labelL'} color="onBrand">
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
  wrap: {alignItems: 'center', flexDirection: 'row', gap: espacamento[3]},
  row: {flexDirection: 'row', gap: espacamento[1]},
  pill: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 26,
    width: 26,
    borderRadius: raios.sm,
  },
  pillCompacta: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 20,
    width: 20,
    borderRadius: raios.sm,
  },
});
