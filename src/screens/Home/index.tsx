/**
 * Tela inicial — "Mesa do Técnico" (Módulo 2).
 * Cabeçalho com escudo/saldo/ajustes; forma recente; card do próximo jogo com
 * barras de força; avisos (lesões/suspensões/saldo); atalhos rápidos; última
 * partida e notícias.
 */

import React, {useMemo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {
  Botao,
  Metric,
  MetricsRow,
  ScreenContainer,
  Section,
  TextoVazio,
} from '../../components/ui';
import AlertasCard, {type Alerta} from '../../components/AlertasCard';
import Escudo from '../../components/Escudo';
import FormaRecente from '../../components/FormaRecente';
import Icone, {type IconeNome} from '../../components/Icone';
import ProximoJogoCard from '../../components/ProximoJogoCard';
import {useConfirm, useToast} from '../../components/feedback';
import {
  calcularForcaTime,
  type ForcaTime,
} from '../../engine/simulation/teamStrength';
import {useAppNavigation} from '../../navigation/types';
import {
  calcularProximoEvento,
  selecionarClubeUsuario,
  selecionarProximoJogo,
  useEventosUltimaPartida,
  useGameStore,
} from '../../store/useGameStore';
import {cores, espaco, raio, sombra} from '../../theme';
import {formatarDataCurta, formatarDataLonga} from '../../utils/datas';
import {moedaCompacta, nomeClube} from '../../utils/formatters';
import type {Clube, Partida, Player} from '../../types';

const MAX_EVENTOS = 8;
const MAX_FORMA = 5;
const MAX_ALERTAS = 5;

type ResultadoForma = 'V' | 'E' | 'D';

function mediaOverallClube(jogadores: Player[], clubeId: string): number {
  const doClube = jogadores
    .filter(jogador => jogador.clubeId === clubeId)
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 11);
  if (doClube.length === 0) {
    return 0;
  }
  const soma = doClube.reduce((total, jogador) => total + jogador.overall, 0);
  return Math.round(soma / doClube.length);
}

/** Força do clube pela escalação atual; cai para a média de overall se faltar. */
function forcaDoClube(clube: Clube, jogadores: Player[]): ForcaTime {
  if (clube.formacaoAtual && clube.taticaAtual) {
    return calcularForcaTime(
      clube.formacaoAtual,
      jogadores.filter(jogador => jogador.clubeId === clube.id),
      clube.taticaAtual,
    );
  }
  const media = mediaOverallClube(jogadores, clube.id);
  return {ataque: media, meio: media, defesa: media, forcaGoleiro: media, overall: media};
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

/** Ícone/cor da notícia inferidos pelo conteúdo do texto. */
function estiloNoticia(texto: string): {nome: IconeNome; cor: string} {
  const t = texto.toLowerCase();
  if (t.includes('contratad') || t.includes('vendid') || t.includes('proposta')) {
    return {nome: 'mercado', cor: cores.primaria};
  }
  if (t.includes('renov')) {
    return {nome: 'troca', cor: cores.secundaria};
  }
  if (t.includes('temporada')) {
    return {nome: 'trofeu', cor: cores.secundaria};
  }
  if (t.includes('rodada') || t.includes('disputad') || t.includes('simulad')) {
    return {nome: 'bola', cor: cores.primaria};
  }
  if (t.includes('treino')) {
    return {nome: 'tatica', cor: cores.primaria};
  }
  if (t.includes('jovem') || t.includes('promov') || t.includes('peneira')) {
    return {nome: 'jovem', cor: cores.secundaria};
  }
  if (t.includes('carreira')) {
    return {nome: 'clube', cor: cores.primaria};
  }
  if (t.includes('escalação') || t.includes('tática')) {
    return {nome: 'tatica', cor: cores.textoSecundario};
  }
  return {nome: 'apito', cor: cores.textoSecundario};
}

function Home(): React.JSX.Element {
  const nav = useAppNavigation();
  const confirm = useConfirm();
  const toast = useToast();

  const clubes = useGameStore(state => state.clubes);
  const jogadores = useGameStore(state => state.jogadores);
  const partidas = useGameStore(state => state.partidas);
  const tabela = useGameStore(state => state.tabela);
  const mensagens = useGameStore(state => state.mensagens);
  const rodadaAtual = useGameStore(state => state.rodadaAtual);
  const temporadaAtual = useGameStore(state => state.temporadaAtual);
  const clubeUsuarioId = useGameStore(state => state.clubeUsuarioId);
  const ultimaPartidaUsuario = useGameStore(state => state.ultimaPartidaUsuario);
  const confirmarAcoes = useGameStore(state => state.config.confirmarAcoes);
  const proximoJogo = useGameStore(selecionarProximoJogo);
  const clubeUsuario = useGameStore(selecionarClubeUsuario);
  const eventosUltimaPartida = useEventosUltimaPartida();

  const finalizarTemporada = useGameStore(state => state.finalizarTemporada);
  const avancarParaData = useGameStore(state => state.avancarParaData);
  const dataAtual = useGameStore(state => state.dataAtual);
  const treinouProximoJogo = useGameStore(state => state.treinouProximoJogo);

  const indiceTabela = tabela.findIndex(linha => linha.clubeId === clubeUsuarioId);
  const posicao = indiceTabela === -1 ? '-' : `${indiceTabela + 1}º`;
  const jogos = indiceTabela === -1 ? 0 : tabela[indiceTabela].jogos;

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
          texto: `${jogador.apelido ?? jogador.nome} — lesão (${jogador.diasLesao} dias)`,
          jogadorId: jogador.id,
        });
      } else if (jogador.suspenso) {
        lista.push({
          id: `susp_${jogador.id}`,
          tipo: 'suspensao',
          texto: `${jogador.apelido ?? jogador.nome} — suspenso (${jogador.jogosSuspensao} jogo)`,
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

  const eventosVisiveis = eventosUltimaPartida.slice(0, MAX_EVENTOS);
  const mandoCasa = proximoJogo?.timeCasa === clubeUsuarioId;

  // Próximo evento do calendário (treino → jogo → fim de temporada).
  const proximoEvento = useMemo(
    () => calcularProximoEvento(proximoJogo, treinouProximoJogo),
    [proximoJogo, treinouProximoJogo],
  );

  const confirmarSe = async (
    opcoes: Parameters<typeof confirm>[0],
  ): Promise<boolean> => {
    if (!confirmarAcoes) {
      return true;
    }
    return confirm(opcoes);
  };

  // Avança o calendário até o dia do treino e abre a tela de treino.
  const handleIrTreinar = () => {
    if (proximoEvento.tipo !== 'treino') {
      return;
    }
    avancarParaData(proximoEvento.data);
    nav.navigate('Semana');
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

  return (
    <ScreenContainer scroll>
      {/* Cabeçalho-resumo */}
      <View style={styles.header}>
        {clubeUsuarioId ? (
          <Escudo
            clubeId={clubeUsuarioId}
            sigla={clubeUsuario?.sigla ?? ''}
            tamanho={48}
          />
        ) : null}
        <View style={styles.headerInfo}>
          <Text style={styles.titulo} numberOfLines={1}>
            {clubeUsuario?.nome ?? 'Início'}
          </Text>
          <Text style={styles.subtitulo}>
            Temporada {temporadaAtual} · Rodada {Math.min(rodadaAtual, 38)}/38
          </Text>
        </View>
        <View style={styles.headerDireita}>
          <Text style={styles.headerSaldoLabel}>Saldo</Text>
          <Text
            style={[
              styles.headerSaldoValor,
              (clubeUsuario?.financas.saldo ?? 0) < 0
                ? styles.saldoNegativo
                : null,
            ]}>
            {moedaCompacta(clubeUsuario?.financas.saldo ?? 0)}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => nav.navigate('MainTabs', {screen: 'Settings'})}
          style={styles.gear}>
          <Icone nome="ajustes" tamanho={22} cor={cores.textoSecundario} />
        </Pressable>
      </View>

      {/* Barra de data + próximo evento do calendário (estilo FIFA) */}
      <View style={styles.dataBar}>
        <Icone nome="calendario" tamanho={16} cor={cores.primaria} />
        <Text style={styles.dataTexto} numberOfLines={1}>
          {formatarDataLonga(dataAtual)}
        </Text>
        <View style={styles.eventoChip}>
          <Icone
            nome={
              proximoEvento.tipo === 'jogo'
                ? 'bola'
                : proximoEvento.tipo === 'treino'
                  ? 'tatica'
                  : 'trofeu'
            }
            tamanho={12}
            cor={cores.contrastePrimaria}
          />
          <Text style={styles.eventoChipTexto}>
            {proximoEvento.tipo === 'treino'
              ? `Treino · ${formatarDataCurta(proximoEvento.data)}`
              : proximoEvento.tipo === 'jogo'
                ? `Jogo · ${formatarDataCurta(proximoEvento.data)}`
                : 'Fim de temporada'}
          </Text>
        </View>
      </View>

      {forma.length > 0 ? (
        <View style={styles.formaBox}>
          <FormaRecente resultados={forma} titulo="Últimos jogos" />
          <Text style={styles.formaPos}>
            {posicao} · {jogos} jogos
          </Text>
        </View>
      ) : null}

      <Section titulo="Próximo Jogo">
        {proximoEvento.tipo === 'fim' ? (
          <View style={styles.acoes}>
            <Botao
              variante="grande"
              icone="trofeu"
              titulo="Iniciar próxima temporada"
              onPress={handleFinalizarTemporada}
            />
          </View>
        ) : proximoJogo && confronto ? (
          <>
            <ProximoJogoCard
              partida={proximoJogo}
              clubeCasa={confronto.casa}
              clubeFora={confronto.fora}
              forcaCasa={confronto.forcaCasa}
              forcaFora={confronto.forcaFora}
              mandoCasa={mandoCasa}
              onEscalar={() => nav.navigate('MainTabs', {screen: 'Tactics'})}
              onJogar={handleJogarPartida}
              jogarDesabilitado={proximoEvento.tipo === 'treino'}
            />
            {proximoEvento.tipo === 'treino' ? (
              <View style={styles.acoes}>
                <View style={styles.avisoTreino}>
                  <Icone nome="tatica" tamanho={15} cor={cores.secundaria} />
                  <Text style={styles.avisoTreinoTexto}>
                    Treine o elenco antes da partida para liberar o jogo.
                  </Text>
                </View>
                <Botao
                  variante="grande"
                  icone="tatica"
                  titulo="Avançar para o treino"
                  onPress={handleIrTreinar}
                />
              </View>
            ) : null}
          </>
        ) : (
          <TextoVazio>Nenhum jogo agendado.</TextoVazio>
        )}
      </Section>

      <AlertasCard
        alertas={alertas}
        onAbrirJogador={jogadorId => nav.navigate('PlayerDetail', {jogadorId})}
      />

      {/* Atalhos rápidos */}
      <View style={styles.atalhos}>
        <Atalho
          icone="elenco"
          rotulo="Elenco"
          onPress={() => nav.navigate('MainTabs', {screen: 'Squad'})}
        />
        <Atalho
          icone="mercado"
          rotulo="Mercado"
          onPress={() => nav.navigate('TransferMarket')}
        />
        <Atalho
          icone="dinheiro"
          rotulo="Finanças"
          onPress={() => nav.navigate('MainTabs', {screen: 'Club'})}
        />
      </View>
      <View style={styles.atalhos}>
        <Atalho
          icone="tatica"
          rotulo="Treino"
          onPress={() => nav.navigate('Semana')}
        />
        <Atalho
          icone="jovem"
          rotulo="Base"
          onPress={() => nav.navigate('Academia')}
        />
        <Atalho
          icone="trofeu"
          rotulo="Conquistas"
          onPress={() => nav.navigate('Gabinete')}
        />
      </View>
      <View style={styles.atalhos}>
        <Atalho
          icone="calendario"
          rotulo="Calendário"
          onPress={() => nav.navigate('Calendario')}
        />
        <Atalho
          icone="troca"
          rotulo="Contratos"
          onPress={() => nav.navigate('Contratos')}
        />
      </View>

      <MetricsRow>
        <Metric label="Posição" valor={posicao} />
        <Metric label="Rodada" valor={String(Math.min(rodadaAtual, 38))} />
        <Metric label="Jogos" valor={String(jogos)} />
      </MetricsRow>

      <Section titulo="Última Partida">
        {ultimaPartidaUsuario ? (
          <View style={styles.card}>
            <Text style={styles.placar}>
              {nomeClube(clubes, ultimaPartidaUsuario.timeCasa)}{' '}
              <Text style={styles.placarNumero}>
                {ultimaPartidaUsuario.placarCasa ?? 0}
              </Text>
              <Text style={styles.versus}> x </Text>
              <Text style={styles.placarNumero}>
                {ultimaPartidaUsuario.placarFora ?? 0}
              </Text>{' '}
              {nomeClube(clubes, ultimaPartidaUsuario.timeFora)}
            </Text>
            {eventosVisiveis.length > 0 ? (
              <View style={styles.eventos}>
                {eventosVisiveis.map((evento, index) => (
                  <View key={`${evento.minuto}_${index}`} style={styles.evento}>
                    <Text style={styles.eventoMinuto}>{evento.minuto}&apos;</Text>
                    <Text style={styles.eventoDescricao}>{evento.descricao}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <TextoVazio>Sem eventos registrados.</TextoVazio>
            )}
          </View>
        ) : (
          <TextoVazio>Nenhuma partida disputada ainda.</TextoVazio>
        )}
      </Section>

      <Section titulo="Notícias">
        {mensagens.length > 0 ? (
          <View style={styles.noticias}>
            {mensagens.map((mensagem, index) => {
              const {nome, cor} = estiloNoticia(mensagem.texto);
              return (
                <View
                  key={mensagem.id}
                  style={[
                    styles.noticia,
                    index === 0 ? styles.noticiaDestaque : null,
                  ]}>
                  <View style={[styles.noticiaIcone, {borderColor: cor}]}>
                    <Icone nome={nome} tamanho={16} cor={cor} />
                  </View>
                  <View style={styles.flex1}>
                    <Text style={styles.noticiaTexto}>{mensagem.texto}</Text>
                    {index === 0 ? (
                      <Text style={styles.noticiaRecente}>Mais recente</Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.noticiaVazia}>
            <Icone nome="apito" tamanho={26} cor={cores.textoSecundario} />
            <Text style={styles.noticiaVaziaTexto}>
              Tudo tranquilo por aqui. As novidades aparecem após cada rodada,
              negociação ou treino.
            </Text>
          </View>
        )}
      </Section>
    </ScreenContainer>
  );
}

function Atalho({
  icone,
  rotulo,
  onPress,
}: {
  icone: IconeNome;
  rotulo: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.atalho}>
      <Icone nome={icone} tamanho={22} cor={cores.primaria} />
      <Text style={styles.atalhoTexto}>{rotulo}</Text>
    </Pressable>
  );
}

export default Home;

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.md,
    marginBottom: espaco.md,
  },
  headerInfo: {
    flex: 1,
  },
  titulo: {
    color: cores.texto,
    fontSize: 22,
    fontWeight: '800',
  },
  subtitulo: {
    color: cores.textoSecundario,
    fontSize: 13,
    marginTop: 2,
  },
  headerDireita: {
    alignItems: 'flex-end',
  },
  headerSaldoLabel: {
    color: cores.textoSecundario,
    fontSize: 11,
  },
  headerSaldoValor: {
    color: cores.primaria,
    fontSize: 16,
    fontWeight: '800',
  },
  saldoNegativo: {
    color: cores.perigo,
  },
  gear: {
    padding: espaco.xs,
  },
  dataBar: {
    alignItems: 'center',
    backgroundColor: cores.superficie,
    borderColor: cores.bordaClara,
    borderRadius: raio.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: espaco.sm,
    marginBottom: espaco.md,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
    ...sombra.suave,
  },
  dataTexto: {
    color: cores.texto,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  eventoChip: {
    alignItems: 'center',
    backgroundColor: cores.primaria,
    borderRadius: raio.pill,
    flexDirection: 'row',
    gap: espaco.xs,
    paddingHorizontal: espaco.sm,
    paddingVertical: 3,
  },
  eventoChipTexto: {
    color: cores.contrastePrimaria,
    fontSize: 11,
    fontWeight: '800',
  },
  avisoTreino: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.sm,
    paddingVertical: espaco.xs,
  },
  avisoTreinoTexto: {
    color: cores.textoSecundario,
    flex: 1,
    fontSize: 12,
  },
  formaBox: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: espaco.lg,
  },
  formaPos: {
    color: cores.textoSecundario,
    fontSize: 12,
    fontWeight: '700',
  },
  acoes: {
    gap: espaco.sm,
    marginTop: espaco.sm,
  },
  atalhos: {
    flexDirection: 'row',
    gap: espaco.sm,
    marginVertical: espaco.md,
  },
  atalho: {
    alignItems: 'center',
    backgroundColor: cores.superficieAlt,
    borderColor: cores.bordaClara,
    borderRadius: raio.md,
    borderWidth: 1,
    flex: 1,
    gap: espaco.xs,
    paddingVertical: espaco.md,
    ...sombra.suave,
  },
  atalhoTexto: {
    color: cores.texto,
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    backgroundColor: cores.superficie,
    borderColor: cores.bordaClara,
    borderRadius: raio.md,
    borderWidth: 1,
    gap: espaco.sm,
    padding: espaco.md,
    ...sombra.suave,
  },
  versus: {
    color: cores.textoSecundario,
    fontWeight: '700',
  },
  placar: {
    color: cores.texto,
    fontSize: 17,
    fontWeight: '800',
  },
  placarNumero: {
    color: cores.primaria,
    fontWeight: '800',
  },
  eventos: {
    gap: espaco.xs,
  },
  evento: {
    flexDirection: 'row',
    gap: espaco.sm,
  },
  eventoMinuto: {
    color: cores.secundaria,
    fontSize: 13,
    fontWeight: '800',
    minWidth: 34,
  },
  eventoDescricao: {
    color: cores.textoSecundario,
    flex: 1,
    fontSize: 13,
  },
  flex1: {
    flex: 1,
  },
  noticias: {
    gap: espaco.sm,
  },
  noticia: {
    alignItems: 'center',
    backgroundColor: cores.superficie,
    borderColor: cores.bordaClara,
    borderRadius: raio.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: espaco.md,
    padding: espaco.md,
    ...sombra.suave,
  },
  noticiaDestaque: {
    borderColor: cores.primaria,
  },
  noticiaIcone: {
    alignItems: 'center',
    backgroundColor: cores.fundo,
    borderRadius: 18,
    borderWidth: 1.5,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  noticiaTexto: {
    color: cores.texto,
    fontSize: 13,
    lineHeight: 18,
  },
  noticiaRecente: {
    color: cores.primaria,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  noticiaVazia: {
    alignItems: 'center',
    backgroundColor: cores.superficie,
    borderColor: cores.borda,
    borderRadius: raio.md,
    borderWidth: 1,
    gap: espaco.sm,
    padding: espaco.lg,
  },
  noticiaVaziaTexto: {
    color: cores.textoSecundario,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
