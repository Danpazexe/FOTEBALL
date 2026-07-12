/**
 * TeamCrest — escudo do clube com rótulo acessível (nome do clube). Envolve o
 * `Escudo` existente (PNG real + fallback por sigla/cor do time). Ponto único de
 * escudo no design system.
 */
import React from 'react';
import {View} from 'react-native';

import Escudo from '../../../components/Escudo';

type Props = {
  clubeId: string;
  sigla: string;
  /** Nome do clube — vira rótulo acessível; ausente = decorativo. */
  nome?: string;
  size?: number;
};

export function TeamCrest({clubeId, sigla, nome, size = 32}: Props): React.JSX.Element {
  return (
    <View
      accessible={!!nome}
      accessibilityLabel={nome}
      importantForAccessibility={nome ? 'yes' : 'no-hide-descendants'}>
      <Escudo clubeId={clubeId} sigla={sigla} tamanho={size} />
    </View>
  );
}
