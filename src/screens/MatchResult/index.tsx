/**
 * Relatório da partida (súmula pós-jogo) — layout "prancheta": placar grande
 * sobre o scoreboard, gols por lado, craque do jogo, poucas estatísticas
 * relevantes (só as que a engine gera) e momentos, com o CTA "Continuar".
 *
 * Toda informação vem do store/engine: placar e eventos da própria partida,
 * nota calculada por `calcularNotaPartida`, posse/estatísticas acumuladas pela
 * engine e momentos por `analisarMomentos`. Nada é inventado — seções sem dado
 * (posse/estatísticas em saves antigos, jogo sem gols) simplesmente somem.
 */

import React, {useMemo, useState} from 'react';
import {Modal, StyleSheet, View, useWindowDimensions} from 'react-native';
import {useRoute, type RouteProp} from '@react-navigation/native';

import {
  AppHeader,
  Box,
  Button,
  Card,
  EmptyState,
  Icon,
  PositionBadge,
  IconButton,
  Pressable,
  Screen,
  SectionHeader,
  SegmentedTabs,
  TeamCrest,
  Text,
  espacamento,
  raios,
  useTheme,
  type CorTexto,
} from '../../design-system';
import PlayerAvatar from '../../components/PlayerAvatar';
import MapaFinalizacoes from '../../components/MapaFinalizacoes';
import ReplayGol from '../../components/ReplayGol';
import {
  calcularNotaPartida,
  type ResultadoJogador,
} from '../../engine/simulation/matchRating';
import {obterFinalizacoesPartida} from '../../engine/simulation/finalizacoes';
import {reconstruirLancesGol} from '../../engine/simulation/lanceReplay';
import type {LanceGol} from '../../engine/simulation/lances';
import {analisarMomentos, type TomMomento} from '../../engine/simulation/momentos';
import {nomeClube, nomeCurto, siglaClube} from '../../utils/formatters';
import {rotuloMinuto} from '../../utils/minutoPartida';
import {useGameStore} from '../../store/useGameStore';
import {useAppNavigation, type RootStackParamList} from '../../navigation/types';
import {ehEventoGol} from '../../types';
import type {Clube, EventoPartida, Partida, Player, Position} from '../../types';

/** Uma linha de jogador que ATUOU na partida (usada só para achar o craque). */
type LinhaJogador = {
  jogador: Player;
  gols: number;
  assistencias: number;
  nota: number;
};

/** Cor da nota pelo valor (verde ótima, âmbar regular, vermelho fraca). */
function corNota(nota: number): CorTexto {
  if (nota >= 7.5) {
    return 'success';
  }
  if (nota >= 6) {
    return 'warning';
  }
  return 'danger';
}

/**
 * Quem ATUOU (para poder ter nota): titular que não saiu joga até o fim; quem
 * entra joga da troca ao fim (ou até ser expulso/lesionar). Determinístico a
 * partir dos eventos reais persistidos na partida.
 */
function participantes(
  eventos: EventoPartida[],
  titularesIds: Set<string>,
): Set<string> {
  const entrou = new Set<string>();
  for (const evento of eventos) {
    if (evento.tipo === 'substituicao' && evento.jogadorEntraId) {
      entrou.add(evento.jogadorEntraId);
    }
  }
  return new Set<string>([...titularesIds, ...entrou]);
}

/** Linhas com nota dos jogadores que atuaram por um time. */
function linhasDoTime(
  clube: Clube | undefined,
  jogadores: Player[],
  partida: Partida,
  ehCasa: boolean,
): LinhaJogador[] {
  if (!clube) {
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
  // Escalação do APITO persistida (histórico correto); fallback: formação atual.
  const snapshot = ehCasa ? partida.titularesCasa : partida.titularesFora;
  const idsTitulares =
    snapshot ?? clube.formacaoAtual?.titulares.map(t => t.jogadorId) ?? [];
  const atuantes = participantes(partida.eventos, new Set(idsTitulares));

  const linhas: LinhaJogador[] = [];
  for (const id of atuantes) {
    const jogador = porId.get(id);
    if (!jogador) {
      continue;
    }
    const eventosDoJogador = partida.eventos.filter(e => e.jogadorId === id);
    const gols = eventosDoJogador.filter(e => e.tipo === 'gol').length;
    const assistencias = partida.eventos.filter(
      e => e.tipo === 'gol' && e.jogadorAssistenciaId === id,
    ).length;
    linhas.push({
      jogador,
      gols,
      assistencias,
      nota: calcularNotaPartida(jogador, eventosDoJogador, resultado, cleanSheet),
    });
  }
  return linhas;
}

function MatchResult(): React.JSX.Element {
  const nav = useAppNavigation();
  const {cores} = useTheme();
  const route = useRoute<RouteProp<RootStackParamList, 'MatchResult'>>();
  const {partidaId} = route.params;

  const partida = useGameStore(state =>
    state.partidas.find(item => item.id === partidaId),
  );
  const clubes = useGameStore(state => state.clubes);
  const jogadores = useGameStore(state => state.jogadores);
  const clubeUsuarioId = useGameStore(state => state.clubeUsuarioId);
  const {width} = useWindowDimensions();
  const [mapaTime, setMapaTime] = useState<'casa' | 'fora'>('casa');
  const [mapaTempo, setMapaTempo] = useState<'todos' | '1' | '2'>('todos');
  // Relatório em duas leituras: Resumo (destaques) e Detalhes (números/notas).
  const [aba, setAba] = useState<'resumo' | 'detalhes'>('resumo');

  // Craque do jogo: maior nota entre quem atuou nos dois times.
  const melhor = useMemo<LinhaJogador | null>(() => {
    if (!partida) {
      return null;
    }
    const clubeCasa = clubes.find(c => c.id === partida.timeCasa);
    const clubeFora = clubes.find(c => c.id === partida.timeFora);
    const todas = [
      ...linhasDoTime(clubeCasa, jogadores, partida, true),
      ...linhasDoTime(clubeFora, jogadores, partida, false),
    ];
    if (todas.length === 0) {
      return null;
    }
    return todas.reduce((m, l) => (l.nota > m.nota ? l : m));
  }, [partida, clubes, jogadores]);

  // Momentos dramáticos na ótica do usuário — só quando o clube dele jogou.
  const momentos = useMemo(() => {
    if (
      !partida ||
      !clubeUsuarioId ||
      (partida.timeCasa !== clubeUsuarioId &&
        partida.timeFora !== clubeUsuarioId)
    ) {
      return [];
    }
    return analisarMomentos({
      eventos: partida.eventos,
      timeCasa: partida.timeCasa,
      timeFora: partida.timeFora,
      placarCasa: partida.placarCasa ?? 0,
      placarFora: partida.placarFora ?? 0,
      meuTimeId: clubeUsuarioId,
      vencedorPenaltis: partida.vencedorPenaltis,
    });
  }, [partida, clubeUsuarioId]);

  const jogadoresPorId = useMemo(
    () => new Map(jogadores.map(j => [j.id, j])),
    [jogadores],
  );

  // Notas de quem atuou pelo TIME DO USUÁRIO (a assinatura do Sofascore no
  // pós-jogo), ordenadas da melhor para a pior. Só quando o clube dele jogou.
  const notasUsuario = useMemo<LinhaJogador[]>(() => {
    if (!partida || !clubeUsuarioId) {
      return [];
    }
    const ehCasa = partida.timeCasa === clubeUsuarioId;
    const ehFora = partida.timeFora === clubeUsuarioId;
    if (!ehCasa && !ehFora) {
      return [];
    }
    const clube = clubes.find(c => c.id === clubeUsuarioId);
    return linhasDoTime(clube, jogadores, partida, ehCasa).sort(
      (a, b) => b.nota - a.nota,
    );
  }, [partida, clubeUsuarioId, clubes, jogadores]);

  // Cartões da partida (súmula): amarelos e vermelhos na ordem do jogo.
  const cartoes = useMemo(() => {
    if (!partida) {
      return [];
    }
    return partida.eventos
      .filter(e => e.tipo === 'cartao_amarelo' || e.tipo === 'cartao_vermelho')
      .map(e => ({
        minuto: e.minuto,
        vermelho: e.tipo === 'cartao_vermelho',
        segundoAmarelo: e.segundoAmarelo ?? false,
        jogador: jogadoresPorId.get(e.jogadorId),
        sigla: siglaClube(clubes, e.timeId),
      }))
      .sort((a, b) => a.minuto - b.minuto);
  }, [partida, jogadoresPorId, clubes]);

  // Mapa de chutes: partidas da engine V2 usam os chutes FACTUAIS persistidos
  // (posição/xG reais do lance); partidas legacy caem na reconstrução
  // determinística e recebem o selo de estimativa (RF-11 — legacy honesto).
  const mapaChutes = useMemo(() => {
    if (!partida) {
      return {finalizacoes: [], factual: false};
    }
    const posicoes: Record<string, Position> = {};
    for (const j of jogadores) {
      posicoes[j.id] = j.posicaoPrincipal;
    }
    return obterFinalizacoesPartida(partida, posicoes);
  }, [partida, jogadores]);
  const finalizacoes = mapaChutes.finalizacoes;

  const nomesJogadores = useMemo(() => {
    const mapa: Record<string, string> = {};
    for (const j of jogadores) {
      mapa[j.id] = nomeCurto(j);
    }
    return mapa;
  }, [jogadores]);

  // Replay dos gols: reconstrução PURA/determinística (mesma filosofia do mapa
  // de chutes) — o toque num gol abre a animação do lance.
  const lancesGol = useMemo(() => {
    if (!partida) {
      return [];
    }
    const posicoes: Record<string, Position> = {};
    for (const j of jogadores) {
      posicoes[j.id] = j.posicaoPrincipal;
    }
    return reconstruirLancesGol(partida, posicoes);
  }, [partida, jogadores]);
  const [lanceAberto, setLanceAberto] = useState<LanceGol | null>(null);

  // Evento → lance por IDENTIDADE (mesma ordenação estável da engine): dois gols
  // do mesmo autor no mesmo minuto abrem replays distintos — casar por campos
  // (minuto/time/autor) colidiria e esconderia o segundo lance.
  const lancePorEvento = useMemo(() => {
    const mapa = new Map<EventoPartida, LanceGol>();
    if (!partida) {
      return mapa;
    }
    const golsOrdenados = [...partida.eventos]
      .sort((a, b) => a.minuto - b.minuto)
      .filter(e => ehEventoGol(e.tipo));
    golsOrdenados.forEach((evento, i) => {
      const lance = lancesGol[i];
      if (lance) {
        mapa.set(evento, lance);
      }
    });
    return mapa;
  }, [partida, lancesGol]);

  const lanceDoEvento = (evento: EventoPartida): LanceGol | null =>
    lancePorEvento.get(evento) ?? null;

  const header = (
    <AppHeader title="Relatório da partida" onBack={() => nav.goBack()} />
  );

  if (!partida) {
    return (
      <Screen header={header}>
        <EmptyState
          title="Partida não encontrada"
          description="Não foi possível carregar o relatório desta partida."
          icone="ficha"
          variant="error"
          actionLabel="Voltar"
          onAction={() => nav.goBack()}
        />
      </Screen>
    );
  }

  const placarCasa = partida.placarCasa ?? 0;
  const placarFora = partida.placarFora ?? 0;
  const siglaCasa = siglaClube(clubes, partida.timeCasa);
  const siglaFora = siglaClube(clubes, partida.timeFora);
  const nomeCasa = nomeClube(clubes, partida.timeCasa);
  const nomeFora = nomeClube(clubes, partida.timeFora);
  const est = partida.estatisticas;

  const nomePorId = (id: string): string => {
    const j = jogadoresPorId.get(id);
    return j ? nomeCurto(j) : '—';
  };

  // Gols por lado (gol normal ou gol contra creditam ao time do `timeId`).
  const ordenarPorMinuto = (a: EventoPartida, b: EventoPartida): number =>
    a.minuto - b.minuto;
  const golsCasa = partida.eventos
    .filter(e => ehEventoGol(e.tipo) && e.timeId === partida.timeCasa)
    .sort(ordenarPorMinuto);
  const golsFora = partida.eventos
    .filter(e => ehEventoGol(e.tipo) && e.timeId === partida.timeFora)
    .sort(ordenarPorMinuto);
  const temGols = golsCasa.length + golsFora.length > 0;

  const rotuloGol = (evento: EventoPartida): string =>
    `${rotuloMinuto(evento.minuto)}' ${nomePorId(evento.jogadorId)}${
      evento.tipo === 'gol_contra' ? ' (gc)' : ''
    }`;

  // Poucas estatísticas relevantes — só as que a engine produz de verdade.
  const linhasEstat: Array<{
    rotulo: string;
    casa: number;
    fora: number;
    sufixo?: string;
  }> = [];
  if (partida.posseCasa !== undefined) {
    const posseCasa = partida.posseCasa;
    linhasEstat.push({
      rotulo: 'Posse de bola',
      casa: posseCasa,
      fora: partida.posseFora ?? 100 - posseCasa,
      sufixo: '%',
    });
  }
  if (est) {
    linhasEstat.push({
      rotulo: 'Finalizações',
      casa: est.casa.finalizacoes,
      fora: est.fora.finalizacoes,
    });
    linhasEstat.push({
      rotulo: 'No alvo',
      casa: est.casa.finalizacoesNoAlvo,
      fora: est.fora.finalizacoesNoAlvo,
    });
    linhasEstat.push({
      rotulo: 'Chances claras',
      casa: est.casa.grandesChances,
      fora: est.fora.grandesChances,
    });
  }

  const corMomento = (tom: TomMomento): string =>
    tom === 'bom' ? cores.success : tom === 'ruim' ? cores.danger : cores.textMuted;

  // Mapa de finalizações filtrado pelos toggles (time + tempo).
  const timeIdMapa = mapaTime === 'casa' ? partida.timeCasa : partida.timeFora;
  const finalizacoesMapa = finalizacoes.filter(
    f =>
      f.timeId === timeIdMapa &&
      (mapaTempo === 'todos' || (mapaTempo === '1') === f.primeiroTempo),
  );
  const larguraMapa = Math.min(width - 72, 340);

  return (
    <Screen scroll header={header}>
      {/* Placar final sobre o scoreboard */}
      <Box bg="scoreboard" radius="lg" padding={4} gap={3}>
        <Text
          variant="caption"
          color="onScoreboard"
          align="center"
          weight="700"
          style={estilos.encerrado}>
          ENCERRADO
        </Text>
        <View style={estilos.placarLinha}>
          <View style={estilos.placarTime}>
            <TeamCrest
              clubeId={partida.timeCasa}
              sigla={siglaCasa}
              nome={nomeCasa}
              size={52}
            />
            <Text
              variant="labelM"
              color="onScoreboard"
              align="center"
              numberOfLines={1}>
              {nomeCasa}
            </Text>
          </View>
          <Text variant="scoreXL" color="onScoreboard" tabular>
            {placarCasa} - {placarFora}
          </Text>
          <View style={estilos.placarTime}>
            <TeamCrest
              clubeId={partida.timeFora}
              sigla={siglaFora}
              nome={nomeFora}
              size={52}
            />
            <Text
              variant="labelM"
              color="onScoreboard"
              align="center"
              numberOfLines={1}>
              {nomeFora}
            </Text>
          </View>
        </View>
        <Text variant="caption" color="onScoreboard" align="center" tabular>
          Rodada {partida.rodada} · {partida.data}
        </Text>
        {partida.vencedorPenaltis ? (
          <Text variant="caption" color="onScoreboard" align="center">
            Vencedor nos pênaltis:{' '}
            {siglaClube(clubes, partida.vencedorPenaltis)}
          </Text>
        ) : null}
      </Box>

      <SegmentedTabs
        abas={[
          {chave: 'resumo', rotulo: 'Resumo'},
          {chave: 'detalhes', rotulo: 'Detalhes'},
        ]}
        ativa={aba}
        onSelect={c => setAba(c as 'resumo' | 'detalhes')}
      />

      {aba === 'resumo' ? (
        <>
          {/* Gols / autores */}
      {temGols ? (
        <Card>
          <View style={estilos.cardInner}>
            <SectionHeader titulo="Gols" />
            <View style={estilos.golsRow}>
              <View style={estilos.golsCol}>
                {golsCasa.map((evento, i) => (
                  <Pressable
                    key={`c_${i}`}
                    style={estilos.golItem}
                    hitSlop={{top: 4, bottom: 4}}
                    accessibilityLabel={`Ver replay: ${rotuloGol(evento)}`}
                    onPress={() => setLanceAberto(lanceDoEvento(evento))}>
                    <Icon nome="bola" size={14} color="success" />
                    <Text variant="bodyM" numberOfLines={1} style={estilos.golTexto}>
                      {rotuloGol(evento)}
                    </Text>
                    <Icon nome="jogar" size={12} color="textMuted" />
                  </Pressable>
                ))}
              </View>
              <View style={estilos.golsCol}>
                {golsFora.map((evento, i) => (
                  <Pressable
                    key={`f_${i}`}
                    style={[estilos.golItem, estilos.golItemFim]}
                    hitSlop={{top: 4, bottom: 4}}
                    accessibilityLabel={`Ver replay: ${rotuloGol(evento)}`}
                    onPress={() => setLanceAberto(lanceDoEvento(evento))}>
                    <Icon nome="jogar" size={12} color="textMuted" />
                    <Text
                      variant="bodyM"
                      numberOfLines={1}
                      align="right"
                      style={estilos.golTexto}>
                      {rotuloGol(evento)}
                    </Text>
                    <Icon nome="bola" size={14} color="success" />
                  </Pressable>
                ))}
              </View>
            </View>
            <Text variant="caption" color="textMuted" align="center">
              Toque num gol para ver o replay do lance
            </Text>
          </View>
        </Card>
      ) : null}

      {/* Craque do jogo */}
      {melhor ? (
        <Card>
          <View style={estilos.cardInner}>
            <SectionHeader titulo="Craque do jogo" />
            <View style={estilos.craqueRow}>
              <PlayerAvatar id={melhor.jogador.id} tamanho={56} />
              <View style={estilos.craqueInfo}>
                <Text variant="titleM" numberOfLines={1}>
                  {nomeCurto(melhor.jogador)}
                </Text>
                <View style={estilos.craqueMeta}>
                  <PositionBadge
                    posicao={melhor.jogador.posicaoPrincipal}
                    tamanho="sm"
                  />
                  <Text variant="labelM" color="textSecondary">
                    {siglaClube(clubes, melhor.jogador.clubeId ?? '')}
                  </Text>
                  {melhor.gols > 0 ? (
                    <Text variant="caption" color="textSecondary" tabular>
                      {melhor.gols} G
                    </Text>
                  ) : null}
                  {melhor.assistencias > 0 ? (
                    <Text variant="caption" color="textSecondary" tabular>
                      {melhor.assistencias} A
                    </Text>
                  ) : null}
                </View>
              </View>
              <View style={estilos.craqueNota}>
                <Icon nome="estrela" size={16} color="warning" />
                <Text
                  variant="scoreXL"
                  color={corNota(melhor.nota)}
                  tabular>
                  {melhor.nota.toFixed(1)}
                </Text>
              </View>
            </View>
          </View>
        </Card>
      ) : null}

          {/* Momentos (destaques na ótica do usuário) */}
          {momentos.length > 0 ? (
            <Card>
              <View style={estilos.cardInner}>
                <SectionHeader titulo="Momentos" />
                <View style={estilos.momentosLista}>
                  {momentos.map(momento => (
                    <View key={momento.tipo} style={estilos.momentoLinha}>
                      <View
                        style={[
                          estilos.momentoDot,
                          {backgroundColor: corMomento(momento.tom)},
                        ]}
                      />
                      <Text
                        variant="bodyM"
                        color="textSecondary"
                        style={estilos.momentoTexto}>
                        {momento.texto}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </Card>
          ) : null}
        </>
      ) : (
        <>
          {/* Notas do time do usuário (assinatura Sofascore no pós-jogo) */}
      {notasUsuario.length > 0 ? (
        <Card>
          <View style={estilos.cardInner}>
            <SectionHeader titulo="Notas do seu time" />
            {notasUsuario.map(linha => (
              <View key={linha.jogador.id} style={estilos.notaRow}>
                <PositionBadge
                  posicao={linha.jogador.posicaoPrincipal}
                  tamanho="sm"
                />
                <Text
                  variant="bodyM"
                  numberOfLines={1}
                  style={estilos.notaNome}>
                  {nomeCurto(linha.jogador)}
                </Text>
                {linha.gols > 0 ? (
                  <Text variant="caption" color="textSecondary" tabular>
                    {linha.gols}G
                  </Text>
                ) : null}
                {linha.assistencias > 0 ? (
                  <Text variant="caption" color="textSecondary" tabular>
                    {linha.assistencias}A
                  </Text>
                ) : null}
                <Text
                  variant="labelL"
                  color={corNota(linha.nota)}
                  tabular
                  style={estilos.notaValor}>
                  {linha.nota.toFixed(1)}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      {/* Cartões (súmula) */}
      {cartoes.length > 0 ? (
        <Card>
          <View style={estilos.cardInner}>
            <SectionHeader titulo="Cartões" />
            {cartoes.map((c, i) => (
              <View key={`${c.minuto}-${i}`} style={estilos.notaRow}>
                <Text
                  variant="labelM"
                  color="textSecondary"
                  tabular
                  style={estilos.cartaoMin}>
                  {c.minuto}'
                </Text>
                <Icon
                  nome="cartao"
                  size={16}
                  color={c.vermelho ? 'danger' : 'warning'}
                />
                <Text variant="bodyM" numberOfLines={1} style={estilos.notaNome}>
                  {c.jogador ? nomeCurto(c.jogador) : 'Jogador'}
                  {c.segundoAmarelo ? ' (2º amarelo)' : ''}
                </Text>
                <Text variant="caption" color="textSecondary">
                  {c.sigla}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      {/* Estatísticas relevantes */}
      {linhasEstat.length > 0 ? (
        <Card>
          <View style={estilos.cardInner}>
            <SectionHeader titulo="Estatísticas" />
            <View style={estilos.estatCabecalho}>
              <Text variant="labelM" color="textSecondary">
                {siglaCasa}
              </Text>
              <Text variant="labelM" color="textSecondary">
                {siglaFora}
              </Text>
            </View>
            <View style={estilos.estatLista}>
              {linhasEstat.map(linha => {
                const casaMaior = linha.casa > linha.fora;
                const foraMaior = linha.fora > linha.casa;
                return (
                  <View key={linha.rotulo} style={estilos.estatLinha}>
                    <Text
                      variant="numeric"
                      tabular
                      weight={casaMaior ? '800' : '600'}
                      color={casaMaior ? 'textPrimary' : 'textSecondary'}
                      style={estilos.estatValorCasa}>
                      {linha.casa}
                      {linha.sufixo ?? ''}
                    </Text>
                    <Text
                      variant="labelM"
                      color="textSecondary"
                      align="center"
                      numberOfLines={1}
                      style={estilos.estatRotulo}>
                      {linha.rotulo}
                    </Text>
                    <Text
                      variant="numeric"
                      tabular
                      weight={foraMaior ? '800' : '600'}
                      color={foraMaior ? 'textPrimary' : 'textSecondary'}
                      style={estilos.estatValorFora}>
                      {linha.fora}
                      {linha.sufixo ?? ''}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </Card>
      ) : null}

      {/* Mapa de finalizações — factual (engine V2) ou estimado (legacy) */}
      {finalizacoes.length > 0 ? (
        <Card>
          <View style={estilos.cardInner}>
            <SectionHeader titulo="Mapa de finalizações" />
            {!mapaChutes.factual ? (
              <Text variant="caption" color="textMuted">
                Posições estimadas a partir dos lances (partida sem dados
                completos de chute).
              </Text>
            ) : partida.qualidadeDados === 'causal_summary' ? (
              <Text variant="caption" color="textMuted">
                Principais finalizações registradas da partida.
              </Text>
            ) : null}
            <SegmentedTabs
              abas={[
                {chave: 'casa', rotulo: siglaCasa},
                {chave: 'fora', rotulo: siglaFora},
              ]}
              ativa={mapaTime}
              onSelect={c => setMapaTime(c as 'casa' | 'fora')}
            />
            <SegmentedTabs
              abas={[
                {chave: 'todos', rotulo: 'Todos'},
                {chave: '1', rotulo: '1º T'},
                {chave: '2', rotulo: '2º T'},
              ]}
              ativa={mapaTempo}
              onSelect={c => setMapaTempo(c as 'todos' | '1' | '2')}
            />
            <MapaFinalizacoes
              finalizacoes={finalizacoesMapa}
              largura={larguraMapa}
              nomes={nomesJogadores}
              chaveFiltro={`${mapaTime}-${mapaTempo}`}
            />
          </View>
        </Card>
      ) : null}

        </>
      )}

      <Button
        titulo="Continuar"
        onPress={() => nav.navigate('MainTabs')}
        fullWidth
      />

      {/* Replay do gol (animação do lance) — abre ao tocar num gol da lista. */}
      <Modal
        visible={lanceAberto !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setLanceAberto(null)}>
        <View style={[estilos.replayOverlay, {backgroundColor: cores.overlay}]}>
          {lanceAberto ? (
            <View
              accessibilityViewIsModal
              style={[estilos.replayCard, {backgroundColor: cores.surface}]}>
              <View style={estilos.replayFechar}>
                <IconButton
                  icone="fechar"
                  accessibilityLabel="Fechar replay"
                  onPress={() => setLanceAberto(null)}
                />
              </View>
              <ReplayGol
                lance={lanceAberto}
                nomes={nomesJogadores}
                siglaTime={siglaClube(clubes, lanceAberto.timeId)}
              />
            </View>
          ) : null}
        </View>
      </Modal>
    </Screen>
  );
}

const estilos = StyleSheet.create({
  encerrado: {
    letterSpacing: 1.5,
  },
  replayOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: espacamento[4],
  },
  replayCard: {
    borderRadius: raios.lg,
    padding: espacamento[3],
    gap: espacamento[2],
    // Nunca maior que a janela (paisagem/fonte grande): o campo do ReplayGol já
    // se limita pela altura da janela, e este teto protege o restante do card.
    maxHeight: '100%',
  },
  replayFechar: {
    alignItems: 'flex-end',
  },
  placarLinha: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espacamento[3],
    justifyContent: 'center',
  },
  placarTime: {
    alignItems: 'center',
    flex: 1,
    gap: espacamento[1],
  },
  cardInner: {
    gap: espacamento[3],
  },
  notaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[2],
  },
  notaNome: {flex: 1},
  notaValor: {width: 32, textAlign: 'right'},
  cartaoMin: {width: 32},
  golsRow: {
    flexDirection: 'row',
    gap: espacamento[3],
  },
  golsCol: {
    flex: 1,
    gap: espacamento[2],
  },
  golItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espacamento[2],
    // Linha tocável (abre o replay): altura mínima + hitSlop ⇒ alvo ≥44.
    minHeight: 36,
  },
  golItemFim: {
    justifyContent: 'flex-end',
  },
  golTexto: {
    flexShrink: 1,
  },
  craqueRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espacamento[3],
  },
  craqueInfo: {
    flex: 1,
    gap: espacamento[1],
  },
  craqueMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacamento[2],
  },
  craqueNota: {
    alignItems: 'center',
    gap: espacamento[1],
  },
  estatCabecalho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  estatLista: {
    gap: espacamento[3],
  },
  estatLinha: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  estatValorCasa: {
    minWidth: 52,
    textAlign: 'left',
  },
  estatValorFora: {
    minWidth: 52,
    textAlign: 'right',
  },
  estatRotulo: {
    flex: 1,
  },
  momentosLista: {
    gap: espacamento[2],
  },
  momentoLinha: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: espacamento[2],
  },
  momentoDot: {
    borderRadius: 999,
    height: 8,
    marginTop: 6,
    width: 8,
  },
  momentoTexto: {
    flex: 1,
  },
});

export default MatchResult;
