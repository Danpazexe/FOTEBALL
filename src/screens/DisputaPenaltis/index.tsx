/**
 * DisputaPenaltis — acompanhamento AO VIVO da disputa de pênaltis da Copa.
 *
 * Sem jogabilidade: o resultado chega PRONTO pela rota (engine determinística,
 * já commitado e salvo antes de navegar) e a tela só REVELA as cobranças uma a
 * uma, estilo Sofascore — placar da disputa, batedores e vencedor. Com redução
 * de movimento ativa, mostra a disputa completa de imediato.
 */
import React, {useEffect, useMemo, useState} from 'react';
import {AccessibilityInfo, StyleSheet, View} from 'react-native';
import Animated, {ZoomIn} from 'react-native-reanimated';

import {
  tocarFimDeJogo,
  tocarGol,
  tocarPenalti,
  tocarPenaltiPerdido,
} from '../../audio/sons';
import Escudo from '../../components/Escudo';
import {
  AppBar,
  Button,
  Card,
  Icon,
  Score,
  Screen,
  Text,
  espacamento,
  useTheme,
} from '../../design-system';
import type {CobrancaPenalti} from '../../engine/simulation/penaltis';
import {useAppNavigation, useAppRoute} from '../../navigation/types';
import {useGameStore} from '../../store/useGameStore';
import {nomeClube, siglaClube} from '../../utils/formatters';
import type {Clube} from '../../types';

/** Cadência da revelação (1ª cobrança um pouco antes, para não travar a tela). */
const PRIMEIRA_COBRANCA_MS = 900;
const INTERVALO_COBRANCA_MS = 1100;

function DisputaPenaltis(): React.JSX.Element {
  const nav = useAppNavigation();
  const route = useAppRoute<'DisputaPenaltis'>();
  const {timeA, timeB, disputa} = route.params.disputa;

  const todosClubes = useGameStore(state => state.todosClubes);
  const clubeUsuarioId = useGameStore(state => state.clubeUsuarioId);
  const jogadores = useGameStore(state => state.jogadores);
  const todosJogadores = useGameStore(state => state.todosJogadores);

  const nomes = useMemo(() => {
    const mapa: Record<string, string> = {};
    for (const jogador of todosJogadores) {
      mapa[jogador.id] = jogador.nome;
    }
    for (const jogador of jogadores) {
      mapa[jogador.id] = jogador.nome;
    }
    return mapa;
  }, [jogadores, todosJogadores]);

  const total = disputa.cobrancas.length;
  const [reveladas, setReveladas] = useState(0);
  const [instantaneo, setInstantaneo] = useState(false);
  const concluida = reveladas >= total;

  // Redução de movimento: sem revelação gradual nem sons por cobrança.
  useEffect(() => {
    let vivo = true;
    AccessibilityInfo.isReduceMotionEnabled().then(ativo => {
      if (vivo && ativo) {
        setInstantaneo(true);
        setReveladas(total);
      }
    });
    return () => {
      vivo = false;
    };
  }, [total]);

  useEffect(() => {
    tocarPenalti();
  }, []);

  // Revela a próxima cobrança na cadência — som de gol/perda no momento da
  // revelação; ao concluir (revelando ou pulando), apito final.
  useEffect(() => {
    if (concluida) {
      tocarFimDeJogo();
      return;
    }
    const proxima = disputa.cobrancas[reveladas];
    const timer = setTimeout(
      () => {
        if (proxima) {
          const doUsuario = proxima.timeId === clubeUsuarioId;
          if (proxima.convertido) {
            tocarGol(doUsuario);
          } else {
            tocarPenaltiPerdido(doUsuario);
          }
        }
        setReveladas(n => Math.min(n + 1, total));
      },
      reveladas === 0 ? PRIMEIRA_COBRANCA_MS : INTERVALO_COBRANCA_MS,
    );
    return () => clearTimeout(timer);
  }, [reveladas, concluida, total, disputa, clubeUsuarioId]);

  const visiveis = disputa.cobrancas.slice(0, reveladas);
  const golsDe = (id: string) =>
    visiveis.filter(c => c.timeId === id && c.convertido).length;
  const ultima = visiveis[visiveis.length - 1];
  const morteSubita = (ultima?.rodada ?? 0) > 5;

  const usuarioVenceu = disputa.vencedor === clubeUsuarioId;
  const golsVencedor = Math.max(disputa.golsCasa, disputa.golsFora);
  const golsPerdedor = Math.min(disputa.golsCasa, disputa.golsFora);

  return (
    <Screen
      header={
        <AppBar
          title="Disputa de pênaltis"
          subtitle={
            morteSubita && !concluida ? 'Copa do Brasil · Morte súbita' : 'Copa do Brasil'
          }
        />
      }>
      <View style={styles.corpo}>
        <Card variante="outlined" style={styles.placarCard}>
          <View style={styles.times}>
            <LadoTime clubeId={timeA} clubes={todosClubes} />
            <Score casa={golsDe(timeA)} fora={golsDe(timeB)} size="lg" />
            <LadoTime clubeId={timeB} clubes={todosClubes} />
          </View>
          <LinhaCobrancas
            clubeId={timeA}
            clubes={todosClubes}
            cobrancas={disputa.cobrancas}
            reveladas={reveladas}
            instantaneo={instantaneo}
          />
          <LinhaCobrancas
            clubeId={timeB}
            clubes={todosClubes}
            cobrancas={disputa.cobrancas}
            reveladas={reveladas}
            instantaneo={instantaneo}
          />
        </Card>

        {concluida ? (
          <View style={styles.desfecho}>
            <Icon
              nome={usuarioVenceu ? 'trofeu' : 'penalti'}
              size={28}
              color={usuarioVenceu ? 'accent' : 'textSecondary'}
            />
            <Text variant="titleL" align="center">
              {nomeClube(todosClubes, disputa.vencedor)} vence por {golsVencedor}{' '}
              a {golsPerdedor}
            </Text>
            <Text variant="bodyM" color="textSecondary" align="center">
              {usuarioVenceu
                ? 'Classificação garantida nos pênaltis!'
                : 'Fim de linha na Copa — decidido nos pênaltis.'}
            </Text>
          </View>
        ) : (
          <NarracaoCobranca
            cobranca={ultima}
            clubes={todosClubes}
            nomes={nomes}
          />
        )}
      </View>

      <View style={styles.rodape}>
        {concluida ? (
          <Button
            variante="primary"
            icone="trofeu"
            titulo="Continuar"
            onPress={() => nav.navigate('Copa')}
            fullWidth
          />
        ) : (
          <Button
            variante="ghost"
            titulo="Pular"
            onPress={() => setReveladas(total)}
            fullWidth
          />
        )}
      </View>
    </Screen>
  );
}

function LadoTime({
  clubeId,
  clubes,
}: {
  clubeId: string;
  clubes: Clube[];
}): React.JSX.Element {
  return (
    <View style={styles.lado}>
      <Escudo clubeId={clubeId} sigla={siglaClube(clubes, clubeId)} tamanho={44} />
      <Text variant="labelL">{siglaClube(clubes, clubeId)}</Text>
    </View>
  );
}

/** Fileira de bolinhas de um time: convertida (verde), perdida (vermelha), pendente. */
function LinhaCobrancas({
  clubeId,
  clubes,
  cobrancas,
  reveladas,
  instantaneo,
}: {
  clubeId: string;
  clubes: Clube[];
  cobrancas: CobrancaPenalti[];
  reveladas: number;
  instantaneo: boolean;
}): React.JSX.Element {
  const {cores} = useTheme();
  const doTime = cobrancas
    .map((cobranca, indice) => ({cobranca, revelada: indice < reveladas}))
    .filter(item => item.cobranca.timeId === clubeId);
  return (
    <View style={styles.linhaCobrancas}>
      <Text variant="labelM" color="textSecondary" style={styles.siglaLinha}>
        {siglaClube(clubes, clubeId)}
      </Text>
      <View style={styles.bolinhas}>
        {doTime.map(({cobranca, revelada}, indice) => (
          <View
            key={indice}
            style={[
              styles.bolinha,
              revelada ? styles.bolinhaRevelada : {borderColor: cores.border},
            ]}>
            {revelada ? (
              <Animated.View
                entering={instantaneo ? undefined : ZoomIn.duration(220)}
                style={[
                  styles.bolinhaCheia,
                  {
                    backgroundColor: cobranca.convertido
                      ? cores.success
                      : cores.danger,
                  },
                ]}>
                <Icon
                  nome={cobranca.convertido ? 'check' : 'fechar'}
                  size={13}
                  color="onBrand"
                />
              </Animated.View>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

/** Uma linha de narração da cobrança recém-revelada ("Fulano converte"). */
function NarracaoCobranca({
  cobranca,
  clubes,
  nomes,
}: {
  cobranca?: CobrancaPenalti;
  clubes: Clube[];
  nomes: Record<string, string>;
}): React.JSX.Element {
  if (!cobranca) {
    return (
      <Text variant="bodyM" color="textSecondary" align="center">
        Os jogadores se posicionam para as cobranças…
      </Text>
    );
  }
  const batedor =
    (cobranca.jogadorId ? nomes[cobranca.jogadorId] : undefined) ??
    siglaClube(clubes, cobranca.timeId);
  return (
    <View style={styles.narracao}>
      <Icon
        nome={cobranca.convertido ? 'bola' : 'fechar'}
        size={16}
        color={cobranca.convertido ? 'success' : 'danger'}
      />
      <Text variant="titleM" align="center">
        {batedor} {cobranca.convertido ? 'converte!' : 'desperdiça!'}
      </Text>
    </View>
  );
}

export default DisputaPenaltis;

const styles = StyleSheet.create({
  corpo: {
    flex: 1,
    justifyContent: 'center',
    gap: espacamento[4],
    paddingHorizontal: espacamento[4],
  },
  placarCard: {gap: espacamento[3]},
  times: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lado: {alignItems: 'center', gap: espacamento[1], width: 72},
  linhaCobrancas: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[2],
  },
  siglaLinha: {width: 34},
  bolinhas: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacamento[1],
  },
  bolinha: {
    height: 24,
    width: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bolinhaRevelada: {borderColor: 'transparent'},
  bolinhaCheia: {
    height: 24,
    width: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  desfecho: {alignItems: 'center', gap: espacamento[2]},
  narracao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacamento[2],
    minHeight: 28,
  },
  rodape: {padding: espacamento[4]},
});
