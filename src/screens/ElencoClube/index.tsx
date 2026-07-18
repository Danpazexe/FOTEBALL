/**
 * Elenco de UM clube qualquer — aberto ao tocar num time na Classificação (ou
 * em qualquer lista de clubes). Somente leitura: escudo, identidade, overall
 * médio e o elenco agrupado por setor (goleiros/defesa/meio/ataque), cada linha
 * com posição, nome, idade, overall e valor. Lê o MUNDO INTEIRO (liga ativa +
 * mundo mestre), então funciona para adversários da liga E times de outras ligas
 * (mercado universal). Não expõe ações — é a ficha do rival.
 */
import React, {useMemo} from 'react';
import {StyleSheet, View} from 'react-native';

import Escudo from '../../components/Escudo';
import {
  AppHeader,
  Card,
  Divider,
  EmptyState,
  OverallRing,
  PositionBadge,
  Pressable,
  Screen,
  Text,
  espacamento,
} from '../../design-system';
import {useAppNavigation, useAppRoute} from '../../navigation/types';
import {useGameStore} from '../../store/useGameStore';
import {moedaCompacta} from '../../utils/formatters';
import {simboloMoeda} from '../../engine/competitions/registry/competitionRegistry';
import type {Player, Position} from '../../types';

/** Ordem canônica de posições (mesma da academia). */
const ORDEM_POSICOES: Position[] = [
  'GOL', 'ZAG', 'LD', 'LE', 'VOL', 'MC', 'MEI', 'PD', 'PE', 'SA', 'CA',
];

type Setor = {chave: string; titulo: string; posicoes: Position[]};

const SETORES: Setor[] = [
  {chave: 'gol', titulo: 'Goleiros', posicoes: ['GOL']},
  {chave: 'def', titulo: 'Defesa', posicoes: ['ZAG', 'LD', 'LE']},
  {chave: 'mei', titulo: 'Meio-campo', posicoes: ['VOL', 'MC', 'MEI']},
  {chave: 'ata', titulo: 'Ataque', posicoes: ['PD', 'PE', 'SA', 'CA']},
];

function ordenarElenco(jogadores: Player[]): Player[] {
  return [...jogadores].sort((a, b) => {
    const pa = ORDEM_POSICOES.indexOf(a.posicaoPrincipal);
    const pb = ORDEM_POSICOES.indexOf(b.posicaoPrincipal);
    if (pa !== pb) {
      return pa - pb;
    }
    return b.overall - a.overall;
  });
}

function ElencoClube(): React.JSX.Element {
  const nav = useAppNavigation();
  const route = useAppRoute<'ElencoClube'>();
  const clubeId = route.params?.clubeId;

  const clubes = useGameStore(state => state.clubes);
  const todosClubes = useGameStore(state => state.todosClubes);
  const jogadores = useGameStore(state => state.jogadores);
  const todosJogadores = useGameStore(state => state.todosJogadores);

  const clube = useMemo(
    () =>
      clubes.find(c => c.id === clubeId) ??
      todosClubes.find(c => c.id === clubeId) ??
      null,
    [clubes, todosClubes, clubeId],
  );

  // Elenco do clube no mundo inteiro (liga ativa tem prioridade; completa com o
  // mundo mestre), sem duplicar ids.
  const elenco = useMemo(() => {
    if (!clubeId) {
      return [] as Player[];
    }
    const vistos = new Set<string>();
    const lista: Player[] = [];
    for (const j of [...jogadores, ...todosJogadores]) {
      if (j.clubeId === clubeId && !vistos.has(j.id)) {
        vistos.add(j.id);
        lista.push(j);
      }
    }
    return ordenarElenco(lista);
  }, [jogadores, todosJogadores, clubeId]);

  const overallMedio = useMemo(() => {
    if (elenco.length === 0) {
      return 0;
    }
    return Math.round(
      elenco.reduce((s, j) => s + j.overall, 0) / elenco.length,
    );
  }, [elenco]);

  const titular = useMemo(
    () => [...elenco].sort((a, b) => b.overall - a.overall).slice(0, 11),
    [elenco],
  );
  const overallTitular = useMemo(() => {
    if (titular.length === 0) {
      return 0;
    }
    return Math.round(titular.reduce((s, j) => s + j.overall, 0) / titular.length);
  }, [titular]);

  if (!clube) {
    return (
      <Screen header={<AppHeader title="Elenco" onBack={() => nav.goBack()} />}>
        <View style={estilos.vazio}>
          <EmptyState
            icone="clube"
            title="Clube não encontrado"
            description="Não foi possível carregar o elenco deste clube."
          />
        </View>
      </Screen>
    );
  }

  const subtitulo = [clube.divisao ?? clube.campeonato, clube.estado]
    .filter(Boolean)
    .join(' · ');
  const simbolo = simboloMoeda(clube.divisao);

  return (
    <Screen
      scroll
      header={<AppHeader title={clube.nome} onBack={() => nav.goBack()} />}>
      {/* Cabeçalho: escudo + identidade + força do time */}
      <Card>
        <View style={estilos.cabecalho}>
          <Escudo clubeId={clube.id} sigla={clube.sigla} tamanho={56} />
          <View style={estilos.flex}>
            <Text variant="titleL" numberOfLines={1}>
              {clube.nome}
            </Text>
            {subtitulo ? (
              <Text variant="labelM" color="textSecondary">
                {subtitulo}
              </Text>
            ) : null}
            <Text variant="caption" color="textSecondary">
              {elenco.length} jogador{elenco.length === 1 ? '' : 'es'} no elenco
            </Text>
          </View>
          <View style={estilos.forca}>
            <OverallRing valor={overallTitular || overallMedio} rotulo="TIME" />
          </View>
        </View>
      </Card>

      {elenco.length === 0 ? (
        <View style={estilos.vazio}>
          <EmptyState
            icone="elenco"
            title="Elenco indisponível"
            description="Os jogadores deste clube ainda não foram carregados."
          />
        </View>
      ) : (
        SETORES.map(setor => {
          const doSetor = elenco.filter(j =>
            setor.posicoes.includes(j.posicaoPrincipal),
          );
          if (doSetor.length === 0) {
            return null;
          }
          return (
            <View key={setor.chave} style={estilos.setor}>
              <Text variant="labelM" color="textSecondary" style={estilos.caps}>
                {setor.titulo}
              </Text>
              <Card padding={0}>
                {doSetor.map((j, i) => (
                  <View key={j.id}>
                    {i > 0 ? <Divider /> : null}
                    <Pressable
                      style={estilos.linha}
                      onPress={() =>
                        nav.navigate('PlayerDetail', {jogadorId: j.id})
                      }
                      accessibilityLabel={`Ver ${j.apelido || j.nome}`}>
                      <PositionBadge posicao={j.posicaoPrincipal} tamanho="sm" />
                      <View style={estilos.flex}>
                        <Text variant="titleM" numberOfLines={1}>
                          {j.apelido || j.nome}
                        </Text>
                        <Text variant="caption" color="textSecondary">
                          {j.idade} anos · {moedaCompacta(j.valorMercado, simbolo)}
                          {j.lesionado ? ' · Lesionado' : ''}
                          {j.suspenso ? ' · Suspenso' : ''}
                        </Text>
                      </View>
                      <Text
                        variant="titleM"
                        tabular
                        color={
                          j.overall >= 75
                            ? 'success'
                            : j.overall >= 60
                            ? 'textPrimary'
                            : 'textSecondary'
                        }
                        style={estilos.overall}>
                        {j.overall}
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </Card>
            </View>
          );
        })
      )}
      <View style={{height: espacamento[6]}} />
    </Screen>
  );
}

const estilos = StyleSheet.create({
  vazio: {flex: 1, justifyContent: 'center', paddingVertical: espacamento[8]},
  cabecalho: {flexDirection: 'row', alignItems: 'center', gap: espacamento[3]},
  flex: {flex: 1},
  forca: {alignItems: 'center'},
  setor: {gap: espacamento[2], marginTop: espacamento[4]},
  caps: {textTransform: 'uppercase', letterSpacing: 1},
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[3],
    paddingHorizontal: espacamento[3],
    paddingVertical: espacamento[2],
  },
  overall: {width: 32, textAlign: 'right'},
});

export default ElencoClube;
