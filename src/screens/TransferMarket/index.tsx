/**
 * Mercado de Transferências (North Star). Card de ORÇAMENTO (disponível +
 * salarial), abas Disponíveis / Empréstimos / Propostas e lista de jogadores
 * "Recomendados" (avatar, posição/idade, faixa overall–potencial, valor). O
 * usuário propõe compra/empréstimo e responde ofertas da IA. Só mostra dado que
 * o jogo conhece (overall + potencial); nada é inventado.
 */
import React, {useMemo, useState} from 'react';
import {ScrollView, StyleSheet, TextInput, View} from 'react-native';

import {
  AppBar,
  Button,
  Card,
  Chip,
  Divider,
  IconButton,
  PositionBadge,
  ProgressBar,
  Pressable,
  Screen,
  SectionHeader,
  SegmentedTabs,
  TeamCrest,
  Text,
  espacamento,
  raios,
  useTheme,
} from '../../design-system';
import PlayerAvatar from '../../components/PlayerAvatar';
import {useToast} from '../../components/feedback';
import {calcularFolhaSalarial} from '../../engine/finance/financeEngine';
import {
  custoEmprestimo,
  ehEmprestado,
} from '../../engine/transfers/emprestimoEngine';
import {useMercadoNavigation} from '../../navigation/types';
import {selecionarClubeUsuario, useGameStore} from '../../store/useGameStore';
import {combinarMundoStore} from '../../store/transferenciaMundo';
import {moeda, moedaCompacta, nomeClube, siglaClube} from '../../utils/formatters';
import type {Player, Position} from '../../types';

const LIMITE = 30;
const POSICOES: Array<Position | 'Todos'> = [
  'Todos', 'GOL', 'ZAG', 'LD', 'LE', 'VOL', 'MC', 'MEI', 'PD', 'PE', 'SA', 'CA',
];

type Aba = 'disponiveis' | 'emprestar' | 'propostas';

function nomeCurto(jogador: Player): string {
  return jogador.apelido ?? jogador.nome;
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Faixa overall→potencial (ambos conhecidos); só o número se não há margem. */
function faixaOverall(jogador: Player): string {
  return jogador.potencial > jogador.overall
    ? `${jogador.overall}–${jogador.potencial}`
    : `${jogador.overall}`;
}

function TransferMarket(): React.JSX.Element {
  const nav = useMercadoNavigation();
  const toast = useToast();
  const {cores} = useTheme();

  const jogadores = useGameStore(state => state.jogadores);
  const clubes = useGameStore(state => state.clubes);
  const todosJogadores = useGameStore(state => state.todosJogadores);
  const todosClubes = useGameStore(state => state.todosClubes);
  const clubeUsuarioId = useGameStore(state => state.clubeUsuarioId);
  const propostas = useGameStore(state => state.propostasRecebidas);
  const responderPropostaVenda = useGameStore(
    state => state.responderPropostaVenda,
  );
  const pegarEmprestado = useGameStore(state => state.pegarEmprestado);
  const clubeUsuario = useGameStore(selecionarClubeUsuario);

  const [aba, setAba] = useState<Aba>('disponiveis');
  const [filtro, setFiltro] = useState<Position | 'Todos'>('Todos');
  const [busca, setBusca] = useState('');
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [filtroAberto, setFiltroAberto] = useState(false);

  // Orçamento: saldo disponível + folha salarial mensal e seu peso na receita.
  const orcamento = useMemo(() => {
    const saldo = clubeUsuario?.financas.saldo ?? 0;
    const elenco = jogadores.filter(j => j.clubeId === clubeUsuarioId);
    const folha = calcularFolhaSalarial(elenco);
    // A quebra mensal do seed fica sempre 0; a receita real está no histórico.
    const receita = (clubeUsuario?.financas.historicoTransacoes ?? [])
      .filter(t => t.tipo === 'receita')
      .reduce((s, t) => s + Math.abs(t.valor), 0);
    const pctFolha = receita > 0 ? Math.min(100, (folha / receita) * 100) : 0;
    return {saldo, folha, pctFolha};
  }, [clubeUsuario, jogadores, clubeUsuarioId]);

  const corFolha =
    orcamento.pctFolha > 80
      ? cores.danger
      : orcamento.pctFolha > 60
      ? cores.warning
      : cores.brand;

  const alvoBusca = normalizar(busca.trim());

  // Mercado UNIVERSAL: enxerga TODAS as ligas carregadas (não só a divisão
  // jogada). A liga ativa vence para o elenco do usuário (estado vivo).
  const mundo = useMemo(
    () => combinarMundoStore({clubes, jogadores, todosClubes, todosJogadores}),
    [clubes, jogadores, todosClubes, todosJogadores],
  );
  const jogadoresMundo = mundo.jogadores;
  const clubesMundo = mundo.clubes;

  const disponiveis = useMemo(
    () =>
      jogadoresMundo
        .filter(j => j.clubeId !== clubeUsuarioId && j.clubeId !== null)
        .filter(j => filtro === 'Todos' || j.posicaoPrincipal === filtro)
        .filter(j => alvoBusca === '' || normalizar(nomeCurto(j)).includes(alvoBusca))
        .sort((a, b) => b.overall - a.overall)
        .slice(0, LIMITE),
    [jogadoresMundo, clubeUsuarioId, filtro, alvoBusca],
  );

  const emprestaveis = useMemo(
    () =>
      jogadoresMundo
        .filter(
          j =>
            j.clubeId !== clubeUsuarioId && j.clubeId !== null && !ehEmprestado(j),
        )
        .filter(j => filtro === 'Todos' || j.posicaoPrincipal === filtro)
        .filter(j => alvoBusca === '' || normalizar(nomeCurto(j)).includes(alvoBusca))
        .sort((a, b) => a.idade - b.idade || b.overall - a.overall)
        .slice(0, LIMITE),
    [jogadoresMundo, clubeUsuarioId, filtro, alvoBusca],
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

  const abrirProposta = (jogador: Player) =>
    nav.navigate('Negociacao', {jogadorId: jogador.id});

  const aceitar = (propostaId: string) => {
    responderPropostaVenda(propostaId, true);
    toast('Venda concluída.', 'sucesso');
  };
  const recusar = (propostaId: string) => {
    responderPropostaVenda(propostaId, false);
    toast('Proposta recusada.', 'info');
  };

  const abrirDetalhe = (id: string) =>
    nav.navigate('PlayerDetail', {jogadorId: id});

  const abas = [
    {chave: 'disponiveis', rotulo: 'Disponíveis'},
    {chave: 'emprestar', rotulo: 'Empréstimos'},
    {
      chave: 'propostas',
      rotulo: `Propostas${propostas.length > 0 ? ` (${propostas.length})` : ''}`,
    },
  ];

  return (
    <Screen
      scroll
      header={
        <AppBar
          title="Mercado"
          right={
            <View style={styles.headerAcoes}>
              <IconButton
                icone="busca"
                onPress={() => setBuscaAberta(v => !v)}
                accessibilityLabel="Buscar jogador"
                tom={buscaAberta ? 'brand' : 'textPrimary'}
              />
              <IconButton
                icone="filtro"
                onPress={() => setFiltroAberto(v => !v)}
                accessibilityLabel="Filtrar por posição"
                tom={filtroAberto || filtro !== 'Todos' ? 'brand' : 'textPrimary'}
              />
              <IconButton
                icone="olho"
                onPress={() => nav.navigate('CentralOlheiro')}
                accessibilityLabel="Central do olheiro"
              />
            </View>
          }
        />
      }>
      {/* Orçamento. */}
      <Card variante="outlined" style={styles.orcamento}>
        <View style={styles.orcamentoLinha}>
          <View style={styles.flex}>
            <Text variant="labelM" color="textSecondary">
              Orçamento disponível
            </Text>
            <Text
              variant="titleL"
              color={orcamento.saldo < 0 ? 'danger' : 'brand'}
              tabular>
              {moedaCompacta(orcamento.saldo)}
            </Text>
          </View>
          <View style={styles.flex}>
            <Text variant="labelM" color="textSecondary">
              Orçamento salarial
            </Text>
            <Text variant="titleM" tabular>
              {moedaCompacta(orcamento.folha)}
              <Text variant="caption" color="textMuted">
                {' '}
                /mês
              </Text>
            </Text>
          </View>
        </View>
        <ProgressBar valor={orcamento.pctFolha} cor={corFolha} />
      </Card>

      <SegmentedTabs abas={abas} ativa={aba} onSelect={c => setAba(c as Aba)} />

      {buscaAberta ? (
        <TextInput
          value={busca}
          onChangeText={setBusca}
          autoFocus
          placeholder="Buscar por nome"
          placeholderTextColor={cores.textMuted}
          accessibilityLabel="Buscar por nome"
          style={[
            styles.busca,
            {
              backgroundColor: cores.surfaceSubtle,
              borderColor: cores.border,
              color: cores.textPrimary,
            },
          ]}
        />
      ) : null}

      {filtroAberto && (aba === 'disponiveis' || aba === 'emprestar') ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtros}>
          {POSICOES.map(pos => (
            <Chip
              key={pos}
              label={pos}
              selected={filtro === pos}
              onPress={() => setFiltro(pos)}
            />
          ))}
        </ScrollView>
      ) : null}

      {aba === 'disponiveis' ? (
        <>
          <SectionHeader titulo="Recomendados para você" />
          {disponiveis.length === 0 ? (
            <Text variant="bodyM" color="textSecondary">
              Nenhum jogador para esse filtro.
            </Text>
          ) : (
            <View style={styles.lista}>
              {disponiveis.map((jogador, i) => (
                <React.Fragment key={jogador.id}>
                  {i > 0 ? <Divider /> : null}
                  <MercadoRow
                    jogador={jogador}
                    clubeId={jogador.clubeId ?? ''}
                    sigla={siglaClube(clubesMundo, jogador.clubeId ?? '')}
                    valorTexto={moedaCompacta(jogador.valorMercado)}
                    acaoLabel="Propor"
                    onAcao={() => abrirProposta(jogador)}
                    onPress={() => abrirDetalhe(jogador.id)}
                  />
                </React.Fragment>
              ))}
            </View>
          )}
        </>
      ) : null}

      {aba === 'emprestar' ? (
        emprestaveis.length === 0 ? (
          <Text variant="bodyM" color="textSecondary">
            Nenhum jogador para empréstimo nesse filtro.
          </Text>
        ) : (
          <View style={styles.lista}>
            {emprestaveis.map((jogador, i) => (
              <React.Fragment key={jogador.id}>
                {i > 0 ? <Divider /> : null}
                <MercadoRow
                  jogador={jogador}
                  clubeId={jogador.clubeId ?? ''}
                  sigla={siglaClube(clubesMundo, jogador.clubeId ?? '')}
                  extra={`taxa ${moeda(custoEmprestimo(jogador))}`}
                  valorTexto={moedaCompacta(jogador.valorMercado)}
                  acaoLabel="Pegar"
                  onAcao={() => aoEmprestar(jogador)}
                  onPress={() => abrirDetalhe(jogador.id)}
                />
              </React.Fragment>
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
                      {jogador ? nomeCurto(jogador) : 'Jogador'}
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
    </Screen>
  );
}

/** Linha de jogador do mercado: avatar · nome/posição/idade · faixa OVR · valor. */
function MercadoRow({
  jogador,
  clubeId,
  sigla,
  extra,
  valorTexto,
  acaoLabel,
  onAcao,
  onPress,
}: {
  jogador: Player;
  clubeId: string;
  sigla: string;
  extra?: string;
  valorTexto: string;
  acaoLabel: string;
  onAcao: () => void;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={styles.row}
      accessibilityLabel={`${nomeCurto(jogador)}, ${jogador.posicaoPrincipal}, ${jogador.idade} anos`}>
      <PlayerAvatar id={jogador.id} tamanho={40} />
      <View style={styles.rowInfo}>
        <Text variant="labelL" numberOfLines={1}>
          {nomeCurto(jogador)}
        </Text>
        <View style={styles.rowMeta}>
          <PositionBadge posicao={jogador.posicaoPrincipal} tamanho="sm" />
          <Text variant="caption" color="textSecondary">
            {jogador.idade} anos
          </Text>
          <TeamCrest clubeId={clubeId} sigla={sigla} size={16} />
          {extra ? (
            <Text
              variant="caption"
              color="textSecondary"
              numberOfLines={1}
              style={styles.flex}>
              {extra}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.rowNums}>
        <Text variant="labelL" tabular>
          {faixaOverall(jogador)}
        </Text>
        <Text variant="caption" color="textSecondary" tabular>
          {valorTexto}
        </Text>
      </View>
      <Button
        titulo={acaoLabel}
        variante="secondary"
        tamanho="sm"
        onPress={onAcao}
      />
    </Pressable>
  );
}

export default TransferMarket;

const styles = StyleSheet.create({
  flex: {flex: 1},
  headerAcoes: {flexDirection: 'row', alignItems: 'center', gap: espacamento[1]},
  busca: {
    borderRadius: raios.md,
    borderWidth: 1,
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: espacamento[3],
    paddingVertical: espacamento[2],
  },
  orcamento: {gap: espacamento[3]},
  orcamentoLinha: {flexDirection: 'row', gap: espacamento[3]},
  filtros: {flexDirection: 'row', gap: espacamento[2], paddingRight: espacamento[4]},
  lista: {gap: 0},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[3],
    minHeight: 60,
    paddingVertical: espacamento[2],
  },
  rowInfo: {flex: 1, gap: 3},
  rowMeta: {flexDirection: 'row', alignItems: 'center', gap: espacamento[2]},
  rowNums: {alignItems: 'flex-end', gap: 2},
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
