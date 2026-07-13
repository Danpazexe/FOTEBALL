/**
 * Calendário da temporada (aba Partidas). Lista os jogos do clube (Liga + Copa)
 * em abas Resultados / Próximos, cada um como um MatchCard com escudos, placar
 * ou horário, competição e mando. Toca → súmula / pré-jogo / chave. Dados reais.
 */
import React, {useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import {
  AppHeader,
  Badge,
  EmptyState,
  MatchCard,
  Screen,
  SegmentedTabs,
  Text,
  espacamento,
} from '../../design-system';
import {useAppNavigation} from '../../navigation/types';
import {useGameStore} from '../../store/useGameStore';
import {siglaClube} from '../../utils/formatters';

type Aba = 'proximos' | 'resultados';

type Jogo = {
  id: string;
  ordem: string;
  casa: {clubeId: string; sigla: string};
  fora: {clubeId: string; sigla: string};
  encerrado: boolean;
  placarCasa?: number;
  placarFora?: number;
  quando: string;
  competicao: string;
  proximo: boolean;
  tipo: 'liga' | 'copa';
  partidaId?: string;
};

function dataCurta(iso: string): string {
  return iso.length >= 10 ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : iso;
}

function Calendario(): React.JSX.Element {
  const nav = useAppNavigation();
  const [aba, setAba] = useState<Aba>('proximos');

  const partidas = useGameStore(state => state.partidas);
  const clubes = useGameStore(state => state.clubes);
  const todosClubes = useGameStore(state => state.todosClubes);
  const copa = useGameStore(state => state.copa);
  const clubeUsuarioId = useGameStore(state => state.clubeUsuarioId);
  const rodadaAtual = useGameStore(state => state.rodadaAtual);
  const temporadaAtual = useGameStore(state => state.temporadaAtual);
  const divisao = useGameStore(
    state =>
      state.clubes.find(c => c.id === state.clubeUsuarioId)?.divisao ??
      'Brasileirão',
  );

  const jogos = useMemo<Jogo[]>(() => {
    if (!clubeUsuarioId) {
      return [];
    }
    const lista: Jogo[] = [];
    for (const p of partidas) {
      if (p.timeCasa !== clubeUsuarioId && p.timeFora !== clubeUsuarioId) {
        continue;
      }
      lista.push({
        id: p.id,
        ordem: p.data,
        casa: {clubeId: p.timeCasa, sigla: siglaClube(clubes, p.timeCasa)},
        fora: {clubeId: p.timeFora, sigla: siglaClube(clubes, p.timeFora)},
        encerrado: p.jogada,
        placarCasa: p.placarCasa ?? undefined,
        placarFora: p.placarFora ?? undefined,
        quando: dataCurta(p.data),
        competicao: divisao,
        proximo: !p.jogada && p.rodada === rodadaAtual,
        tipo: 'liga',
        partidaId: p.id,
      });
    }
    if (copa) {
      copa.fases.forEach((fase, indice) => {
        const c = fase.confrontos.find(
          x => x.timeA === clubeUsuarioId || x.timeB === clubeUsuarioId,
        );
        if (!c || !fase.data) {
          return;
        }
        const casaId = c.timeA;
        const foraId = c.timeB;
        lista.push({
          id: `copa-${indice}`,
          ordem: fase.data,
          casa: {clubeId: casaId, sigla: siglaClube(todosClubes, casaId)},
          fora: {clubeId: foraId, sigla: siglaClube(todosClubes, foraId)},
          encerrado: c.vencedor !== undefined && c.vencedor !== null,
          quando: dataCurta(fase.data),
          competicao: 'Copa do Brasil',
          proximo: !c.vencedor && indice === copa.faseAtual,
          tipo: 'copa',
        });
      });
    }
    return lista.sort((a, b) => a.ordem.localeCompare(b.ordem));
  }, [partidas, clubes, todosClubes, copa, clubeUsuarioId, rodadaAtual, divisao]);

  const filtrados = useMemo(() => {
    const arr = jogos.filter(j => (aba === 'resultados' ? j.encerrado : !j.encerrado));
    return aba === 'resultados' ? arr.reverse() : arr;
  }, [jogos, aba]);

  const aoTocar = (j: Jogo) => {
    if (j.tipo === 'copa') {
      nav.navigate('Copa');
    } else if (j.encerrado && j.partidaId) {
      nav.navigate('MatchResult', {partidaId: j.partidaId});
    } else if (j.proximo) {
      nav.navigate('PreJogo');
    }
  };

  return (
    <Screen
      scroll
      header={
        <AppHeader
          title="Calendário"
          onBack={() => (nav.canGoBack() ? nav.goBack() : undefined)}
        />
      }>
      <Text variant="labelM" color="textSecondary" align="center">
        Liga + Copa · Temporada {temporadaAtual}
      </Text>

      <SegmentedTabs
        abas={[
          {chave: 'resultados', rotulo: 'Resultados'},
          {chave: 'proximos', rotulo: 'Próximos'},
        ]}
        ativa={aba}
        onSelect={c => setAba(c as Aba)}
      />

      {filtrados.length === 0 ? (
        <View style={estilos.vazio}>
          <EmptyState
            icone="calendario"
            title={
              aba === 'resultados'
                ? 'Nenhum jogo disputado ainda'
                : 'Sem jogos futuros'
            }
            description={
              aba === 'resultados'
                ? 'Os resultados aparecem aqui após cada partida.'
                : 'O calendário da temporada aparece aqui.'
            }
          />
        </View>
      ) : (
        <View style={estilos.lista}>
          {filtrados.map(j => (
            <View key={j.id} style={estilos.item}>
              {j.proximo ? (
                <View style={estilos.proximoTag}>
                  <Badge label="Próximo jogo" tom="brand" solido />
                </View>
              ) : null}
              <MatchCard
                casa={j.casa}
                fora={j.fora}
                status={j.encerrado ? 'encerrado' : 'agendado'}
                placarCasa={j.placarCasa}
                placarFora={j.placarFora}
                quando={j.quando}
                competicao={j.competicao}
                onPress={
                  j.tipo === 'copa' || j.encerrado || j.proximo
                    ? () => aoTocar(j)
                    : undefined
                }
              />
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

export default Calendario;

const estilos = StyleSheet.create({
  vazio: {flex: 1, justifyContent: 'center', paddingVertical: espacamento[8]},
  lista: {gap: espacamento[3]},
  item: {gap: espacamento[1]},
  proximoTag: {alignSelf: 'flex-start'},
});
