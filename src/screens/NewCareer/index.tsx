/**
 * Tela de seleção de clube para iniciar uma nova carreira. Lista TODOS os clubes
 * do seed agrupados por divisão (Série A e Série B). Ao escolher um clube, a liga
 * ativa é montada para a divisão dele (ver `iniciarNovaCarreira` na store).
 */

import React from 'react';
import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useRoute, type RouteProp} from '@react-navigation/native';

import {logoDaDivisao} from '../../assets/escudos';
import {AppHeader, ScreenContainer} from '../../components/ui';
import OverallBadge from '../../components/OverallBadge';
import Escudo from '../../components/Escudo';
import {useConfirm} from '../../components/feedback';
import {useAppNavigation} from '../../navigation/types';
import type {RootStackParamList} from '../../navigation/types';
import {useGameStore} from '../../store/useGameStore';
import {cores, espaco, raio, sombra} from '../../theme';
import type {Clube, Player} from '../../types';
import {moeda} from '../../utils/formatters';

const ORDEM_DIVISOES = ['Série A', 'Série B', 'Série C'];

function mediaOverall(jogadores: Player[], clubeId: string): number {
  const doClube = jogadores
    .filter(j => j.clubeId === clubeId)
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 11);
  if (doClube.length === 0) {
    return 0;
  }
  return Math.round(
    doClube.reduce((t, j) => t + j.overall, 0) / doClube.length,
  );
}

function NewCareer(): React.JSX.Element {
  const nav = useAppNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'NewCareer'>>();
  const divisaoFiltro = route.params?.divisao;
  const todosClubes = useGameStore(state => state.todosClubes);
  const jogadores = useGameStore(state => state.todosJogadores);
  const iniciarNovaCarreira = useGameStore(state => state.iniciarNovaCarreira);
  const confirm = useConfirm();

  const secoes = React.useMemo(() => {
    // Quando a divisão vem da seleção de liga, mostra só os clubes dela.
    const base = divisaoFiltro
      ? todosClubes.filter(
          clube => (clube.divisao ?? 'Série A') === divisaoFiltro,
        )
      : todosClubes;
    const grupos = new Map<string, Clube[]>();
    for (const clube of base) {
      const divisao = clube.divisao ?? 'Série A';
      const lista = grupos.get(divisao) ?? [];
      lista.push(clube);
      grupos.set(divisao, lista);
    }
    return [...grupos.keys()]
      .sort((a, b) => {
        const ia = ORDEM_DIVISOES.indexOf(a);
        const ib = ORDEM_DIVISOES.indexOf(b);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      })
      .map(divisao => ({divisao, clubes: grupos.get(divisao) ?? []}));
  }, [todosClubes, divisaoFiltro]);

  async function selecionar(clube: Clube): Promise<void> {
    const divisao = clube.divisao ?? 'Série A';
    const ok = await confirm({
      titulo: `Comandar o ${clube.nome}?`,
      mensagem: `Você assume este clube na ${divisao}; os outros 19 são controlados pela IA.`,
      detalhes: [
        {rotulo: 'Divisão', valor: divisao},
        {rotulo: 'Força do elenco', valor: `${mediaOverall(jogadores, clube.id)} OVR`},
        {rotulo: 'Reputação', valor: `${clube.reputacao}/100`},
        {rotulo: 'Saldo', valor: moeda(clube.financas.saldo)},
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
    <ScreenContainer>
      <View style={styles.headerWrap}>
        <AppHeader
          titulo={divisaoFiltro ? `Brasileirão ${divisaoFiltro}` : 'Brasileirão'}
          subtitulo="Escolha o clube"
          onBack={nav.goBack}
          right={
            <Image
              source={logoDaDivisao(divisaoFiltro)}
              style={styles.logo}
              resizeMode="contain"
            />
          }
        />
      </View>
      <ScrollView contentContainerStyle={styles.lista}>
        {secoes.map(secao => (
          <View key={secao.divisao} style={styles.secao}>
            <Text style={styles.secaoTitulo}>{secao.divisao}</Text>
            {secao.clubes.map(clube => (
              <Pressable
                accessibilityRole="button"
                key={clube.id}
                onPress={() => selecionar(clube)}
                style={styles.item}>
                <Escudo clubeId={clube.id} sigla={clube.sigla} tamanho={44} />
                <View style={styles.itemInfoWrap}>
                  <Text style={styles.itemNome}>{clube.nome}</Text>
                  <Text style={styles.itemInfo}>
                    Rep. {clube.reputacao} · {moeda(clube.financas.saldo)}
                  </Text>
                </View>
                <OverallBadge overall={mediaOverall(jogadores, clube.id)} size={40} />
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: espaco.lg,
    paddingTop: espaco.lg,
  },
  logo: {
    height: 48,
    width: 48,
  },
  lista: {
    gap: espaco.lg,
    padding: espaco.lg,
    paddingBottom: espaco.xl * 2,
  },
  secao: {
    gap: espaco.md,
  },
  secaoTitulo: {
    color: cores.textoSecundario,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  item: {
    alignItems: 'center',
    backgroundColor: cores.superficieElevada,
    borderColor: cores.bordaTransl,
    borderRadius: raio.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: espaco.md,
    padding: espaco.md,
    ...sombra.card,
  },
  itemInfoWrap: {
    flex: 1,
    gap: espaco.xs,
  },
  itemNome: {
    color: cores.texto,
    fontSize: 17,
    fontWeight: '800',
  },
  itemInfo: {
    color: cores.textoSecundario,
    fontSize: 13,
    fontWeight: '600',
  },
});

export default NewCareer;
