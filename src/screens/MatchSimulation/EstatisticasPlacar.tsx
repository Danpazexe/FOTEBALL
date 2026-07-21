/**
 * Estatísticas exibidas SOBRE o scoreboard da partida narrada: linhas de
 * comparação casa × fora e o gráfico "Momento da partida" (pressão ofensiva
 * por minuto). Presentacional puro — extraído da tela MatchSimulation.
 */
import React from 'react';
import {StyleSheet, View} from 'react-native';

import {Text, espacamento, useTheme} from '../../design-system';

/** Linha de estatística comparada sobre o scoreboard: casa · rótulo · fora. */
export function LinhaStatDupla({
  casa,
  rotulo,
  fora,
}: {
  casa: string;
  rotulo: string;
  fora: string;
}): React.JSX.Element {
  return (
    <View style={styles.statDuplaRow}>
      <Text
        variant="titleM"
        color="onScoreboard"
        tabular
        style={styles.statDuplaCasa}>
        {casa}
      </Text>
      <Text
        variant="caption"
        color="onScoreboard"
        align="center"
        style={styles.statDuplaRot}>
        {rotulo}
      </Text>
      <Text
        variant="titleM"
        color="onScoreboard"
        tabular
        style={styles.statDuplaFora}>
        {fora}
      </Text>
    </View>
  );
}

/**
 * "Momento da partida": barras de PRESSÃO OFENSIVA recente por minuto (−1..1,
 * casa acima / visitante abaixo). O GOL aparece como MARCADOR (ponto) no
 * minuto — separado da altura da barra, que é só pressão. Linha divisória
 * marca o intervalo (45').
 */
export function MomentoChart({
  momentum,
  minutosGolCasa,
  minutosGolFora,
}: {
  momentum: number[];
  minutosGolCasa: number[];
  minutosGolFora: number[];
}): React.JSX.Element {
  const {cores, esporte} = useTheme();
  const HALF = 22;
  const golCasaNoMinuto = new Set(minutosGolCasa);
  const golForaNoMinuto = new Set(minutosGolFora);
  return (
    <View style={styles.momento}>
      <Text
        variant="caption"
        color="onScoreboard"
        align="center"
        style={styles.momentoTitulo}>
        Momento da partida
      </Text>
      <View style={styles.momentoBarras}>
        {momentum.length === 0 ? (
          <View style={styles.momentoVazio}>
            <View
              style={[styles.momentoBase, {backgroundColor: cores.onScoreboard}]}
            />
          </View>
        ) : (
          momentum.map((m, i) => {
            const alt = Math.min(1, Math.abs(m)) * HALF;
            const minutoBarra = i + 1;
            const golCasa = golCasaNoMinuto.has(minutoBarra);
            const golFora = golForaNoMinuto.has(minutoBarra);
            return (
              <View
                key={i}
                style={[
                  styles.momentoCol,
                  minutoBarra === 45
                    ? [styles.momentoIntervalo, {borderRightColor: cores.onScoreboard}]
                    : null,
                ]}>
                <View style={styles.momentoTopo}>
                  {golCasa ? (
                    <View
                      style={[
                        styles.momentoGol,
                        {backgroundColor: esporte.match.goal},
                      ]}
                    />
                  ) : null}
                  {m > 0 ? (
                    <View
                      style={[
                        styles.momentoBar,
                        {height: alt, backgroundColor: esporte.match.goal},
                      ]}
                    />
                  ) : null}
                </View>
                <View style={styles.momentoFundo}>
                  {m < 0 ? (
                    <View
                      style={[
                        styles.momentoBar,
                        {height: alt, backgroundColor: esporte.match.cardRed},
                      ]}
                    />
                  ) : null}
                  {golFora ? (
                    <View
                      style={[
                        styles.momentoGol,
                        {backgroundColor: esporte.match.cardRed},
                      ]}
                    />
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statDuplaRow: {flexDirection: 'row', alignItems: 'center'},
  statDuplaCasa: {width: 44, textAlign: 'left'},
  statDuplaFora: {width: 44, textAlign: 'right'},
  statDuplaRot: {
    flex: 1,
    opacity: 0.65,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  momento: {gap: espacamento[1]},
  momentoTitulo: {opacity: 0.7, textTransform: 'uppercase', letterSpacing: 0.5},
  momentoBarras: {flexDirection: 'row', alignItems: 'stretch', height: 44},
  momentoVazio: {flex: 1, justifyContent: 'center'},
  momentoBase: {height: 2, borderRadius: 1, opacity: 0.25},
  momentoCol: {flex: 1, marginHorizontal: 0.3},
  momentoTopo: {flex: 1, justifyContent: 'flex-end', alignItems: 'center', gap: 1},
  momentoFundo: {flex: 1, justifyContent: 'flex-start', alignItems: 'center', gap: 1},
  momentoBar: {width: '100%', borderRadius: 1},
  // Marcador de GOL: ponto acima/abaixo da barra do minuto (não altera a barra).
  momentoGol: {width: 4, height: 4, borderRadius: 2},
  // Divisória vertical do intervalo (após a coluna dos 45').
  momentoIntervalo: {borderRightWidth: 1, marginRight: 1, opacity: 0.9},
});
