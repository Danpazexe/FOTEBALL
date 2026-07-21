/**
 * Departamento Médico (aba Elenco). Prontidão do elenco derivada de dado REAL:
 * condição física média dos aptos, lesionados (com previsão e gravidade), em
 * recuperação (condição baixa) e disponíveis; risco de lesão por condição +
 * idade. Ajuste de carga → Treino. Nada é inventado. DS v2.
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
  corCondicao,
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

function estadoDoJogador(j: Player): Estado {
  if (j.lesionado) {
    return 'lesionado';
  }
  if (j.condicaoFisica < CONDICAO_RECUPERACAO) {
    return 'recuperacao';
  }
  return 'disponivel';
}

// ─── Gravidade da lesão (pelos dias de retorno) ──────────────────────────────
type Gravidade = 'Leve' | 'Moderada' | 'Grave';

function gravidadeLesao(diasLesao: number): {rotulo: Gravidade; tom: CorTexto} {
  if (diasLesao <= 6) {
    return {rotulo: 'Leve', tom: 'accent'};
  }
  if (diasLesao <= 20) {
    return {rotulo: 'Moderada', tom: 'warning'};
  }
  return {rotulo: 'Grave', tom: 'danger'};
}

// ─── Risco de lesão (condição baixa + idade avançada elevam) ─────────────────
type Risco = 'Baixo' | 'Médio' | 'Alto';

function riscoLesao(j: Player): {rotulo: Risco; tom: CorTexto} {
  let pontos = 0;
  if (j.condicaoFisica < 55) {
    pontos += 2;
  } else if (j.condicaoFisica < 70) {
    pontos += 1;
  }
  if (j.idade >= 33) {
    pontos += 2;
  } else if (j.idade >= 30) {
    pontos += 1;
  }
  if (pontos >= 3) {
    return {rotulo: 'Alto', tom: 'danger'};
  }
  if (pontos >= 1) {
    return {rotulo: 'Médio', tom: 'warning'};
  }
  return {rotulo: 'Baixo', tom: 'success'};
}

function recomendacao(j: Player, estado: Estado): string {
  if (estado === 'lesionado') {
    return j.diasLesao > 20
      ? 'Tratamento intensivo'
      : j.diasLesao > 6
      ? 'Tratamento em curso'
      : 'Fisioterapia leve';
  }
  if (estado === 'recuperacao') {
    return j.condicaoFisica < 55 ? 'Poupar — carga reduzida' : 'Retorno gradual';
  }
  return 'Apto para jogar';
}

// Qualidade da prontidão média do elenco. tom (success/warning/danger) tem os
// mesmos hex de fitness.high/medium/low → barra e rótulo na mesma cor.
function faixaProntidao(pct: number): {rotulo: string; tom: CorTexto} {
  if (pct >= 80) {
    return {rotulo: 'Ótima', tom: 'success'};
  }
  if (pct >= 70) {
    return {rotulo: 'Boa', tom: 'success'};
  }
  if (pct >= 55) {
    return {rotulo: 'Atenção', tom: 'warning'};
  }
  return {rotulo: 'Crítica', tom: 'danger'};
}

function DepartamentoMedico(): React.JSX.Element {
  const nav = useElencoNavigation();
  const {esporte} = useTheme();
  const [aba, setAba] = useState<Aba>('todos');
  const elenco = useJogadoresUsuario();

  const {disponiveis, recuperacao, lesionados, riscoAlto, prontidao} =
    useMemo(() => {
      let d = 0;
      let r = 0;
      let l = 0;
      let risc = 0;
      let somaCond = 0;
      let aptos = 0;
      for (const j of elenco) {
        const e = estadoDoJogador(j);
        if (e === 'lesionado') {
          l += 1;
        } else if (e === 'recuperacao') {
          r += 1;
        } else {
          d += 1;
        }
        if (!j.lesionado) {
          somaCond += j.condicaoFisica;
          aptos += 1;
          if (riscoLesao(j).rotulo === 'Alto') {
            risc += 1;
          }
        }
      }
      return {
        disponiveis: d,
        recuperacao: r,
        lesionados: l,
        riscoAlto: risc,
        prontidao: aptos > 0 ? Math.round(somaCond / aptos) : 0,
      };
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

  const faixa = faixaProntidao(prontidao);
  const corProntidao =
    faixa.tom === 'success'
      ? esporte.fitness.high
      : faixa.tom === 'warning'
      ? esporte.fitness.medium
      : esporte.fitness.low;

  return (
    <Screen
      scroll
      header={
        <AppHeader
          title="Departamento Médico"
          onBack={() => (nav.canGoBack() ? nav.goBack() : undefined)}
        />
      }>
      {/* Prontidão média do elenco (condição dos aptos) */}
      <Card variante="outlined" style={styles.prontidaoCard}>
        <View style={styles.prontidaoTopo}>
          <View style={styles.flex}>
            <Text variant="labelM" color="textSecondary">
              Prontidão do elenco
            </Text>
            <View style={styles.prontidaoValor}>
              <Text variant="titleXL" color={faixa.tom} tabular>
                {prontidao}%
              </Text>
              <Text variant="labelM" color={faixa.tom}>
                {faixa.rotulo}
              </Text>
            </View>
            <Text variant="caption" color="textMuted">
              Média de condição física dos aptos
            </Text>
          </View>
          <Icon nome="lesao" size={22} color={faixa.tom} />
        </View>
        <ProgressBar valor={prontidao} cor={corProntidao} altura={8} />
      </Card>

      {/* Contagem por estado */}
      <Card variante="outlined" style={styles.statsRow}>
        <CelulaStat valor={disponiveis} rotulo="Disponíveis" tom="success" />
        <Divider vertical />
        <CelulaStat valor={recuperacao} rotulo="Em recuperação" tom="warning" />
        <Divider vertical />
        <CelulaStat valor={lesionados} rotulo="Lesionados" tom="danger" />
      </Card>

      {riscoAlto > 0 ? (
        <Card variante="status" status="warning" padding={3} style={styles.cargaCard}>
          <Icon nome="lesao" size={18} color="warning" />
          <Text variant="labelL" style={styles.flex}>
            Alto risco de lesão: {riscoAlto} jogador{riscoAlto > 1 ? 'es' : ''}
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
            const corCond = corCondicao(j.condicaoFisica, esporte);
            const progresso = lesionado
              ? Math.max(5, 100 - j.diasLesao * 6)
              : j.condicaoFisica;
            const grav = lesionado ? gravidadeLesao(j.diasLesao) : null;
            const risco = !lesionado ? riscoLesao(j) : null;
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
                      <Text variant="caption" color="textMuted" tabular>
                        {j.idade} anos
                      </Text>
                    </View>
                    <View style={styles.nomeLinha}>
                      <Text
                        variant="caption"
                        color={lesionado ? 'danger' : 'warning'}
                        style={styles.flex}>
                        {lesionado
                          ? `Lesionado · retorno em ${j.diasLesao} dia${j.diasLesao > 1 ? 's' : ''}`
                          : `Condição física ${j.condicaoFisica}%`}
                      </Text>
                      {grav ? (
                        <Text variant="caption" weight="800" color={grav.tom}>
                          {grav.rotulo}
                        </Text>
                      ) : risco ? (
                        <Text variant="caption" weight="800" color={risco.tom}>
                          Risco {risco.rotulo}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>
                <ProgressBar valor={progresso} cor={corCond} />
                <Text variant="caption" color="textSecondary">
                  {lesionado ? 'Recuperação' : 'Condição'} ·{' '}
                  {recomendacao(j, estado)}
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
  prontidaoCard: {gap: espacamento[3]},
  prontidaoTopo: {flexDirection: 'row', alignItems: 'center', gap: espacamento[3]},
  prontidaoValor: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: espacamento[2],
  },
  statsRow: {flexDirection: 'row', alignItems: 'center'},
  celula: {flex: 1, alignItems: 'center', gap: 2},
  cargaCard: {flexDirection: 'row', alignItems: 'center', gap: espacamento[2]},
  lista: {gap: espacamento[2]},
  card: {gap: espacamento[2]},
  cardTopo: {flexDirection: 'row', alignItems: 'center', gap: espacamento[3]},
  nomeLinha: {flexDirection: 'row', alignItems: 'center', gap: espacamento[2]},
});
