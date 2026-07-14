import React from 'react';
import {StyleSheet, View} from 'react-native';

import Escudo from '../Escudo';
import {Text, espacamento, raios, useTheme, type CorTexto} from '../../design-system';
import {nomeClube, siglaClube} from '../../utils/formatters';
import type {Clube, TabelaClassificacao} from '../../types';

/**
 * Tabela de classificação. Cabeçalho (#, Clube, P, J, SG) + uma linha por clube.
 * Destaca a linha do clube do usuário e marca as zonas de acesso (topo, VERDE =
 * positivo) e de rebaixamento (VERMELHO) com filete à esquerda + número da
 * posição tingido pela zona. Migrada ao Design System v2.
 */
type Zona = 'acesso' | 'queda' | null;

function zonaDaPosicao(
  posicao: number,
  zonaAcesso: number,
  zonaQueda: number | null,
): Zona {
  if (posicao <= zonaAcesso) {
    return 'acesso';
  }
  if (zonaQueda !== null && posicao >= zonaQueda) {
    return 'queda';
  }
  return null;
}

export function ClassificationTable({
  tabela,
  clubes,
  clubeDestaqueId,
  zonaAcesso = 4,
  zonaQueda = 17,
}: {
  tabela: TabelaClassificacao[];
  clubes: Clube[];
  clubeDestaqueId?: string | null;
  /** Posições do topo destacadas (Libertadores/acesso). Padrão 1º–4º. */
  zonaAcesso?: number;
  /** Posição a partir da qual é rebaixamento; `null` desliga. */
  zonaQueda?: number | null;
}) {
  const {cores} = useTheme();
  return (
    <View
      style={[
        styles.container,
        {backgroundColor: cores.surface, borderColor: cores.border},
      ]}>
      <View
        style={[
          styles.row,
          {backgroundColor: cores.surfaceSubtle, borderBottomColor: cores.border},
        ]}>
        <Text variant="labelM" color="textSecondary" style={styles.colPos}>
          #
        </Text>
        <Text variant="labelM" color="textSecondary" style={styles.colClube}>
          Clube
        </Text>
        <Text variant="labelM" color="textSecondary" style={styles.colStat}>
          P
        </Text>
        <Text variant="labelM" color="textSecondary" style={styles.colStat}>
          J
        </Text>
        <Text variant="labelM" color="textSecondary" style={styles.colStat}>
          SG
        </Text>
      </View>

      {tabela.map((linha, index) => {
        const posicao = index + 1;
        const destaque = !!clubeDestaqueId && linha.clubeId === clubeDestaqueId;
        const cor: CorTexto = destaque ? 'accent' : 'textPrimary';
        const zona = zonaDaPosicao(posicao, zonaAcesso, zonaQueda);
        const fileteCor =
          zona === 'acesso'
            ? cores.success
            : zona === 'queda'
            ? cores.danger
            : 'transparent';
        const corPos: CorTexto = destaque
          ? 'accent'
          : zona === 'acesso'
          ? 'success'
          : zona === 'queda'
          ? 'danger'
          : 'textSecondary';
        return (
          <View
            key={linha.clubeId}
            style={[
              styles.row,
              {
                borderBottomColor: cores.border,
                borderLeftColor: fileteCor,
              },
              destaque ? {backgroundColor: cores.accentSoft} : null,
            ]}>
            <Text
              variant="labelL"
              weight="800"
              color={corPos}
              tabular
              style={styles.colPos}>
              {posicao}
            </Text>
            <View style={styles.colClube}>
              <Escudo
                clubeId={linha.clubeId}
                sigla={siglaClube(clubes, linha.clubeId)}
                tamanho={22}
              />
              <Text variant="bodyM" color={cor} numberOfLines={1} style={styles.flexText}>
                {nomeClube(clubes, linha.clubeId)}
              </Text>
            </View>
            <Text variant="labelL" color={cor} tabular style={styles.colStat}>
              {linha.pontos}
            </Text>
            <Text variant="bodyM" color={cor} tabular style={styles.colStat}>
              {linha.jogos}
            </Text>
            <Text variant="bodyM" color={cor} tabular style={styles.colStat}>
              {linha.saldoGols > 0 ? '+' : ''}
              {linha.saldoGols}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {borderRadius: raios.md, borderWidth: 1, overflow: 'hidden'},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    paddingHorizontal: espacamento[3],
    paddingVertical: espacamento[2],
    borderBottomWidth: 1,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  colPos: {width: 28},
  colClube: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[2],
    paddingRight: espacamento[2],
  },
  colStat: {width: 36, textAlign: 'right'},
  flexText: {flex: 1},
});
