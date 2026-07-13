/**
 * Departamento Médico (aba Elenco). Prontidão do elenco derivada de dado REAL:
 * lesionados (com previsão de retorno), em recuperação (condição baixa) e
 * disponíveis; risco elevado por condição crítica. Ajuste de carga → Treino.
 * DS v2.
 */
import React, {useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import {
  AppHeader,
  Button,
  Card,
  Divider,
  EmptyState,
  Icon,
  PositionBadge,
  ProgressBar,
  Screen,
  SegmentedTabs,
  Text,
  espacamento,
  useTheme,
  type CorTexto,
} from '../../design-system';
import PlayerAvatar from '../../components/PlayerAvatar';
import {useElencoNavigation} from '../../navigation/types';
import {useJogadoresUsuario} from '../../store/useGameStore';
import type {Player} from '../../types';

type Aba = 'todos' | 'lesionados' | 'recuperacao';
type Estado = 'lesionado' | 'recuperacao' | 'disponivel';

const CONDICAO_RECUPERACAO = 65;
const CONDICAO_RISCO = 50;

function estadoDoJogador(j: Player): Estado {
  if (j.lesionado) {
    return 'lesionado';
  }
  if (j.condicaoFisica < CONDICAO_RECUPERACAO) {
    return 'recuperacao';
  }
  return 'disponivel';
}

function recomendacao(j: Player, estado: Estado): string {
  if (estado === 'lesionado') {
    return j.diasLesao > 10 ? 'Tratamento intensivo' : 'Tratamento em curso';
  }
  if (estado === 'recuperacao') {
    return j.condicaoFisica < CONDICAO_RISCO ? 'Carga reduzida' : 'Retorno gradual';
  }
  return 'Apto para jogar';
}

function DepartamentoMedico(): React.JSX.Element {
  const nav = useElencoNavigation();
  const {esporte} = useTheme();
  const [aba, setAba] = useState<Aba>('todos');
  const elenco = useJogadoresUsuario();

  const {disponiveis, recuperacao, lesionados, risco} = useMemo(() => {
    let d = 0;
    let r = 0;
    let l = 0;
    let risc = 0;
    for (const j of elenco) {
      const e = estadoDoJogador(j);
      if (e === 'lesionado') {
        l += 1;
      } else if (e === 'recuperacao') {
        r += 1;
      } else {
        d += 1;
      }
      if (!j.lesionado && j.condicaoFisica < CONDICAO_RISCO) {
        risc += 1;
      }
    }
    return {disponiveis: d, recuperacao: r, lesionados: l, risco: risc};
  }, [elenco]);

  const lista = useMemo(() => {
    const comEstado = elenco
      .map(j => ({j, estado: estadoDoJogador(j)}))
      .filter(x => x.estado !== 'disponivel');
    const filtrada =
      aba === 'lesionados'
        ? comEstado.filter(x => x.estado === 'lesionado')
        : aba === 'recuperacao'
        ? comEstado.filter(x => x.estado === 'recuperacao')
        : comEstado;
    // Lesionados primeiro, depois por condição.
    return filtrada.sort(
      (a, b) =>
        Number(b.estado === 'lesionado') - Number(a.estado === 'lesionado') ||
        a.j.condicaoFisica - b.j.condicaoFisica,
    );
  }, [elenco, aba]);

  return (
    <Screen
      scroll
      header={
        <AppHeader
          title="Departamento Médico"
          onBack={() => (nav.canGoBack() ? nav.goBack() : undefined)}
        />
      }>
      {/* Prontidão */}
      <Card variante="outlined" style={styles.statsRow}>
        <CelulaStat valor={disponiveis} rotulo="Disponíveis" tom="success" />
        <Divider vertical />
        <CelulaStat valor={recuperacao} rotulo="Em recuperação" tom="accent" />
        <Divider vertical />
        <CelulaStat valor={lesionados} rotulo="Lesionado" tom="danger" />
      </Card>

      {risco > 0 ? (
        <Card variante="status" status="warning" padding={3} style={styles.cargaCard}>
          <Icon nome="lesao" size={18} color="warning" />
          <Text variant="labelL">
            Risco elevado para {risco} jogador{risco > 1 ? 'es' : ''}
          </Text>
        </Card>
      ) : null}

      <SegmentedTabs
        abas={[
          {chave: 'todos', rotulo: 'Todos'},
          {chave: 'lesionados', rotulo: 'Lesionados'},
          {chave: 'recuperacao', rotulo: 'Recuperação'},
        ]}
        ativa={aba}
        onSelect={c => setAba(c as Aba)}
      />

      {lista.length === 0 ? (
        <View style={styles.vazio}>
          <EmptyState
            icone="check"
            title="Elenco 100% saudável"
            description="Nenhum jogador lesionado ou em recuperação."
          />
        </View>
      ) : (
        <View style={styles.lista}>
          {lista.map(({j, estado}) => {
            const lesionado = estado === 'lesionado';
            const corCond =
              j.condicaoFisica >= 75
                ? esporte.fitness.high
                : j.condicaoFisica >= 50
                ? esporte.fitness.medium
                : esporte.fitness.low;
            const progresso = lesionado
              ? Math.max(5, 100 - j.diasLesao * 6)
              : j.condicaoFisica;
            return (
              <Card key={j.id} variante="outlined" style={styles.card}>
                <View style={styles.cardTopo}>
                  <PlayerAvatar id={j.id} tamanho={40} />
                  <View style={styles.flex}>
                    <View style={styles.nomeLinha}>
                      <PositionBadge posicao={j.posicaoPrincipal} tamanho="sm" />
                      <Text variant="labelL" numberOfLines={1} style={styles.flex}>
                        {j.apelido ?? j.nome}
                      </Text>
                    </View>
                    <Text
                      variant="caption"
                      color={lesionado ? 'danger' : 'warning'}>
                      {lesionado
                        ? `Lesionado · retorno em ${j.diasLesao} dia${j.diasLesao > 1 ? 's' : ''}`
                        : `Condição física ${j.condicaoFisica}%`}
                    </Text>
                  </View>
                </View>
                <ProgressBar valor={progresso} cor={corCond} />
                <Text variant="caption" color="textSecondary">
                  Recomendação: {recomendacao(j, estado)}
                </Text>
              </Card>
            );
          })}
        </View>
      )}

      <Button
        icone="apito"
        variante="secondary"
        titulo="Ajustar carga de treino"
        onPress={() => nav.navigate('Semana')}
        fullWidth
      />
    </Screen>
  );
}

function CelulaStat({
  valor,
  rotulo,
  tom,
}: {
  valor: number;
  rotulo: string;
  tom: CorTexto;
}): React.JSX.Element {
  return (
    <View style={styles.celula}>
      <Text variant="titleL" color={tom} tabular>
        {valor}
      </Text>
      <Text variant="caption" color="textSecondary" align="center">
        {rotulo}
      </Text>
    </View>
  );
}

export default DepartamentoMedico;

const styles = StyleSheet.create({
  flex: {flex: 1},
  vazio: {flex: 1, justifyContent: 'center', paddingVertical: espacamento[6]},
  statsRow: {flexDirection: 'row', alignItems: 'center'},
  celula: {flex: 1, alignItems: 'center', gap: 2},
  cargaCard: {flexDirection: 'row', alignItems: 'center', gap: espacamento[2]},
  lista: {gap: espacamento[2]},
  card: {gap: espacamento[2]},
  cardTopo: {flexDirection: 'row', alignItems: 'center', gap: espacamento[3]},
  nomeLinha: {flexDirection: 'row', alignItems: 'center', gap: espacamento[2]},
});
