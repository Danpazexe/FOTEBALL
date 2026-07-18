/**
 * GraficoEvolucao — gráfico de linha da evolução média do elenco por categoria
 * (Físico / Técnico / Mental), ao longo das temporadas. Consome a série REAL
 * capturada no store (`historicoDesenvolvimento`): um ponto no início da carreira
 * e um por virada. Auto-escala ao intervalo dos dados (com folga) para que
 * variações pequenas fiquem visíveis. Vetor via react-native-svg; cor sempre por
 * token e sempre acompanhada de legenda com o número (cor nunca é o único sinal).
 */
import React from 'react';
import {StyleSheet, View} from 'react-native';
import Svg, {Circle, Line, Polyline} from 'react-native-svg';

import {Text, espacamento, useTheme} from '../../design-system';
import type {InstantaneoDesenvolvimento} from '../../types';

const LARGURA = 300;
const ALTURA = 150;
const PAD = {top: 12, right: 12, bottom: 20, left: 28};

type Serie = {chave: 'fisico' | 'tecnico' | 'mental'; rotulo: string; cor: string};

export function GraficoEvolucao({
  dados,
}: {
  dados: InstantaneoDesenvolvimento[];
}): React.JSX.Element {
  const {cores} = useTheme();

  const series: Serie[] = [
    {chave: 'fisico', rotulo: 'Físico', cor: cores.success},
    {chave: 'tecnico', rotulo: 'Técnica', cor: cores.brand},
    {chave: 'mental', rotulo: 'Mental', cor: cores.warning},
  ];

  // Escala Y: intervalo dos valores (todas as categorias) com folga de 2 pontos.
  const valores = dados.flatMap(d => [d.fisico, d.tecnico, d.mental]);
  const minY = Math.max(0, Math.min(...valores) - 2);
  const maxY = Math.min(100, Math.max(...valores) + 2);
  const faixa = Math.max(1, maxY - minY);

  const n = dados.length;
  const x = (i: number): number =>
    n === 1
      ? LARGURA / 2
      : PAD.left + (i * (LARGURA - PAD.left - PAD.right)) / (n - 1);
  const y = (v: number): number =>
    PAD.top + (1 - (v - minY) / faixa) * (ALTURA - PAD.top - PAD.bottom);

  const pontos = (chave: Serie['chave']): string =>
    dados.map((d, i) => `${x(i)},${y(d[chave])}`).join(' ');

  return (
    <View style={estilos.wrap}>
      <Svg
        width="100%"
        height={ALTURA}
        viewBox={`0 0 ${LARGURA} ${ALTURA}`}
        preserveAspectRatio="none">
        {/* Linhas-guia horizontais (min, meio, max) */}
        {[minY, (minY + maxY) / 2, maxY].map(v => (
          <Line
            key={`g-${v}`}
            x1={PAD.left}
            y1={y(v)}
            x2={LARGURA - PAD.right}
            y2={y(v)}
            stroke={cores.border}
            strokeWidth={1}
          />
        ))}
        {series.map(s => (
          <React.Fragment key={s.chave}>
            <Polyline
              points={pontos(s.chave)}
              fill="none"
              stroke={s.cor}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {dados.map((d, i) => (
              <Circle
                key={`${s.chave}-${i}`}
                cx={x(i)}
                cy={y(d[s.chave])}
                r={2.5}
                fill={s.cor}
              />
            ))}
          </React.Fragment>
        ))}
      </Svg>

      {/* Eixo X: primeira e última temporada */}
      <View style={estilos.eixoX}>
        <Text variant="caption" color="textMuted">
          {dados[0]?.temporada}
        </Text>
        <Text variant="caption" color="textMuted">
          {dados[dados.length - 1]?.temporada}
        </Text>
      </View>

      {/* Legenda com o valor atual de cada categoria */}
      <View style={estilos.legenda}>
        {series.map(s => (
          <View key={s.chave} style={estilos.legendaItem}>
            <View style={[estilos.marca, {backgroundColor: s.cor}]} />
            <Text variant="caption" color="textSecondary">
              {s.rotulo}
            </Text>
            <Text variant="caption" tabular>
              {dados[dados.length - 1]?.[s.chave]}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default GraficoEvolucao;

const estilos = StyleSheet.create({
  wrap: {gap: espacamento[2]},
  eixoX: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: espacamento[1],
  },
  legenda: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: espacamento[2],
  },
  legendaItem: {flexDirection: 'row', alignItems: 'center', gap: espacamento[1]},
  marca: {width: 10, height: 3, borderRadius: 2},
});
