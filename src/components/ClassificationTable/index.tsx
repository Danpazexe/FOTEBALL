import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import Escudo from '../Escudo';
import {cores, espaco, raio, suaves, tabular} from '../../theme';
import {nomeClube, siglaClube} from '../../utils/formatters';
import type {Clube, TabelaClassificacao} from '../../types';

/**
 * Tabela de classificação do campeonato. Cabeçalho fixo (#, Clube, P, J, SG) e
 * uma linha por clube. Destaca a linha do clube do usuário e marca, com borda
 * esquerda colorida, as zonas de acesso/Libertadores (topo) e de rebaixamento.
 * As faixas das zonas são configuráveis por divisão (`zonaAcesso`/`zonaQueda`).
 */
function corZona(
  posicao: number,
  zonaAcesso: number,
  zonaQueda: number | null,
): string {
  if (posicao <= zonaAcesso) {
    return cores.primaria;
  }
  if (zonaQueda !== null && posicao >= zonaQueda) {
    return cores.perigo;
  }
  return 'transparent';
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
  /** Posição a partir da qual é rebaixamento; `null` desliga (última divisão). */
  zonaQueda?: number | null;
}) {
  return (
    <View style={styles.container}>
      <View style={[styles.row, styles.headerRow]}>
        <Text style={[styles.headerText, styles.colPos]}>#</Text>
        <Text style={[styles.headerText, styles.colClube]}>Clube</Text>
        <Text style={[styles.headerText, styles.colStat]}>P</Text>
        <Text style={[styles.headerText, styles.colStat]}>J</Text>
        <Text style={[styles.headerText, styles.colStat]}>SG</Text>
      </View>

      {tabela.map((linha, index) => {
        const posicao = index + 1;
        const destaque = !!clubeDestaqueId && linha.clubeId === clubeDestaqueId;
        return (
          <View
            key={linha.clubeId}
            style={[
              styles.row,
              {borderLeftColor: corZona(posicao, zonaAcesso, zonaQueda)},
              destaque ? styles.rowDestaque : null,
            ]}>
            <Text
              style={[
                styles.position,
                styles.colPos,
                destaque ? styles.textoDestaque : null,
              ]}>
              {posicao}
            </Text>
            <View style={styles.colClube}>
              <Escudo
                clubeId={linha.clubeId}
                sigla={siglaClube(clubes, linha.clubeId)}
                tamanho={22}
              />
              <Text
                style={[styles.club, destaque ? styles.textoDestaque : null]}
                numberOfLines={1}>
                {nomeClube(clubes, linha.clubeId)}
              </Text>
            </View>
            <Text
              style={[
                styles.stat,
                styles.statPontos,
                styles.colStat,
                destaque ? styles.textoDestaque : null,
              ]}>
              {linha.pontos}
            </Text>
            <Text
              style={[
                styles.stat,
                styles.colStat,
                destaque ? styles.textoDestaque : null,
              ]}>
              {linha.jogos}
            </Text>
            <Text
              style={[
                styles.stat,
                styles.colStat,
                destaque ? styles.textoDestaque : null,
              ]}>
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
  container: {
    backgroundColor: cores.superficie,
    borderColor: cores.borda,
    borderRadius: raio.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    alignItems: 'center',
    borderBottomColor: cores.borda,
    borderBottomWidth: 1,
    borderLeftColor: 'transparent',
    borderLeftWidth: 3,
    flexDirection: 'row',
    minHeight: 40,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
  },
  headerRow: {
    backgroundColor: cores.superficieAlt,
  },
  // Time do usuário: destacado em âmbar (o acento raro marca "o seu time").
  rowDestaque: {
    backgroundColor: suaves.laranja,
  },
  headerText: {
    color: cores.textoSecundario,
    fontSize: 12,
    fontWeight: '800',
  },
  position: {
    color: cores.textoSecundario,
    fontSize: 13,
    fontWeight: '700',
    ...tabular,
  },
  club: {
    color: cores.texto,
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  stat: {
    color: cores.texto,
    fontSize: 12,
    ...tabular,
  },
  // PTS é a coluna que decide — peso maior para ler no relance.
  statPontos: {
    fontWeight: '800',
  },
  textoDestaque: {
    color: cores.secundaria,
  },
  colPos: {
    width: 28,
  },
  colClube: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: espaco.sm,
    paddingRight: espaco.sm,
  },
  colStat: {
    textAlign: 'right',
    width: 36,
  },
});
