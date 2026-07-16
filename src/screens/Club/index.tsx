/**
 * Visão do Clube (aberta pela Central do Clube). Identidade, estádio, reputação e
 * moral, instalações (com melhorias reais do estádio) e preço do ingresso. O
 * financeiro detalhado vive na tela Finanças. Dados reais de `clube`. DS v2.
 */
import React, {useMemo} from 'react';
import {StyleSheet, View} from 'react-native';

import {
  AppHeader,
  Box,
  Button,
  Card,
  Chip,
  Divider,
  EmptyState,
  Icon,
  Screen,
  TeamCrest,
  Text,
  espacamento,
} from '../../design-system';
import {useToast} from '../../components/feedback';
import {useClubeNavigation} from '../../navigation/types';
import {
  CAPACIDADE_MAX_ESTADIO,
  INFRA_MAX_ESTADIO,
  LUGARES_POR_AMPLIACAO,
  custoAmpliacaoEstadio,
  custoMelhoriaInfra,
  selecionarClubeUsuario,
  useGameStore,
  useJogadoresUsuario,
} from '../../store/useGameStore';
import {moeda, moedaCompacta} from '../../utils/formatters';

const PRESETS_PRECO: {rotulo: string; fator: number}[] = [
  {rotulo: 'Barato', fator: 0.75},
  {rotulo: 'Normal', fator: 1.0},
  {rotulo: 'Caro', fator: 1.4},
];

function Club(): React.JSX.Element {
  const nav = useClubeNavigation();
  const toast = useToast();
  const clube = useGameStore(selecionarClubeUsuario);
  const elenco = useJogadoresUsuario();
  const melhorarEstadio = useGameStore(state => state.melhorarEstadio);
  const ajustarPrecoIngresso = useGameStore(
    state => state.ajustarPrecoIngresso,
  );

  const moral = useMemo(
    () =>
      elenco.length === 0
        ? 0
        : elenco.reduce((s, j) => s + j.moral, 0) / elenco.length / 10,
    [elenco],
  );

  const voltar = () =>
    nav.canGoBack() ? nav.goBack() : nav.navigate('CentralClube');

  if (!clube) {
    return (
      <Screen header={<AppHeader title="Visão geral" onBack={voltar} />}>
        <View style={styles.vazio}>
          <EmptyState
            icone="estadio"
            title="Nenhum clube selecionado"
            description="Inicie ou carregue uma carreira para ver o clube."
          />
        </View>
      </Screen>
    );
  }

  const {financas, estadio} = clube;
  const capacidadeMaxima = estadio.capacidade >= CAPACIDADE_MAX_ESTADIO;
  const infraMaxima = estadio.nivelInfraestrutura >= INFRA_MAX_ESTADIO;
  const custoCapacidade = custoAmpliacaoEstadio(estadio.capacidade);
  const custoInfra = custoMelhoriaInfra(estadio.nivelInfraestrutura);
  const fatorPreco = estadio.precoIngressoFator ?? 1;
  const precoEfetivo = Math.round(estadio.precoMedioIngresso * fatorPreco);

  const aoMelhorar = (tipo: 'capacidade' | 'infraestrutura') => {
    const resultado = melhorarEstadio(tipo);
    toast(resultado.mensagem, resultado.ok ? 'sucesso' : 'erro');
  };

  return (
    <Screen scroll header={<AppHeader title="Visão geral" onBack={voltar} />}>
      {/* Identidade */}
      <Card variante="outlined" style={styles.identidade}>
        <TeamCrest clubeId={clube.id} sigla={clube.sigla} size={56} />
        <View style={styles.flex}>
          <Text variant="titleL" numberOfLines={1}>
            {clube.nome}
          </Text>
          <Text variant="labelM" color="textSecondary">
            {clube.fundacao ? `Fundado em ${clube.fundacao} · ` : ''}
            {clube.divisao ?? 'Série A'}
          </Text>
        </View>
      </Card>

      {/* Estádio (faixa) */}
      <Box bg="scoreboard" radius="lg" padding={4} gap={1}>
        <Text variant="titleM" color="onScoreboard" align="center">
          {estadio.nome}
        </Text>
        <Text variant="labelM" color="onScoreboard" align="center">
          Capacidade {estadio.capacidade.toLocaleString('pt-BR')}
        </Text>
      </Box>

      {/* Reputação · Capacidade · Moral */}
      <Card variante="outlined" style={styles.statsRow}>
        <CelulaStat valor={String(clube.reputacao)} rotulo="Reputação" icone="medalha" />
        <Divider vertical />
        <CelulaStat valor={String(elenco.length)} rotulo="Elenco" icone="elenco" />
        <Divider vertical />
        <CelulaStat
          valor={moral.toFixed(1).replace('.', ',')}
          rotulo="Moral"
          icone="humor-bom"
        />
      </Card>

      {/* Instalações */}
      <View style={styles.secao}>
        <Text variant="labelM" color="textSecondary" style={styles.caps}>
          Instalações
        </Text>
        <Card variante="outlined" style={styles.cardGap}>
          <Linha label="Estádio" valor={`${estadio.capacidade.toLocaleString('pt-BR')} lugares`} />
          <Divider />
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
      </View>

      {/* Preço do ingresso */}
      <View style={styles.secao}>
        <Text variant="labelM" color="textSecondary" style={styles.caps}>
          Preço do ingresso
        </Text>
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
      </View>

      <Button
        icone="dinheiro"
        titulo="Ver finanças do clube"
        variante="secondary"
        onPress={() => nav.navigate('Financas')}
        fullWidth
      />
    </Screen>
  );
}

function CelulaStat({
  valor,
  rotulo,
  icone,
}: {
  valor: string;
  rotulo: string;
  icone: import('../../components/Icone').IconeNome;
}): React.JSX.Element {
  return (
    <View style={styles.celula}>
      <Icon nome={icone} size={16} color="textSecondary" />
      <Text variant="titleM" tabular>
        {valor}
      </Text>
      <Text variant="caption" color="textSecondary">
        {rotulo}
      </Text>
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

export default Club;

const styles = StyleSheet.create({
  flex: {flex: 1},
  vazio: {flex: 1, justifyContent: 'center', padding: espacamento[4]},
  caps: {textTransform: 'uppercase', letterSpacing: 1},
  identidade: {flexDirection: 'row', alignItems: 'center', gap: espacamento[3]},
  statsRow: {flexDirection: 'row', alignItems: 'center'},
  celula: {flex: 1, alignItems: 'center', gap: 2},
  secao: {gap: espacamento[2]},
  cardGap: {gap: espacamento[2]},
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  obras: {gap: espacamento[2]},
  precoBotoes: {flexDirection: 'row', gap: espacamento[2]},
});
