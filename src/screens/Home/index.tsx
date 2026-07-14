/**
 * Tela inicial — Home (North Star). Centro de decisão do técnico, na ordem:
 * identidade do clube → PRÓXIMA PARTIDA (hero) → estado (posição/pts/moral) →
 * pendências do técnico → classificação compacta. Os sistemas ricos (objetivo,
 * diretoria, copa, série D, imprensa, sequências, avisos por jogador) são
 * PRESERVADOS abaixo da dobra ("detalhe por toque"), não removidos.
 *
 * Nada é calculado a mais aqui: tudo vem do store/engine; as pendências e a
 * janela da classificação são derivações puras (ver ./derivados).
 */

import React, {useMemo} from 'react';
import {Image, StyleSheet, View} from 'react-native';

import {
  Badge,
  Box,
  Button,
  Card,
  Chip,
  Divider,
  Icon,
  ManagerTask,
  Pressable,
  Screen,
  SectionHeader,
  StandingRow,
  TeamCrest,
  Text,
  espacamento,
  type CorTexto,
} from '../../design-system';
import AlertasCard, {type Alerta} from '../../components/AlertasCard';
import {LOGO_COPA, LOGO_SERIE_D} from '../../assets/escudos';
import type {IconeNome} from '../../components/Icone';
import {useConfirm, useToast} from '../../components/feedback';
import {forcaDoClube} from '../../utils/forca';
import {confrontoDoClube, type EstadoCopa} from '../../engine/season/copaEngine';
import {
  definirObjetivoTemporada,
  metaCumprida,
} from '../../engine/carreira/objetivo';
import {avaliarUltimato} from '../../engine/carreira/ultimato';
import {
  calcularSequencias,
  type JogoResultado,
} from '../../engine/season/sequencias';
import {classicoEntre} from '../../engine/season/classicos';
import {useInicioNavigation} from '../../navigation/types';
import {
  calcularProximoEvento,
  selecionarClubeUsuario,
  selecionarProximoJogo,
  useGameStore,
} from '../../store/useGameStore';
import {limiteDerrotasPorDivisao} from '../../store/helpers';
import {moedaCompacta, nomeClube} from '../../utils/formatters';
import {horarioProvavel, rotuloRelativo} from '../../utils/datas';
import {
  derivarJanelaClassificacao,
  derivarPendencias,
  type DestinoPendencia,
} from './derivados';
import type {Clube} from '../../types';

const MAX_ALERTAS = 5;
const MAX_PENDENCIAS = 3;

/** Moral média (0-100) → nota 0-10 + carinha + cor. */
function humorDaMoral(moral0a100: number): {
  nota: number;
  icone: IconeNome;
  cor: CorTexto;
} {
  const nota = Math.round(moral0a100 / 10);
  if (nota >= 7) {
    return {nota, icone: 'humor-bom', cor: 'success'};
  }
  if (nota >= 4) {
    return {nota, icone: 'humor-neutro', cor: 'warning'};
  }
  return {nota, icone: 'humor-ruim', cor: 'danger'};
}

/** Linha-resumo da Copa para o card do Home (próximo adversário / status). */
function resumoCopa(
  copa: EstadoCopa,
  clubeUsuarioId: string | null,
  clubes: Clube[],
): string {
  if (copa.campeao) {
    return `Campeão: ${nomeClube(clubes, copa.campeao)}`;
  }
  const confronto = confrontoDoClube(copa, clubeUsuarioId);
  if (!confronto) {
    return 'Seu clube foi eliminado';
  }
  const adversarioId =
    confronto.timeA === clubeUsuarioId ? confronto.timeB : confronto.timeA;
  return `Próximo adversário: ${nomeClube(clubes, adversarioId)}`;
}

/** Célula de estado do clube (número tabular + rótulo + carinha opcional). */
function CelulaStat({
  valor,
  rotulo,
  icone,
  corIcone,
}: {
  valor: string | number;
  rotulo: string;
  icone?: IconeNome;
  corIcone?: CorTexto;
}): React.JSX.Element {
  return (
    <View
      accessible
      accessibilityLabel={`${rotulo}: ${valor}`}
      style={estilos.statCell}>
      <View style={estilos.statValorRow}>
        <Text variant="titleL" tabular>
          {valor}
        </Text>
        {icone ? (
          <Icon nome={icone} size={20} color={corIcone ?? 'textMuted'} />
        ) : null}
      </View>
      <Text variant="labelM" color="textSecondary">
        {rotulo}
      </Text>
    </View>
  );
}

/** Hero da próxima partida — superfície `scoreboard` (azul-marinho) + CTA. */
function HeroPartida({
  casa,
  fora,
  quando,
  horario,
  estadio,
  onJogar,
}: {
  casa: Clube;
  fora: Clube;
  quando: string;
  horario: string;
  estadio: string;
  onJogar: () => void;
}): React.JSX.Element {
  return (
    <Box bg="scoreboard" radius="lg" padding={4} gap={3}>
      <View style={estilos.heroTimes}>
        <View style={estilos.heroTime}>
          <TeamCrest clubeId={casa.id} sigla={casa.sigla} size={44} />
          <Text variant="titleL" color="onScoreboard">
            {casa.sigla}
          </Text>
        </View>
        <Text variant="titleM" color="onScoreboard">
          ×
        </Text>
        <View style={[estilos.heroTime, estilos.heroTimeDir]}>
          <Text variant="titleL" color="onScoreboard">
            {fora.sigla}
          </Text>
          <TeamCrest clubeId={fora.id} sigla={fora.sigla} size={44} />
        </View>
      </View>
      <View style={estilos.heroInfo}>
        <Text variant="labelL" color="onScoreboard">
          {quando} · {horario}
        </Text>
        {estadio ? (
          <Text
            variant="caption"
            color="onScoreboard"
            numberOfLines={1}
            style={estilos.heroEstadio}>
            {estadio}
          </Text>
        ) : null}
      </View>
      <Button titulo="JOGAR PARTIDA" onPress={onJogar} fullWidth />
    </Box>
  );
}

function Home(): React.JSX.Element {
  const nav = useInicioNavigation();
  const confirm = useConfirm();
  const toast = useToast();

  const clubes = useGameStore(state => state.clubes);
  const jogadores = useGameStore(state => state.jogadores);
  const partidas = useGameStore(state => state.partidas);
  const tabela = useGameStore(state => state.tabela);
  const clubeUsuarioId = useGameStore(state => state.clubeUsuarioId);
  const confirmarAcoes = useGameStore(state => state.config.confirmarAcoes);
  const proximoJogo = useGameStore(selecionarProximoJogo);
  const clubeUsuario = useGameStore(selecionarClubeUsuario);
  const copa = useGameStore(state => state.copa);
  const todosClubes = useGameStore(state => state.todosClubes);
  const serieDCarreira = useGameStore(state => state.serieDCarreira);
  const iniciarMataMataDaCarreira = useGameStore(
    state => state.iniciarMataMataDaCarreira,
  );

  const finalizarTemporada = useGameStore(state => state.finalizarTemporada);
  const avancarParaData = useGameStore(state => state.avancarParaData);
  const demissao = useGameStore(state => state.demissao);
  const derrotasConsecutivas = useGameStore(
    state => state.derrotasConsecutivas,
  );
  const rodadasNoVermelho = useGameStore(state => state.rodadasNoVermelho);
  const dificuldade = useGameStore(state => state.config.dificuldade);
  const propostasRecebidas = useGameStore(state => state.propostasRecebidas);
  const jovensDisponiveis = useGameStore(state => state.jovensDisponiveis);
  const temporadaAtual = useGameStore(state => state.temporadaAtual);
  const dataAtual = useGameStore(state => state.dataAtual);
  const mensagens = useGameStore(state => state.mensagens);

  // Demissão: assim que a diretoria demite, leva o técnico à tela de recontratação.
  React.useEffect(() => {
    if (demissao) {
      nav.navigate('Demissao');
    }
  }, [demissao, nav]);

  const indiceTabela = tabela.findIndex(
    linha => linha.clubeId === clubeUsuarioId,
  );
  const posicao = indiceTabela === -1 ? '-' : `${indiceTabela + 1}º`;
  const jogos = indiceTabela === -1 ? 0 : tabela[indiceTabela].jogos;
  const pontos = indiceTabela === -1 ? 0 : tabela[indiceTabela].pontos;

  // Meta da diretoria (mesma regra do fim de temporada): reputação + divisão do
  // clube definem a meta; a posição atual diz se está no rumo.
  const objetivo = useMemo(
    () =>
      clubeUsuario
        ? definirObjetivoTemporada(
            clubeUsuario.reputacao,
            clubeUsuario.divisao ?? 'Série A',
            dificuldade,
          )
        : null,
    [clubeUsuario, dificuldade],
  );
  // Antes da 1ª rodada a posição é desempate arbitrário (localeCompare do clubeId);
  // só há "posição real" com jogos disputados — senão a meta cobraria sem jogo.
  const posicaoReal =
    jogos > 0 && indiceTabela !== -1 ? indiceTabela + 1 : null;
  const metaNoRumo =
    objetivo && posicaoReal != null
      ? metaCumprida(objetivo, posicaoReal)
      : true;

  // Ultimato — a diretoria dá a exigência concreta quando um gatilho de demissão
  // está a um passo. Deriva do estado; resolve pela própria lógica de demissão.
  const ultimato = clubeUsuario
    ? avaliarUltimato({
        derrotasConsecutivas,
        limiteDerrotas: limiteDerrotasPorDivisao(
          clubeUsuario.divisao ?? 'Série A',
        ),
        rodadasNoVermelho,
      })
    : null;

  const alertas = useMemo<Alerta[]>(() => {
    if (!clubeUsuario || !clubeUsuarioId) {
      return [];
    }
    const elenco = jogadores.filter(j => j.clubeId === clubeUsuarioId);
    const lista: Alerta[] = [];
    for (const jogador of elenco) {
      if (jogador.lesionado) {
        lista.push({
          id: `lesao_${jogador.id}`,
          tipo: 'lesao',
          texto: `${jogador.apelido ?? jogador.nome} — lesão (${
            jogador.diasLesao
          } dias)`,
          jogadorId: jogador.id,
        });
      } else if (jogador.suspenso) {
        lista.push({
          id: `susp_${jogador.id}`,
          tipo: 'suspensao',
          texto: `${jogador.apelido ?? jogador.nome} — suspenso (${
            jogador.jogosSuspensao
          } jogo)`,
          jogadorId: jogador.id,
        });
      }
    }
    if (clubeUsuario.financas.saldo < 0) {
      lista.unshift({
        id: 'saldo',
        tipo: 'saldo',
        texto: `Saldo negativo: ${moedaCompacta(clubeUsuario.financas.saldo)}`,
      });
    }
    return lista.slice(0, MAX_ALERTAS);
  }, [clubeUsuario, clubeUsuarioId, jogadores]);

  // Estado no relance: moral médio do elenco (0-100) → nota 0-10 + humor.
  const moralMedia = useMemo(() => {
    if (!clubeUsuarioId) {
      return 0;
    }
    const elenco = jogadores.filter(j => j.clubeId === clubeUsuarioId);
    if (elenco.length === 0) {
      return 0;
    }
    return Math.round(
      elenco.reduce((soma, j) => soma + j.moral, 0) / elenco.length,
    );
  }, [jogadores, clubeUsuarioId]);
  const humor = humorDaMoral(moralMedia);
  const semElenco = moralMedia === 0;
  const numPropostas = propostasRecebidas.length;

  // Jogadores indisponíveis (lesão + suspensão) — base de uma pendência.
  const indisponiveis = useMemo(() => {
    if (!clubeUsuarioId) {
      return 0;
    }
    return jogadores.filter(
      j => j.clubeId === clubeUsuarioId && (j.lesionado || j.suspenso),
    ).length;
  }, [jogadores, clubeUsuarioId]);

  // Pendências do técnico — agrega sinais reais numa lista acionável priorizada.
  const pendencias = useMemo(
    () =>
      derivarPendencias({
        indisponiveis,
        propostas: numPropostas,
        jovens: jovensDisponiveis.length,
        saldoNegativo: (clubeUsuario?.financas.saldo ?? 0) < 0,
        saldoTexto: moedaCompacta(clubeUsuario?.financas.saldo ?? 0),
        metaForaDoRumo: !metaNoRumo,
      }),
    [
      indisponiveis,
      numPropostas,
      jovensDisponiveis.length,
      clubeUsuario,
      metaNoRumo,
    ],
  );

  // Classificação compacta — janela de 5 ao redor do clube.
  const janela = useMemo(
    () => derivarJanelaClassificacao({tabela, clubes, clubeUsuarioId}),
    [tabela, clubes, clubeUsuarioId],
  );

  const confronto = useMemo(() => {
    if (!proximoJogo) {
      return null;
    }
    const casa = clubes.find(clube => clube.id === proximoJogo.timeCasa);
    const fora = clubes.find(clube => clube.id === proximoJogo.timeFora);
    if (!casa || !fora) {
      return null;
    }
    return {
      casa,
      fora,
      forcaCasa: forcaDoClube(casa, jogadores),
      forcaFora: forcaDoClube(fora, jogadores),
    };
  }, [proximoJogo, clubes, jogadores]);

  // Clássico: o próximo jogo é uma rivalidade reconhecida?
  const classico = proximoJogo
    ? classicoEntre(proximoJogo.timeCasa, proximoJogo.timeFora)
    : null;

  // Sequências (streaks) atuais do clube — derivadas do histórico da temporada.
  const sequencias = useMemo(() => {
    if (!clubeUsuarioId) {
      return [];
    }
    const ordenadas = partidas
      .filter(
        partida =>
          partida.jogada &&
          (partida.timeCasa === clubeUsuarioId ||
            partida.timeFora === clubeUsuarioId),
      )
      .sort((a, b) => a.rodada - b.rodada);
    const jogosSeq: JogoResultado[] = [];
    for (const partida of ordenadas) {
      if (partida.placarCasa == null || partida.placarFora == null) {
        continue;
      }
      const mandante = partida.timeCasa === clubeUsuarioId;
      const golsFavor = mandante ? partida.placarCasa : partida.placarFora;
      const golsContra = mandante ? partida.placarFora : partida.placarCasa;
      jogosSeq.push({
        resultado:
          golsFavor > golsContra ? 'V' : golsFavor < golsContra ? 'D' : 'E',
        golsFavor,
        golsContra,
      });
    }
    return calcularSequencias(jogosSeq);
  }, [partidas, clubeUsuarioId]);

  // Próximo evento do calendário (treino → jogo → fim de temporada).
  const proximoEvento = useMemo(
    () => calcularProximoEvento(proximoJogo),
    [proximoJogo],
  );

  // Confronto da Copa "na vez": entra no lugar do jogo da liga quando sua data
  // (meio de semana) chega antes ou junto da próxima rodada.
  const copaNaVez = useMemo(() => {
    if (!copa || copa.campeao) {
      return null;
    }
    const confrontoCopa = confrontoDoClube(copa, clubeUsuarioId);
    if (!confrontoCopa || confrontoCopa.vencedor) {
      return null;
    }
    const fase = copa.fases[copa.faseAtual];
    if (!fase.data || (proximoJogo && proximoJogo.data < fase.data)) {
      return null;
    }
    const adversarioId =
      confrontoCopa.timeA === clubeUsuarioId
        ? confrontoCopa.timeB
        : confrontoCopa.timeA;
    return {
      faseNome: fase.nome,
      adversario: nomeClube(todosClubes, adversarioId),
      data: fase.data,
    };
  }, [copa, clubeUsuarioId, proximoJogo, todosClubes]);

  const confirmarSe = async (
    opcoes: Parameters<typeof confirm>[0],
  ): Promise<boolean> => {
    if (!confirmarAcoes) {
      return true;
    }
    return confirm(opcoes);
  };

  // Avança o calendário até o dia do jogo e abre o pré-jogo.
  const handleJogarPartida = () => {
    if (proximoEvento.tipo !== 'jogo') {
      return;
    }
    avancarParaData(proximoEvento.data);
    nav.navigate('PreJogo');
  };

  const handleFinalizarTemporada = async () => {
    const ok = await confirmarSe({
      titulo: 'Encerrar temporada?',
      mensagem:
        'Os jogadores evoluem/declinam, os salários são pagos e um novo calendário é gerado.',
      confirmarLabel: 'Avançar',
    });
    if (ok) {
      finalizarTemporada();
      toast('Nova temporada iniciada.', 'sucesso');
    }
  };

  // Carreira na Série D: ao fim da fase de grupos, monta e abre o mata-mata.
  const ehSerieD = clubeUsuario?.divisao === 'Série D';
  const mataMataEmAndamento =
    serieDCarreira?.fase === 'mata_mata' ||
    serieDCarreira?.fase === 'playoff_acesso';
  const handleIniciarMataMata = async () => {
    const ok = await confirmarSe({
      titulo: 'Encerrar a fase de grupos?',
      mensagem:
        'Os outros 15 grupos são resolvidos e a chave nacional do mata-mata é montada.',
      confirmarLabel: 'Ir ao mata-mata',
    });
    if (ok) {
      iniciarMataMataDaCarreira();
      nav.navigate('SerieD');
    }
  };

  const irParaPendencia = (destino: DestinoPendencia) => {
    switch (destino) {
      case 'elenco':
        nav.navigate('MainTabs', {screen: 'Elenco'});
        return;
      case 'mercado':
        nav.navigate('MainTabs', {screen: 'TransferMarket'});
        return;
      case 'academia':
        nav.navigate('Academia');
        return;
      case 'clube':
        nav.navigate('MainTabs', {screen: 'Club'});
        return;
      case 'gabinete':
        nav.navigate('Gabinete');
        return;
    }
  };

  // Bloco polimórfico da "Próxima partida": jogo da liga (hero), confronto de
  // Copa na vez, transições da Série D, fim de temporada ou "nenhum jogo".
  const heroPartida =
    proximoJogo && confronto ? (
      <HeroPartida
        casa={confronto.casa}
        fora={confronto.fora}
        quando={rotuloRelativo(dataAtual, proximoJogo.data)}
        horario={horarioProvavel(proximoJogo.data)}
        estadio={confronto.casa.estadio?.nome ?? ''}
        onJogar={handleJogarPartida}
      />
    ) : (
      <Text variant="bodyM" color="textSecondary">
        Nenhum jogo agendado.
      </Text>
    );

  return (
    <Screen
      scroll
      header={
        <View style={estilos.header}>
          <Pressable
            onPress={() => nav.navigate('Noticias')}
            minSize="min"
            accessibilityLabel={
              mensagens.length > 0
                ? `Notícias, ${mensagens.length} novas`
                : 'Notícias'
            }
            style={estilos.headerBotao}>
            <Icon nome="noticia" color="textSecondary" />
            {mensagens.length > 0 ? (
              <View style={estilos.sinoBadge}>
                <Badge count={mensagens.length} tom="danger" solido />
              </View>
            ) : null}
          </Pressable>
          <Text variant="titleXL" align="center" style={estilos.flex}>
            FOTEBALL
          </Text>
          <Pressable
            onPress={() => nav.navigate('Settings')}
            minSize="min"
            accessibilityLabel="Ajustes"
            style={estilos.headerBotao}>
            <Icon nome="ajustes" color="textSecondary" />
          </Pressable>
        </View>
      }>
      {/* Identidade do clube. */}
      <View style={estilos.identidade}>
        <TeamCrest
          clubeId={clubeUsuario?.id ?? ''}
          sigla={clubeUsuario?.sigla ?? ''}
          nome={clubeUsuario?.nome}
          size={40}
        />
        <View style={estilos.flex}>
          <Text variant="titleL" numberOfLines={1}>
            {clubeUsuario?.nome ?? 'FOTEBALL'}
          </Text>
          <Text variant="labelM" color="textSecondary" numberOfLines={1}>
            {temporadaAtual} · {clubeUsuario?.divisao ?? 'Série A'}
          </Text>
        </View>
      </View>

      {/* Ultimato — urgente, permanece em destaque no topo. */}
      {ultimato ? (
        <Card variante="status" status="danger" padding={4} style={estilos.gap1}>
          <View style={estilos.linhaIcone}>
            <Icon nome="apito" size={16} color="danger" />
            <Text variant="labelL" color="danger" style={estilos.caps}>
              {ultimato.titulo}
            </Text>
          </View>
          <Text variant="bodyM">{ultimato.mensagem}</Text>
        </Card>
      ) : null}

      {/* PRÓXIMA PARTIDA (hero). */}
      <SectionHeader
        titulo="Próxima partida"
        trailing={
          classico ? (
            <Badge label={`Clássico · ${classico.nome}`} tom="accent" />
          ) : undefined
        }
      />
      {ehSerieD ? (
        !serieDCarreira ? (
          proximoEvento.tipo === 'fim' ? (
            <Button
              variante="primary"
              icone="trofeu"
              titulo="Encerrar grupos e ir ao mata-mata"
              onPress={handleIniciarMataMata}
              fullWidth
            />
          ) : (
            heroPartida
          )
        ) : mataMataEmAndamento ? (
          <Button
            variante="primary"
            icone="jogar"
            titulo="Ir ao mata-mata da Série D"
            onPress={() => nav.navigate('SerieD')}
            fullWidth
          />
        ) : (
          <Button
            variante="primary"
            icone="trofeu"
            titulo="Iniciar próxima temporada"
            onPress={handleFinalizarTemporada}
            fullWidth
          />
        )
      ) : copaNaVez ? (
        <Card variante="outlined" padding={4} style={estilos.copaJogo}>
          <Image
            source={LOGO_COPA}
            style={estilos.copaJogoLogo}
            resizeMode="contain"
          />
          <Text variant="labelM" color="textMuted">
            Copa do Brasil · {copaNaVez.faseNome}
          </Text>
          <Text variant="titleM" numberOfLines={1}>
            {clubeUsuario?.nome ?? 'Seu time'} x {copaNaVez.adversario}
          </Text>
          <Button
            variante="primary"
            icone="jogar"
            titulo="Jogar confronto da Copa"
            onPress={() => {
              avancarParaData(copaNaVez.data);
              nav.navigate('MatchSimulation', {copa: true});
            }}
            fullWidth
          />
        </Card>
      ) : proximoEvento.tipo === 'fim' ? (
        <Button
          variante="primary"
          icone="trofeu"
          titulo="Iniciar próxima temporada"
          onPress={handleFinalizarTemporada}
          fullWidth
        />
      ) : (
        heroPartida
      )}

      {/* Estado do clube — posição / pontos / moral. */}
      <View style={estilos.statsRow}>
        <CelulaStat valor={posicao} rotulo="posição" />
        <Divider vertical />
        <CelulaStat valor={pontos} rotulo="pts" />
        <Divider vertical />
        <CelulaStat
          valor={semElenco ? '-' : humor.nota}
          rotulo="moral"
          icone={semElenco ? undefined : humor.icone}
          corIcone={humor.cor}
        />
      </View>

      {/* Pendências do técnico. */}
      <SectionHeader
        titulo="Pendências do técnico"
        trailing={
          pendencias.length > 0 ? (
            <Badge count={pendencias.length} tom="danger" solido />
          ) : undefined
        }
      />
      {pendencias.length > 0 ? (
        pendencias.slice(0, MAX_PENDENCIAS).map(pendencia => (
          <ManagerTask
            key={pendencia.id}
            titulo={pendencia.titulo}
            subtitulo={pendencia.subtitulo}
            icone={pendencia.icone}
            tom={pendencia.tom}
            onPress={() => irParaPendencia(pendencia.destino)}
          />
        ))
      ) : (
        <ManagerTask
          titulo="Tudo em ordem"
          subtitulo="Nenhuma pendência no momento"
          icone="check"
          tom="brand"
        />
      )}

      {/* Classificação compacta. */}
      {janela.length > 0 ? (
        <>
          <SectionHeader
            titulo="Classificação"
            acaoLabel="Ver tabela"
            onAcao={() => nav.navigate('MainTabs', {screen: 'Competition'})}
          />
          <View style={estilos.tabelaHeader}>
            <Text variant="caption" color="textMuted" style={estilos.colJ}>
              J
            </Text>
            <Text variant="caption" color="textMuted" style={estilos.colPts}>
              PTS
            </Text>
          </View>
          {janela.map(linha => (
            <StandingRow
              key={linha.clubeId}
              posicao={linha.posicao}
              clubeId={linha.clubeId}
              sigla={linha.sigla}
              nome={linha.nome}
              jogos={linha.jogos}
              pontos={linha.pontos}
              destacado={linha.destacado}
            />
          ))}
        </>
      ) : null}

      {/* ───────── Detalhe por toque (profundidade preservada) ───────── */}
      <Divider style={estilos.sep} />

      {/* Copa do Brasil — atalho. */}
      {copa ? (
        <Card
          variante="interactive"
          onPress={() => nav.navigate('Copa')}
          style={estilos.linhaCard}>
          <Image
            source={LOGO_COPA}
            style={estilos.miniLogo}
            resizeMode="contain"
          />
          <View style={estilos.flex}>
            <Text variant="titleM" numberOfLines={1}>
              {copa.campeao ? 'Campeão!' : copa.fases[copa.faseAtual].nome}
            </Text>
            <Text variant="bodyM" color="textSecondary" numberOfLines={1}>
              {resumoCopa(copa, clubeUsuarioId, todosClubes)}
            </Text>
          </View>
          <Icon nome="avancar" color="textMuted" />
        </Card>
      ) : null}

      {/* Série D — atalho para o chaveamento. */}
      {ehSerieD && serieDCarreira ? (
        <Card
          variante="interactive"
          onPress={() => nav.navigate('SerieD')}
          style={estilos.linhaCard}>
          <Image
            source={LOGO_SERIE_D}
            style={estilos.miniLogo}
            resizeMode="contain"
          />
          <View style={estilos.flex}>
            <Text variant="titleM" numberOfLines={1}>
              {serieDCarreira.fase === 'campeao'
                ? 'Campeão da Série D!'
                : serieDCarreira.fase === 'eliminado'
                ? 'Campanha encerrada'
                : serieDCarreira.faseCorrente?.nome ?? 'Mata-mata'}
            </Text>
            <Text variant="bodyM" color="textSecondary" numberOfLines={1}>
              Chaveamento da Série D
            </Text>
          </View>
          <Icon nome="avancar" color="textMuted" />
        </Card>
      ) : null}

      {/* Avisos do elenco — cada jogador abre o detalhe. */}
      <AlertasCard
        alertas={alertas}
        onAbrirJogador={jogadorId => nav.navigate('PlayerDetail', {jogadorId})}
      />

      {/* Sequências (streaks). */}
      {sequencias.length > 0 ? (
        <View style={estilos.sequenciasRow}>
          {sequencias.map(seq => (
            <Chip
              key={seq.tipo}
              label={seq.rotulo}
              tom={seq.destaque === 'bom' ? 'brand' : 'danger'}
              selected
            />
          ))}
        </View>
      ) : null}

    </Screen>
  );
}

export default Home;

const estilos = StyleSheet.create({
  flex: {flex: 1},
  gap1: {gap: espacamento[1]},
  linhaIcone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[2],
  },
  caps: {textTransform: 'uppercase', letterSpacing: 0.8},
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[1],
  },
  headerBotao: {alignItems: 'center', justifyContent: 'center'},
  sinoBadge: {position: 'absolute', top: -2, right: -6},
  // Identidade
  identidade: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[3],
  },
  // Hero
  heroTimes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTime: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[2],
  },
  heroTimeDir: {justifyContent: 'flex-end'},
  heroInfo: {alignItems: 'center', gap: 2},
  heroEstadio: {opacity: 0.8},
  // Estado do clube
  statsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: espacamento[1],
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: espacamento[1],
  },
  statValorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[1],
  },
  // Classificação
  tabelaHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: espacamento[2],
    paddingHorizontal: espacamento[2],
  },
  colJ: {width: 28, textAlign: 'center'},
  colPts: {width: 32, textAlign: 'right'},
  // Secundários
  sep: {marginVertical: espacamento[2]},
  sequenciasRow: {flexDirection: 'row', flexWrap: 'wrap', gap: espacamento[2]},
  copaJogo: {alignItems: 'center', gap: espacamento[2]},
  copaJogoLogo: {height: 56, width: '55%'},
  linhaCard: {flexDirection: 'row', alignItems: 'center', gap: espacamento[3]},
  miniLogo: {height: 36, width: 36},
});
