/**
 * Classificação (raiz da aba Partidas): tabela do Brasileirão da divisão do clube
 * com abas Geral / Casa / Fora (Casa e Fora derivadas dos jogos disputados —
 * dado real, nada inventado), legenda de zonas e artilheiros. DS v2.
 */

import React, {useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import {ClassificationTable} from '../../components/ClassificationTable';
import {
  AppBar,
  Screen,
  SegmentedTabs,
  Text,
  espacamento,
  raios,
  useTheme,
} from '../../design-system';
import {calcularArtilheiros} from '../../engine/season/artilheiros';
import {selecionarClubeUsuario, useGameStore} from '../../store/useGameStore';
import {siglaClube} from '../../utils/formatters';
import type {Partida, TabelaClassificacao} from '../../types';

const DIVISAO_PADRAO = 'Série A';
const ULTIMA_DIVISAO = 'Série D';

type Mando = 'geral' | 'casa' | 'fora';

/** Deriva a tabela por mando (casa/fora) dos jogos DISPUTADOS. */
function derivarPorMando(
  base: TabelaClassificacao[],
  partidas: Partida[],
  mando: 'casa' | 'fora',
): TabelaClassificacao[] {
  const linhas = new Map<string, TabelaClassificacao>();
  for (const t of base) {
    linhas.set(t.clubeId, {
      clubeId: t.clubeId,
      pontos: 0,
      jogos: 0,
      vitorias: 0,
      empates: 0,
      derrotas: 0,
      golsPro: 0,
      golsContra: 0,
      saldoGols: 0,
    });
  }
  for (const p of partidas) {
    if (!p.jogada || p.placarCasa === undefined || p.placarFora === undefined) {
      continue;
    }
    const clubeId = mando === 'casa' ? p.timeCasa : p.timeFora;
    const linha = linhas.get(clubeId);
    if (!linha) {
      continue;
    }
    const pro = mando === 'casa' ? p.placarCasa : p.placarFora;
    const con = mando === 'casa' ? p.placarFora : p.placarCasa;
    linha.jogos += 1;
    linha.golsPro += pro;
    linha.golsContra += con;
    linha.saldoGols = linha.golsPro - linha.golsContra;
    if (pro > con) {
      linha.vitorias += 1;
      linha.pontos += 3;
    } else if (pro === con) {
      linha.empates += 1;
      linha.pontos += 1;
    } else {
      linha.derrotas += 1;
    }
  }
  return [...linhas.values()].sort(
    (a, b) =>
      b.pontos - a.pontos ||
      b.saldoGols - a.saldoGols ||
      b.golsPro - a.golsPro,
  );
}

function Competition(): React.JSX.Element {
  const {cores} = useTheme();
  const [mando, setMando] = useState<Mando>('geral');

  const tabela = useGameStore(state => state.tabela);
  const clubes = useGameStore(state => state.clubes);
  const partidas = useGameStore(state => state.partidas);
  const jogadores = useGameStore(state => state.jogadores);
  const clubeUsuarioId = useGameStore(state => state.clubeUsuarioId);
  const clubeUsuario = useGameStore(selecionarClubeUsuario);
  const temporadaAtual = useGameStore(state => state.temporadaAtual);

  const artilheiros = useMemo(
    () => calcularArtilheiros(jogadores, 10),
    [jogadores],
  );

  const tabelaCasa = useMemo(
    () => derivarPorMando(tabela, partidas, 'casa'),
    [tabela, partidas],
  );
  const tabelaFora = useMemo(
    () => derivarPorMando(tabela, partidas, 'fora'),
    [tabela, partidas],
  );

  const divisao = clubeUsuario?.divisao ?? DIVISAO_PADRAO;
  const ehSerieA = divisao === DIVISAO_PADRAO;
  const ehUltima = divisao === ULTIMA_DIVISAO;
  const zonaQueda = ehUltima ? null : Math.max(5, tabela.length - 3);
  const rotuloTopo = ehSerieA ? 'Libertadores (1º–4º)' : 'Acesso (1º–4º)';

  const ehGeral = mando === 'geral';
  const tabelaAtiva =
    mando === 'casa' ? tabelaCasa : mando === 'fora' ? tabelaFora : tabela;

  return (
    <Screen
      scroll
      header={
        <AppBar
          title="Classificação"
          subtitle={`Brasileirão ${divisao} · ${temporadaAtual}`}
        />
      }>
      <SegmentedTabs
        abas={[
          {chave: 'geral', rotulo: 'Geral'},
          {chave: 'casa', rotulo: 'Casa'},
          {chave: 'fora', rotulo: 'Fora'},
        ]}
        ativa={mando}
        onSelect={c => setMando(c as Mando)}
      />

      <ClassificationTable
        tabela={tabelaAtiva}
        clubes={clubes}
        clubeDestaqueId={clubeUsuarioId}
        zonaQueda={ehGeral ? zonaQueda : null}
      />

      {ehGeral ? (
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
      ) : (
        <Text variant="caption" color="textMuted" align="center">
          Desempenho apenas nos jogos {mando === 'casa' ? 'em casa' : 'fora'}.
        </Text>
      )}

      {ehGeral ? (
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
      ) : null}
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
