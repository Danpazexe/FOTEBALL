/**
 * Tela de súmula da partida (apresentada na pilha). Mostra o placar final, os
 * GOLS (autor + assistência), as NOTAS dos jogadores das duas equipes (com o
 * melhor em campo) e a lista completa de lances.
 *
 * As notas são recalculadas na hora a partir dos eventos da partida e da
 * escalação atual de cada clube (`calcularNotaPartida`) — gols/assistências
 * ficam gravados nos próprios eventos, então são sempre exatos.
 */

import React, {useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useRoute, type RouteProp} from '@react-navigation/native';

import {
  AppHeader,
  Botao,
  ScreenContainer,
  Section,
  TextoVazio,
} from '../../components/ui';
import {EventItem} from '../../components/MatchNarration/EventItem';
import {ScoreHeader} from '../../components/MatchNarration/ScoreHeader';
import Icone from '../../components/Icone';
import {
  calcularNotaPartida,
  type ResultadoJogador,
} from '../../engine/simulation/matchRating';
import {cores, corDoTime, espaco, raio, sombra} from '../../theme';
import {nomeClube, siglaClube} from '../../utils/formatters';
import {useGameStore} from '../../store/useGameStore';
import {useAppNavigation, type RootStackParamList} from '../../navigation/types';
import type {Clube, Partida, Player} from '../../types';

type NotaJogador = {jogador: Player; nota: number};

function nomeCurto(jogador: Player): string {
  return jogador.apelido ?? jogador.nome;
}

/** Verde (ótima) → amarelo (regular) → vermelho (ruim). */
function corNota(nota: number): string {
  if (nota >= 7.5) {
    return cores.primaria;
  }
  if (nota >= 6) {
    return cores.secundaria;
  }
  return cores.perigo;
}

/** Notas dos 11 titulares de um clube, da maior para a menor. */
function notasDoTime(
  clube: Clube | undefined,
  jogadores: Player[],
  partida: Partida,
  ehCasa: boolean,
): NotaJogador[] {
  if (!clube?.formacaoAtual) {
    return [];
  }
  const placarCasa = partida.placarCasa ?? 0;
  const placarFora = partida.placarFora ?? 0;
  const resultado: ResultadoJogador =
    placarCasa === placarFora
      ? 'empate'
      : (placarCasa > placarFora) === ehCasa
      ? 'vitoria'
      : 'derrota';
  const cleanSheet = ehCasa ? placarFora === 0 : placarCasa === 0;
  const porId = new Map(jogadores.map(j => [j.id, j]));

  return clube.formacaoAtual.titulares
    .map(titular => porId.get(titular.jogadorId))
    .filter((p): p is Player => p !== undefined)
    .map(p => ({
      jogador: p,
      nota: calcularNotaPartida(
        p,
        partida.eventos.filter(e => e.jogadorId === p.id),
        resultado,
        cleanSheet,
      ),
    }))
    .sort((a, b) => b.nota - a.nota);
}

function MatchResult(): React.JSX.Element {
  const nav = useAppNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'MatchResult'>>();
  const {partidaId} = route.params;

  const partida = useGameStore(state =>
    state.partidas.find(item => item.id === partidaId),
  );
  const clubes = useGameStore(state => state.clubes);
  const jogadores = useGameStore(state => state.jogadores);

  const dados = useMemo(() => {
    if (!partida) {
      return null;
    }
    const clubeCasa = clubes.find(c => c.id === partida.timeCasa);
    const clubeFora = clubes.find(c => c.id === partida.timeFora);
    const nomes = new Map(jogadores.map(j => [j.id, nomeCurto(j)]));
    const gols = partida.eventos
      .filter(e => e.tipo === 'gol')
      .sort((a, b) => a.minuto - b.minuto);
    const notasCasa = notasDoTime(clubeCasa, jogadores, partida, true);
    const notasFora = notasDoTime(clubeFora, jogadores, partida, false);
    const todas = [...notasCasa, ...notasFora];
    const melhor = todas.length
      ? todas.reduce((m, n) => (n.nota > m.nota ? n : m))
      : null;
    return {gols, notasCasa, notasFora, nomes, melhor};
  }, [partida, clubes, jogadores]);

  if (!partida || !dados) {
    return (
      <ScreenContainer scroll>
        <AppHeader titulo="Súmula" onBack={() => nav.goBack()} />
        <TextoVazio>Partida não encontrada.</TextoVazio>
      </ScreenContainer>
    );
  }

  const placarCasa = partida.placarCasa ?? 0;
  const placarFora = partida.placarFora ?? 0;
  const corCasa = corDoTime(partida.timeCasa);
  const corFora = corDoTime(partida.timeFora);
  const siglaCasa = siglaClube(clubes, partida.timeCasa);
  const siglaFora = siglaClube(clubes, partida.timeFora);
  const eventosOrdenados = [...partida.eventos].sort((a, b) => a.minuto - b.minuto);
  const melhorId = dados.melhor?.jogador.id;

  return (
    <ScreenContainer scroll>
      <AppHeader titulo="Súmula" onBack={() => nav.goBack()} />

      <View style={styles.placar}>
        <ScoreHeader
          nomeCasa={nomeClube(clubes, partida.timeCasa)}
          nomeFora={nomeClube(clubes, partida.timeFora)}
          placarCasa={placarCasa}
          placarFora={placarFora}
          rotulo="FINAL"
          clubeIdCasa={partida.timeCasa}
          clubeIdFora={partida.timeFora}
          siglaCasa={siglaCasa}
          siglaFora={siglaFora}
          corCasa={corCasa}
          corFora={corFora}
        />
      </View>

      <Section titulo="Gols">
        {dados.gols.length === 0 ? (
          <TextoVazio>Sem gols nesta partida.</TextoVazio>
        ) : (
          <View style={styles.gols}>
            {dados.gols.map((gol, indice) => {
              const ehCasa = gol.timeId === partida.timeCasa;
              const assistente = gol.jogadorAssistenciaId
                ? dados.nomes.get(gol.jogadorAssistenciaId)
                : undefined;
              return (
                <View key={`gol_${indice}`} style={styles.golLinha}>
                  <View
                    style={[
                      styles.golDot,
                      {backgroundColor: ehCasa ? corCasa : corFora},
                    ]}
                  />
                  <Icone nome="bola" tamanho={16} cor={cores.texto} />
                  <Text style={styles.golMinuto}>{gol.minuto}&apos;</Text>
                  <View style={styles.flex1}>
                    <Text style={styles.golNome} numberOfLines={1}>
                      {dados.nomes.get(gol.jogadorId) ?? 'Jogador'}
                    </Text>
                    {assistente ? (
                      <Text style={styles.golAssist} numberOfLines={1}>
                        assistência de {assistente}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.golSigla}>
                    {ehCasa ? siglaCasa : siglaFora}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </Section>

      <Section titulo="Notas dos jogadores">
        {dados.melhor ? (
          <View style={styles.melhor}>
            <Icone nome="trofeu" tamanho={16} cor={cores.contrastePrimaria} />
            <Text style={styles.melhorTexto} numberOfLines={1}>
              Melhor em campo: {nomeCurto(dados.melhor.jogador)} ·{' '}
              {dados.melhor.nota.toFixed(1)}
            </Text>
          </View>
        ) : null}
        <View style={styles.notasTimes}>
          <TimeNotas
            titulo={siglaCasa}
            notas={dados.notasCasa}
            melhorId={melhorId}
          />
          <TimeNotas
            titulo={siglaFora}
            notas={dados.notasFora}
            melhorId={melhorId}
          />
        </View>
      </Section>

      <Section titulo="Lances">
        {eventosOrdenados.length === 0 ? (
          <TextoVazio>Nenhum lance registrado nesta partida.</TextoVazio>
        ) : (
          <View style={styles.eventos}>
            {eventosOrdenados.map((evento, indice) => {
              const ehCasa = evento.timeId === partida.timeCasa;
              return (
                <EventItem
                  key={`${evento.minuto}-${evento.tipo}-${indice}`}
                  minuto={evento.minuto}
                  tipo={evento.tipo}
                  descricao={evento.descricao}
                  lado={ehCasa ? 'casa' : 'fora'}
                  sigla={ehCasa ? siglaCasa : siglaFora}
                  corTime={ehCasa ? corCasa : corFora}
                  clubeId={evento.timeId}
                />
              );
            })}
          </View>
        )}
      </Section>

      <Botao titulo="Continuar" onPress={() => nav.navigate('MainTabs')} />
    </ScreenContainer>
  );
}

/** Coluna de notas de um time (11 titulares, maior nota primeiro). */
function TimeNotas({
  titulo,
  notas,
  melhorId,
}: {
  titulo: string;
  notas: NotaJogador[];
  melhorId?: string;
}): React.JSX.Element {
  return (
    <View style={styles.timeCol}>
      <Text style={styles.timeTitulo}>{titulo}</Text>
      {notas.length === 0 ? (
        <Text style={styles.semNotas}>—</Text>
      ) : (
        notas.map(({jogador, nota}) => (
          <View key={jogador.id} style={styles.notaLinha}>
            <Text style={styles.notaPos}>{jogador.posicaoPrincipal}</Text>
            <Text style={styles.notaNome} numberOfLines={1}>
              {nomeCurto(jogador)}
            </Text>
            {jogador.id === melhorId ? (
              <Icone nome="trofeu" tamanho={11} cor={cores.secundaria} />
            ) : null}
            <View style={[styles.notaBadge, {borderColor: corNota(nota)}]}>
              <Text style={[styles.notaValor, {color: corNota(nota)}]}>
                {nota.toFixed(1)}
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  placar: {
    marginVertical: espaco.lg,
  },
  flex1: {
    flex: 1,
  },
  gols: {
    gap: espaco.sm,
  },
  golLinha: {
    alignItems: 'center',
    backgroundColor: cores.superficieElevada,
    borderColor: cores.bordaTransl,
    borderRadius: raio.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: espaco.sm,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
    ...sombra.suave,
  },
  golDot: {
    borderRadius: 3,
    height: 22,
    width: 4,
  },
  golMinuto: {
    color: cores.secundaria,
    fontSize: 13,
    fontWeight: '900',
    minWidth: 30,
  },
  golNome: {
    color: cores.texto,
    fontSize: 14,
    fontWeight: '800',
  },
  golAssist: {
    color: cores.textoSecundario,
    fontSize: 12,
  },
  golSigla: {
    color: cores.textoSecundario,
    fontSize: 12,
    fontWeight: '800',
  },
  melhor: {
    alignItems: 'center',
    backgroundColor: cores.primaria,
    borderRadius: raio.md,
    flexDirection: 'row',
    gap: espaco.sm,
    marginBottom: espaco.sm,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
  },
  melhorTexto: {
    color: cores.contrastePrimaria,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  notasTimes: {
    flexDirection: 'row',
    gap: espaco.sm,
  },
  timeCol: {
    backgroundColor: cores.superficieElevada,
    borderColor: cores.bordaTransl,
    borderRadius: raio.lg,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    padding: espaco.sm,
    ...sombra.suave,
  },
  timeTitulo: {
    color: cores.textoSecundario,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: espaco.xs,
    textTransform: 'uppercase',
  },
  semNotas: {
    color: cores.textoSecundario,
    fontSize: 12,
  },
  notaLinha: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.xs,
    paddingVertical: 2,
  },
  notaPos: {
    color: cores.textoSecundario,
    fontSize: 9,
    fontWeight: '800',
    minWidth: 22,
  },
  notaNome: {
    color: cores.texto,
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
  },
  notaBadge: {
    borderRadius: raio.sm,
    borderWidth: 1.5,
    minWidth: 30,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  notaValor: {
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  eventos: {
    gap: espaco.sm,
  },
});

export default MatchResult;
