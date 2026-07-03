/**
 * Tela pré-jogo (Módulo 5). Mostra o confronto (força como "favoritismo"),
 * forma e posição e o histórico de confrontos diretos. Daqui o usuário simula
 * ou joga ao vivo.
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
import {cores, corDoTime, espaco, raio, sombra} from '../../theme';
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

  // Favoritismo: força + leve mando de campo.
  const diffForca =
    confronto.forcaCasa.overall + 3 - confronto.forcaFora.overall;
  const favoritismo =
    Math.abs(diffForca) < 2
      ? 'Confronto equilibrado'
      : `Favorito${Math.abs(diffForca) >= 6 ? '' : ' leve'}: ${
          diffForca > 0 ? confronto.casa.nome : confronto.fora.nome
        }`;

  return (
    <ScreenContainer scroll>
      <AppHeader
        titulo={`Rodada ${proximo.rodada}`}
        subtitulo={`Brasileirão ${confronto.casa.divisao ?? 'Série A'}`}
        onBack={() => nav.goBack()}
      />

      {/* Versus — card clean */}
      <View style={styles.versusCard}>
        <View style={styles.confronto}>
          <View style={styles.time}>
            <Escudo
              clubeId={confronto.casa.id}
              sigla={confronto.casa.sigla}
              tamanho={54}
            />
            <Text style={styles.timeNome} numberOfLines={1}>
              {confronto.casa.nome}
            </Text>
            <Text style={styles.forca}>
              {Math.round(confronto.forcaCasa.overall)}
            </Text>
            <Text style={styles.mando}>Casa</Text>
          </View>
          <Text style={styles.vs}>VS</Text>
          <View style={styles.time}>
            <Escudo
              clubeId={confronto.fora.id}
              sigla={confronto.fora.sigla}
              tamanho={54}
            />
            <Text style={styles.timeNome} numberOfLines={1}>
              {confronto.fora.nome}
            </Text>
            <Text style={styles.forca}>
              {Math.round(confronto.forcaFora.overall)}
            </Text>
            <Text style={styles.mando}>Fora</Text>
          </View>
        </View>
        <View style={styles.favoritismoChip}>
          <Text style={styles.favoritismoTexto}>{favoritismo}</Text>
        </View>
      </View>

      <Section titulo="Comparativo de força">
        <View style={styles.card}>
          <BarrasForca
            casa={confronto.forcaCasa}
            fora={confronto.forcaFora}
            corCasa={corDoTime(confronto.casa.id)}
            corFora={corDoTime(confronto.fora.id)}
          />
        </View>
      </Section>

      <Section titulo="Histórico de confrontos">
        {historico.length === 0 ? (
          <TextoVazio>Sem confrontos anteriores.</TextoVazio>
        ) : (
          <View style={styles.card}>
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
          </View>
        )}
      </Section>

      {/* "Jogar ao vivo" é a ação principal → domina; "Simular" é o atalho
          secundário. Proporção ~1:2 (dá destaque sem apertar o rótulo). */}
      <View style={styles.acoes}>
        <View style={styles.acaoSimular}>
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
        <View style={styles.acaoJogar}>
          <Botao
            variante="ouro"
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
  card: {
    backgroundColor: cores.superficie,
    borderColor: cores.borda,
    borderRadius: raio.lg,
    borderWidth: 1,
    padding: espaco.lg,
    ...sombra.suave,
  },
  versusCard: {
    backgroundColor: cores.superficie,
    borderColor: cores.borda,
    borderRadius: raio.lg,
    borderWidth: 1,
    gap: espaco.md,
    marginBottom: espaco.md,
    padding: espaco.lg,
    ...sombra.suave,
  },
  confronto: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  mando: {
    color: cores.textoSecundario,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  vs: {
    color: cores.textoSecundario,
    fontSize: 16,
    fontWeight: '900',
    paddingHorizontal: espaco.sm,
    paddingTop: espaco.xl,
  },
  favoritismoChip: {
    alignSelf: 'center',
    backgroundColor: cores.fundo,
    borderRadius: raio.pill,
    paddingHorizontal: espaco.md,
    paddingVertical: 5,
  },
  favoritismoTexto: {
    color: cores.secundariaEscura,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  historico: {
    gap: espaco.xs,
  },
  histLinha: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.sm,
    paddingVertical: espaco.xs,
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
  acoes: {
    flexDirection: 'row',
    gap: espaco.sm,
    marginTop: espaco.md,
  },
  acaoSimular: {
    flex: 1,
  },
  acaoJogar: {
    flex: 2,
  },
});
