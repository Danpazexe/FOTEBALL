/**
 * Tela de demissão. A carreira não acaba: o técnico é recontratado por um clube
 * disposto (filtrado pela reputação). Se ninguém o quer, é o fim. Migrada ao DS v2.
 */

import React from 'react';
import {StyleSheet, View} from 'react-native';

import OverallBadge from '../../components/OverallBadge';
import Escudo from '../../components/Escudo';
import {
  AppBar,
  Button,
  Card,
  Screen,
  Text,
  espacamento,
} from '../../design-system';
import {useConfirm} from '../../components/feedback';
import {clubeElegivelParaTecnico} from '../../engine/carreira/carreiraEngine';
import {useAppNavigation} from '../../navigation/types';
import {useGameStore} from '../../store/useGameStore';
import type {Clube, MotivoDemissao, Player} from '../../types';
import {moeda} from '../../utils/formatters';
import {agruparClubesPorDivisao} from '../../utils/clubes';

const ORDEM_DIVISOES = ['Série A', 'Série B', 'Série C', 'Série D'];

function motivoTexto(motivo: MotivoDemissao): string {
  switch (motivo) {
    case 'FALENCIA':
      return 'O clube quebrou financeiramente e a diretoria te dispensou.';
    case 'REBAIXAMENTO':
      return 'O rebaixamento custou o seu emprego.';
    case 'DERROTAS_CONSECUTIVAS':
      return 'A sequência de derrotas esgotou a paciência da diretoria.';
  }
}

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

function Demissao(): React.JSX.Element {
  const nav = useAppNavigation();
  const confirm = useConfirm();
  const demissao = useGameStore(state => state.demissao);
  const reputacaoTecnico = useGameStore(state => state.reputacaoTecnico);
  const clubeUsuarioId = useGameStore(state => state.clubeUsuarioId);
  const todosClubes = useGameStore(state => state.todosClubes);
  const jogadores = useGameStore(state => state.todosJogadores);
  const assumirClube = useGameStore(state => state.assumirClube);
  const reiniciarCarreira = useGameStore(state => state.reiniciarCarreira);

  const secoes = React.useMemo(() => {
    const elegiveis = todosClubes.filter(
      clube =>
        clube.id !== clubeUsuarioId &&
        clubeElegivelParaTecnico(reputacaoTecnico, clube.reputacao),
    );
    return agruparClubesPorDivisao(elegiveis, ORDEM_DIVISOES).map(grupo => ({
      divisao: grupo.divisao,
      clubes: grupo.clubes.sort((a, b) => b.reputacao - a.reputacao),
    }));
  }, [todosClubes, clubeUsuarioId, reputacaoTecnico]);

  const semPropostas = secoes.length === 0;

  async function assumir(clube: Clube): Promise<void> {
    const divisao = clube.divisao ?? 'Série A';
    const ok = await confirm({
      titulo: `Assumir o ${clube.nome}?`,
      mensagem: `Você recomeça na ${divisao}, levando sua reputação de técnico.`,
      detalhes: [
        {rotulo: 'Divisão', valor: divisao},
        {rotulo: 'Força do elenco', valor: `${mediaOverall(jogadores, clube.id)} OVR`},
        {rotulo: 'Reputação do clube', valor: `${clube.reputacao}/100`},
        {rotulo: 'Saldo', valor: moeda(clube.financas.saldo)},
      ],
      confirmarLabel: 'Assinar contrato',
    });
    if (!ok) {
      return;
    }
    assumirClube(clube.id);
    nav.navigate('MainTabs');
  }

  function recomecar(): void {
    reiniciarCarreira();
    nav.navigate('MainMenu');
  }

  return (
    <Screen
      scroll
      header={
        <AppBar
          title="Você foi demitido"
          subtitle={`Reputação ${reputacaoTecnico}/100`}
        />
      }>

      <Card variante="status" status="danger" padding={4}>
        <Text variant="bodyM">
          {demissao ? motivoTexto(demissao) : 'Sua passagem chegou ao fim.'}
        </Text>
      </Card>

      {semPropostas ? (
        <View style={styles.semPropostas}>
          <Text variant="titleL">Fim da linha</Text>
          <Text variant="bodyM" color="textSecondary">
            Sua reputação afundou e nenhum clube fez proposta. É o fim desta
            carreira.
          </Text>
          <Button
            icone="jogar"
            titulo="Começar uma nova carreira"
            variante="primary"
            onPress={recomecar}
            fullWidth
          />
        </View>
      ) : (
        <>
          <Text variant="labelM" color="textSecondary">
            Clubes dispostos a te contratar agora:
          </Text>
          {secoes.map(secao => (
            <View key={secao.divisao} style={styles.secao}>
              <Text variant="labelM" color="textSecondary" style={styles.caps}>
                {secao.divisao}
              </Text>
              {secao.clubes.map(clube => (
                <Card
                  key={clube.id}
                  variante="interactive"
                  accessibilityLabel={`Assumir o ${clube.nome}`}
                  onPress={() => assumir(clube)}
                  style={styles.item}>
                  <Escudo clubeId={clube.id} sigla={clube.sigla} tamanho={44} />
                  <View style={styles.itemInfo}>
                    <Text variant="titleM" numberOfLines={1}>
                      {clube.nome}
                    </Text>
                    <Text variant="caption" color="textSecondary">
                      Rep. {clube.reputacao} · {moeda(clube.financas.saldo)}
                    </Text>
                  </View>
                  <OverallBadge
                    overall={mediaOverall(jogadores, clube.id)}
                    size={40}
                  />
                </Card>
              ))}
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}

export default Demissao;

const styles = StyleSheet.create({
  semPropostas: {gap: espacamento[4]},
  caps: {textTransform: 'uppercase', letterSpacing: 1},
  secao: {gap: espacamento[2]},
  item: {flexDirection: 'row', alignItems: 'center', gap: espacamento[3]},
  itemInfo: {flex: 1, gap: espacamento[1]},
});
