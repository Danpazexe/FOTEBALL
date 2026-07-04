import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';

import {FACES} from '../../data/facesIndex';
import {corOverall, nivelCarta} from '../../theme';

/**
 * Face do jogador: mostra a FOTO REAL empacotada (quando existe no índice gerado
 * pelo script) ou um fallback determinístico de INICIAIS num círculo colorido
 * pelo tier do overall. O anel usa a cor do tier (corOverall), unificando o visual
 * com o resto da UI (badges de overall, cartas). 100% offline.
 */

/** Iniciais do jogador (primeira letra do primeiro e do último nome). */
export function iniciaisDoNome(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) {
    return '?';
  }
  const primeira = partes[0]![0] ?? '';
  const ultima = partes.length > 1 ? partes[partes.length - 1]![0] ?? '' : '';
  return (primeira + ultima).toUpperCase();
}

type Props = {
  jogadorId: string;
  nome: string;
  overall: number;
  /** Diâmetro em px (default 44). */
  tamanho?: number;
};

function FaceJogador({
  jogadorId,
  nome,
  overall,
  tamanho = 44,
}: Props): React.JSX.Element {
  const anel = corOverall(overall);
  const dimensao = {
    width: tamanho,
    height: tamanho,
    borderRadius: tamanho / 2,
    borderColor: anel,
  };

  const foto = FACES[jogadorId];
  if (foto !== undefined) {
    return (
      <Image
        source={foto}
        accessibilityLabel={nome}
        style={[styles.face, dimensao]}
      />
    );
  }

  const nivel = nivelCarta(overall);
  return (
    <View
      accessibilityLabel={nome}
      style={[styles.face, styles.fallback, dimensao, {backgroundColor: nivel.background}]}>
      <Text
        style={[styles.iniciais, {color: nivel.text, fontSize: Math.round(tamanho * 0.36)}]}>
        {iniciaisDoNome(nome)}
      </Text>
    </View>
  );
}

export default FaceJogador;

const styles = StyleSheet.create({
  face: {
    borderWidth: 2,
    overflow: 'hidden',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iniciais: {
    fontWeight: '900',
    letterSpacing: -0.5,
  },
});
