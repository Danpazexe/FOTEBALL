/**
 * Tela da aba "Clube" / Finanças (Módulo 11). Saldo em destaque, donuts de
 * receitas e despesas (agregadas do histórico), alerta de folha salarial,
 * projeção, dados do estádio e histórico recente.
 */

import React, {useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {
  Botao,
  Metric,
  MetricsRow,
  ScreenContainer,
  Section,
  TextoVazio,
} from '../../components/ui';
import DonutChart, {type FatiaDonut} from '../../components/DonutChart';
import Icone from '../../components/Icone';
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
import {cores, espaco, raio} from '../../theme';
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

const CORES_RECEITA = [cores.primaria, cores.secundaria, '#3B82F6', '#8B5CF6'];
const CORES_DESPESA = [cores.perigo, '#F59E0B', '#FB923C', '#64748B'];

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
      <ScreenContainer scroll>
        <Text style={styles.titulo}>Clube</Text>
        <TextoVazio>Nenhum clube selecionado.</TextoVazio>
      </ScreenContainer>
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
  const folha = calcularFolhaSalarial(elenco);
  const pctFolha = receitas.total > 0 ? (folha / receitas.total) * 100 : 0;
  const folhaAlta = pctFolha > 80;
  const semDados = receitas.total === 0 && despesas.total === 0;

  return (
    <ScreenContainer scroll>
      <Text style={styles.titulo}>{clubeUsuario.nome}</Text>

      {/* Saldo em destaque */}
      <View style={styles.saldoHero}>
        <Icone nome="dinheiro" tamanho={26} cor={financas.saldo < 0 ? cores.perigo : cores.primaria} />
        <View style={styles.flex1}>
          <Text style={styles.saldoLabel}>Saldo do clube</Text>
          <Text
            style={[
              styles.saldoValor,
              {color: financas.saldo < 0 ? cores.perigo : cores.primaria},
            ]}>
            {moeda(financas.saldo)}
          </Text>
        </View>
      </View>

      <MetricsRow>
        <Metric label="Estádio" valor={estadio.capacidade.toLocaleString('pt-BR')} />
        <Metric label="Reputação" valor={String(clubeUsuario.reputacao)} />
        <Metric label="Folha" valor={moedaCompacta(folha)} />
      </MetricsRow>

      {folhaAlta ? (
        <View style={styles.alerta}>
          <Icone nome="apito" tamanho={16} cor={cores.secundaria} />
          <Text style={styles.alertaTexto}>
            Atenção: salários consomem {pctFolha.toFixed(0)}% da receita. Considere
            vender jogadores de alto salário.
          </Text>
        </View>
      ) : null}

      {semDados ? (
        <Section titulo="Finanças">
          <TextoVazio>Sem movimentações financeiras ainda.</TextoVazio>
        </Section>
      ) : (
        <>
          <Section titulo="Receitas">
            <View style={styles.donutLinha}>
              <DonutChart
                fatias={receitas.fatias}
                valorCentro={moedaCompacta(receitas.total)}
                labelCentro="Receitas"
              />
              <Legenda fatias={receitas.fatias} />
            </View>
          </Section>

          <Section titulo="Despesas">
            <View style={styles.donutLinha}>
              <DonutChart
                fatias={despesas.fatias}
                valorCentro={moedaCompacta(despesas.total)}
                labelCentro="Despesas"
              />
              <Legenda fatias={despesas.fatias} />
            </View>
          </Section>
        </>
      )}

      <View style={styles.projecao}>
        <Text style={styles.projecaoLabel}>Após a próxima folha</Text>
        <Text
          style={[
            styles.projecaoValor,
            {color: financas.saldo - folha < 0 ? cores.perigo : cores.texto},
          ]}>
          {moeda(financas.saldo - folha)}
        </Text>
      </View>

      <Section titulo="Estádio">
        <View style={styles.card}>
          <Text style={styles.estadioNome}>{estadio.nome}</Text>
          <View style={styles.linha}>
            <Text style={styles.linhaLabel}>Capacidade</Text>
            <Text style={styles.linhaValor}>
              {estadio.capacidade.toLocaleString('pt-BR')}
            </Text>
          </View>
          <View style={styles.linha}>
            <Text style={styles.linhaLabel}>Infraestrutura</Text>
            <Text style={styles.linhaValor}>Nível {estadio.nivelInfraestrutura}</Text>
          </View>
          <Text style={styles.obraNota}>
            Capacidade aumenta a bilheteria e o mando; infraestrutura acelera a
            base e o treino.
          </Text>
        </View>
        <View style={styles.obras}>
          <Botao
            variante="secundaria"
            icone="dinheiro"
            disabled={capacidadeMaxima || financas.saldo < custoCapacidade}
            titulo={
              capacidadeMaxima
                ? 'Capacidade máxima'
                : `Ampliar +${LUGARES_POR_AMPLIACAO.toLocaleString('pt-BR')} · ${moedaCompacta(custoCapacidade)}`
            }
            onPress={() => aoMelhorar('capacidade')}
          />
          <Botao
            variante="secundaria"
            icone="tatica"
            disabled={infraMaxima || financas.saldo < custoInfra}
            titulo={
              infraMaxima
                ? 'Infraestrutura máxima'
                : `Melhorar infra (nível ${estadio.nivelInfraestrutura + 1}) · ${moedaCompacta(custoInfra)}`
            }
            onPress={() => aoMelhorar('infraestrutura')}
          />
        </View>
      </Section>

      <Section titulo="Histórico Financeiro">
        {historico.length > 0 ? (
          <View style={styles.historico}>
            {historico.slice(0, 6).map((transacao, index) => {
              const receita = transacao.tipo === 'receita';
              return (
                <View key={`${transacao.data}_${index}`} style={styles.transacao}>
                  <Icone
                    nome={receita ? 'seta-cima' : 'seta-baixo'}
                    tamanho={16}
                    cor={receita ? cores.primaria : cores.perigo}
                  />
                  <Text style={styles.transacaoDescricao}>{transacao.descricao}</Text>
                  <Text
                    style={[
                      styles.transacaoValor,
                      receita ? styles.valorReceita : styles.valorDespesa,
                    ]}>
                    {receita ? '+' : '-'}
                    {moedaCompacta(Math.abs(transacao.valor))}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <TextoVazio>Nenhuma transação registrada.</TextoVazio>
        )}
      </Section>

      <Botao
        icone="mercado"
        titulo="Mercado de Transferências"
        onPress={() => nav.navigate('TransferMarket')}
      />
    </ScreenContainer>
  );
}

function Legenda({fatias}: {fatias: FatiaDonut[]}): React.JSX.Element {
  return (
    <View style={styles.legenda}>
      {fatias.map(fatia => (
        <View key={fatia.label} style={styles.legendaItem}>
          <View style={[styles.legendaPonto, {backgroundColor: fatia.cor}]} />
          <Text style={styles.legendaLabel}>{fatia.label}</Text>
          <Text style={styles.legendaValor}>{moedaCompacta(fatia.valor)}</Text>
        </View>
      ))}
    </View>
  );
}

export default Club;

const styles = StyleSheet.create({
  titulo: {
    color: cores.texto,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: espaco.md,
  },
  flex1: {
    flex: 1,
  },
  saldoHero: {
    alignItems: 'center',
    backgroundColor: cores.superficie,
    borderColor: cores.borda,
    borderRadius: raio.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: espaco.md,
    marginBottom: espaco.md,
    padding: espaco.md,
  },
  saldoLabel: {
    color: cores.textoSecundario,
    fontSize: 12,
  },
  saldoValor: {
    fontSize: 24,
    fontWeight: '900',
  },
  alerta: {
    alignItems: 'center',
    backgroundColor: cores.superficie,
    borderColor: cores.secundaria,
    borderRadius: raio.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: espaco.sm,
    marginVertical: espaco.md,
    padding: espaco.md,
  },
  alertaTexto: {
    color: cores.texto,
    flex: 1,
    fontSize: 13,
  },
  donutLinha: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.md,
  },
  legenda: {
    flex: 1,
    gap: espaco.xs,
  },
  legendaItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.sm,
  },
  legendaPonto: {
    borderRadius: 4,
    height: 10,
    width: 10,
  },
  legendaLabel: {
    color: cores.textoSecundario,
    flex: 1,
    fontSize: 12,
  },
  legendaValor: {
    color: cores.texto,
    fontSize: 12,
    fontWeight: '700',
  },
  projecao: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: espaco.md,
    paddingHorizontal: espaco.xs,
  },
  projecaoLabel: {
    color: cores.textoSecundario,
    fontSize: 13,
  },
  projecaoValor: {
    fontSize: 16,
    fontWeight: '800',
  },
  card: {
    backgroundColor: cores.superficie,
    borderColor: cores.borda,
    borderRadius: raio.md,
    borderWidth: 1,
    gap: espaco.sm,
    padding: espaco.md,
  },
  estadioNome: {
    color: cores.texto,
    fontSize: 18,
    fontWeight: '800',
  },
  obraNota: {
    color: cores.textoSecundario,
    fontSize: 12,
    marginTop: espaco.xs,
  },
  obras: {
    gap: espaco.sm,
    marginTop: espaco.sm,
  },
  linha: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  linhaLabel: {
    color: cores.textoSecundario,
    fontSize: 13,
  },
  linhaValor: {
    color: cores.texto,
    fontSize: 14,
    fontWeight: '700',
  },
  historico: {
    gap: espaco.sm,
  },
  transacao: {
    alignItems: 'center',
    backgroundColor: cores.superficie,
    borderColor: cores.borda,
    borderRadius: raio.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: espaco.sm,
    padding: espaco.md,
  },
  transacaoDescricao: {
    color: cores.texto,
    flex: 1,
    fontSize: 13,
  },
  transacaoValor: {
    fontSize: 13,
    fontWeight: '800',
  },
  valorReceita: {
    color: cores.primaria,
  },
  valorDespesa: {
    color: cores.perigo,
  },
});
