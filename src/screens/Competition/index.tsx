/**
 * Classificação (raiz da aba Partidas): tabela do Brasileirão da divisão do clube,
 * com legenda de zonas (acesso/Libertadores e rebaixamento) e artilheiros. DS v2.
 */

import React, {useMemo} from 'react';
import {StyleSheet, View} from 'react-native';

import {ClassificationTable} from '../../components/ClassificationTable';
import {
  AppHeader,
  Pressable,
  Screen,
  Text,
  espacamento,
  raios,
  useTheme,
} from '../../design-system';
import {calcularArtilheiros} from '../../engine/season/artilheiros';
import {selecionarClubeUsuario, useGameStore} from '../../store/useGameStore';
import {useAppNavigation} from '../../navigation/types';
import {siglaClube} from '../../utils/formatters';

const DIVISAO_PADRAO = 'Série A';
const ULTIMA_DIVISAO = 'Série D';

function Competition(): React.JSX.Element {
  const {cores} = useTheme();
  const nav = useAppNavigation();

  const tabela = useGameStore(state => state.tabela);
  const clubes = useGameStore(state => state.clubes);
  const jogadores = useGameStore(state => state.jogadores);
  const clubeUsuarioId = useGameStore(state => state.clubeUsuarioId);
  const clubeUsuario = useGameStore(selecionarClubeUsuario);
  const temporadaAtual = useGameStore(state => state.temporadaAtual);

  const artilheiros = useMemo(
    () => calcularArtilheiros(jogadores, 10),
    [jogadores],
  );

  const divisao = clubeUsuario?.divisao ?? DIVISAO_PADRAO;
  const ehSerieA = divisao === DIVISAO_PADRAO;
  const ehUltima = divisao === ULTIMA_DIVISAO;
  const zonaQueda = ehUltima ? null : Math.max(5, tabela.length - 3);
  const rotuloTopo = ehSerieA ? 'Libertadores (1º–4º)' : 'Acesso (1º–4º)';

  return (
    <Screen
      scroll
      header={
        <AppHeader title="Classificação" onBack={() => nav.goBack()} />
      }>
      <Text variant="labelM" color="textSecondary" align="center">
        Brasileirão {divisao} · {temporadaAtual}
      </Text>

      <ClassificationTable
        tabela={tabela}
        clubes={clubes}
        clubeDestaqueId={clubeUsuarioId}
        zonaQueda={zonaQueda}
        onSelecionarClube={id => nav.navigate('ElencoClube', {clubeId: id})}
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
              <Pressable
                key={linha.jogadorId}
                onPress={() =>
                  nav.navigate('PlayerDetail', {jogadorId: linha.jogadorId})
                }
                accessibilityLabel={`Ver ${linha.nome}`}
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
              </Pressable>
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
