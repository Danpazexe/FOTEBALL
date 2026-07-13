/**
 * Aba "Clube" / Finanças. Saldo em destaque, donuts de receitas/despesas, alerta
 * de folha, projeção, estádio, preço do ingresso e histórico. Migrada ao DS v2.
 */

import React, {useMemo} from 'react';
import {StyleSheet, View} from 'react-native';

import DonutChart, {type FatiaDonut} from '../../components/DonutChart';
import {
  AppBar,
  Button,
  Card,
  Chip,
  Icon,
  Screen,
  StatValue,
  Text,
  espacamento,
} from '../../design-system';
import {useToast} from '../../components/feedback';
import {calcularFolhaSalarial} from '../../engine/finance/financeEngine';
import {useAppNavigation} from '../../navigation/types';
import {
  CAPACIDADE_MAX_ESTADIO,
  INFRA_MAX_ESTADIO,
  LUGARES_POR_AMPLIACAO,
  custoAmpliacaoEstadio,
  custoMelhoriaInfra,
  selecionarClubeUsuario,
  useGameStore,
} from '../../store/useGameStore';
import {moeda, moedaCompacta} from '../../utils/formatters';
import type {Transacao} from '../../types';

const ROTULO_CATEGORIA: Record<string, string> = {
  bilheteria: 'Bilheteria',
  patrocinio: 'Patrocínio',
  premiacoes: 'Premiações',
  vendaJogadores: 'Vendas',
  salarios: 'Salários',
  manutencaoEstadio: 'Estádio',
  comissoes: 'Comissões',
  contratacoes: 'Contratações',
};

// Paleta de séries do gráfico (categórica, independente de tema).
const CORES_RECEITA = ['#13A65A', '#F2B43C', '#2878F0', '#8B5CF6'];
const CORES_DESPESA = ['#D64545', '#F59E0B', '#FB923C', '#64748B'];

const PRESETS_PRECO: {rotulo: string; fator: number}[] = [
  {rotulo: 'Barato', fator: 0.75},
  {rotulo: 'Normal', fator: 1.0},
  {rotulo: 'Caro', fator: 1.4},
];

function agregar(
  historico: Transacao[],
  tipo: 'receita' | 'despesa',
  paleta: string[],
): {fatias: FatiaDonut[]; total: number} {
  const mapa = new Map<string, number>();
  for (const transacao of historico) {
    if (transacao.tipo !== tipo) {
      continue;
    }
    mapa.set(
      transacao.categoria,
      (mapa.get(transacao.categoria) ?? 0) + Math.abs(transacao.valor),
    );
  }
  const entradas = [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  const fatias: FatiaDonut[] = entradas.map(([categoria, valor], index) => ({
    valor,
    cor: paleta[index % paleta.length],
    label: ROTULO_CATEGORIA[categoria] ?? categoria,
  }));
  const total = fatias.reduce((soma, fatia) => soma + fatia.valor, 0);
  return {fatias, total};
}

function Club(): React.JSX.Element {
  const nav = useAppNavigation();
  const toast = useToast();
  const clubeUsuario = useGameStore(selecionarClubeUsuario);
  const jogadores = useGameStore(state => state.jogadores);
  const melhorarEstadio = useGameStore(state => state.melhorarEstadio);
  const ajustarPrecoIngresso = useGameStore(
    state => state.ajustarPrecoIngresso,
  );

  const elenco = useMemo(
    () => jogadores.filter(j => j.clubeId === clubeUsuario?.id),
    [jogadores, clubeUsuario],
  );

  const receitas = useMemo(
    () =>
      clubeUsuario
        ? agregar(clubeUsuario.financas.historicoTransacoes, 'receita', CORES_RECEITA)
        : {fatias: [], total: 0},
    [clubeUsuario],
  );
  const despesas = useMemo(
    () =>
      clubeUsuario
        ? agregar(clubeUsuario.financas.historicoTransacoes, 'despesa', CORES_DESPESA)
        : {fatias: [], total: 0},
    [clubeUsuario],
  );

  if (!clubeUsuario) {
    return (
      <Screen scroll>
        <AppBar title="Clube" subtitle="Finanças do clube" />
        <Text variant="bodyM" color="textSecondary">
          Nenhum clube selecionado.
        </Text>
      </Screen>
    );
  }

  const {financas, estadio} = clubeUsuario;
  const historico = financas.historicoTransacoes;
  const capacidadeMaxima = estadio.capacidade >= CAPACIDADE_MAX_ESTADIO;
  const infraMaxima = estadio.nivelInfraestrutura >= INFRA_MAX_ESTADIO;
  const custoCapacidade = custoAmpliacaoEstadio(estadio.capacidade);
  const custoInfra = custoMelhoriaInfra(estadio.nivelInfraestrutura);
  const aoMelhorar = (tipo: 'capacidade' | 'infraestrutura') => {
    const resultado = melhorarEstadio(tipo);
    toast(resultado.mensagem, resultado.ok ? 'sucesso' : 'erro');
  };
  const fatorPreco = estadio.precoIngressoFator ?? 1;
  const precoEfetivo = Math.round(estadio.precoMedioIngresso * fatorPreco);
  const folha = calcularFolhaSalarial(elenco);
  const pctFolha = receitas.total > 0 ? (folha / receitas.total) * 100 : 0;
  const folhaAlta = pctFolha > 80;
  const semDados = receitas.total === 0 && despesas.total === 0;
  const saldoNeg = financas.saldo < 0;

  return (
    <Screen scroll>
      <AppBar title={clubeUsuario.nome} subtitle="Finanças do clube" />

      <Card variante="status" status={saldoNeg ? 'danger' : 'brand'}>
        <View style={styles.saldoHero}>
          <Icon nome="dinheiro" size={28} color={saldoNeg ? 'danger' : 'brand'} />
          <View style={styles.flex}>
            <Text variant="labelM" color="textSecondary" style={styles.caps}>
              Saldo do clube
            </Text>
            <Text
              variant="titleXL"
              color={saldoNeg ? 'danger' : 'brand'}
              tabular
              numberOfLines={1}
              adjustsFontSizeToFit>
              {moeda(financas.saldo)}
            </Text>
          </View>
        </View>
      </Card>

      <View style={styles.metricsRow}>
        <StatValue
          label="Estádio"
          value={estadio.capacidade.toLocaleString('pt-BR')}
          style={styles.flex}
        />
        <StatValue
          label="Reputação"
          value={String(clubeUsuario.reputacao)}
          style={styles.flex}
        />
        <StatValue label="Folha" value={moedaCompacta(folha)} style={styles.flex} />
      </View>

      {folhaAlta ? (
        <Card variante="status" status="warning">
          <View style={styles.linhaIcone}>
            <Icon nome="apito" size={16} color="warning" />
            <Text variant="bodyM" style={styles.flex}>
              Atenção: salários consomem {pctFolha.toFixed(0)}% da receita.
              Considere vender jogadores de alto salário.
            </Text>
          </View>
        </Card>
      ) : null}

      {semDados ? (
        <Text variant="bodyM" color="textSecondary">
          Sem movimentações financeiras ainda.
        </Text>
      ) : (
        <>
          <Secao titulo="Receitas">
            <Card variante="outlined">
              <View style={styles.donutLinha}>
                <DonutChart
                  fatias={receitas.fatias}
                  valorCentro={moedaCompacta(receitas.total)}
                  labelCentro="Receitas"
                />
                <Legenda fatias={receitas.fatias} />
              </View>
            </Card>
          </Secao>
          <Secao titulo="Despesas">
            <Card variante="outlined">
              <View style={styles.donutLinha}>
                <DonutChart
                  fatias={despesas.fatias}
                  valorCentro={moedaCompacta(despesas.total)}
                  labelCentro="Despesas"
                />
                <Legenda fatias={despesas.fatias} />
              </View>
            </Card>
          </Secao>
        </>
      )}

      <Card variante="outlined">
        <View style={styles.rowBetween}>
          <Text variant="bodyM" color="textSecondary">
            Após a próxima folha
          </Text>
          <Text
            variant="titleM"
            color={financas.saldo - folha < 0 ? 'danger' : 'textPrimary'}
            tabular>
            {moeda(financas.saldo - folha)}
          </Text>
        </View>
      </Card>

      <Secao titulo="Estádio">
        <Card variante="outlined" style={styles.cardGap}>
          <Text variant="titleM">{estadio.nome}</Text>
          <Linha label="Capacidade" valor={estadio.capacidade.toLocaleString('pt-BR')} />
          <Linha label="Infraestrutura" valor={`Nível ${estadio.nivelInfraestrutura}`} />
          <Text variant="caption" color="textSecondary">
            Capacidade aumenta a bilheteria e o mando; infraestrutura acelera a
            base e o treino.
          </Text>
        </Card>
        <View style={styles.obras}>
          <Button
            variante="secondary"
            icone="dinheiro"
            disabled={capacidadeMaxima || financas.saldo < custoCapacidade}
            titulo={
              capacidadeMaxima
                ? 'Capacidade máxima'
                : `Ampliar +${LUGARES_POR_AMPLIACAO.toLocaleString('pt-BR')} · ${moedaCompacta(custoCapacidade)}`
            }
            onPress={() => aoMelhorar('capacidade')}
            fullWidth
          />
          <Button
            variante="secondary"
            icone="tatica"
            disabled={infraMaxima || financas.saldo < custoInfra}
            titulo={
              infraMaxima
                ? 'Infraestrutura máxima'
                : `Melhorar infra (nível ${estadio.nivelInfraestrutura + 1}) · ${moedaCompacta(custoInfra)}`
            }
            onPress={() => aoMelhorar('infraestrutura')}
            fullWidth
          />
        </View>
      </Secao>

      <Secao titulo="Preço do ingresso">
        <Card variante="outlined" style={styles.cardGap}>
          <Linha label="Preço médio" valor={moeda(precoEfetivo)} />
          <View style={styles.precoBotoes}>
            {PRESETS_PRECO.map(preset => (
              <Chip
                key={preset.rotulo}
                label={preset.rotulo}
                selected={Math.abs(fatorPreco - preset.fator) < 0.01}
                onPress={() => ajustarPrecoIngresso(preset.fator)}
                style={styles.flex}
              />
            ))}
          </View>
          <Text variant="caption" color="textSecondary">
            Cobrar mais rende por ingresso, mas esvazia o estádio. Há um ponto
            ideal entre lotar barato e cobrar caro.
          </Text>
        </Card>
      </Secao>

      <Secao titulo="Histórico Financeiro">
        {historico.length > 0 ? (
          <Card variante="outlined" style={styles.cardGap}>
            {historico.slice(0, 6).map((transacao, index) => {
              const receita = transacao.tipo === 'receita';
              return (
                <View key={`${transacao.data}_${index}`} style={styles.transacao}>
                  <Icon
                    nome={receita ? 'seta-cima' : 'seta-baixo'}
                    size={16}
                    color={receita ? 'brand' : 'danger'}
                  />
                  <Text variant="bodyM" style={styles.flex} numberOfLines={1}>
                    {transacao.descricao}
                  </Text>
                  <Text
                    variant="labelL"
                    color={receita ? 'brand' : 'danger'}
                    tabular>
                    {receita ? '+' : '-'}
                    {moedaCompacta(Math.abs(transacao.valor))}
                  </Text>
                </View>
              );
            })}
          </Card>
        ) : (
          <Text variant="bodyM" color="textSecondary">
            Nenhuma transação registrada.
          </Text>
        )}
      </Secao>

      <Button
        icone="mercado"
        titulo="Mercado de Transferências"
        onPress={() => nav.navigate('TransferMarket')}
        fullWidth
      />
    </Screen>
  );
}

function Secao({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View style={styles.secao}>
      <Text variant="labelM" color="textSecondary" style={styles.caps}>
        {titulo}
      </Text>
      {children}
    </View>
  );
}

function Linha({label, valor}: {label: string; valor: string}): React.JSX.Element {
  return (
    <View style={styles.rowBetween}>
      <Text variant="bodyM" color="textSecondary">
        {label}
      </Text>
      <Text variant="labelL" tabular>
        {valor}
      </Text>
    </View>
  );
}

function Legenda({fatias}: {fatias: FatiaDonut[]}): React.JSX.Element {
  return (
    <View style={styles.legenda}>
      {fatias.map(fatia => (
        <View key={fatia.label} style={styles.legendaItem}>
          <View style={[styles.legendaPonto, {backgroundColor: fatia.cor}]} />
          <Text variant="caption" color="textSecondary" style={styles.flex}>
            {fatia.label}
          </Text>
          <Text variant="caption" tabular>
            {moedaCompacta(fatia.valor)}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default Club;

const styles = StyleSheet.create({
  flex: {flex: 1},
  caps: {textTransform: 'uppercase', letterSpacing: 1},
  saldoHero: {flexDirection: 'row', alignItems: 'center', gap: espacamento[3]},
  metricsRow: {flexDirection: 'row', gap: espacamento[2]},
  linhaIcone: {flexDirection: 'row', alignItems: 'center', gap: espacamento[2]},
  secao: {gap: espacamento[2]},
  cardGap: {gap: espacamento[2]},
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  donutLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[3],
  },
  legenda: {flex: 1, gap: espacamento[1]},
  legendaItem: {flexDirection: 'row', alignItems: 'center', gap: espacamento[2]},
  legendaPonto: {width: 10, height: 10, borderRadius: 4},
  obras: {gap: espacamento[2]},
  precoBotoes: {flexDirection: 'row', gap: espacamento[2]},
  transacao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[2],
    paddingVertical: espacamento[1],
  },
});
