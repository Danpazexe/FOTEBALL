/**
 * OverallRing — anel de progresso do overall (0–100) com o número no centro e um
 * rótulo curto abaixo (ex "GER"). O arco é colorido por FAIXA (alto=verde,
 * médio=âmbar, baixo=vermelho) — a cor nunca é o único sinal, pois o número é
 * mostrado. Cor sempre por token. Vetor via react-native-svg.
 */
import React from 'react';
import {StyleSheet, View} from 'react-native';
import Svg, {Circle} from 'react-native-svg';

import {Text} from '../../primitives/Text';
import {useTheme} from '../../themes/useTheme';

type Props = {
  valor: number;
  tamanho?: number;
  stroke?: number;
  rotulo?: string;
};

export function OverallRing({
  valor,
  tamanho = 48,
  stroke = 4,
  rotulo = 'GER',
}: Props): React.JSX.Element {
  const {cores} = useTheme();
  const v = Math.max(0, Math.min(100, valor));
  const r = (tamanho - stroke) / 2;
  const c = 2 * Math.PI * r;
  const centro = tamanho / 2;
  const corArco =
    v >= 75 ? cores.success : v >= 60 ? cores.warning : cores.danger;

  return (
    <View style={styles.wrap}>
      <View style={{width: tamanho, height: tamanho}}>
        <Svg width={tamanho} height={tamanho}>
          <Circle
            cx={centro}
            cy={centro}
            r={r}
            stroke={cores.border}
            strokeWidth={stroke}
            fill="none"
          />
          <Circle
            cx={centro}
            cy={centro}
            r={r}
            stroke={corArco}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - v / 100)}
            transform={`rotate(-90 ${centro} ${centro})`}
          />
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.centro]}>
          <Text variant="titleM" tabular>
            {Math.round(v)}
          </Text>
        </View>
      </View>
      {rotulo ? (
        <Text variant="caption" color="textSecondary" weight="700">
          {rotulo}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {alignItems: 'center', gap: 1},
  centro: {alignItems: 'center', justifyContent: 'center'},
});
