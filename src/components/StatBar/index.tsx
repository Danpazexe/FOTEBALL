import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {cores, espaco, raio} from '../../theme';

type StatBarProps = {
  /** Rótulo à esquerda (ex.: "FIN", "ATA"). Omita para barra sem label. */
  label?: string;
  valor: number;
  /** Escala máxima (default 99, escala FIFA de atributo). */
  max?: number;
  /** Cor do preenchimento (default verde da marca). */
  cor?: string;
  /** Marca de evolução recente (▲ treino). */
  melhoria?: boolean;
  /** Mostra o número à direita (default true). */
  mostrarValor?: boolean;
};

/**
 * Barra de estatística premium (v0.0.2): trilho escuro + preenchimento em acento,
 * número à direita. Usada para força do time (ATA/MEI/DEF) e atributos do jogador.
 */
function StatBar({
  label,
  valor,
  max = 99,
  cor = cores.primaria,
  melhoria = false,
  mostrarValor = true,
}: StatBarProps): React.JSX.Element {
  const pct = Math.max(0, Math.min(100, (valor / max) * 100));
  return (
    <View style={styles.linha}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.track}>
        <View
          style={[styles.fill, {width: `${pct}%`, backgroundColor: cor}]}
        />
      </View>
      {mostrarValor ? (
        <Text style={styles.valor}>
          {valor}
          {melhoria ? <Text style={styles.melhoria}> ▲</Text> : null}
        </Text>
      ) : null}
    </View>
  );
}

export default StatBar;

const styles = StyleSheet.create({
  linha: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.sm,
  },
  label: {
    color: cores.textoSecundario,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    width: 34,
  },
  track: {
    backgroundColor: cores.fundoBase,
    borderRadius: raio.pill,
    flex: 1,
    height: 7,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: raio.pill,
    height: 7,
  },
  valor: {
    color: cores.texto,
    fontSize: 13,
    fontWeight: '800',
    minWidth: 30,
    textAlign: 'right',
  },
  melhoria: {
    color: cores.primaria,
    fontSize: 11,
  },
});
