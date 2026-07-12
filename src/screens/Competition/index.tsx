/**
 * Tela de competições (aba "Competições"): tabela de classificação do Brasileirão
 * da divisão do clube, com legenda de zonas, e artilheiros. Migrada ao DS v2.
 */

import React from 'react';
import {StyleSheet, View} from 'react-native';

import {ClassificationTable} from '../../components/ClassificationTable';
import {Screen, Text, espacamento, raios, useTheme} from '../../design-system';
import {calcularArtilheiros} from '../../engine/season/artilheiros';
import {selecionarClubeUsuario, useGameStore} from '../../store/useGameStore';
import {siglaClube} from '../../utils/formatters';

const DIVISAO_PADRAO = 'Série A';
/** Divisão mais baixa da pirâmide (não tem rebaixamento). */
const ULTIMA_DIVISAO = 'Série D';

function Competition(): React.JSX.Element {
  const {cores} = useTheme();
  const tabela = useGameStore(state => state.tabela);
  const clubes = useGameStore(state => state.clubes);
  const jogadores = useGameStore(state => state.jogadores);
  const clubeUsuarioId = useGameStore(state => state.clubeUsuarioId);
  const clubeUsuario = useGameStore(selecionarClubeUsuario);
  const temporadaAtual = useGameStore(state => state.temporadaAtual);

  const artilheiros = React.useMemo(
    () => calcularArtilheiros(jogadores, 10),
    [jogadores],
  );

  const divisao = clubeUsuario?.divisao ?? DIVISAO_PADRAO;
  const ehSerieA = divisao === DIVISAO_PADRAO;
  const ehUltima = divisao === ULTIMA_DIVISAO;
  const zonaQueda = ehUltima ? null : Math.max(5, tabela.length - 3);
  const rotuloTopo = ehSerieA ? 'Libertadores (1º–4º)' : 'Acesso (1º–4º)';

  return (
    <Screen scroll>
      <View style={styles.section}>
        <Text variant="labelM" color="textSecondary" style={styles.caps}>
          Brasileirão {divisao} {temporadaAtual}
        </Text>
        <ClassificationTable
          tabela={tabela}
          clubes={clubes}
          clubeDestaqueId={clubeUsuarioId}
          zonaQueda={zonaQueda}
        />
        <View style={styles.legenda}>
          <View style={styles.legendaItem}>
            <View style={[styles.legendaMarca, {backgroundColor: cores.brand}]} />
            <Text variant="labelM" color="textSecondary">
              {rotuloTopo}
            </Text>
          </View>
          {zonaQueda !== null ? (
            <View style={styles.legendaItem}>
              <View
                style={[styles.legendaMarca, {backgroundColor: cores.danger}]}
              />
              <Text variant="labelM" color="textSecondary">
                Rebaixamento ({zonaQueda}º–{tabela.length}º)
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.section}>
        <Text variant="labelM" color="textSecondary" style={styles.caps}>
          Artilheiros
        </Text>
        {artilheiros.length === 0 ? (
          <Text variant="bodyM" color="textSecondary">
            Nenhum gol marcado na temporada ainda.
          </Text>
        ) : (
          artilheiros.map((linha, indice) => {
            const ehUsuario = linha.clubeId === clubeUsuarioId;
            return (
              <View
                key={linha.jogadorId}
                style={[
                  styles.artLinha,
                  ehUsuario ? {backgroundColor: cores.brandSoft} : null,
                ]}>
                <Text
                  variant="labelL"
                  color="textSecondary"
                  tabular
                  style={styles.artPos}>
                  {indice + 1}º
                </Text>
                <View style={styles.flex}>
                  <Text variant="titleM" numberOfLines={1}>
                    {linha.nome}
                  </Text>
                  <Text variant="caption" color="textSecondary">
                    {linha.clubeId ? siglaClube(clubes, linha.clubeId) : '—'}
                    {linha.assistencias > 0
                      ? ` · ${linha.assistencias} assist.`
                      : ''}
                  </Text>
                </View>
                <Text variant="titleM" color="brand" tabular>
                  {linha.gols}
                </Text>
              </View>
            );
          })
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {gap: espacamento[2]},
  caps: {textTransform: 'uppercase', letterSpacing: 1},
  legenda: {flexDirection: 'row', flexWrap: 'wrap', gap: espacamento[4]},
  legendaItem: {flexDirection: 'row', alignItems: 'center', gap: espacamento[2]},
  legendaMarca: {width: 4, height: 12, borderRadius: 2},
  artLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[3],
    paddingHorizontal: espacamento[2],
    paddingVertical: espacamento[2],
    borderRadius: raios.sm,
  },
  artPos: {width: 28},
  flex: {flex: 1},
});

export default Competition;
