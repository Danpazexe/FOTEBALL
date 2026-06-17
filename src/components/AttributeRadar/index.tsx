import React from 'react';
import Svg, {Circle, Line, Polygon, Text as SvgText} from 'react-native-svg';

import {cores} from '../../theme';
import type {Player, PlayerAttributes} from '../../types';

interface EixoRadar {
  chave: keyof PlayerAttributes;
  label: string;
}

const RADAR_OUTFIELD: EixoRadar[] = [
  {chave: 'finalizacao', label: 'FIN'},
  {chave: 'passe', label: 'PAS'},
  {chave: 'velocidade', label: 'VEL'},
  {chave: 'drible', label: 'DRI'},
  {chave: 'marcacao', label: 'MAR'},
  {chave: 'forca', label: 'FOR'},
];

const RADAR_GOLEIRO: EixoRadar[] = [
  {chave: 'reflexos', label: 'REF'},
  {chave: 'posicionamento', label: 'POS'},
  {chave: 'forca', label: 'FOR'},
  {chave: 'velocidade', label: 'VEL'},
  {chave: 'passe', label: 'PAS'},
  {chave: 'cabeceio', label: 'CAB'},
];

function AttributeRadar({
  jogador,
  size = 220,
}: {
  jogador: Player;
  size?: number;
}) {
  const eixos =
    jogador.posicaoPrincipal === 'GOL' ? RADAR_GOLEIRO : RADAR_OUTFIELD;
  const center = size / 2;
  const raioRadar = (size * 80) / 220;

  const ponto = (indice: number, escala: number) => {
    const angulo = (Math.PI * 2 * indice) / eixos.length - Math.PI / 2;
    return {
      x: center + Math.cos(angulo) * raioRadar * escala,
      y: center + Math.sin(angulo) * raioRadar * escala,
    };
  };

  const gridPontos = eixos
    .map((_, i) => {
      const p = ponto(i, 1);
      return `${p.x},${p.y}`;
    })
    .join(' ');

  const dataPontos = eixos
    .map((eixo, i) => {
      const valor = jogador.atributos[eixo.chave];
      const p = ponto(i, Math.max(0.08, valor / 99));
      return `${p.x},${p.y}`;
    })
    .join(' ');

  return (
    <Svg width={size} height={size}>
      {[0.25, 0.5, 0.75, 1].map(escala => (
        <Polygon
          key={escala}
          points={eixos
            .map((_, i) => {
              const p = ponto(i, escala);
              return `${p.x},${p.y}`;
            })
            .join(' ')}
          fill="none"
          stroke={cores.borda}
          strokeWidth={1}
        />
      ))}
      {eixos.map((_, i) => {
        const p = ponto(i, 1);
        return (
          <Line
            key={`axis_${i}`}
            x1={center}
            y1={center}
            x2={p.x}
            y2={p.y}
            stroke={cores.borda}
            strokeWidth={1}
          />
        );
      })}
      <Polygon
        points={gridPontos}
        fill="none"
        stroke={cores.borda}
        strokeWidth={1}
      />
      <Polygon
        points={dataPontos}
        fill="rgba(0,229,160,0.35)"
        stroke={cores.primaria}
        strokeWidth={2}
      />
      {eixos.map((eixo, i) => {
        const p = ponto(i, 1.16);
        return (
          <SvgText
            key={`lbl_${i}`}
            x={p.x}
            y={p.y}
            fill={cores.textoSecundario}
            fontSize={11}
            fontWeight="bold"
            textAnchor="middle">
            {`${eixo.label} ${jogador.atributos[eixo.chave]}`}
          </SvgText>
        );
      })}
      <Circle cx={center} cy={center} r={2} fill={cores.textoSecundario} />
    </Svg>
  );
}

export default AttributeRadar;
