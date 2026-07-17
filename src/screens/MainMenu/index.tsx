/**
 * Tela inicial do FOTEBALL — marca, emblema e resumo da carreira ativa, com
 * atalhos para continuar ou iniciar uma nova carreira. Migrada ao Design System v2.
 */

import React from 'react';
import {StyleSheet, View} from 'react-native';

import Escudo from '../../components/Escudo';
import LogoFoteball from '../../components/LogoFoteball';
import {
  Box,
  Button,
  Card,
  Icon,
  Screen,
  Text,
  espacamento,
} from '../../design-system';
import type {IconeNome} from '../../components/Icone';
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
    <Screen scroll>
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
            <View style={styles.chips}>
              <InfoChip icone="calendario" texto={`Temporada ${temporadaAtual}`} />
              <InfoChip
                icone="bola"
                texto={`Rodada ${rodadaExibida}/${totalRodadas || 38}`}
              />
              <InfoChip icone="tabela" texto={`${posicao}º lugar`} />
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
    </Screen>
  );
}

function InfoChip({
  icone,
  texto,
}: {
  icone: IconeNome;
  texto: string;
}): React.JSX.Element {
  return (
    <Box
      bg="surfaceSubtle"
      bordered
      radius="full"
      px={3}
      py={1}
      direction="row"
      align="center"
      gap={1}>
      <Icon nome={icone} size={13} color="brand" />
      <Text variant="labelM">{texto}</Text>
    </Box>
  );
}

const styles = StyleSheet.create({
  hero: {alignItems: 'center', gap: espacamento[2], marginVertical: espacamento[6]},
  marca: {letterSpacing: 7},
  caps: {textTransform: 'uppercase', letterSpacing: 1},
  cardTopo: {flexDirection: 'row', alignItems: 'center', gap: espacamento[3]},
  flex1: {flex: 1},
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacamento[2],
    marginTop: espacamento[3],
  },
  acoes: {gap: espacamento[3], marginTop: espacamento[4]},
});

export default MainMenu;
