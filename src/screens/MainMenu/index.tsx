/**
 * Tela inicial do FOTEBALL — marca, emblema e resumo da carreira ativa, com
 * atalhos para continuar ou iniciar uma nova carreira.
 *
 * Layout ancorado: o herói (logo/marca) centraliza no espaço LIVRE e o bloco
 * de decisão (card da carreira + ações + versão) fica preso à base, na zona
 * do polegar — sem scroll e sem mar de espaço vazio em telas altas.
 */

import React from 'react';
import {StyleSheet, View} from 'react-native';

import Escudo from '../../components/Escudo';
import LogoFoteball from '../../components/LogoFoteball';
import {
  Button,
  Card,
  Divider,
  Screen,
  Text,
  espacamento,
} from '../../design-system';
import {useGameStore} from '../../store/useGameStore';
import {useAppNavigation} from '../../navigation/types';
import {VERSAO_APP} from '../../version';

function MainMenu(): React.JSX.Element {
  const nav = useAppNavigation();
  const clubes = useGameStore(state => state.clubes);
  const tabela = useGameStore(state => state.tabela);
  const clubeUsuarioId = useGameStore(state => state.clubeUsuarioId);
  const temporadaAtual = useGameStore(state => state.temporadaAtual);
  const rodadaAtual = useGameStore(state => state.rodadaAtual);
  const partidas = useGameStore(state => state.partidas);

  const clube = clubeUsuarioId
    ? clubes.find(item => item.id === clubeUsuarioId)
    : undefined;
  const indiceTabela = clubeUsuarioId
    ? tabela.findIndex(linha => linha.clubeId === clubeUsuarioId)
    : -1;
  const posicao = indiceTabela === -1 ? tabela.length : indiceTabela + 1;
  // Total de rodadas da liga ATIVA (38 no Brasileirão, 34 na Premier…).
  const totalRodadas = partidas.reduce(
    (maior, partida) => Math.max(maior, partida.rodada),
    0,
  );
  const rodadaExibida = Math.min(rodadaAtual, totalRodadas || rodadaAtual);

  return (
    <Screen>
      <View style={styles.corpo}>
        <View style={styles.hero}>
          <LogoFoteball />
          <Text variant="display">FOTEBALL</Text>
          <Text variant="labelL" color="accent" style={styles.marca}>
            MANAGER
          </Text>
          <Text variant="bodyM" color="textSecondary" align="center">
            Construa uma dinastia no futebol brasileiro
          </Text>
        </View>

        <Card variante={clubeUsuarioId ? 'status' : 'outlined'} status="brand">
          {clube ? (
            <>
              <View style={styles.cardTopo}>
                <Escudo clubeId={clube.id} sigla={clube.sigla} tamanho={46} />
                <View style={styles.flex1}>
                  <Text variant="labelM" color="brand" style={styles.caps}>
                    Carreira atual
                  </Text>
                  <Text variant="titleL" numberOfLines={1}>
                    {clube.nome}
                  </Text>
                </View>
              </View>
              <Divider style={styles.divisor} />
              <View style={styles.statLinha}>
                <EstatCarreira
                  rotulo="Temporada"
                  valor={String(temporadaAtual)}
                />
                <Divider vertical style={styles.statSep} />
                <EstatCarreira
                  rotulo="Rodada"
                  valor={`${rodadaExibida}/${totalRodadas || 38}`}
                />
                <Divider vertical style={styles.statSep} />
                <EstatCarreira rotulo="Posição" valor={`${posicao}º`} />
              </View>
            </>
          ) : (
            <>
              <Text variant="labelM" color="brand" style={styles.caps}>
                Novo desafio
              </Text>
              <Text variant="titleL">Nenhuma carreira ativa</Text>
              <Text variant="bodyM" color="textSecondary">
                Brasileirão Série A 2026 · 20 clubes
              </Text>
            </>
          )}
        </Card>

        <View style={styles.acoes}>
          {clubeUsuarioId ? (
            <>
              <Button
                variante="primary"
                tamanho="lg"
                icone="jogar"
                titulo="Continuar carreira"
                onPress={() => nav.navigate('MainTabs')}
                fullWidth
              />
              <Button
                variante="secondary"
                icone="troca"
                titulo="Nova carreira"
                onPress={() => nav.navigate('LeagueSelect')}
                fullWidth
              />
            </>
          ) : (
            <Button
              variante="primary"
              tamanho="lg"
              icone="jogar"
              titulo="Começar agora"
              onPress={() => nav.navigate('LeagueSelect')}
              fullWidth
            />
          )}
        </View>

        <Text variant="caption" color="textSecondary" align="center">
          Feito no Brasil · v{VERSAO_APP}
        </Text>
      </View>
    </Screen>
  );
}

/** Coluna de estatística da carreira: rótulo em caps + valor tabular. */
function EstatCarreira({
  rotulo,
  valor,
}: {
  rotulo: string;
  valor: string;
}): React.JSX.Element {
  return (
    <View style={styles.stat}>
      <Text variant="caption" color="textSecondary" style={styles.caps}>
        {rotulo}
      </Text>
      <Text variant="titleM" tabular>
        {valor}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  corpo: {
    flex: 1,
    padding: espacamento[4],
    paddingBottom: espacamento[6],
    gap: espacamento[4],
  },
  // O herói absorve o espaço livre e centraliza a marca nele — o restante
  // (card/ações/versão) fica ancorado na base, ao alcance do polegar.
  hero: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: espacamento[2]},
  marca: {letterSpacing: 7},
  caps: {textTransform: 'uppercase', letterSpacing: 1},
  cardTopo: {flexDirection: 'row', alignItems: 'center', gap: espacamento[3]},
  flex1: {flex: 1},
  divisor: {marginVertical: espacamento[3]},
  statLinha: {flexDirection: 'row', alignItems: 'center'},
  stat: {flex: 1, alignItems: 'center', gap: 2},
  statSep: {height: 28, alignSelf: 'center'},
  acoes: {gap: espacamento[3]},
});

export default MainMenu;
