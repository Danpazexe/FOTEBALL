/**
 * Mercado de Transferências (Módulo 9). Duas abas:
 *  • Contratar — jogadores de outros clubes; o usuário envia proposta com valor
 *    e a IA responde (aceita / recusa / contraproposta).
 *  • Propostas — ofertas que a IA fez pelos jogadores do usuário (aceitar/recusar).
 */

import React, {useMemo, useState} from 'react';
import {Modal, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';

import PlayerCard from '../../components/PlayerCard';
import {AppHeader, Botao, ScreenContainer, TextoVazio} from '../../components/ui';
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
import {acentos, cores, espaco, raio, sombra, tipografia} from '../../theme';
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

  // Empréstimos disponíveis: jogadores de outros clubes, ainda não cedidos,
  // priorizando os mais jovens (perfil de empréstimo para desenvolver/encorpar).
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

  return (
    <ScreenContainer scroll>
      <AppHeader titulo="Mercado" onBack={() => nav.goBack()} />

      <View style={styles.tabBar}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setAba('contratar')}
          style={[styles.tab, aba === 'contratar' ? styles.tabAtiva : null]}>
          <Text style={[styles.tabTexto, aba === 'contratar' ? styles.tabTextoAtivo : null]}>
            Contratar
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setAba('propostas')}
          style={[styles.tab, aba === 'propostas' ? styles.tabAtiva : null]}>
          <Text style={[styles.tabTexto, aba === 'propostas' ? styles.tabTextoAtivo : null]}>
            Propostas{propostas.length > 0 ? ` (${propostas.length})` : ''}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setAba('emprestar')}
          style={[styles.tab, aba === 'emprestar' ? styles.tabAtiva : null]}>
          <Text style={[styles.tabTexto, aba === 'emprestar' ? styles.tabTextoAtivo : null]}>
            Empréstimos
          </Text>
        </Pressable>
      </View>

      {aba === 'contratar' || aba === 'emprestar' ? (
        <View style={styles.filtros}>
          {POSICOES.map(pos => (
            <Pressable
              accessibilityRole="button"
              key={pos}
              onPress={() => setFiltro(pos)}
              style={[styles.chip, filtro === pos ? styles.chipAtivo : null]}>
              <Text
                style={[
                  styles.chipTexto,
                  filtro === pos ? styles.chipTextoAtivo : null,
                ]}>
                {pos}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {aba === 'contratar' ? (
        disponiveis.length === 0 ? (
          <TextoVazio>Nenhum jogador para esse filtro.</TextoVazio>
        ) : (
          <View style={styles.lista}>
            {disponiveis.map(jogador => (
              <PlayerCard
                key={jogador.id}
                jogador={jogador}
                legendaExtra={nomeClube(clubes, jogador.clubeId ?? '')}
                onPress={() => nav.navigate('PlayerDetail', {jogadorId: jogador.id})}
                acaoLabel="Propor"
                onAcao={() => abrirProposta(jogador)}
              />
            ))}
          </View>
        )
      ) : null}

      {aba === 'emprestar' ? (
        emprestaveis.length === 0 ? (
          <TextoVazio>Nenhum jogador para empréstimo nesse filtro.</TextoVazio>
        ) : (
          <View style={styles.lista}>
            {emprestaveis.map(jogador => (
              <PlayerCard
                key={jogador.id}
                jogador={jogador}
                legendaExtra={`${nomeClube(clubes, jogador.clubeId ?? '')} · taxa ${moeda(custoEmprestimo(jogador))}`}
                onPress={() => nav.navigate('PlayerDetail', {jogadorId: jogador.id})}
                acaoLabel="Pegar"
                onAcao={() => aoEmprestar(jogador)}
              />
            ))}
          </View>
        )
      ) : null}

      {aba === 'propostas' ? (
        <>
          {propostas.length === 0 ? (
            <TextoVazio>Nenhuma proposta recebida.</TextoVazio>
          ) : (
            <View style={styles.lista}>
              {propostas.map(proposta => {
                const jogador = jogadores.find(j => j.id === proposta.jogadorId);
                return (
                  <View key={proposta.id} style={styles.proposta}>
                    <View style={styles.flex1}>
                      <Text style={styles.propostaNome}>
                        {jogador?.apelido ?? jogador?.nome ?? 'Jogador'}
                      </Text>
                      <Text style={styles.propostaLegenda}>
                        {nomeClube(clubes, proposta.clubeOfertante)} oferece
                      </Text>
                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        style={[styles.propostaValor, tipografia.numero]}>
                        {moeda(proposta.valorProposto)}
                      </Text>
                    </View>
                    <View style={styles.propostaAcoes}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => aceitar(proposta.id)}
                        style={styles.botaoAceitar}>
                        <Text style={styles.botaoAceitarTexto}>Aceitar</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => recusar(proposta.id)}
                        style={styles.botaoRecusar}>
                        <Text style={styles.botaoRecusarTexto}>Recusar</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </>
      ) : null}

      <Modal
        visible={alvo !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setAlvo(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitulo}>
              Proposta por {alvo?.apelido ?? alvo?.nome}
            </Text>
            <Text style={styles.modalLabel}>
              Valor de mercado: {alvo ? moeda(alvo.valorMercado) : '—'}
            </Text>
            <TextInput
              keyboardType="numeric"
              value={valorInput}
              onChangeText={setValorInput}
              style={styles.input}
              placeholder="Valor da proposta"
              placeholderTextColor={cores.textoSecundario}
            />
            {contra !== null ? (
              <Text style={styles.contra}>
                Contraproposta do clube: {moeda(contra)}
              </Text>
            ) : null}
            <View style={styles.modalAcoes}>
              <View style={styles.flex1}>
                <Botao
                  variante="secundaria"
                  titulo="Fechar"
                  onPress={() => setAlvo(null)}
                />
              </View>
              <View style={styles.flex1}>
                <Botao
                  variante="ouro"
                  titulo="Enviar proposta"
                  onPress={enviarProposta}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

export default TransferMarket;

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: cores.superficieElevada,
    borderColor: cores.bordaTransl,
    borderRadius: raio.lg,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: espaco.md,
    padding: 3,
    ...sombra.card,
  },
  tab: {
    alignItems: 'center',
    borderRadius: raio.md,
    flex: 1,
    paddingVertical: espaco.sm,
  },
  tabAtiva: {
    backgroundColor: cores.primaria,
  },
  tabTexto: {
    color: cores.textoSecundario,
    fontSize: 13,
    fontWeight: '800',
  },
  tabTextoAtivo: {
    color: cores.contrastePrimaria,
  },
  filtros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaco.xs,
    marginBottom: espaco.md,
  },
  chip: {
    borderColor: cores.borda,
    borderRadius: raio.pill,
    borderWidth: 1,
    paddingHorizontal: espaco.sm,
    paddingVertical: espaco.xs,
  },
  chipAtivo: {
    backgroundColor: cores.primaria,
    borderColor: cores.primaria,
  },
  chipTexto: {
    color: cores.texto,
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextoAtivo: {
    color: cores.contrastePrimaria,
  },
  lista: {
    gap: espaco.sm,
  },
  flex1: {
    flex: 1,
  },
  proposta: {
    alignItems: 'center',
    backgroundColor: cores.superficieElevada,
    borderColor: cores.bordaTransl,
    borderRadius: raio.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: espaco.md,
    padding: espaco.md,
    ...sombra.card,
  },
  propostaNome: {
    color: cores.texto,
    fontSize: 15,
    fontWeight: '800',
  },
  propostaLegenda: {
    color: cores.textoSecundario,
    fontSize: 12,
  },
  propostaValor: {
    color: cores.primaria,
    fontSize: 16,
    fontWeight: '900',
  },
  propostaAcoes: {
    gap: espaco.xs,
  },
  botaoAceitar: {
    alignItems: 'center',
    backgroundColor: cores.primaria,
    borderRadius: raio.sm,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
  },
  botaoAceitarTexto: {
    color: cores.contrastePrimaria,
    fontSize: 12,
    fontWeight: '800',
  },
  botaoRecusar: {
    alignItems: 'center',
    borderColor: cores.borda,
    borderRadius: raio.sm,
    borderWidth: 1,
    paddingVertical: espaco.xs,
  },
  botaoRecusarTexto: {
    color: cores.textoSecundario,
    fontSize: 11,
    fontWeight: '700',
  },
  modalBackdrop: {
    backgroundColor: 'rgba(5,8,14,0.82)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: cores.superficieElevada,
    borderColor: cores.bordaTransl,
    borderWidth: 1,
    borderTopLeftRadius: raio.xl,
    borderTopRightRadius: raio.xl,
    gap: espaco.sm,
    padding: espaco.lg,
    ...sombra.card,
  },
  modalTitulo: {
    color: cores.texto,
    fontSize: 18,
    fontWeight: '800',
  },
  modalLabel: {
    color: cores.textoSecundario,
    fontSize: 12,
  },
  input: {
    backgroundColor: cores.superficieAlt,
    borderColor: cores.borda,
    borderRadius: raio.sm,
    borderWidth: 1,
    color: cores.texto,
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
  },
  contra: {
    // Amarelo do acento (legível sobre card branco, ao contrário do dourado).
    color: acentos.amarelo,
    fontSize: 13,
    fontWeight: '700',
  },
  modalAcoes: {
    flexDirection: 'row',
    gap: espaco.sm,
    marginTop: espaco.sm,
  },
});
