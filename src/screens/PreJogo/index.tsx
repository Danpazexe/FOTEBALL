/**
 * Tela pré-jogo (Módulo 5). Mostra o confronto (força como "favoritismo"),
 * forma e posição, histórico de confrontos diretos e o acesso à coletiva de
 * imprensa. Daqui o usuário simula ou joga ao vivo.
 */

import React, {useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {
  AppHeader,
  Botao,
  ScreenContainer,
  Section,
  TextoVazio,
} from '../../components/ui';
import BarrasForca from '../../components/BarrasForca';
import Escudo from '../../components/Escudo';
import {useToast} from '../../components/feedback';
import {useAppNavigation} from '../../navigation/types';
import {selecionarProximoJogo, useGameStore} from '../../store/useGameStore';
import {cores, corDoTime, espaco, raio} from '../../theme';
import {forcaDoClube} from '../../utils/forca';
import {nomeClube} from '../../utils/formatters';

function PreJogo(): React.JSX.Element {
  const nav = useAppNavigation();
  const toast = useToast();

  const clubes = useGameStore(state => state.clubes);
  const jogadores = useGameStore(state => state.jogadores);
  const partidas = useGameStore(state => state.partidas);
  const proximo = useGameStore(selecionarProximoJogo);
  const avancarRodada = useGameStore(state => state.avancarRodada);
  const coletivaConcedida = useGameStore(state => state.coletivaConcedida);

  const confronto = useMemo(() => {
    if (!proximo) {
      return null;
    }
    const casa = clubes.find(c => c.id === proximo.timeCasa);
    const fora = clubes.find(c => c.id === proximo.timeFora);
    if (!casa || !fora) {
      return null;
    }
    return {
      casa,
      fora,
      forcaCasa: forcaDoClube(casa, jogadores),
      forcaFora: forcaDoClube(fora, jogadores),
    };
  }, [proximo, clubes, jogadores]);

  const historico = useMemo(() => {
    if (!proximo) {
      return [];
    }
    const {timeCasa: a, timeFora: b} = proximo;
    return partidas
      .filter(
        p =>
          p.jogada &&
          ((p.timeCasa === a && p.timeFora === b) ||
            (p.timeCasa === b && p.timeFora === a)),
      )
      .sort((x, y) => y.rodada - x.rodada)
      .slice(0, 3);
  }, [partidas, proximo]);

  if (!proximo || !confronto) {
    return (
      <ScreenContainer>
        <AppHeader titulo="Pré-jogo" onBack={() => nav.goBack()} />
        <TextoVazio>Nenhum jogo agendado.</TextoVazio>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      <AppHeader
        titulo={`Rodada ${proximo.rodada}`}
        subtitulo="Brasileirão Série A"
        onBack={() => nav.goBack()}
      />

      <View style={styles.confronto}>
        <View style={styles.time}>
          <Escudo clubeId={confronto.casa.id} sigla={confronto.casa.sigla} tamanho={56} />
          <Text style={styles.timeNome} numberOfLines={1}>
            {confronto.casa.nome}
          </Text>
          <Text style={styles.forca}>{Math.round(confronto.forcaCasa.overall)}</Text>
        </View>
        <Text style={styles.vs}>VS</Text>
        <View style={styles.time}>
          <Escudo clubeId={confronto.fora.id} sigla={confronto.fora.sigla} tamanho={56} />
          <Text style={styles.timeNome} numberOfLines={1}>
            {confronto.fora.nome}
          </Text>
          <Text style={styles.forca}>{Math.round(confronto.forcaFora.overall)}</Text>
        </View>
      </View>

      <BarrasForca
        casa={confronto.forcaCasa}
        fora={confronto.forcaFora}
        corCasa={corDoTime(confronto.casa.id)}
        corFora={corDoTime(confronto.fora.id)}
      />

      <Section titulo="Histórico de confrontos">
        {historico.length === 0 ? (
          <TextoVazio>Sem confrontos anteriores.</TextoVazio>
        ) : (
          <View style={styles.historico}>
            {historico.map(p => (
              <View key={p.id} style={styles.histLinha}>
                <Text style={styles.histRodada}>R{p.rodada}</Text>
                <Text style={styles.histTexto}>
                  {nomeClube(clubes, p.timeCasa)} {p.placarCasa ?? 0} ×{' '}
                  {p.placarFora ?? 0} {nomeClube(clubes, p.timeFora)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Section>

      <Section titulo="Coletiva de imprensa">
        <Text style={styles.coletivaTexto}>
          {coletivaConcedida
            ? 'Você já falou com a imprensa antes deste jogo.'
            : 'Enfrente os jornalistas: 3 perguntas sobre escalação, um jogador e o adversário. Suas respostas mexem com a moral do elenco.'}
        </Text>
        <Botao
          variante="secundaria"
          icone="conversa"
          titulo={coletivaConcedida ? 'Ver coletiva' : 'Ir à coletiva'}
          onPress={() => nav.navigate('Coletiva')}
        />
      </Section>

      <View style={styles.acoes}>
        <View style={styles.acaoFlex}>
          <Botao
            variante="secundaria"
            icone="simular"
            titulo="Simular"
            onPress={() => {
              avancarRodada();
              toast('Rodada simulada.', 'sucesso');
              nav.navigate('MainTabs');
            }}
          />
        </View>
        <View style={styles.acaoFlex}>
          <Botao
            icone="jogar"
            titulo="Jogar ao vivo"
            onPress={() => nav.navigate('MatchSimulation')}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

export default PreJogo;

const styles = StyleSheet.create({
  confronto: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: espaco.md,
  },
  time: {
    alignItems: 'center',
    flex: 1,
    gap: espaco.xs,
  },
  timeNome: {
    color: cores.texto,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  forca: {
    color: cores.primaria,
    fontSize: 22,
    fontWeight: '900',
  },
  vs: {
    color: cores.textoSecundario,
    fontSize: 18,
    fontWeight: '900',
    paddingHorizontal: espaco.sm,
  },
  historico: {
    gap: espaco.xs,
  },
  histLinha: {
    alignItems: 'center',
    backgroundColor: cores.superficieAlt,
    borderRadius: raio.sm,
    flexDirection: 'row',
    gap: espaco.sm,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
  },
  histRodada: {
    color: cores.secundaria,
    fontSize: 12,
    fontWeight: '800',
    minWidth: 30,
  },
  histTexto: {
    color: cores.texto,
    flex: 1,
    fontSize: 13,
  },
  coletivaTexto: {
    color: cores.textoSecundario,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: espaco.md,
  },
  acoes: {
    flexDirection: 'row',
    gap: espaco.sm,
    marginTop: espaco.md,
  },
  acaoFlex: {
    flex: 1,
  },
});
