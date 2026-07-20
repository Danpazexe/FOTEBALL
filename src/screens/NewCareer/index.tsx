/**
 * Seleção de clube para iniciar carreira. Lista TODOS os clubes do seed agrupados
 * por divisão. A escolha é por IDENTIDADE (cidade, estádio) — sem expor números.
 * Migrada ao Design System v2.
 */

import React from 'react';
import {Image, StyleSheet, View} from 'react-native';
import {useRoute, type RouteProp} from '@react-navigation/native';

import {logoDaDivisao} from '../../assets/escudos';
import Escudo from '../../components/Escudo';
import {
  AppBar,
  Box,
  Card,
  Icon,
  Screen,
  Text,
  espacamento,
} from '../../design-system';
import {useConfirm} from '../../components/feedback';
import {useAppNavigation} from '../../navigation/types';
import type {RootStackParamList} from '../../navigation/types';
import {useGameStore} from '../../store/useGameStore';
import {classificarCenario} from '../../engine/carreira/cenarios';
import type {Clube} from '../../types';
import {agruparClubesPorDivisao} from '../../utils/clubes';

const ORDEM_DIVISOES = [
  'Série A',
  'Série B',
  'Série C',
  'Série D',
  'Primera División',
  'Premier League',
  'Championship',
];

/** Título do cabeçalho: "Brasileirão Série A" ou o nome da liga internacional. */
function tituloDaDivisao(divisao?: string): string {
  if (!divisao) {
    return 'Nova carreira';
  }
  return divisao.startsWith('Série') ? `Brasileirão ${divisao}` : divisao;
}

/** Desafio de carreira do clube (reputação + caixa + divisão). */
function cenarioDoClube(clube: Clube) {
  return classificarCenario({
    reputacao: clube.reputacao,
    saldo: clube.financas.saldo,
    divisao: clube.divisao ?? 'Série A',
  });
}

/** Linha de identidade do clube: "Cidade, UF · desde ANO". */
function identidadeClube(clube: Clube): string {
  const local = [clube.cidade, clube.estado].filter(Boolean).join(', ');
  return clube.fundacao ? `${local} · desde ${clube.fundacao}` : local;
}

function NewCareer(): React.JSX.Element {
  const nav = useAppNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'NewCareer'>>();
  const divisaoFiltro = route.params?.divisao;
  const todosClubes = useGameStore(state => state.todosClubes);
  const iniciarNovaCarreira = useGameStore(state => state.iniciarNovaCarreira);
  const confirm = useConfirm();

  const secoes = React.useMemo(() => {
    const base = divisaoFiltro
      ? todosClubes.filter(
          clube => (clube.divisao ?? 'Série A') === divisaoFiltro,
        )
      : todosClubes;
    return agruparClubesPorDivisao(base, ORDEM_DIVISOES);
  }, [todosClubes, divisaoFiltro]);

  async function selecionar(clube: Clube): Promise<void> {
    const divisao = clube.divisao ?? 'Série A';
    const cenario = cenarioDoClube(clube);
    const rivais =
      todosClubes.filter(c => (c.divisao ?? 'Série A') === divisao).length - 1;
    const ok = await confirm({
      titulo: `Comandar o ${clube.nome}?`,
      mensagem: `${cenario.descricao} ${
        divisao === 'Série D'
          ? 'Você disputa o grupo de 6 do clube e, avançando, o mata-mata nacional. Os demais clubes são controlados pela IA.'
          : `Os outros ${rivais} clubes são controlados pela IA.`
      }`,
      detalhes: [
        {rotulo: 'Desafio', valor: cenario.nome},
        {rotulo: 'Divisão', valor: divisao},
        {rotulo: 'Cidade', valor: [clube.cidade, clube.estado].filter(Boolean).join(', ') || '—'},
        {rotulo: 'Estádio', valor: clube.estadio.nome},
      ],
      confirmarLabel: 'Iniciar carreira',
    });
    if (!ok) {
      return;
    }
    iniciarNovaCarreira(clube.id);
    nav.navigate('MainTabs');
  }

  return (
    <Screen
      scroll
      header={
        <AppBar
          title={tituloDaDivisao(divisaoFiltro)}
          subtitle="Escolha o clube"
          onBack={nav.goBack}
          right={
            <Image
              source={logoDaDivisao(divisaoFiltro)}
              style={styles.logo}
              resizeMode="contain"
            />
          }
        />
      }>
      {secoes.map(secao => (
        <View key={secao.divisao} style={styles.secao}>
          <Text variant="labelM" color="textSecondary" style={styles.caps}>
            {secao.divisao}
          </Text>
          {secao.clubes.map(clube => (
            <Card
              key={clube.id}
              variante="interactive"
              accessibilityLabel={`Comandar o ${clube.nome}`}
              onPress={() => selecionar(clube)}
              style={styles.item}>
              <Escudo clubeId={clube.id} sigla={clube.sigla} tamanho={46} />
              <View style={styles.main}>
                <Text variant="titleM" numberOfLines={1}>
                  {clube.nome}
                </Text>
                <Text variant="caption" color="textSecondary" numberOfLines={1}>
                  {identidadeClube(clube)}
                </Text>
                <Box
                  bg="surfaceSubtle"
                  radius="sm"
                  px={2}
                  style={styles.cenarioChip}>
                  <Text variant="labelM" color="brand" numberOfLines={1}>
                    {cenarioDoClube(clube).nome}
                  </Text>
                </Box>
              </View>
              <Icon nome="avancar" size={22} color="textMuted" />
            </Card>
          ))}
        </View>
      ))}
    </Screen>
  );
}

export default NewCareer;

const styles = StyleSheet.create({
  logo: {width: 48, height: 48},
  secao: {gap: espacamento[2]},
  caps: {textTransform: 'uppercase', letterSpacing: 1},
  item: {flexDirection: 'row', alignItems: 'center', gap: espacamento[3]},
  main: {flex: 1, gap: 3},
  cenarioChip: {alignSelf: 'flex-start', marginTop: 2, paddingVertical: 2},
});
