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
import {LOGO_COPA} from '../../assets/escudos';
// Papel de parede do "hero" do Gabinete: estádio noturno (empacotado).
const FUNDO_ESTADIO = require('../../assets/planodefundo.jpg');
import FormaRecente from '../../components/FormaRecente';
import Icone, {type IconeNome} from '../../components/Icone';
import ProximoJogoCard from '../../components/ProximoJogoCard';
import {useConfirm, useToast} from '../../components/feedback';
import {forcaDoClube} from '../../utils/forca';
import {confrontoDoClube, type EstadoCopa} from '../../engine/season/copaEngine';
import {
  definirObjetivoTemporada,
  metaCumprida,
} from '../../engine/carreira/objetivo';
import {
  calcularPressaoDiretoria,
  type NivelPressao,
} from '../../engine/carreira/pressao';
import {useAppNavigation} from '../../navigation/types';
import {
  calcularProximoEvento,
  selecionarClubeUsuario,
  selecionarProximoJogo,
  useGameStore,
} from '../../store/useGameStore';
import {limiteDerrotasPorDivisao} from '../../store/helpers';
import {cores, espaco, raio, sombra} from '../../theme';
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
  const reputacaoTecnico = useGameStore(state => state.reputacaoTecnico);
  const derrotasConsecutivas = useGameStore(
    state => state.derrotasConsecutivas,
  );
  const rodadasNoVermelho = useGameStore(state => state.rodadasNoVermelho);

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

  // Meta da diretoria (mesma regra do fim de temporada): reputação + divisão do
  // clube definem a meta; a posição atual diz se está no rumo.
  const objetivo = useMemo(
    () =>
      clubeUsuario
        ? definirObjetivoTemporada(
            clubeUsuario.reputacao,
            clubeUsuario.divisao ?? 'Série A',
          )
        : null,
    [clubeUsuario],
  );
  // Antes da 1ª rodada a posição é desempate arbitrário (localeCompare do clubeId);
  // só há "posição real" com jogos disputados — senão a meta cobraria sem jogo.
  const posicaoReal = jogos > 0 && indiceTabela !== -1 ? indiceTabela + 1 : null;
  const metaNoRumo =
    objetivo && posicaoReal != null ? metaCumprida(objetivo, posicaoReal) : true;

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

  // Atalhos da "Central do Técnico" — chips compactos (ícone + rótulo), 3 colunas.
  const central: {rotulo: string; icone: IconeNome; onPress: () => void}[] = [
    {rotulo: 'Elenco', icone: 'elenco', onPress: () => nav.navigate('MainTabs', {screen: 'Squad'})},
    {rotulo: 'Mercado', icone: 'mercado', onPress: () => nav.navigate('TransferMarket')},
    {rotulo: 'Treino', icone: 'apito', onPress: () => nav.navigate('Semana')},
    {rotulo: 'Tática', icone: 'tatica', onPress: () => nav.navigate('MainTabs', {screen: 'Tactics'})},
    {rotulo: 'Clube', icone: 'clube', onPress: () => nav.navigate('MainTabs', {screen: 'Club'})},
    {rotulo: 'Contrato', icone: 'dinheiro', onPress: () => nav.navigate('Contratos')},
    {rotulo: 'Copa', icone: 'trofeu', onPress: () => nav.navigate('Copa')},
    {rotulo: 'Base', icone: 'base', onPress: () => nav.navigate('Academia')},
    {rotulo: 'Troféus', icone: 'medalha', onPress: () => nav.navigate('Gabinete')},
  ];

  return (
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
                ]}>
                {moedaCompacta(clubeUsuario?.financas.saldo ?? 0)}
              </Text>
            </View>
          </View>
          <View style={styles.statusRow}>
            <Text style={[styles.subtitulo, styles.heroSub]} numberOfLines={1}>
              {clubeUsuario?.divisao ?? 'Série A'} · {posicao} · {jogos} jogos ·{' '}
              {pontos} pts
            </Text>
            {forma.length > 0 ? (
              <FormaRecente resultados={forma} compacto />
            ) : null}
          </View>
        </ImageBackground>

        {/* Meta da diretoria — objetivo contratado da temporada + progresso. */}
        {objetivo ? (
          <View style={styles.objetivoCard}>
            <View style={styles.objetivoTopo}>
              <Icone nome="trofeu" tamanho={15} cor={cores.aviso} />
              <Text style={styles.objetivoRotulo}>Objetivo da temporada</Text>
              <View
                style={[
                  styles.objetivoTag,
                  metaNoRumo ? styles.objetivoTagOk : styles.objetivoTagRisco,
                ]}>
                <Text
                  style={[
                    styles.objetivoTagTexto,
                    metaNoRumo
                      ? styles.objetivoTagTextoOk
                      : styles.objetivoTagTextoRisco,
                  ]}>
                  {metaNoRumo ? 'No rumo' : 'Fora da meta'}
                </Text>
              </View>
            </View>
            <Text style={styles.objetivoMeta} numberOfLines={1}>
              {objetivo.descricao}
            </Text>
            <Text style={styles.objetivoAlvo} numberOfLines={1}>
              Meta: terminar até {objetivo.posicaoAlvo}º · Você está em {posicao}
            </Text>
          </View>
        ) : null}

        {/* Termômetro da diretoria — pressão sobre o cargo (0-100 + nível). */}
        {pressao ? (
          <View style={styles.objetivoCard}>
            <View style={styles.objetivoTopo}>
              <Icone
                nome="conversa"
                tamanho={15}
                cor={corDaPressao(pressao.nivel)}
              />
              <Text style={styles.objetivoRotulo}>Termômetro da diretoria</Text>
              <Text
                style={[
                  styles.pressaoNivel,
                  {color: corDaPressao(pressao.nivel)},
                ]}>
                {pressao.nivel}
              </Text>
            </View>
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
            <Text style={styles.objetivoAlvo} numberOfLines={1}>
              {pressao.fatores.length > 0
                ? pressao.fatores[0]
                : 'Diretoria tranquila com o trabalho.'}
            </Text>
          </View>
        ) : null}

        {/* Próximo compromisso (sem header duplicado — o card já se rotula). */}
        {copaNaVez ? (
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
            ]}>
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

        <AlertasCard
          alertas={alertas}
          onAbrirJogador={jogadorId => nav.navigate('PlayerDetail', {jogadorId})}
        />

        {/* Central do Técnico — chips compactos (ícone + rótulo), 3 colunas. */}
        <View style={styles.centralBloco}>
          <Text style={styles.blocoTitulo}>Central do Técnico</Text>
          <View style={styles.centralGrid}>
            {central.map(item => (
              <Pressable
                key={item.rotulo}
                accessibilityRole="button"
                onPress={item.onPress}
                style={({pressed}) => [
                  styles.chip,
                  pressed ? styles.cardPressed : null,
                ]}>
                <Icone nome={item.icone} tamanho={22} cor={cores.primaria} />
                <Text style={styles.chipTexto} numberOfLines={1}>
                  {item.rotulo}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}

export default Home;

const styles = StyleSheet.create({
  container: {
    // Sem padding próprio: o ScreenContainer (scroll) já aplica o padding
    // padrão — antes duplicava (32px de cada lado), deixando a tela apertada.
    gap: espaco.md,
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
  // Véu navy sobre o estádio: garante legibilidade do texto claro por cima.
  heroVeu: {
    backgroundColor: 'rgba(11, 30, 63, 0.5)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  heroTexto: {
    color: '#FFFFFF',
  },
  heroSub: {
    color: 'rgba(233, 240, 251, 0.9)',
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
  // Meta da diretoria — objetivo da temporada + progresso.
  objetivoCard: {
    backgroundColor: cores.superficie,
    borderColor: cores.borda,
    borderRadius: raio.lg,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.md,
    ...sombra.suave,
  },
  objetivoTopo: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.xs,
  },
  objetivoRotulo: {
    color: cores.textoSecundario,
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  objetivoMeta: {
    color: cores.texto,
    fontSize: 16,
    fontWeight: '900',
  },
  objetivoAlvo: {
    color: cores.textoSecundario,
    fontSize: 12.5,
  },
  objetivoTag: {
    borderRadius: raio.sm,
    paddingHorizontal: espaco.xs,
    paddingVertical: 2,
  },
  objetivoTagOk: {
    backgroundColor: 'rgba(18, 183, 106, 0.12)',
  },
  objetivoTagRisco: {
    backgroundColor: 'rgba(229, 72, 77, 0.12)',
  },
  objetivoTagTexto: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  objetivoTagTextoOk: {
    color: cores.sucesso,
  },
  objetivoTagTextoRisco: {
    color: cores.perigo,
  },
  // Termômetro da diretoria — nível + barra de pressão.
  pressaoNivel: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
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
  // Central do Técnico — grid de chips (ícone + rótulo), 3 colunas.
  centralBloco: {
    gap: espaco.sm,
  },
  centralGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaco.sm,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: cores.superficie,
    borderColor: cores.borda,
    borderRadius: raio.lg,
    borderWidth: 1,
    flexBasis: '31.5%',
    flexGrow: 1,
    gap: espaco.xs,
    paddingVertical: espaco.md,
    ...sombra.suave,
  },
  chipTexto: {
    color: cores.texto,
    fontSize: 13,
    fontWeight: '700',
  },
});
