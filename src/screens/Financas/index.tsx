/**
 * Finanças (aba Clube). Saldo atual, resultado do mês, evolução (net por mês do
 * histórico real), e a quebra de receitas/despesas + folha salarial. Dados reais
 * de `clube.financas` — nada é inventado.
 */
import React, {useMemo} from 'react';
import {StyleSheet, View} from 'react-native';

import {
  AppHeader,
  Card,
  Divider,
  EmptyState,
  ProgressBar,
  Screen,
  SectionHeader,
  Text,
  espacamento,
  raios,
  useTheme,
} from '../../design-system';
import {
  selecionarClubeUsuario,
  useGameStore,
  useJogadoresUsuario,
} from '../../store/useGameStore';
import {calcularFolhaSalarial} from '../../engine/finance/financeEngine';
import {useClubeNavigation} from '../../navigation/types';
import {moeda, moedaCompacta} from '../../utils/formatters';
import type {Transacao} from '../../types';

/** Rótulo amigável de cada categoria de transação. */
const LABEL_CATEGORIA: Record<string, string> = {
  bilheteria: 'Bilheteria',
  patrocinio: 'Patrocínio',
  premiacoes: 'Premiações',
  vendaJogadores: 'Venda de jogadores',
  cotaTV: 'Cota de TV',
  salarios: 'Salários',
  manutencaoEstadio: 'Manutenção do estádio',
  comissoes: 'Comissões',
  contratacoes: 'Contratações',
  juros: 'Juros do saldo negativo',
};

/** Agrega o histórico REAL por categoria (o dado mensal do seed fica sempre 0). */
function agregarPorCategoria(
  transacoes: Transacao[],
  tipo: 'receita' | 'despesa',
): {rotulo: string; valor: number}[] {
  const m = new Map<string, number>();
  for (const t of transacoes) {
    if (t.tipo === tipo) {
      m.set(t.categoria, (m.get(t.categoria) ?? 0) + Math.abs(t.valor));
    }
  }
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([cat, valor]) => ({rotulo: LABEL_CATEGORIA[cat] ?? cat, valor}));
}

/** Net por mês (YYYY-MM) dos últimos 6 meses do histórico. Defensivo a datas. */
function evolucaoMensal(transacoes: Transacao[]): {mes: string; net: number}[] {
  const porMes = new Map<string, number>();
  for (const t of transacoes) {
    const d = new Date(t.data);
    if (Number.isNaN(d.getTime())) {
      continue;
    }
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const delta = t.tipo === 'receita' ? t.valor : -t.valor;
    porMes.set(chave, (porMes.get(chave) ?? 0) + delta);
  }
  return [...porMes.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([mes, net]) => ({mes: mes.slice(5), net}));
}

function Financas(): React.JSX.Element {
  const nav = useClubeNavigation();
  const {cores} = useTheme();
  const clube = useGameStore(selecionarClubeUsuario);
  const elenco = useJogadoresUsuario();

  const voltar = () =>
    nav.canGoBack() ? nav.goBack() : nav.navigate('CentralClube');

  const dados = useMemo(() => {
    if (!clube) {
      return null;
    }
    const {financas} = clube;
    // A quebra mensal do seed nunca é atualizada pela engine (fica 0). O dado
    // REAL é o histórico de transações — receitas/despesas por categoria.
    const receitas = agregarPorCategoria(financas.historicoTransacoes, 'receita');
    const despesas = agregarPorCategoria(financas.historicoTransacoes, 'despesa');
    const totalReceita = receitas.reduce((s, x) => s + x.valor, 0);
    const totalDespesa = despesas.reduce((s, x) => s + x.valor, 0);
    const folha = calcularFolhaSalarial(elenco);
    const pctFolha =
      totalReceita > 0 ? Math.min(100, (folha / totalReceita) * 100) : 0;
    return {
      saldo: financas.saldo,
      resultado: totalReceita - totalDespesa,
      totalReceita,
      totalDespesa,
      folha,
      pctFolha,
      receitas,
      despesas,
      evolucao: evolucaoMensal(financas.historicoTransacoes),
    };
  }, [clube, elenco]);

  if (!dados) {
    return (
      <Screen header={<AppHeader title="Finanças" onBack={voltar} />}>
        <View style={estilos.vazio}>
          <EmptyState
            icone="dinheiro"
            title="Sem dados financeiros"
            description="Inicie ou carregue uma carreira para ver as finanças do clube."
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll header={<AppHeader title="Finanças" onBack={voltar} />}>
      {/* Saldo + resultado do mês */}
      <Card variante="outlined" style={estilos.saldoCard}>
        <Text variant="labelM" color="textSecondary" align="center">
          Saldo atual
        </Text>
        <Text
          variant="display"
          color={dados.saldo < 0 ? 'danger' : 'textPrimary'}
          align="center"
          tabular>
          {moedaCompacta(dados.saldo)}
        </Text>
        <Text
          variant="labelL"
          color={dados.resultado < 0 ? 'danger' : 'success'}
          align="center"
          tabular>
          Resultado do mês {dados.resultado >= 0 ? '+' : ''}
          {moedaCompacta(dados.resultado)}
        </Text>
      </Card>

      {dados.evolucao.length > 1 ? (
        <Card variante="outlined" style={estilos.evolCard}>
          <Text variant="labelM" color="textSecondary">
            Evolução (últimos meses)
          </Text>
          <EvolucaoChart dados={dados.evolucao} />
        </Card>
      ) : null}

      <SectionHeader titulo="Resumo do mês" />
      <Card variante="outlined" padding={0} style={estilos.lista}>
        <LinhaValor rotulo="Receitas" valor={dados.totalReceita} tom="success" />
        <Divider />
        <LinhaValor rotulo="Despesas" valor={-dados.totalDespesa} tom="danger" />
        <Divider />
        <View style={estilos.folha}>
          <View style={estilos.folhaTopo}>
            <Text variant="labelL">Folha salarial</Text>
            <Text variant="labelL" tabular color="textSecondary">
              {moeda(dados.folha)}
              <Text variant="caption" color="textMuted">
                {' '}
                /mês
              </Text>
            </Text>
          </View>
          <ProgressBar
            valor={dados.pctFolha}
            cor={
              dados.pctFolha > 80
                ? cores.danger
                : dados.pctFolha > 60
                ? cores.warning
                : cores.brand
            }
          />
          <Text variant="caption" color="textMuted">
            {Math.round(dados.pctFolha)}% da receita do mês
          </Text>
        </View>
      </Card>

      <SectionHeader titulo="Receitas" />
      <Card variante="outlined" padding={0} style={estilos.lista}>
        {dados.receitas.map((it, i) => (
          <React.Fragment key={it.rotulo}>
            {i > 0 ? <Divider /> : null}
            <LinhaValor rotulo={it.rotulo} valor={it.valor} tom="success" />
          </React.Fragment>
        ))}
      </Card>

      <SectionHeader titulo="Despesas" />
      <Card variante="outlined" padding={0} style={estilos.lista}>
        {dados.despesas.map((it, i) => (
          <React.Fragment key={it.rotulo}>
            {i > 0 ? <Divider /> : null}
            <LinhaValor rotulo={it.rotulo} valor={-it.valor} tom="danger" />
          </React.Fragment>
        ))}
      </Card>
    </Screen>
  );
}

/** Linha rótulo + valor (verde receita / vermelho despesa). */
function LinhaValor({
  rotulo,
  valor,
  tom,
}: {
  rotulo: string;
  valor: number;
  tom: 'success' | 'danger';
}): React.JSX.Element {
  return (
    <View style={estilos.linha}>
      <Text variant="labelL" style={estilos.flex}>
        {rotulo}
      </Text>
      <Text variant="labelL" color={tom} tabular>
        {valor >= 0 ? '+' : ''}
        {moedaCompacta(valor)}
      </Text>
    </View>
  );
}

/** Barras verticais de net por mês (verde positivo / vermelho negativo). */
function EvolucaoChart({
  dados,
}: {
  dados: {mes: string; net: number}[];
}): React.JSX.Element {
  const {cores} = useTheme();
  const max = Math.max(1, ...dados.map(d => Math.abs(d.net)));
  return (
    <View style={estilos.chart}>
      {dados.map(d => {
        const alt = (Math.abs(d.net) / max) * 46;
        return (
          <View key={d.mes} style={estilos.chartCol}>
            <View style={estilos.chartBarWrap}>
              <View
                style={[
                  estilos.chartBar,
                  {
                    height: Math.max(3, alt),
                    backgroundColor: d.net >= 0 ? cores.success : cores.danger,
                  },
                ]}
              />
            </View>
            <Text variant="caption" color="textMuted">
              {d.mes}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default Financas;

const estilos = StyleSheet.create({
  vazio: {flex: 1, justifyContent: 'center', padding: espacamento[4]},
  saldoCard: {gap: espacamento[1], alignItems: 'stretch'},
  evolCard: {gap: espacamento[2]},
  lista: {paddingHorizontal: espacamento[3]},
  flex: {flex: 1},
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    gap: espacamento[2],
  },
  folha: {paddingVertical: espacamento[2], gap: espacamento[2]},
  folhaTopo: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  chart: {flexDirection: 'row', alignItems: 'flex-end', gap: espacamento[2], height: 72},
  chartCol: {flex: 1, alignItems: 'center', gap: espacamento[1]},
  chartBarWrap: {height: 48, justifyContent: 'flex-end'},
  chartBar: {width: 22, borderRadius: raios.sm},
});
