/**
 * Tela inicial — "Mesa do Técnico" (Módulo 2).
 * Cabeçalho com escudo/saldo/ajustes; forma recente; card do próximo jogo com
 * barras de força; avisos (lesões/suspensões/saldo); atalhos rápidos; última
 * partida e notícias.
 */

import React, {useMemo} from 'react';
import {Image, Pressable, StyleSheet, View} from 'react-native';

import {
  Box,
  Button,
  Card,
  Chip,
  Icon,
  Screen,
  Text,
  espacamento,
  useTheme,
  type CorTexto,
} from '../../design-system';
import AlertasCard, {type Alerta} from '../../components/AlertasCard';
import {LOGO_COPA, LOGO_SERIE_D} from '../../assets/escudos';
import FormaRecente from '../../components/FormaRecente';
import ProximoJogoCard from '../../components/ProximoJogoCard';
import {useConfirm, useToast} from '../../components/feedback';
import {forcaDoClube} from '../../utils/forca';
import {
  confrontoDoClube,
  type EstadoCopa,
} from '../../engine/season/copaEngine';
import {
  definirObjetivoTemporada,
  metaCumprida,
} from '../../engine/carreira/objetivo';
import {
  calcularPressaoDiretoria,
  type NivelPressao,
} from '../../engine/carreira/pressao';
import {avaliarUltimato} from '../../engine/carreira/ultimato';
import {gerarManchetes, type TomManchete} from '../../engine/carreira/imprensa';
import {
  calcularSequencias,
  type JogoResultado,
} from '../../engine/season/sequencias';
import {classicoEntre} from '../../engine/season/classicos';
import {useAppNavigation} from '../../navigation/types';
import {
  calcularProximoEvento,
  selecionarClubeUsuario,
  selecionarProximoJogo,
  useGameStore,
} from '../../store/useGameStore';
import {limiteDerrotasPorDivisao} from '../../store/helpers';
import {moedaCompacta, nomeClube} from '../../utils/formatters';
import type {Clube, Partida} from '../../types';

const MAX_FORMA = 5;
const MAX_ALERTAS = 5;

/** Token de cor do termômetro da diretoria por nível de pressão. */
function corDaPressao(nivel: NivelPressao): CorTexto {
  if (nivel === 'Tranquilo' || nivel === 'Estável') {
    return 'success';
  }
  if (nivel === 'Pressionado') {
    return 'warning';
  }
  return 'danger';
}

/** Token de cor do marcador da manchete pelo tom editorial. */
function corDoTom(tom: TomManchete): CorTexto {
  if (tom === 'positivo') {
    return 'success';
  }
  if (tom === 'negativo') {
    return 'danger';
  }
  return 'textMuted';
}

/**
 * Reputação do técnico (0-100) → estrelas + rótulo curto para o StatCard.
 * 5 estrelas mapeiam a faixa; mínimo 1 (um técnico contratado nunca é 0 estrela).
 */
function reputacaoResumo(rep: number): {estrelas: string; label: string} {
  const cheias = Math.max(1, Math.min(5, Math.round(rep / 20)));
  const estrelas = '★'.repeat(cheias) + '☆'.repeat(5 - cheias);
  const label =
    rep >= 80
      ? 'Ídolo da torcida'
      : rep >= 60
      ? 'Respeitado'
      : rep >= 40
      ? 'Em construção'
      : rep >= 20
      ? 'Contestado'
      : 'Ameaçado';
  return {estrelas, label};
}

type ResultadoForma = 'V' | 'E' | 'D';

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

function resultadoDoUsuario(
  partida: Partida,
  clubeUsuarioId: string,
): ResultadoForma {
  const ehCasa = partida.timeCasa === clubeUsuarioId;
  const golsPro = ehCasa ? partida.placarCasa ?? 0 : partida.placarFora ?? 0;
  const golsContra = ehCasa ? partida.placarFora ?? 0 : partida.placarCasa ?? 0;
  if (golsPro > golsContra) {
    return 'V';
  }
  if (golsPro < golsContra) {
    return 'D';
  }
  return 'E';
}

function Home(): React.JSX.Element {
  const nav = useAppNavigation();
  const confirm = useConfirm();
  const toast = useToast();
  const {cores} = useTheme();

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
  const reputacaoTecnico = useGameStore(state => state.reputacaoTecnico);
  const derrotasConsecutivas = useGameStore(
    state => state.derrotasConsecutivas,
  );
  const rodadasNoVermelho = useGameStore(state => state.rodadasNoVermelho);
  const dificuldade = useGameStore(state => state.config.dificuldade);
  const propostasRecebidas = useGameStore(state => state.propostasRecebidas);

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

  // Termômetro de pressão da diretoria — espelha os gatilhos de demissão + meta.
  const pressao = useMemo(
    () =>
      clubeUsuario && objetivo
        ? calcularPressaoDiretoria({
            derrotasConsecutivas,
            limiteDerrotas: limiteDerrotasPorDivisao(
              clubeUsuario.divisao ?? 'Série A',
            ),
            rodadasNoVermelho,
            reputacaoTecnico,
            posicaoAtual: posicaoReal,
            posicaoAlvo: objetivo.posicaoAlvo,
            totalClubes: tabela.length,
          })
        : null,
    [
      clubeUsuario,
      objetivo,
      derrotasConsecutivas,
      rodadasNoVermelho,
      reputacaoTecnico,
      posicaoReal,
      tabela.length,
    ],
  );

  const forma = useMemo<ResultadoForma[]>(() => {
    if (!clubeUsuarioId) {
      return [];
    }
    return partidas
      .filter(
        partida =>
          partida.jogada &&
          (partida.timeCasa === clubeUsuarioId ||
            partida.timeFora === clubeUsuarioId),
      )
      .sort((a, b) => a.rodada - b.rodada)
      .slice(-MAX_FORMA)
      .map(partida => resultadoDoUsuario(partida, clubeUsuarioId));
  }, [partidas, clubeUsuarioId]);

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

  // Estado no relance (StatCards do topo): moral médio do elenco, reputação e
  // propostas recebidas — resumo antes do detalhe.
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
  const reputacao = reputacaoResumo(reputacaoTecnico);
  const numPropostas = propostasRecebidas.length;

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

  const mandoCasa = proximoJogo?.timeCasa === clubeUsuarioId;

  // Clássico: o próximo jogo é uma rivalidade reconhecida?
  const classico = proximoJogo
    ? classicoEntre(proximoJogo.timeCasa, proximoJogo.timeFora)
    : null;

  // Última partida disputada pelo clube — base editorial do feed de imprensa.
  const ultimaJogada = useMemo(() => {
    if (!clubeUsuarioId) {
      return null;
    }
    const jogadas = partidas
      .filter(
        partida =>
          partida.jogada &&
          (partida.timeCasa === clubeUsuarioId ||
            partida.timeFora === clubeUsuarioId),
      )
      .sort((a, b) => a.rodada - b.rodada);
    const ultima = jogadas[jogadas.length - 1];
    if (!ultima || ultima.placarCasa == null || ultima.placarFora == null) {
      return null;
    }
    const mandante = ultima.timeCasa === clubeUsuarioId;
    return {
      golsFavor: mandante ? ultima.placarCasa : ultima.placarFora,
      golsContra: mandante ? ultima.placarFora : ultima.placarCasa,
      adversario: nomeClube(
        clubes,
        mandante ? ultima.timeFora : ultima.timeCasa,
      ),
      mandante,
    };
  }, [partidas, clubeUsuarioId, clubes]);

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

  const proximoAdversario =
    proximoJogo && clubeUsuarioId
      ? nomeClube(
          clubes,
          proximoJogo.timeCasa === clubeUsuarioId
            ? proximoJogo.timeFora
            : proximoJogo.timeCasa,
        )
      : null;

  // Feed de imprensa — manchetes editoriais derivadas do estado atual.
  const manchetes = useMemo(
    () =>
      clubeUsuario && objetivo
        ? gerarManchetes({
            nomeClube: clubeUsuario.nome,
            ultima: ultimaJogada,
            nivelPressao: pressao?.nivel ?? 'Tranquilo',
            temUltimato: ultimato != null,
            posicaoAtual: posicaoReal,
            posicaoAlvo: objetivo.posicaoAlvo,
            objetivoDescricao: objetivo.descricao,
            proximoAdversario,
          })
        : [],
    [
      clubeUsuario,
      objetivo,
      ultimaJogada,
      pressao,
      ultimato,
      posicaoReal,
      proximoAdversario,
    ],
  );

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

  return (
    <Screen scroll>
      {/* Cabeçalho — banner da marca (temável: texto onBrand nos dois temas). */}
      <Box bg="brandStrong" radius="lg" padding={4} gap={2}>
        <View style={estilos.linhaEntre}>
          <Text
            variant="labelM"
            color="onBrand"
            numberOfLines={1}
            style={estilos.flex}>
            {(clubeUsuario?.nome ?? 'FOTEBALL').toUpperCase()}
          </Text>
          <Pressable
            onPress={() => nav.navigate('Settings')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Ajustes">
            <Icon nome="ajustes" color="onBrand" size="md" />
          </Pressable>
        </View>
        <View style={estilos.linhaEntre}>
          <Text
            variant="titleXL"
            color="onBrand"
            numberOfLines={1}
            style={estilos.flex}>
            Mesa do Técnico
          </Text>
          <Box bg="surface" radius="full" px={3} py={1}>
            <Text
              variant="labelL"
              color={
                (clubeUsuario?.financas.saldo ?? 0) < 0 ? 'danger' : 'textPrimary'
              }
              tabular>
              {moedaCompacta(clubeUsuario?.financas.saldo ?? 0)}
            </Text>
          </Box>
        </View>
        <View style={estilos.linhaEntre}>
          <Text
            variant="labelM"
            color="onBrand"
            numberOfLines={1}
            tabular
            style={estilos.flex}>
            {clubeUsuario?.divisao ?? 'Série A'} · {posicao} · {jogos} jogos ·{' '}
            {pontos} pts
          </Text>
          {forma.length > 0 ? (
            <FormaRecente resultados={forma} compacto />
          ) : null}
        </View>
      </Box>

      {/* Estado no relance — moral / reputação / propostas. */}
      <View style={estilos.relanceRow}>
        <Card
          variante="interactive"
          onPress={() => nav.navigate('MainTabs', {screen: 'Elenco'})}
          style={estilos.statCard}>
          <Text variant="labelM" color="textSecondary">
            Moral
          </Text>
          <Text
            variant="titleL"
            color={
              moralMedia >= 75
                ? 'success'
                : moralMedia >= 50
                ? 'textPrimary'
                : 'danger'
            }
            tabular>
            {moralMedia}%
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {moralMedia >= 75
              ? 'Confiante'
              : moralMedia >= 50
              ? 'Equilibrado'
              : 'Tenso'}
          </Text>
        </Card>
        <Card
          variante="interactive"
          onPress={() => nav.navigate('Gabinete')}
          style={estilos.statCard}>
          <Text variant="labelM" color="textSecondary">
            Reputação
          </Text>
          <Text
            variant="titleM"
            color={reputacaoTecnico >= 60 ? 'accent' : 'textPrimary'}>
            {reputacao.estrelas}
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {reputacao.label}
          </Text>
        </Card>
        <Card
          variante={numPropostas > 0 ? 'interactive' : 'outlined'}
          onPress={
            numPropostas > 0 ? () => nav.navigate('TransferMarket') : undefined
          }
          style={estilos.statCard}>
          <View style={estilos.linhaEntre}>
            <Text variant="labelM" color="textSecondary">
              Propostas
            </Text>
            {numPropostas > 0 ? (
              <Icon nome="mercado" size={14} color="accent" />
            ) : null}
          </View>
          <Text
            variant="titleL"
            color={numPropostas > 0 ? 'accent' : 'textPrimary'}
            tabular>
            {numPropostas}
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {numPropostas > 0 ? 'Aguardando' : 'Nenhuma'}
          </Text>
        </Card>
      </View>

      {/* Ultimato — exigência concreta da diretoria. */}
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

      {/* Objetivo + Diretoria — dois mini-cards lado a lado. */}
      {objetivo && pressao ? (
        <View style={estilos.duplaBotoes}>
          <Card
            variante="interactive"
            accessibilityLabel="Ver a tabela"
            onPress={() => nav.navigate('MainTabs', {screen: 'Competition'})}
            style={estilos.miniCard}>
            <View style={estilos.linhaIcone}>
              <Icon nome="trofeu" size={14} color="warning" />
              <Text variant="labelM" color="textSecondary" style={estilos.caps}>
                Objetivo
              </Text>
            </View>
            <Text variant="titleM" numberOfLines={1}>
              {objetivo.tipo}
            </Text>
            <Text
              variant="caption"
              color={metaNoRumo ? 'success' : 'danger'}
              numberOfLines={1}>
              {metaNoRumo ? 'No rumo' : 'Fora da meta'} · até{' '}
              {objetivo.posicaoAlvo}º
            </Text>
          </Card>
          <Card
            variante="interactive"
            accessibilityLabel="Ver o gabinete do técnico"
            onPress={() => nav.navigate('Gabinete')}
            style={estilos.miniCard}>
            <View style={estilos.linhaIcone}>
              <Icon nome="conversa" size={14} color={corDaPressao(pressao.nivel)} />
              <Text variant="labelM" color="textSecondary" style={estilos.caps}>
                Diretoria
              </Text>
            </View>
            <Text
              variant="titleM"
              color={corDaPressao(pressao.nivel)}
              numberOfLines={1}>
              {pressao.nivel}
            </Text>
            <View
              style={[
                estilos.pressaoTrilha,
                {backgroundColor: cores.surfaceSubtle},
              ]}>
              <View
                style={[
                  estilos.pressaoBarra,
                  {
                    width: `${pressao.pontuacao}%`,
                    backgroundColor: cores[corDaPressao(pressao.nivel)],
                  },
                ]}
              />
            </View>
          </Card>
        </View>
      ) : null}

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

      {/* Clássico à vista. */}
      {classico ? (
        <Card variante="status" status="warning" padding={3}>
          <View style={estilos.linhaIcone}>
            <Icon nome="apito" size={15} color="warning" />
            <Text variant="labelL" color="warning">
              CLÁSSICO · {classico.nome}
            </Text>
          </View>
        </Card>
      ) : null}

      {/* Próximo compromisso (o card já se rotula). */}
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
          ) : proximoJogo && confronto ? (
            <ProximoJogoCard
              partida={proximoJogo}
              clubeCasa={confronto.casa}
              clubeFora={confronto.fora}
              forcaCasa={confronto.forcaCasa}
              forcaFora={confronto.forcaFora}
              mandoCasa={mandoCasa}
              onJogar={handleJogarPartida}
            />
          ) : (
            <Text variant="bodyM" color="textSecondary">
              Nenhum jogo agendado.
            </Text>
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
      ) : proximoJogo && confronto ? (
        <ProximoJogoCard
          partida={proximoJogo}
          clubeCasa={confronto.casa}
          clubeFora={confronto.fora}
          forcaCasa={confronto.forcaCasa}
          forcaFora={confronto.forcaFora}
          mandoCasa={mandoCasa}
          onJogar={handleJogarPartida}
        />
      ) : (
        <Text variant="bodyM" color="textSecondary">
          Nenhum jogo agendado.
        </Text>
      )}

      {/* Copa do Brasil — card em linha. */}
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

      <AlertasCard
        alertas={alertas}
        onAbrirJogador={jogadorId => nav.navigate('PlayerDetail', {jogadorId})}
      />

      {/* Imprensa — manchetes editoriais. */}
      {manchetes.length > 0 ? (
        <Card variante="outlined" padding={4} style={estilos.gap2}>
          <View style={estilos.linhaIcone}>
            <Icon nome="conversa" size={15} color="accent" />
            <Text variant="labelM" color="textSecondary">
              IMPRENSA
            </Text>
          </View>
          {manchetes.map(manchete => (
            <View key={manchete.id} style={estilos.mancheteLinha}>
              <View
                style={[
                  estilos.mancheteDot,
                  {backgroundColor: cores[corDoTom(manchete.tom)]},
                ]}
              />
              <Text variant="bodyM" color="textSecondary" style={estilos.flex}>
                {manchete.texto}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

export default Home;

const estilos = StyleSheet.create({
  flex: {flex: 1},
  gap1: {gap: espacamento[1]},
  gap2: {gap: espacamento[2]},
  linhaEntre: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacamento[2],
  },
  linhaIcone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[2],
  },
  relanceRow: {flexDirection: 'row', gap: espacamento[2]},
  statCard: {flex: 1, gap: espacamento[1]},
  duplaBotoes: {flexDirection: 'row', gap: espacamento[2]},
  miniCard: {flex: 1, gap: espacamento[1]},
  pressaoTrilha: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: espacamento[1],
  },
  pressaoBarra: {height: '100%', borderRadius: 999},
  sequenciasRow: {flexDirection: 'row', flexWrap: 'wrap', gap: espacamento[2]},
  copaJogo: {alignItems: 'center', gap: espacamento[2]},
  copaJogoLogo: {height: 56, width: '55%'},
  linhaCard: {flexDirection: 'row', alignItems: 'center', gap: espacamento[3]},
  miniLogo: {height: 36, width: 36},
  mancheteLinha: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espacamento[2],
  },
  mancheteDot: {width: 7, height: 7, borderRadius: 999, marginTop: 6},
  caps: {textTransform: 'uppercase', letterSpacing: 0.8},
});
