/**
 * Tela de seleção de clube para iniciar uma nova carreira. Lista TODOS os clubes
 * do seed agrupados por divisão (Série A, B e C). Ao escolher um clube, a liga
 * ativa é montada para a divisão dele (ver `iniciarNovaCarreira` na store).
 *
 * A escolha é por IDENTIDADE do clube (cidade, estádio, fundação) — de propósito
 * NÃO expomos força do elenco, reputação ou saldo, para o técnico escolher pelo
 * escudo e não min-maxar por números.
 */

import React from 'react';
import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useRoute, type RouteProp} from '@react-navigation/native';

import {logoDaDivisao} from '../../assets/escudos';
import {AppHeader, ScreenContainer} from '../../components/ui';
import Escudo from '../../components/Escudo';
import Icone from '../../components/Icone';
import {useConfirm} from '../../components/feedback';
import {useAppNavigation} from '../../navigation/types';
import type {RootStackParamList} from '../../navigation/types';
import {useGameStore} from '../../store/useGameStore';
import {classificarCenario} from '../../engine/carreira/cenarios';
import {cores, espaco, raio, sombra} from '../../theme';
import type {Clube} from '../../types';

const ORDEM_DIVISOES = ['Série A', 'Série B', 'Série C', 'Série D'];

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
    const cenario = cenarioDoClube(clube);
    const ok = await confirm({
      titulo: `Comandar o ${clube.nome}?`,
      mensagem: `${cenario.descricao} ${
        divisao === 'Série D'
          ? 'Você disputa o grupo de 6 do clube e, avançando, o mata-mata nacional. Os demais clubes são controlados pela IA.'
          : 'Os outros 19 clubes são controlados pela IA.'
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
                accessibilityLabel={`Comandar o ${clube.nome}`}
                key={clube.id}
                onPress={() => selecionar(clube)}
                style={({pressed}) => [styles.item, pressed && styles.itemPressed]}>
                <Escudo clubeId={clube.id} sigla={clube.sigla} tamanho={46} />
                <View style={styles.itemInfoWrap}>
                  <Text style={styles.itemNome} numberOfLines={1}>
                    {clube.nome}
                  </Text>
                  <Text style={styles.itemInfo} numberOfLines={1}>
                    {identidadeClube(clube)}
                  </Text>
                  <View style={styles.cenarioChip}>
                    <Text style={styles.cenarioChipTxt} numberOfLines={1}>
                      {cenarioDoClube(clube).nome}
                    </Text>
                  </View>
                </View>
                <Icone nome="avancar" tamanho={22} cor={cores.textoMuted} />
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
    backgroundColor: cores.superficie,
    borderColor: cores.borda,
    borderRadius: raio.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: espaco.md,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.md,
    ...sombra.suave,
  },
  itemPressed: {
    backgroundColor: cores.superficieAlt,
    transform: [{scale: 0.99}],
  },
  itemInfoWrap: {
    flex: 1,
    gap: 3,
  },
  itemNome: {
    color: cores.texto,
    fontSize: 16,
    fontWeight: '800',
  },
  itemInfo: {
    color: cores.textoSecundario,
    fontSize: 12.5,
    fontWeight: '600',
  },
  cenarioChip: {
    alignSelf: 'flex-start',
    backgroundColor: cores.superficieAlt,
    borderRadius: raio.sm,
    marginTop: 2,
    paddingHorizontal: espaco.sm,
    paddingVertical: 2,
  },
  cenarioChipTxt: {
    color: cores.primaria,
    fontSize: 11,
    fontWeight: '800',
  },
});

export default NewCareer;
