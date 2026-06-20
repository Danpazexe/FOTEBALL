/**
 * Tela de demissão (eixo Meta/Carreira §12). Quando a diretoria demite o técnico
 * (`state.demissao` != null), a carreira NÃO acaba: ele é recontratado por um
 * clube disposto — filtrado pela reputação (`clubeElegivelParaTecnico`). Se a
 * reputação afundou e nenhum clube o quer, aí sim é o fim da linha.
 */

import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';

import {AppHeader, Botao, ScreenContainer, TextoVazio} from '../../components/ui';
import OverallBadge from '../../components/OverallBadge';
import Escudo from '../../components/Escudo';
import {useConfirm} from '../../components/feedback';
import {clubeElegivelParaTecnico} from '../../engine/carreira/carreiraEngine';
import {useAppNavigation} from '../../navigation/types';
import {useGameStore} from '../../store/useGameStore';
import {cores, espaco, raio, sombra} from '../../theme';
import type {Clube, MotivoDemissao, Player} from '../../types';
import {moeda} from '../../utils/formatters';

const ORDEM_DIVISOES = ['Série A', 'Série B', 'Série C'];

function motivoTexto(motivo: MotivoDemissao): string {
  switch (motivo) {
    case 'FALENCIA':
      return 'O clube quebrou financeiramente e a diretoria te dispensou.';
    case 'REBAIXAMENTO':
      return 'O rebaixamento custou o seu emprego.';
    case 'DERROTAS_CONSECUTIVAS':
      return 'A sequência de derrotas esgotou a paciência da diretoria.';
  }
}

function mediaOverall(jogadores: Player[], clubeId: string): number {
  const doClube = jogadores
    .filter(j => j.clubeId === clubeId)
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 11);
  if (doClube.length === 0) {
    return 0;
  }
  return Math.round(
    doClube.reduce((t, j) => t + j.overall, 0) / doClube.length,
  );
}

function Demissao(): React.JSX.Element {
  const nav = useAppNavigation();
  const confirm = useConfirm();
  const demissao = useGameStore(state => state.demissao);
  const reputacaoTecnico = useGameStore(state => state.reputacaoTecnico);
  const clubeUsuarioId = useGameStore(state => state.clubeUsuarioId);
  const todosClubes = useGameStore(state => state.todosClubes);
  const jogadores = useGameStore(state => state.todosJogadores);
  const assumirClube = useGameStore(state => state.assumirClube);
  const reiniciarCarreira = useGameStore(state => state.reiniciarCarreira);

  const secoes = React.useMemo(() => {
    const elegiveis = todosClubes.filter(
      clube =>
        clube.id !== clubeUsuarioId &&
        clubeElegivelParaTecnico(reputacaoTecnico, clube.reputacao),
    );
    const grupos = new Map<string, Clube[]>();
    for (const clube of elegiveis) {
      const divisao = clube.divisao ?? 'Série A';
      const lista = grupos.get(divisao) ?? [];
      lista.push(clube);
      grupos.set(divisao, lista);
    }
    return [...grupos.keys()]
      .sort((a, b) => {
        const ia = ORDEM_DIVISOES.indexOf(a);
        const ib = ORDEM_DIVISOES.indexOf(b);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      })
      .map(divisao => ({
        divisao,
        clubes: (grupos.get(divisao) ?? []).sort(
          (a, b) => b.reputacao - a.reputacao,
        ),
      }));
  }, [todosClubes, clubeUsuarioId, reputacaoTecnico]);

  const semPropostas = secoes.length === 0;

  async function assumir(clube: Clube): Promise<void> {
    const divisao = clube.divisao ?? 'Série A';
    const ok = await confirm({
      titulo: `Assumir o ${clube.nome}?`,
      mensagem: `Você recomeça na ${divisao}, levando sua reputação de técnico.`,
      detalhes: [
        {rotulo: 'Divisão', valor: divisao},
        {rotulo: 'Força do elenco', valor: `${mediaOverall(jogadores, clube.id)} OVR`},
        {rotulo: 'Reputação do clube', valor: `${clube.reputacao}/100`},
        {rotulo: 'Saldo', valor: moeda(clube.financas.saldo)},
      ],
      confirmarLabel: 'Assinar contrato',
    });
    if (!ok) {
      return;
    }
    assumirClube(clube.id);
    nav.navigate('MainTabs');
  }

  function recomecar(): void {
    reiniciarCarreira();
    nav.navigate('MainMenu');
  }

  return (
    <ScreenContainer>
      <View style={styles.headerWrap}>
        <AppHeader
          titulo="Você foi demitido"
          subtitulo={`Reputação ${reputacaoTecnico}/100`}
        />
      </View>

      <View style={styles.motivoCard}>
        <Text style={styles.motivoTexto}>
          {demissao ? motivoTexto(demissao) : 'Sua passagem chegou ao fim.'}
        </Text>
      </View>

      {semPropostas ? (
        <View style={styles.semPropostas}>
          <Text style={styles.fimTitulo}>Fim da linha</Text>
          <TextoVazio>
            Sua reputação afundou e nenhum clube fez proposta. É o fim desta
            carreira.
          </TextoVazio>
          <Botao
            icone="jogar"
            titulo="Começar uma nova carreira"
            variante="ouro"
            onPress={recomecar}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.lista}>
          <Text style={styles.intro}>
            Clubes dispostos a te contratar agora:
          </Text>
          {secoes.map(secao => (
            <View key={secao.divisao} style={styles.secao}>
              <Text style={styles.secaoTitulo}>{secao.divisao}</Text>
              {secao.clubes.map(clube => (
                <Pressable
                  accessibilityRole="button"
                  key={clube.id}
                  onPress={() => assumir(clube)}
                  style={styles.item}>
                  <Escudo clubeId={clube.id} sigla={clube.sigla} tamanho={44} />
                  <View style={styles.itemInfoWrap}>
                    <Text style={styles.itemNome}>{clube.nome}</Text>
                    <Text style={styles.itemInfo}>
                      Rep. {clube.reputacao} · {moeda(clube.financas.saldo)}
                    </Text>
                  </View>
                  <OverallBadge
                    overall={mediaOverall(jogadores, clube.id)}
                    size={40}
                  />
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: espaco.lg,
    paddingTop: espaco.lg,
  },
  motivoCard: {
    backgroundColor: cores.superficieElevada,
    borderColor: cores.bordaTransl,
    borderLeftColor: cores.perigo,
    borderLeftWidth: 3,
    borderRadius: raio.lg,
    borderWidth: 1,
    marginHorizontal: espaco.lg,
    marginTop: espaco.md,
    padding: espaco.md,
    ...sombra.card,
  },
  motivoTexto: {
    color: cores.texto,
    fontSize: 14,
    fontWeight: '600',
  },
  intro: {
    color: cores.textoSecundario,
    fontSize: 13,
    fontWeight: '700',
  },
  semPropostas: {
    gap: espaco.lg,
    padding: espaco.lg,
  },
  fimTitulo: {
    color: cores.texto,
    fontSize: 20,
    fontWeight: '900',
  },
  lista: {
    gap: espaco.lg,
    padding: espaco.lg,
    paddingBottom: espaco.xl * 2,
  },
  secao: {
    gap: espaco.md,
  },
  secaoTitulo: {
    color: cores.textoSecundario,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  item: {
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
  itemInfoWrap: {
    flex: 1,
    gap: espaco.xs,
  },
  itemNome: {
    color: cores.texto,
    fontSize: 17,
    fontWeight: '800',
  },
  itemInfo: {
    color: cores.textoSecundario,
    fontSize: 13,
    fontWeight: '600',
  },
});

export default Demissao;
