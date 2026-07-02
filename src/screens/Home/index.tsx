/**
 * Tela inicial — "Mesa do Técnico" (Módulo 2).
 * Cabeçalho com escudo/saldo/ajustes; forma recente; card do próximo jogo com
 * barras de força; avisos (lesões/suspensões/saldo); atalhos rápidos; última
 * partida e notícias.
 */

import React, {useMemo} from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';

import {Botao, ScreenContainer, TextoVazio} from '../../components/ui';
import AlertasCard, {type Alerta} from '../../components/AlertasCard';
import {LOGO_COPA} from '../../assets/escudos';
import FormaRecente from '../../components/FormaRecente';
import Painel from '../../components/Painel';
import ProximoJogoCard from '../../components/ProximoJogoCard';
import {useConfirm, useToast} from '../../components/feedback';
import {forcaDoClube} from '../../utils/forca';
import {confrontoDoClube, type EstadoCopa} from '../../engine/season/copaEngine';
import {useAppNavigation} from '../../navigation/types';
import {
  calcularProximoEvento,
  selecionarClubeUsuario,
  selecionarProximoJogo,
  useGameStore,
} from '../../store/useGameStore';
import {cores, espaco, raio} from '../../theme';
import {moedaCompacta, nomeClube} from '../../utils/formatters';
import type {Clube, Partida} from '../../types';

const MAX_FORMA = 5;
const MAX_ALERTAS = 5;

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

  const finalizarTemporada = useGameStore(state => state.finalizarTemporada);
  const avancarParaData = useGameStore(state => state.avancarParaData);
  const demissao = useGameStore(state => state.demissao);

  // Demissão: assim que a diretoria demite, leva o técnico à tela de recontratação.
  React.useEffect(() => {
    if (demissao) {
      nav.navigate('Demissao');
    }
  }, [demissao, nav]);

  const indiceTabela = tabela.findIndex(linha => linha.clubeId === clubeUsuarioId);
  const posicao = indiceTabela === -1 ? '-' : `${indiceTabela + 1}º`;
  const jogos = indiceTabela === -1 ? 0 : tabela[indiceTabela].jogos;
  const pontos = indiceTabela === -1 ? 0 : tabela[indiceTabela].pontos;

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

  const mandoCasa = proximoJogo?.timeCasa === clubeUsuarioId;

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

  // Atalhos da "Central do Técnico" (grade 2 colunas, estilo do mockup).
  const central: {rotulo: string; onPress: () => void}[] = [
    {rotulo: 'Elenco', onPress: () => nav.navigate('MainTabs', {screen: 'Squad'})},
    {rotulo: 'Mercado', onPress: () => nav.navigate('TransferMarket')},
    {rotulo: 'Treino', onPress: () => nav.navigate('Semana')},
    {rotulo: 'Tática', onPress: () => nav.navigate('MainTabs', {screen: 'Tactics'})},
    {rotulo: 'Clube', onPress: () => nav.navigate('MainTabs', {screen: 'Club'})},
    {rotulo: 'Contrato', onPress: () => nav.navigate('Contratos')},
    {rotulo: 'Copa', onPress: () => nav.navigate('Copa')},
    {rotulo: 'Base', onPress: () => nav.navigate('Academia')},
  ];

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Cabeçalho "Mesa do Técnico" */}
        <View style={styles.hero}>
          <Text style={styles.eyebrow} numberOfLines={1}>
            {(clubeUsuario?.nome ?? 'FOTEBALL').toUpperCase()}
          </Text>
          <View style={styles.tituloRow}>
            <Text style={styles.titulo} numberOfLines={1}>
              Mesa do Técnico
            </Text>
            <View style={styles.saldoPill}>
              <Text
                style={[
                  styles.saldoPillTexto,
                  (clubeUsuario?.financas.saldo ?? 0) < 0
                    ? styles.saldoNegativo
                    : null,
                ]}>
                {moedaCompacta(clubeUsuario?.financas.saldo ?? 0)}
              </Text>
            </View>
          </View>
          <Text style={styles.subtitulo}>
            {clubeUsuario?.divisao ?? 'Série A'} · {posicao} · {pontos} pts
          </Text>
        </View>

        {forma.length > 0 ? (
          <View style={styles.formaBox}>
            <FormaRecente resultados={forma} titulo="Últimos jogos" />
            <Text style={styles.formaPos}>
              {posicao} · {jogos} jogos
            </Text>
          </View>
        ) : null}

        <View style={styles.bloco}>
          <Text style={styles.blocoTitulo}>
            {copaNaVez ? 'Compromisso da Copa' : 'Próximo Jogo'}
          </Text>
          {copaNaVez ? (
            <View style={styles.copaJogo}>
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
            <View style={styles.acoes}>
              <Botao
                variante="ouro"
                icone="trofeu"
                titulo="Iniciar próxima temporada"
                onPress={handleFinalizarTemporada}
              />
            </View>
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
        </View>

        {copa ? (
          <View style={styles.bloco}>
            <Text style={styles.blocoTitulo}>Copa do Brasil</Text>
            <Painel>
              <View style={styles.copaCard}>
                <Image
                  source={LOGO_COPA}
                  style={styles.copaLogo}
                  resizeMode="contain"
                />
                <View style={styles.copaInfo}>
                  <Text style={styles.copaFase}>
                    {copa.campeao
                      ? '🏆 Campeão!'
                      : copa.fases[copa.faseAtual].nome}
                  </Text>
                  <Text style={styles.copaDetalhe} numberOfLines={1}>
                    {resumoCopa(copa, clubeUsuarioId, todosClubes)}
                  </Text>
                </View>
                <Botao
                  variante="secundaria"
                  icone="trofeu"
                  titulo="Ver chave"
                  onPress={() => nav.navigate('Copa')}
                />
              </View>
            </Painel>
          </View>
        ) : null}

        <AlertasCard
          alertas={alertas}
          onAbrirJogador={jogadorId => nav.navigate('PlayerDetail', {jogadorId})}
        />

        <View style={styles.centralBloco}>
          <Text style={styles.blocoTitulo}>Central do Técnico</Text>
          <Painel acento={cores.primaria}>
            <View style={styles.central}>
              {[0, 2, 4, 6].map(i => (
                <View key={central[i].rotulo} style={styles.centralRow}>
                  {[central[i], central[i + 1]].map(item => (
                    <Pressable
                      key={item.rotulo}
                      accessibilityRole="button"
                      onPress={item.onPress}
                      style={({pressed}) => [
                        styles.centralBtn,
                        pressed ? styles.centralBtnPressed : null,
                      ]}>
                      <Text style={styles.centralBtnTexto}>{item.rotulo}</Text>
                    </Pressable>
                  ))}
                </View>
              ))}
            </View>
          </Painel>
        </View>
      </View>
    </ScreenContainer>
  );
}

export default Home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: espaco.sm,
    padding: espaco.lg,
  },
  hero: {
    paddingTop: espaco.xs,
  },
  bloco: {
    gap: espaco.sm,
  },
  blocoTitulo: {
    color: cores.textoSecundario,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  eyebrow: {
    color: cores.primaria,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  tituloRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.md,
    justifyContent: 'space-between',
    marginTop: espaco.xs,
  },
  titulo: {
    color: cores.texto,
    flexShrink: 1,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  saldoPill: {
    backgroundColor: cores.glass,
    borderColor: cores.primariaGlow,
    borderRadius: raio.pill,
    borderWidth: 1,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
  },
  saldoPillTexto: {
    color: cores.texto,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  subtitulo: {
    color: cores.textoSecundario,
    fontSize: 13,
    marginTop: espaco.xs,
  },
  saldoNegativo: {
    color: cores.perigo,
  },
  formaBox: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  copaCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.md,
  },
  copaLogo: {
    height: 40,
    width: 40,
  },
  copaInfo: {
    flex: 1,
  },
  copaJogo: {
    alignItems: 'center',
    gap: espaco.sm,
  },
  copaJogoLogo: {
    height: 70,
    width: '60%',
  },
  copaJogoFase: {
    color: cores.secundaria,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  copaJogoConfronto: {
    color: cores.texto,
    fontSize: 17,
    fontWeight: '900',
  },
  copaFase: {
    color: cores.texto,
    fontSize: 15,
    fontWeight: '800',
  },
  copaDetalhe: {
    color: cores.textoSecundario,
    fontSize: 13,
    marginTop: 2,
  },
  centralBloco: {
    gap: espaco.sm,
  },
  central: {
    gap: espaco.sm,
  },
  centralRow: {
    flexDirection: 'row',
    gap: espaco.sm,
  },
  centralBtn: {
    alignItems: 'center',
    backgroundColor: cores.glass,
    borderColor: cores.bordaTransl,
    borderRadius: raio.lg,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 52,
  },
  centralBtnPressed: {
    opacity: 0.85,
    transform: [{scale: 0.98}],
  },
  centralBtnTexto: {
    color: cores.texto,
    fontSize: 15,
    fontWeight: '800',
  },
});
