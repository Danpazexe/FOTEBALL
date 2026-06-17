/**
 * Tela inicial do FOTEBALL — marca, emblema e resumo da carreira ativa, com
 * atalhos para continuar ou iniciar uma nova carreira. Fundo em degradê herdado
 * do ScreenContainer.
 */

import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {Botao, Card, ScreenContainer} from '../../components/ui';
import Escudo from '../../components/Escudo';
import Icone, {type IconeNome} from '../../components/Icone';
import LogoFoteball from '../../components/LogoFoteball';
import {cores, espaco, raio} from '../../theme';
import {useGameStore} from '../../store/useGameStore';
import {useAppNavigation} from '../../navigation/types';

function MainMenu(): React.JSX.Element {
  const nav = useAppNavigation();
  const clubes = useGameStore(state => state.clubes);
  const tabela = useGameStore(state => state.tabela);
  const clubeUsuarioId = useGameStore(state => state.clubeUsuarioId);
  const temporadaAtual = useGameStore(state => state.temporadaAtual);
  const rodadaAtual = useGameStore(state => state.rodadaAtual);

  const clube = clubeUsuarioId
    ? clubes.find(item => item.id === clubeUsuarioId)
    : undefined;
  const indiceTabela = clubeUsuarioId
    ? tabela.findIndex(linha => linha.clubeId === clubeUsuarioId)
    : -1;
  const posicao = indiceTabela === -1 ? tabela.length : indiceTabela + 1;
  const rodadaExibida = Math.min(rodadaAtual, 38);

  return (
    <ScreenContainer scroll>
      <View style={styles.hero}>
        <LogoFoteball />
        <Text style={styles.titulo}>FOTEBALL</Text>
        <Text style={styles.subtitulo}>MANAGER</Text>
        <Text style={styles.tagline}>
          Construa uma dinastia no futebol brasileiro
        </Text>
      </View>

      <Card destaque={!!clubeUsuarioId}>
        {clube ? (
          <>
            <View style={styles.cardTopo}>
              <Escudo clubeId={clube.id} sigla={clube.sigla} tamanho={46} />
              <View style={styles.flex1}>
                <Text style={styles.cardLabel}>Carreira atual</Text>
                <Text style={styles.cardTitulo} numberOfLines={1}>
                  {clube.nome}
                </Text>
              </View>
            </View>
            <View style={styles.chips}>
              <Chip icone="calendario" texto={`Temporada ${temporadaAtual}`} />
              <Chip icone="bola" texto={`Rodada ${rodadaExibida}/38`} />
              <Chip icone="tabela" texto={`${posicao}º lugar`} />
            </View>
          </>
        ) : (
          <>
            <Text style={styles.cardLabel}>Novo desafio</Text>
            <Text style={styles.cardTitulo}>Nenhuma carreira ativa</Text>
            <Text style={styles.cardResumo}>
              Brasileirão Série A 2026 · 20 clubes
            </Text>
          </>
        )}
      </Card>

      <View style={styles.acoes}>
        {clubeUsuarioId ? (
          <>
            <Botao
              variante="grande"
              icone="jogar"
              titulo="Continuar carreira"
              onPress={() => nav.navigate('MainTabs')}
            />
            <Botao
              variante="secundaria"
              icone="troca"
              titulo="Nova carreira"
              onPress={() => nav.navigate('LeagueSelect')}
            />
          </>
        ) : (
          <Botao
            variante="grande"
            icone="jogar"
            titulo="Começar agora"
            onPress={() => nav.navigate('LeagueSelect')}
          />
        )}
      </View>

      <Text style={styles.rodape}>Feito no Brasil · v0.0.1</Text>
    </ScreenContainer>
  );
}

function Chip({
  icone,
  texto,
}: {
  icone: IconeNome;
  texto: string;
}): React.JSX.Element {
  return (
    <View style={styles.chip}>
      <Icone nome={icone} tamanho={13} cor={cores.primaria} />
      <Text style={styles.chipTexto}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    marginTop: espaco.xxl,
    marginBottom: espaco.xl,
    gap: espaco.sm,
  },
  titulo: {
    color: cores.texto,
    fontSize: 46,
    fontWeight: '900',
    letterSpacing: 3,
    marginTop: espaco.md,
  },
  subtitulo: {
    color: cores.secundaria,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 7,
    marginTop: -espaco.xs,
  },
  tagline: {
    color: cores.textoSecundario,
    fontSize: 13,
    textAlign: 'center',
    marginTop: espaco.xs,
    paddingHorizontal: espaco.lg,
  },
  cardTopo: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.md,
  },
  flex1: {
    flex: 1,
  },
  cardLabel: {
    color: cores.primaria,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardTitulo: {
    color: cores.texto,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  cardResumo: {
    color: cores.textoSecundario,
    fontSize: 13,
    marginTop: espaco.xs,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaco.sm,
    marginTop: espaco.md,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: cores.superficieAlt,
    borderColor: cores.bordaClara,
    borderRadius: raio.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: espaco.xs,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.xs,
  },
  chipTexto: {
    color: cores.texto,
    fontSize: 12,
    fontWeight: '700',
  },
  acoes: {
    gap: espaco.md,
    marginTop: espaco.xl,
  },
  rodape: {
    color: cores.textoSecundario,
    fontSize: 11,
    textAlign: 'center',
    marginTop: espaco.xl,
  },
});

export default MainMenu;
