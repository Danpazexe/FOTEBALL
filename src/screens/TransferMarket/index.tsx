/**
 * Mercado de Transferências. Abas Contratar / Propostas / Empréstimos. O usuário
 * propõe compra/empréstimo e responde ofertas da IA. Migrado ao Design System v2.
 */

import React, {useMemo, useState} from 'react';
import {Modal, StyleSheet, TextInput, View} from 'react-native';

import PlayerCard from '../../components/PlayerCard';
import {
  AppBar,
  Button,
  Card,
  Chip,
  Screen,
  Tabs,
  Text,
  espacamento,
  raios,
  useTheme,
} from '../../design-system';
import {useToast} from '../../components/feedback';
import {
  custoEmprestimo,
  ehEmprestado,
} from '../../engine/transfers/emprestimoEngine';
import {useAppNavigation} from '../../navigation/types';
import {
  precoCompra,
  selecionarClubeUsuario,
  useGameStore,
} from '../../store/useGameStore';
import {moeda, nomeClube} from '../../utils/formatters';
import type {Player, Position} from '../../types';

const LIMITE = 30;
const POSICOES: Array<Position | 'Todos'> = [
  'Todos', 'GOL', 'ZAG', 'LD', 'LE', 'VOL', 'MC', 'MEI', 'PD', 'PE', 'SA', 'CA',
];

type Aba = 'contratar' | 'propostas' | 'emprestar';

function TransferMarket(): React.JSX.Element {
  const nav = useAppNavigation();
  const toast = useToast();
  const {cores} = useTheme();

  const jogadores = useGameStore(state => state.jogadores);
  const clubes = useGameStore(state => state.clubes);
  const clubeUsuarioId = useGameStore(state => state.clubeUsuarioId);
  const propostas = useGameStore(state => state.propostasRecebidas);
  const fazerPropostaCompra = useGameStore(state => state.fazerPropostaCompra);
  const responderPropostaVenda = useGameStore(
    state => state.responderPropostaVenda,
  );
  const pegarEmprestado = useGameStore(state => state.pegarEmprestado);
  const clubeUsuario = useGameStore(selecionarClubeUsuario);

  const [aba, setAba] = useState<Aba>('contratar');
  const [filtro, setFiltro] = useState<Position | 'Todos'>('Todos');
  const [alvo, setAlvo] = useState<Player | null>(null);
  const [valorInput, setValorInput] = useState('');
  const [contra, setContra] = useState<number | null>(null);

  const disponiveis = useMemo(
    () =>
      jogadores
        .filter(j => j.clubeId !== clubeUsuarioId && j.clubeId !== null)
        .filter(j => filtro === 'Todos' || j.posicaoPrincipal === filtro)
        .sort((a, b) => b.overall - a.overall)
        .slice(0, LIMITE),
    [jogadores, clubeUsuarioId, filtro],
  );

  const emprestaveis = useMemo(
    () =>
      jogadores
        .filter(
          j =>
            j.clubeId !== clubeUsuarioId && j.clubeId !== null && !ehEmprestado(j),
        )
        .filter(j => filtro === 'Todos' || j.posicaoPrincipal === filtro)
        .sort((a, b) => a.idade - b.idade || b.overall - a.overall)
        .slice(0, LIMITE),
    [jogadores, clubeUsuarioId, filtro],
  );

  const aoEmprestar = (jogador: Player) => {
    const custo = custoEmprestimo(jogador);
    if ((clubeUsuario?.financas.saldo ?? 0) < custo) {
      toast('Saldo insuficiente para a taxa do empréstimo.', 'erro');
      return;
    }
    pegarEmprestado(jogador.id);
    toast(`${jogador.nome} contratado por empréstimo.`, 'sucesso');
  };

  const abrirProposta = (jogador: Player) => {
    setAlvo(jogador);
    setValorInput(String(precoCompra(jogador)));
    setContra(null);
  };

  const enviarProposta = () => {
    if (!alvo) {
      return;
    }
    const valor = Number(valorInput) || precoCompra(alvo);
    const resultado = fazerPropostaCompra(alvo.id, valor);
    if (resultado.status === 'contraproposta') {
      setContra(resultado.contraValor ?? null);
      if (resultado.contraValor) {
        setValorInput(String(resultado.contraValor));
      }
      toast(resultado.mensagem, 'info');
      return;
    }
    toast(resultado.mensagem, resultado.status === 'aceita' ? 'sucesso' : 'erro');
    setAlvo(null);
  };

  const aceitar = (propostaId: string) => {
    responderPropostaVenda(propostaId, true);
    toast('Venda concluída.', 'sucesso');
  };
  const recusar = (propostaId: string) => {
    responderPropostaVenda(propostaId, false);
    toast('Proposta recusada.', 'info');
  };

  const abas = [
    {chave: 'contratar', rotulo: 'Contratar'},
    {
      chave: 'propostas',
      rotulo: `Propostas${propostas.length > 0 ? ` (${propostas.length})` : ''}`,
    },
    {chave: 'emprestar', rotulo: 'Empréstimos'},
  ];

  return (
    <Screen scroll>
      <AppBar title="Mercado" onBack={() => nav.goBack()} />

      <Tabs abas={abas} ativa={aba} onSelect={c => setAba(c as Aba)} scrollable />

      {aba === 'contratar' || aba === 'emprestar' ? (
        <View style={styles.filtros}>
          {POSICOES.map(pos => (
            <Chip
              key={pos}
              label={pos}
              selected={filtro === pos}
              onPress={() => setFiltro(pos)}
            />
          ))}
        </View>
      ) : null}

      {aba === 'contratar' ? (
        disponiveis.length === 0 ? (
          <Text variant="bodyM" color="textSecondary">
            Nenhum jogador para esse filtro.
          </Text>
        ) : (
          <View style={styles.lista}>
            {disponiveis.map(jogador => (
              <PlayerCard
                key={jogador.id}
                jogador={jogador}
                legendaExtra={nomeClube(clubes, jogador.clubeId ?? '')}
                onPress={() =>
                  nav.navigate('PlayerDetail', {jogadorId: jogador.id})
                }
                acaoLabel="Propor"
                onAcao={() => abrirProposta(jogador)}
              />
            ))}
          </View>
        )
      ) : null}

      {aba === 'emprestar' ? (
        emprestaveis.length === 0 ? (
          <Text variant="bodyM" color="textSecondary">
            Nenhum jogador para empréstimo nesse filtro.
          </Text>
        ) : (
          <View style={styles.lista}>
            {emprestaveis.map(jogador => (
              <PlayerCard
                key={jogador.id}
                jogador={jogador}
                legendaExtra={`${nomeClube(clubes, jogador.clubeId ?? '')} · taxa ${moeda(custoEmprestimo(jogador))}`}
                onPress={() =>
                  nav.navigate('PlayerDetail', {jogadorId: jogador.id})
                }
                acaoLabel="Pegar"
                onAcao={() => aoEmprestar(jogador)}
              />
            ))}
          </View>
        )
      ) : null}

      {aba === 'propostas' ? (
        propostas.length === 0 ? (
          <Text variant="bodyM" color="textSecondary">
            Nenhuma proposta recebida.
          </Text>
        ) : (
          <View style={styles.lista}>
            {propostas.map(proposta => {
              const jogador = jogadores.find(j => j.id === proposta.jogadorId);
              return (
                <Card key={proposta.id} variante="outlined" style={styles.proposta}>
                  <View style={styles.flex}>
                    <Text variant="titleM">
                      {jogador?.apelido ?? jogador?.nome ?? 'Jogador'}
                    </Text>
                    <Text variant="caption" color="textSecondary">
                      {nomeClube(clubes, proposta.clubeOfertante)} oferece
                    </Text>
                    <Text variant="titleL" color="brand" tabular>
                      {moeda(proposta.valorProposto)}
                    </Text>
                  </View>
                  <View style={styles.propostaAcoes}>
                    <Button
                      titulo="Aceitar"
                      variante="primary"
                      tamanho="sm"
                      onPress={() => aceitar(proposta.id)}
                    />
                    <Button
                      titulo="Recusar"
                      variante="ghost"
                      tamanho="sm"
                      onPress={() => recusar(proposta.id)}
                    />
                  </View>
                </Card>
              );
            })}
          </View>
        )
      ) : null}

      <Modal
        visible={alvo !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setAlvo(null)}>
        <View style={[styles.modalBackdrop, {backgroundColor: cores.overlay}]}>
          <View
            style={[
              styles.modalCard,
              {backgroundColor: cores.surface, borderColor: cores.border},
            ]}>
            <Text variant="titleL">
              Proposta por {alvo?.apelido ?? alvo?.nome}
            </Text>
            <Text variant="caption" color="textSecondary">
              Valor de mercado: {alvo ? moeda(alvo.valorMercado) : '—'}
            </Text>
            <TextInput
              keyboardType="numeric"
              value={valorInput}
              onChangeText={setValorInput}
              accessibilityLabel="Valor da proposta"
              style={[
                styles.input,
                {
                  backgroundColor: cores.surfaceSubtle,
                  borderColor: cores.border,
                  color: cores.textPrimary,
                },
              ]}
              placeholder="Valor da proposta"
              placeholderTextColor={cores.textMuted}
            />
            {contra !== null ? (
              <Text variant="labelM" color="warning">
                Contraproposta do clube: {moeda(contra)}
              </Text>
            ) : null}
            <View style={styles.modalAcoes}>
              <View style={styles.flex}>
                <Button
                  variante="secondary"
                  titulo="Fechar"
                  onPress={() => setAlvo(null)}
                  fullWidth
                />
              </View>
              <View style={styles.flex}>
                <Button
                  variante="primary"
                  titulo="Enviar proposta"
                  onPress={enviarProposta}
                  fullWidth
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

export default TransferMarket;

const styles = StyleSheet.create({
  filtros: {flexDirection: 'row', flexWrap: 'wrap', gap: espacamento[2]},
  lista: {gap: espacamento[2]},
  flex: {flex: 1},
  proposta: {flexDirection: 'row', alignItems: 'center', gap: espacamento[3]},
  propostaAcoes: {gap: espacamento[1]},
  modalBackdrop: {flex: 1, justifyContent: 'flex-end'},
  modalCard: {
    borderTopLeftRadius: raios.xl,
    borderTopRightRadius: raios.xl,
    borderWidth: 1,
    gap: espacamento[2],
    padding: espacamento[5],
  },
  input: {
    borderRadius: raios.sm,
    borderWidth: 1,
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: espacamento[3],
    paddingVertical: espacamento[2],
  },
  modalAcoes: {
    flexDirection: 'row',
    gap: espacamento[2],
    marginTop: espacamento[2],
  },
});
