import React from 'react';
import {StyleSheet, View} from 'react-native';
import Svg, {Circle, G, Text as SvgText} from 'react-native-svg';

import {cores} from '../../theme';

export interface FatiaDonut {
  valor: number;
  cor: string;
  label: string;
}

type DonutChartProps = {
  fatias: FatiaDonut[];
  tamanho?: number;
  espessura?: number;
  labelCentro?: string;
  valorCentro?: string;
};

/**
 * Donut em SVG puro (técnica strokeDasharray). Cada fatia é proporcional ao
 * total; lida com fatia única (anel cheio) sem casos especiais.
 */
function DonutChart({
  fatias,
  tamanho = 180,
  espessura = 30,
  labelCentro,
  valorCentro,
}: DonutChartProps): React.JSX.Element {
  const raio = (tamanho - espessura) / 2;
  const circunferencia = 2 * Math.PI * raio;
  const centro = tamanho / 2;
  const total = fatias.reduce((soma, fatia) => soma + Math.max(0, fatia.valor), 0);

  let acumulado = 0;

  return (
    <View style={styles.wrap}>
      <Svg width={tamanho} height={tamanho}>
        {/* trilho de fundo */}
        <Circle
          cx={centro}
          cy={centro}
          r={raio}
          fill="none"
          stroke={cores.superficieAlt}
          strokeWidth={espessura}
        />
        <G transform={`rotate(-90 ${centro} ${centro})`}>
          {total > 0
            ? fatias.map((fatia, index) => {
                const fracao = Math.max(0, fatia.valor) / total;
                const comprimento = fracao * circunferencia;
                const elemento = (
                  <Circle
                    key={`${fatia.label}_${index}`}
                    cx={centro}
                    cy={centro}
                    r={raio}
                    fill="none"
                    stroke={fatia.cor}
                    strokeWidth={espessura}
                    strokeDasharray={`${comprimento} ${circunferencia - comprimento}`}
                    strokeDashoffset={-acumulado}
                  />
                );
                acumulado += comprimento;
                return elemento;
              })
            : null}
        </G>
        {valorCentro ? (
          <SvgText
            x={centro}
            y={centro - 2}
            fill={cores.texto}
            fontSize={tamanho * 0.13}
            fontWeight="bold"
            textAnchor="middle">
            {valorCentro}
          </SvgText>
        ) : null}
        {labelCentro ? (
          <SvgText
            x={centro}
            y={centro + tamanho * 0.12}
            fill={cores.textoSecundario}
            fontSize={tamanho * 0.075}
            textAnchor="middle">
            {labelCentro}
          </SvgText>
        ) : null}
      </Svg>
    </View>
  );
}

export default DonutChart;

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
});
