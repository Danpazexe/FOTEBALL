/**
 * Tela inicial — "Mesa do Técnico" (Módulo 2).
 * Cabeçalho com escudo/saldo/ajustes; forma recente; card do próximo jogo com
 * barras de força; avisos (lesões/suspensões/saldo); atalhos rápidos; última
 * partida e notícias.
 */

import React, {useMemo} from 'react';
import {
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {Botao, ScreenContainer, TextoVazio} from '../../components/ui';
import AlertasCard, {type Alerta} from '../../components/AlertasCard';
import {LOGO_COPA, LOGO_SERIE_D} from '../../assets/escudos';
// Papel de parede do "hero" do Gabinete: estádio noturno (empacotado).
const FUNDO_ESTADIO = require('../../assets/planodefundo.jpg');
import FormaRecente from '../../components/FormaRecente';
import Chip from '../../components/Chip';
import Icone from '../../components/Icone';
import ProximoJogoCard from '../../components/ProximoJogoCard';
import StatCard from '../../components/StatCard';
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
import {comAlfa, cores, espaco, raio, sombra, tabular} from '../../theme';
import {moedaCompacta, nomeClube} from '../../utils/formatters';
import type {Clube, Partida} from '../../types';

const MAX_FORMA = 5;
const MAX_ALERTAS = 5;

/** Cor do termômetro da diretoria por nível de pressão (verde → laranja → vermelho). */
function corDaPressao(nivel: NivelPressao): string {
  if (nivel === 'Tranquilo' || nivel === 'Estável') {
    return cores.sucesso;
  }
  if (nivel === 'Pressionado') {
    return cores.aviso;
  }
  return cores.perigo;
}

/** Cor do marcador da manchete pelo tom editorial. */
function corDoTom(tom: TomManchete): string {
  if (tom === 'positivo') {
    return cores.sucesso;
  }
  if (tom === 'negativo') {
    return cores.perigo;
  }
  return cores.textoMuted;
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
    <View style={styles.raiz}>
      <ScreenContainer scroll>
        <View style={styles.container}>
          {/* Cabeçalho "hero" cinematográfico: estádio ao fundo + véu + texto claro. */}
          <ImageBackground source={FUNDO_ESTADIO} style={styles.hero}>
            <View style={styles.heroVeu} />
            <Text style={styles.eyebrow} numberOfLines={1}>
              {(clubeUsuario?.nome ?? 'FOTEBALL').toUpperCase()}
            </Text>
            <View style={styles.tituloRow}>
              <Text style={[styles.titulo, styles.heroTexto]} numberOfLines={1}>
                Mesa do Técnico
              </Text>
              <View style={[styles.saldoPill, styles.heroPill]}>
                <Text
                  style={[
                    styles.saldoPillTexto,
                    styles.heroTexto,
                    (clubeUsuario?.financas.saldo ?? 0) < 0
                      ? styles.saldoNegativo
                      : null,
                  ]}
                >
                  {moedaCompacta(clubeUsuario?.financas.saldo ?? 0)}
                </Text>
              </View>
            </View>
            <View style={styles.statusRow}>
              <Text
                style={[styles.subtitulo, styles.heroSub]}
                numberOfLines={1}
              >
                {clubeUsuario?.divisao ?? 'Série A'} · {posicao} · {jogos} jogos
                · {pontos} pts
              </Text>
              {forma.length > 0 ? (
                <FormaRecente resultados={forma} compacto />
              ) : null}
            </View>
          </ImageBackground>

          {/* Estado no relance — moral do elenco, reputação do técnico e propostas. */}
          <View style={styles.relanceRow}>
            <StatCard
              label="Moral"
              valor={`${moralMedia}%`}
              sub={
                moralMedia >= 75
                  ? 'Confiante'
                  : moralMedia >= 50
                  ? 'Equilibrado'
                  : 'Tenso'
              }
              corValor={
                moralMedia >= 75
                  ? cores.sucesso
                  : moralMedia >= 50
                  ? cores.texto
                  : cores.perigo
              }
              onPress={() => nav.navigate('Squad')}
            />
            <StatCard
              label="Reputação"
              valor={reputacao.estrelas}
              sub={reputacao.label}
              corValor={
                reputacaoTecnico >= 60 ? cores.secundaria : cores.texto
              }
              onPress={() => nav.navigate('Gabinete')}
            />
            <StatCard
              label="Propostas"
              valor={String(numPropostas)}
              sub={numPropostas > 0 ? 'Aguardando' : 'Nenhuma'}
              corValor={numPropostas > 0 ? cores.secundaria : cores.texto}
              icone={numPropostas > 0 ? 'mercado' : undefined}
              onPress={
                numPropostas > 0
                  ? () => nav.navigate('TransferMarket')
                  : undefined
              }
            />
          </View>

          {/* Ultimato — exigência concreta da diretoria no fio da navalha. */}
          {ultimato ? (
            <View style={styles.ultimatoBanner}>
              <View style={styles.ultimatoTopo}>
                <Icone nome="apito" tamanho={16} cor={cores.perigo} />
                <Text style={styles.ultimatoTitulo}>{ultimato.titulo}</Text>
              </View>
              <Text style={styles.ultimatoMensagem}>{ultimato.mensagem}</Text>
            </View>
          ) : null}

          {/* Objetivo + Diretoria — dois mini-botões lado a lado (compactos). */}
          {objetivo && pressao ? (
            <View style={styles.duplaBotoes}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ver a tabela"
                onPress={() =>
                  nav.navigate('MainTabs', {screen: 'Competition'})
                }
                style={({pressed}) => [
                  styles.miniBotao,
                  pressed ? styles.miniPressed : null,
                ]}
              >
                <View style={styles.miniTopo}>
                  <Icone nome="trofeu" tamanho={14} cor={cores.aviso} />
                  <Text style={styles.miniLabel}>Objetivo</Text>
                </View>
                <Text style={styles.miniValor} numberOfLines={1}>
                  {objetivo.tipo}
                </Text>
                <Text
                  style={[
                    styles.miniStatus,
                    {color: metaNoRumo ? cores.sucesso : cores.perigo},
                  ]}
                  numberOfLines={1}
                >
                  {metaNoRumo ? 'No rumo' : 'Fora da meta'} · até{' '}
                  {objetivo.posicaoAlvo}º
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ver o gabinete do técnico"
                onPress={() => nav.navigate('Gabinete')}
                style={({pressed}) => [
                  styles.miniBotao,
                  pressed ? styles.miniPressed : null,
                ]}
              >
                <View style={styles.miniTopo}>
                  <Icone
                    nome="conversa"
                    tamanho={14}
                    cor={corDaPressao(pressao.nivel)}
                  />
                  <Text style={styles.miniLabel}>Diretoria</Text>
                </View>
                <Text
                  style={[
                    styles.miniValor,
                    {color: corDaPressao(pressao.nivel)},
                  ]}
                  numberOfLines={1}
                >
                  {pressao.nivel}
                </Text>
                <View style={styles.pressaoTrilha}>
                  <View
                    style={[
                      styles.pressaoBarra,
                      {
                        width: `${pressao.pontuacao}%`,
                        backgroundColor: corDaPressao(pressao.nivel),
                      },
                    ]}
                  />
                </View>
              </Pressable>
            </View>
          ) : null}

          {/* Sequências (streaks) atuais — forma + defesa. */}
          {sequencias.length > 0 ? (
            <View style={styles.sequenciasRow}>
              {sequencias.map(seq => (
                <Chip
                  key={seq.tipo}
                  label={seq.rotulo}
                  tom="suave"
                  cor={seq.destaque === 'bom' ? cores.sucesso : cores.perigo}
                  pequeno
                />
              ))}
            </View>
          ) : null}

          {/* Clássico à vista — realça a rivalidade do próximo jogo. */}
          {classico ? (
            <View style={styles.classicoBanner}>
              <Icone nome="apito" tamanho={15} cor={cores.aviso} />
              <Text style={styles.classicoTexto}>
                CLÁSSICO · {classico.nome}
              </Text>
            </View>
          ) : null}

          {/* Próximo compromisso (sem header duplicado — o card já se rotula). */}
          {ehSerieD ? (
            !serieDCarreira ? (
              proximoEvento.tipo === 'fim' ? (
                <Botao
                  variante="ouro"
                  icone="trofeu"
                  titulo="Encerrar grupos e ir ao mata-mata"
                  onPress={handleIniciarMataMata}
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
                <TextoVazio>Nenhum jogo agendado.</TextoVazio>
              )
            ) : mataMataEmAndamento ? (
              <Botao
                variante="ouro"
                icone="jogar"
                titulo="Ir ao mata-mata da Série D"
                onPress={() => nav.navigate('SerieD')}
              />
            ) : (
              <Botao
                variante="ouro"
                icone="trofeu"
                titulo="Iniciar próxima temporada"
                onPress={handleFinalizarTemporada}
              />
            )
          ) : copaNaVez ? (
            <View style={styles.copaJogoCard}>
              <Image
                source={LOGO_COPA}
                style={styles.copaJogoLogo}
                resizeMode="contain"
              />
              <Text style={styles.copaJogoFase}>
                Copa do Brasil · {copaNaVez.faseNome}
              </Text>
              <Text style={styles.copaJogoConfronto} numberOfLines={1}>
                {clubeUsuario?.nome ?? 'Seu time'} x {copaNaVez.adversario}
              </Text>
              <Botao
                variante="ouro"
                icone="jogar"
                titulo="Jogar confronto da Copa"
                onPress={() => {
                  avancarParaData(copaNaVez.data);
                  nav.navigate('MatchSimulation', {copa: true});
                }}
              />
            </View>
          ) : proximoEvento.tipo === 'fim' ? (
            <Botao
              variante="ouro"
              icone="trofeu"
              titulo="Iniciar próxima temporada"
              onPress={handleFinalizarTemporada}
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
            <TextoVazio>Nenhum jogo agendado.</TextoVazio>
          )}

          {/* Copa do Brasil — card clean (linha única, sem gradiente). */}
          {copa ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ver chave da Copa do Brasil"
              onPress={() => nav.navigate('Copa')}
              style={({pressed}) => [
                styles.copaCard,
                pressed ? styles.cardPressed : null,
              ]}
            >
              <Image
                source={LOGO_COPA}
                style={styles.copaLogo}
                resizeMode="contain"
              />
              <View style={styles.copaInfo}>
                <Text style={styles.copaFase} numberOfLines={1}>
                  {copa.campeao ? 'Campeão!' : copa.fases[copa.faseAtual].nome}
                </Text>
                <Text style={styles.copaDetalhe} numberOfLines={1}>
                  {resumoCopa(copa, clubeUsuarioId, todosClubes)}
                </Text>
              </View>
              <Icone nome="avancar" tamanho={20} cor={cores.textoMuted} />
            </Pressable>
          ) : null}

          {/* Série D — atalho para o chaveamento (carreira na D). */}
          {ehSerieD && serieDCarreira ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ver o chaveamento da Série D"
              onPress={() => nav.navigate('SerieD')}
              style={({pressed}) => [
                styles.copaCard,
                pressed ? styles.cardPressed : null,
              ]}
            >
              <Image
                source={LOGO_SERIE_D}
                style={styles.copaLogo}
                resizeMode="contain"
              />
              <View style={styles.copaInfo}>
                <Text style={styles.copaFase} numberOfLines={1}>
                  {serieDCarreira.fase === 'campeao'
                    ? 'Campeão da Série D!'
                    : serieDCarreira.fase === 'eliminado'
                      ? 'Campanha encerrada'
                      : (serieDCarreira.faseCorrente?.nome ?? 'Mata-mata')}
                </Text>
                <Text style={styles.copaDetalhe} numberOfLines={1}>
                  Chaveamento da Série D
                </Text>
              </View>
              <Icone nome="avancar" tamanho={20} cor={cores.textoMuted} />
            </Pressable>
          ) : null}

          <AlertasCard
            alertas={alertas}
            onAbrirJogador={jogadorId =>
              nav.navigate('PlayerDetail', {jogadorId})
            }
          />

          {/* Imprensa — manchetes editoriais derivadas do momento do clube. */}
          {manchetes.length > 0 ? (
            <View style={styles.imprensaBloco}>
              <View style={styles.imprensaTopo}>
                <Icone nome="conversa" tamanho={15} cor={cores.secundaria} />
                <Text style={styles.blocoTitulo}>Imprensa</Text>
              </View>
              {manchetes.map(manchete => (
                <View key={manchete.id} style={styles.mancheteLinha}>
                  <View
                    style={[
                      styles.mancheteDot,
                      {backgroundColor: corDoTom(manchete.tom)},
                    ]}
                  />
                  <Text style={styles.mancheteTexto}>{manchete.texto}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </ScreenContainer>
    </View>
  );
}

export default Home;

const styles = StyleSheet.create({
  raiz: {
    flex: 1,
  },
  container: {
    // Sem padding próprio: o ScreenContainer (scroll) já aplica o padding
    // padrão — antes duplicava (32px de cada lado), deixando a tela apertada.
    gap: espaco.md,
  },
  // Grade "estado no relance" — StatCards de moral/reputação/propostas.
  relanceRow: {
    flexDirection: 'row',
    gap: espaco.sm,
  },
  hero: {
    borderRadius: raio.lg,
    gap: espaco.xs,
    // Conteúdo ancorado na base, como legenda sobre a foto do estádio.
    justifyContent: 'flex-end',
    minHeight: 132,
    overflow: 'hidden',
    padding: espaco.lg,
  },
  // Véu de noite (verde-escuro) sobre o estádio: legibilidade do texto claro por
  // cima, pertencendo ao mundo "noite de estádio" (não ao navy do tema dia).
  heroVeu: {
    backgroundColor: comAlfa(cores.fundoBase, 0.55),
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  heroTexto: {
    color: cores.texto,
  },
  heroSub: {
    color: comAlfa(cores.texto, 0.85),
  },
  heroPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  eyebrow: {
    color: cores.primaria,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  tituloRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.md,
    justifyContent: 'space-between',
  },
  titulo: {
    color: cores.texto,
    flexShrink: 1,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  saldoPill: {
    backgroundColor: cores.glass,
    borderColor: cores.bordaTransl,
    borderRadius: raio.pill,
    borderWidth: 1,
    paddingHorizontal: espaco.md,
    paddingVertical: 6,
  },
  saldoPillTexto: {
    color: cores.texto,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
    ...tabular,
  },
  saldoNegativo: {
    color: cores.perigo,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.sm,
    justifyContent: 'space-between',
  },
  subtitulo: {
    color: cores.textoSecundario,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
    ...tabular,
  },
  blocoTitulo: {
    color: cores.textoSecundario,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  cardPressed: {
    backgroundColor: cores.superficieAlt,
    transform: [{scale: 0.99}],
  },
  // Termômetro da diretoria — barra de pressão (reusada no mini-botão).
  pressaoTrilha: {
    backgroundColor: cores.superficieAlt,
    borderRadius: 999,
    height: 8,
    marginVertical: 2,
    overflow: 'hidden',
    width: '100%',
  },
  pressaoBarra: {
    borderRadius: 999,
    height: '100%',
  },
  // Objetivo + Diretoria — mini-botões lado a lado.
  duplaBotoes: {
    flexDirection: 'row',
    gap: espaco.sm,
  },
  miniBotao: {
    backgroundColor: cores.superficie,
    borderColor: cores.borda,
    borderRadius: raio.lg,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.md,
    ...sombra.suave,
  },
  miniPressed: {
    backgroundColor: cores.superficieAlt,
    transform: [{scale: 0.99}],
  },
  miniTopo: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.xs,
  },
  miniLabel: {
    color: cores.textoSecundario,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  miniValor: {
    color: cores.texto,
    fontSize: 16,
    fontWeight: '900',
  },
  miniStatus: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  // Ultimato — banner urgente (vermelho) no fio da navalha.
  ultimatoBanner: {
    backgroundColor: comAlfa(cores.perigo, 0.1),
    borderColor: cores.perigo,
    borderRadius: raio.lg,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.md,
  },
  ultimatoTopo: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.xs,
  },
  ultimatoTitulo: {
    color: cores.perigo,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  ultimatoMensagem: {
    color: cores.texto,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  // Clássico — banner de rivalidade do próximo jogo.
  classicoBanner: {
    alignItems: 'center',
    backgroundColor: comAlfa(cores.aviso, 0.1),
    borderColor: comAlfa(cores.aviso, 0.35),
    borderRadius: raio.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: espaco.xs,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
  },
  classicoTexto: {
    color: cores.aviso,
    fontSize: 12.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  // Sequências (streaks) — chips de forma/defesa.
  sequenciasRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaco.sm,
  },
  // Imprensa — painel de manchetes editoriais.
  imprensaBloco: {
    backgroundColor: cores.superficie,
    borderColor: cores.borda,
    borderRadius: raio.lg,
    borderWidth: 1,
    gap: espaco.sm,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.md,
    ...sombra.suave,
  },
  imprensaTopo: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.xs,
  },
  mancheteLinha: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: espaco.sm,
  },
  mancheteDot: {
    borderRadius: 999,
    height: 7,
    marginTop: 6,
    width: 7,
  },
  mancheteTexto: {
    color: cores.textoSecundario,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  // Copa "na vez" — card de destaque clean.
  copaJogoCard: {
    alignItems: 'center',
    backgroundColor: cores.superficie,
    borderColor: cores.borda,
    borderRadius: raio.lg,
    borderWidth: 1,
    gap: espaco.sm,
    padding: espaco.lg,
    ...sombra.suave,
  },
  copaJogoLogo: {
    height: 56,
    width: '55%',
  },
  copaJogoFase: {
    color: cores.secundaria,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  copaJogoConfronto: {
    color: cores.texto,
    fontSize: 16,
    fontWeight: '900',
  },
  // Copa do Brasil — card em linha (clean, tocável).
  copaCard: {
    alignItems: 'center',
    backgroundColor: cores.superficie,
    borderColor: cores.borda,
    borderRadius: raio.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: espaco.md,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.md,
    ...sombra.suave,
  },
  copaLogo: {
    height: 36,
    width: 36,
  },
  copaInfo: {
    flex: 1,
    gap: 2,
  },
  copaFase: {
    color: cores.texto,
    fontSize: 15,
    fontWeight: '800',
  },
  copaDetalhe: {
    color: cores.textoSecundario,
    fontSize: 12.5,
  },
});
