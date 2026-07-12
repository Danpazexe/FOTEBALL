import React from 'react';
import {StyleSheet, View} from 'react-native';

import {Text, raios, espacamento, useTheme} from '../../design-system';

type StatBarProps = {
  /** Rótulo à esquerda (ex.: "FIN", "ATA"). Omita para barra sem label. */
  label?: string;
  valor: number;
  /** Escala máxima (default 99, escala FIFA de atributo). */
  max?: number;
  /** Cor do preenchimento (override cru; padrão marca). */
  cor?: string;
  /** Marca de evolução recente (▲ treino). */
  melhoria?: boolean;
  /** Mostra o número à direita (default true). */
  mostrarValor?: boolean;
};

/**
 * Barra de estatística: trilho + preenchimento em acento, número à direita.
 * Força do time (ATA/MEI/DEF) e atributos do jogador. Migrada ao DS v2.
 */
function StatBar({
  label,
  valor,
  max = 99,
  cor,
  melhoria = false,
  mostrarValor = true,
}: StatBarProps): React.JSX.Element {
  const {cores} = useTheme();
  const pct = Math.max(0, Math.min(100, (valor / max) * 100));
  return (
    <View style={styles.linha}>
      {label ? (
        <Text variant="labelM" color="textSecondary" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <View style={[styles.track, {backgroundColor: cores.surfaceSubtle}]}>
        <View
          style={[
            styles.fill,
            {width: `${pct}%`, backgroundColor: cor ?? cores.brand},
          ]}
        />
      </View>
      {mostrarValor ? (
        <Text variant="labelL" tabular style={styles.valor}>
          {valor}
          {melhoria ? (
            <Text variant="caption" color="brand">
              {' ▲'}
            </Text>
          ) : null}
        </Text>
      ) : null}
    </View>
  );
}

export default StatBar;

const styles = StyleSheet.create({
  linha: {alignItems: 'center', flexDirection: 'row', gap: espacamento[2]},
  label: {width: 34},
  track: {
    flex: 1,
    height: 7,
    borderRadius: raios.full,
    overflow: 'hidden',
  },
  fill: {height: 7, borderRadius: raios.full},
  valor: {minWidth: 30, textAlign: 'right'},
});
