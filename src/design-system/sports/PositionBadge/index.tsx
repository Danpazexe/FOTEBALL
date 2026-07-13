/**
 * PositionBadge — selo de posição colorido por ÁREA de função (goleiro / defesa /
 * meio / ataque). Cor SEMPRE de token (`esporte.posicao`). O rótulo (GOL/ZAG/…)
 * também é falado, então a cor nunca é o único sinal.
 */
import React from 'react';
import {StyleSheet, View} from 'react-native';

import {Text} from '../../primitives/Text';
import {raios} from '../../tokens';
import {useTheme} from '../../themes/useTheme';
import type {Position} from '../../../types';

type Area = 'goleiro' | 'defesa' | 'meio' | 'ataque';

/** Posição → área de função (as 4 famílias de cor). */
const AREA: Record<Position, Area> = {
  GOL: 'goleiro',
  ZAG: 'defesa',
  LD: 'defesa',
  LE: 'defesa',
  VOL: 'meio',
  MC: 'meio',
  MEI: 'meio',
  PD: 'ataque',
  PE: 'ataque',
  SA: 'ataque',
  CA: 'ataque',
};

type Props = {
  posicao: Position;
  tamanho?: 'sm' | 'md';
};

export function PositionBadge({posicao, tamanho = 'md'}: Props): React.JSX.Element {
  const {esporte} = useTheme();
  const tom = esporte.posicao[AREA[posicao]];
  return (
    <View
      style={[
        estilos.badge,
        tamanho === 'sm' ? estilos.sm : estilos.md,
        {backgroundColor: tom.fundo},
      ]}>
      <Text variant="caption" weight="800" style={{color: tom.cor}}>
        {posicao}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  badge: {
    borderRadius: raios.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sm: {minWidth: 30, height: 18, paddingHorizontal: 4},
  md: {minWidth: 34, height: 22, paddingHorizontal: 5},
});
