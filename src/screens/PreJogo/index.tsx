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
import Painel from '../../components/Painel';
import {useToast} from '../../components/feedback';
import {useAppNavigation} from '../../navigation/types';
import {selecionarProximoJogo, useGameStore} from '../../store/useGameStore';
import {cores, corDoTime, espaco, gradientes} from '../../theme';
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

      {/* Versus — "Vestiário" */}
      <Painel
        gradiente={gradientes.craque}
        acento={cores.secundaria}
        style={styles.versusPainel}>
        <View style={styles.confronto}>
          <View style={styles.time}>
            <Escudo
              clubeId={confronto.casa.id}
              sigla={confronto.casa.sigla}
              tamanho={56}
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
              tamanho={56}
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
        <Text style={styles.favoritismo}>{favoritismo}</Text>
      </Painel>

      <Section titulo="Comparativo de força">
        <Painel>
          <View style={styles.comparativo}>
            <BarrasForca
              casa={confronto.forcaCasa}
              fora={confronto.forcaFora}
              corCasa={corDoTime(confronto.casa.id)}
              corFora={corDoTime(confronto.fora.id)}
            />
          </View>
        </Painel>
      </Section>

      <Section titulo="Histórico de confrontos">
        {historico.length === 0 ? (
          <TextoVazio>Sem confrontos anteriores.</TextoVazio>
        ) : (
          <Painel>
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
          </Painel>
        )}
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
  versusPainel: {
    marginBottom: espaco.md,
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
    color: cores.secundaria,
    fontSize: 18,
    fontWeight: '900',
    paddingHorizontal: espaco.sm,
    paddingTop: espaco.xl,
  },
  favoritismo: {
    // Dourado padrão: a variante "clara" era para fundo escuro e some no claro.
    color: cores.secundaria,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: espaco.md,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  comparativo: {
    alignItems: 'center',
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
  acaoFlex: {
    flex: 1,
  },
});
