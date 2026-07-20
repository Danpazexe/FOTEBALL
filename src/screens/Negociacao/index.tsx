/**
 * Negociação (aba Mercado) — proposta de COMPRA por um jogador, em tela cheia.
 * Mostra jogador, clube vendedor, valor de mercado, campo de proposta, salário e
 * o orçamento após a proposta; envia usando as regras REAIS do mercado
 * (fazerPropostaCompra), tratando contraproposta/aceite/recusa. DS v2.
 */
import React, {useMemo, useState} from 'react';
import {StyleSheet, TextInput, View} from 'react-native';
import {useRoute, type RouteProp} from '@react-navigation/native';

import {
  AppHeader,
  Button,
  Card,
  Divider,
  EmptyState,
  PositionBadge,
  Screen,
  Text,
  espacamento,
  raios,
  useTheme,
} from '../../design-system';
import PlayerAvatar from '../../components/PlayerAvatar';
import {useToast} from '../../components/feedback';
import {
  precoCompra,
  selecionarClubeUsuario,
  useGameStore,
} from '../../store/useGameStore';
import {
  useMercadoNavigation,
  type MercadoStackParamList,
} from '../../navigation/types';
import {
  faixaOverall,
  moeda,
  moedaCompacta,
  nomeClube,
  nomeCurto,
} from '../../utils/formatters';
import {simboloMoeda} from '../../engine/competitions/registry/competitionRegistry';

function Negociacao(): React.JSX.Element {
  const nav = useMercadoNavigation();
  const {cores} = useTheme();
  const toast = useToast();
  const route = useRoute<RouteProp<MercadoStackParamList, 'Negociacao'>>();
  const {jogadorId} = route.params;

  // Mercado universal: o alvo pode estar em qualquer liga (liga ativa vence).
  const jogador = useGameStore(
    state =>
      state.jogadores.find(j => j.id === jogadorId) ??
      state.todosJogadores.find(j => j.id === jogadorId),
  );
  const clubesLiga = useGameStore(state => state.clubes);
  const todosClubes = useGameStore(state => state.todosClubes);
  const clubes = useMemo(
    () => [...clubesLiga, ...todosClubes],
    [clubesLiga, todosClubes],
  );
  const clube = useGameStore(selecionarClubeUsuario);
  const fazerPropostaCompra = useGameStore(state => state.fazerPropostaCompra);
  // Valor/salário do ALVO na moeda do país dele (rótulo, sem câmbio).
  const simboloAlvo = simboloMoeda(
    clubes.find(c => c.id === jogador?.clubeId)?.divisao,
  );

  const [valorInput, setValorInput] = useState(
    jogador ? String(precoCompra(jogador)) : '',
  );
  const [contra, setContra] = useState<number | null>(null);

  const voltar = () =>
    nav.canGoBack() ? nav.goBack() : nav.navigate('TransferMarket');

  if (!jogador) {
    return (
      <Screen header={<AppHeader title="Negociação" onBack={voltar} />}>
        <View style={styles.vazio}>
          <EmptyState
            icone="mercado"
            title="Jogador indisponível"
            description="Este jogador não está mais no mercado."
          />
        </View>
      </Screen>
    );
  }

  const nome = nomeCurto(jogador);
  const valor = Number(valorInput) || precoCompra(jogador);
  const saldo = clube?.financas.saldo ?? 0;
  const orcamentoApos = saldo - valor;

  const enviar = () => {
    const resultado = fazerPropostaCompra(jogador.id, valor);
    if (resultado.status === 'contraproposta') {
      setContra(resultado.contraValor ?? null);
      if (resultado.contraValor) {
        setValorInput(String(resultado.contraValor));
      }
      toast(resultado.mensagem, 'info');
      return;
    }
    toast(resultado.mensagem, resultado.status === 'aceita' ? 'sucesso' : 'erro');
    if (resultado.status === 'aceita') {
      voltar();
    }
  };

  return (
    <Screen scroll header={<AppHeader title="Negociação" onBack={voltar} />}>
      {/* Jogador */}
      <Card variante="outlined" style={styles.jogadorCard}>
        <PlayerAvatar id={jogador.id} tamanho={56} />
        <View style={styles.flex}>
          <Text variant="titleL" numberOfLines={1}>
            {nome}
          </Text>
          <View style={styles.metaLinha}>
            <PositionBadge posicao={jogador.posicaoPrincipal} tamanho="sm" />
            <Text variant="labelM" color="textSecondary">
              {jogador.idade} anos · OVR {faixaOverall(jogador)}
            </Text>
          </View>
        </View>
      </Card>

      {/* Dados da negociação */}
      <Card variante="outlined" padding={0} style={styles.dadosCard}>
        <Linha
          label="Clube vendedor"
          valor={nomeClube(clubes, jogador.clubeId ?? '')}
        />
        <Divider />
        <Linha
          label="Valor de mercado"
          valor={moeda(jogador.valorMercado, simboloAlvo)}
        />
        <Divider />
        <Linha
          label="Salário estimado"
          valor={`${moeda(jogador.salario, simboloAlvo)}/mês`}
        />
      </Card>

      {/* Proposta */}
      <View style={styles.secao}>
        <Text variant="labelM" color="textSecondary" style={styles.caps}>
          Valor da proposta
        </Text>
        <TextInput
          keyboardType="numeric"
          value={valorInput}
          onChangeText={setValorInput}
          accessibilityLabel="Valor da proposta"
          placeholder="Valor da proposta"
          placeholderTextColor={cores.textMuted}
          style={[
            styles.input,
            {
              backgroundColor: cores.surfaceSubtle,
              borderColor: cores.border,
              color: cores.textPrimary,
            },
          ]}
        />
        {contra !== null ? (
          <Text variant="labelM" color="warning">
            Contraproposta do clube: {moeda(contra)}
          </Text>
        ) : null}
        <View style={styles.orcamentoLinha}>
          <Text variant="bodyM" color="textSecondary">
            Orçamento após a proposta
          </Text>
          <Text
            variant="titleM"
            color={orcamentoApos < 0 ? 'danger' : 'brand'}
            tabular>
            {moedaCompacta(orcamentoApos)}
          </Text>
        </View>
      </View>

      <View style={styles.acoes}>
        <View style={styles.flex}>
          <Button
            variante="secondary"
            titulo="Cancelar"
            onPress={voltar}
            fullWidth
          />
        </View>
        <View style={styles.flex}>
          <Button
            variante="primary"
            titulo="Enviar proposta"
            onPress={enviar}
            disabled={orcamentoApos < 0}
            fullWidth
          />
        </View>
      </View>
    </Screen>
  );
}

function Linha({label, valor}: {label: string; valor: string}): React.JSX.Element {
  return (
    <View style={styles.linha}>
      <Text variant="bodyM" color="textSecondary" style={styles.flex}>
        {label}
      </Text>
      <Text variant="labelL" tabular numberOfLines={1}>
        {valor}
      </Text>
    </View>
  );
}

export default Negociacao;

const styles = StyleSheet.create({
  flex: {flex: 1},
  vazio: {flex: 1, justifyContent: 'center', padding: espacamento[4]},
  caps: {textTransform: 'uppercase', letterSpacing: 1},
  jogadorCard: {flexDirection: 'row', alignItems: 'center', gap: espacamento[3]},
  metaLinha: {flexDirection: 'row', alignItems: 'center', gap: espacamento[2]},
  dadosCard: {paddingHorizontal: espacamento[3]},
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[2],
    minHeight: 48,
  },
  secao: {gap: espacamento[2]},
  input: {
    borderRadius: raios.md,
    borderWidth: 1,
    fontSize: 18,
    fontWeight: '800',
    paddingHorizontal: espacamento[3],
    paddingVertical: espacamento[3],
  },
  orcamentoLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  acoes: {flexDirection: 'row', gap: espacamento[2]},
});
