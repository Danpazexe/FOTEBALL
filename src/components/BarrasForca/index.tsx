import React from 'react';
import {StyleSheet, View} from 'react-native';
import Svg, {Rect, Text as SvgText} from 'react-native-svg';

import type {ForcaTime} from '../../engine/simulation/teamStrength';
import {cores} from '../../theme';

type BarrasForcaProps = {
  casa: ForcaTime;
  fora: ForcaTime;
  corCasa: string;
  corFora: string;
  largura?: number;
};

const LINHAS: Array<{rotulo: string; chave: keyof ForcaTime}> = [
  {rotulo: 'ATA', chave: 'ataque'},
  {rotulo: 'MEI', chave: 'meio'},
  {rotulo: 'DEF', chave: 'defesa'},
];

/**
 * Barras comparativas casa x fora (ataque/meio/defesa). Cada linha é dividida
 * proporcionalmente: mandante cresce da esquerda, visitante da direita.
 */
function BarrasForca({
  casa,
  fora,
  corCasa,
  corFora,
  largura = 280,
}: BarrasForcaProps): React.JSX.Element {
  const alturaLinha = 22;
  const gap = 8;
  const altura = LINHAS.length * alturaLinha + (LINHAS.length - 1) * gap;
  const margem = 30; // espaço lateral para os números
  const barraLargura = largura - margem * 2;

  return (
    <View style={styles.wrap}>
      <Svg width={largura} height={altura}>
        {LINHAS.map((linha, index) => {
          const y = index * (alturaLinha + gap);
          const valorCasa = Math.round(casa[linha.chave]);
          const valorFora = Math.round(fora[linha.chave]);
          const total = Math.max(1, valorCasa + valorFora);
          const fracCasa = valorCasa / total;
          const larguraCasa = barraLargura * fracCasa;
          const meioY = y + alturaLinha / 2;
          return (
            <React.Fragment key={linha.chave}>
              {/* trilho */}
              <Rect
                x={margem}
                y={y}
                width={barraLargura}
                height={alturaLinha}
                rx={5}
                fill={cores.fundo}
              />
              {/* mandante (esquerda) */}
              <Rect
                x={margem}
                y={y}
                width={Math.max(2, larguraCasa)}
                height={alturaLinha}
                rx={5}
                fill={corCasa}
                opacity={0.92}
              />
              {/* visitante (direita) */}
              <Rect
                x={margem + larguraCasa}
                y={y}
                width={Math.max(2, barraLargura - larguraCasa)}
                height={alturaLinha}
                rx={5}
                fill={corFora}
                opacity={0.92}
              />
              {/* números nas pontas */}
              <SvgText
                x={margem - 6}
                y={meioY + 4}
                fill={cores.texto}
                fontSize={11}
                fontWeight="bold"
                textAnchor="end">
                {valorCasa}
              </SvgText>
              <SvgText
                x={margem + barraLargura + 6}
                y={meioY + 4}
                fill={cores.texto}
                fontSize={11}
                fontWeight="bold"
                textAnchor="start">
                {valorFora}
              </SvgText>
              {/* rótulo central */}
              <SvgText
                x={largura / 2}
                y={meioY + 4}
                fill={cores.texto}
                fontSize={11}
                fontWeight="bold"
                textAnchor="middle">
                {linha.rotulo}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

export default BarrasForca;

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
});
