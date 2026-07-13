/**
 * Categorias de Base (aba Elenco). Jovens das peneiras da temporada com faixa de
 * potencial; abas Peneira (todos) / Promessas (destaques A/S). O técnico promove
 * ao elenco ou libera. Dados e ações reais da engine. DS v2.
 */

import React, {useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import {
  AppHeader,
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  Icon,
  PositionBadge,
  Screen,
  SegmentedTabs,
  Text,
  espacamento,
  raios,
  useTheme,
  type CorTexto,
} from '../../design-system';
import {
  faixaPotencial,
  type FaixaPotencial,
} from '../../engine/progression/academiaEngine';
import {useAppNavigation} from '../../navigation/types';
import {selecionarClubeUsuario, useGameStore} from '../../store/useGameStore';
import {moeda} from '../../utils/formatters';
import type {Position} from '../../types';

type Aba = 'peneira' | 'promessas';

function corFaixa(faixa: FaixaPotencial): CorTexto {
  if (faixa === 'S') {
    return 'accent';
  }
  if (faixa === 'A') {
    return 'brand';
  }
  return 'textSecondary';
}

function Academia(): React.JSX.Element {
  const nav = useAppNavigation();
  const {cores} = useTheme();
  const [aba, setAba] = useState<Aba>('peneira');
  const jovens = useGameStore(state => state.jovensDisponiveis);
  const clube = useGameStore(selecionarClubeUsuario);
  const promoverJovem = useGameStore(state => state.promoverJovem);
  const liberarJovem = useGameStore(state => state.liberarJovem);

  const nivelBase = clube?.estadio.nivelInfraestrutura ?? 1;

  const promessas = useMemo(
    () => jovens.filter(j => faixaPotencial(j.potencial) !== 'B'),
    [jovens],
  );
  const lista = aba === 'promessas' ? promessas : jovens;

  return (
    <Screen
      scroll
      header={
        <AppHeader title="Categorias de Base" onBack={() => nav.goBack()} />
      }>
      <Card variante="outlined" style={styles.centroCard}>
        <View style={[styles.centroIcone, {backgroundColor: cores.brandSoft}]}>
          <Icon nome="base" size="md" color="brand" />
        </View>
        <View style={styles.flex}>
          <Text variant="titleM">Centro de formação</Text>
          <Text variant="labelM" color="textSecondary">
            Nível {nivelBase} · {jovens.length} nas peneiras
          </Text>
        </View>
        {promessas.length > 0 ? (
          <Badge count={promessas.length} tom="accent" solido />
        ) : null}
      </Card>

      <SegmentedTabs
        abas={[
          {chave: 'peneira', rotulo: 'Peneira'},
          {chave: 'promessas', rotulo: 'Promessas'},
        ]}
        ativa={aba}
        onSelect={c => setAba(c as Aba)}
      />

      {lista.length === 0 ? (
        <View style={styles.vazio}>
          <EmptyState
            icone="base"
            title={
              aba === 'promessas'
                ? 'Nenhuma promessa em destaque'
                : 'Nenhum jovem na peneira'
            }
            description="Novas peneiras surgem a cada temporada."
          />
        </View>
      ) : (
        <Card variante="outlined" padding={0} style={styles.listaCard}>
          {lista.map((jovem, i) => {
            const faixa = faixaPotencial(jovem.potencial);
            const corF = corFaixa(faixa);
            const temMargem = jovem.potencial > jovem.overall;
            return (
              <React.Fragment key={jovem.id}>
                {i > 0 ? <Divider /> : null}
                <View style={styles.linha}>
                  <PositionBadge
                    posicao={jovem.posicao as Position}
                    tamanho="sm"
                  />
                  <View style={styles.main}>
                    <Text variant="labelL" numberOfLines={1}>
                      {jovem.nome}
                    </Text>
                    <Text variant="caption" color="textSecondary">
                      {jovem.idade} anos · {moeda(jovem.salarioBase)}/mês
                    </Text>
                  </View>
                  <View style={styles.potWrap}>
                    <View style={styles.potLinha}>
                      <Text variant="labelL" tabular>
                        {temMargem
                          ? `${jovem.overall}–${jovem.potencial}`
                          : `${jovem.overall}`}
                      </Text>
                      {temMargem ? (
                        <Icon nome="tendencia" size={14} color="success" />
                      ) : null}
                    </View>
                    <View
                      style={[
                        styles.faixaChip,
                        {borderColor: cores[corF]},
                        faixa === 'S'
                          ? {backgroundColor: cores.accentSoft}
                          : null,
                      ]}>
                      <Text variant="caption" color={corF} weight="800">
                        {faixa}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.acoes}>
                    <Button
                      variante="primary"
                      tamanho="sm"
                      icone="check"
                      titulo="Promover"
                      onPress={() => promoverJovem(jovem.id)}
                    />
                    <Button
                      variante="ghost"
                      tamanho="sm"
                      titulo="Liberar"
                      onPress={() => liberarJovem(jovem.id)}
                    />
                  </View>
                </View>
              </React.Fragment>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}

export default Academia;

const styles = StyleSheet.create({
  flex: {flex: 1},
  centroCard: {flexDirection: 'row', alignItems: 'center', gap: espacamento[3]},
  centroIcone: {
    width: 44,
    height: 44,
    borderRadius: raios.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vazio: {flex: 1, justifyContent: 'center', paddingVertical: espacamento[6]},
  listaCard: {paddingHorizontal: espacamento[3]},
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[2],
    paddingVertical: espacamento[2],
  },
  main: {flex: 1, gap: 2},
  potWrap: {alignItems: 'center', gap: 2},
  potLinha: {flexDirection: 'row', alignItems: 'center', gap: espacamento[1]},
  faixaChip: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: raios.sm,
    borderWidth: 1.5,
    minWidth: 22,
    paddingHorizontal: espacamento[1],
  },
  acoes: {gap: espacamento[1]},
});
