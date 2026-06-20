/**
 * Tela de competições (aba "Competições"): exibe a tabela de classificação do
 * Brasileirão da divisão do clube do usuário, destacando-o, com legenda das
 * zonas de acesso/Libertadores e de rebaixamento (ajustadas por divisão).
 */

import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {ClassificationTable} from '../../components/ClassificationTable';
import {ScreenContainer, Section} from '../../components/ui';
import {selecionarClubeUsuario, useGameStore} from '../../store/useGameStore';
import {cores, espaco} from '../../theme';

const DIVISAO_PADRAO = 'Série A';
/** Divisão mais baixa da pirâmide (não tem rebaixamento). */
const ULTIMA_DIVISAO = 'Série C';

function Competition(): React.JSX.Element {
  const tabela = useGameStore(state => state.tabela);
  const clubes = useGameStore(state => state.clubes);
  const clubeUsuarioId = useGameStore(state => state.clubeUsuarioId);
  const clubeUsuario = useGameStore(selecionarClubeUsuario);
  const temporadaAtual = useGameStore(state => state.temporadaAtual);

  const divisao = clubeUsuario?.divisao ?? DIVISAO_PADRAO;
  const ehSerieA = divisao === DIVISAO_PADRAO;
  const ehUltima = divisao === ULTIMA_DIVISAO;
  const zonaQueda = ehUltima ? null : Math.max(5, tabela.length - 3);
  const rotuloTopo = ehSerieA ? 'Libertadores (1º–4º)' : 'Acesso (1º–4º)';

  return (
    <ScreenContainer scroll>
      <Section titulo={`Brasileirão ${divisao} ${temporadaAtual}`}>
        <ClassificationTable
          tabela={tabela}
          clubes={clubes}
          clubeDestaqueId={clubeUsuarioId}
          zonaQueda={zonaQueda}
        />

        <View style={styles.legenda}>
          <View style={styles.legendaItem}>
            <View
              style={[styles.legendaMarca, {backgroundColor: cores.primaria}]}
            />
            <Text style={styles.legendaTexto}>{rotuloTopo}</Text>
          </View>
          {zonaQueda !== null ? (
            <View style={styles.legendaItem}>
              <View
                style={[styles.legendaMarca, {backgroundColor: cores.perigo}]}
              />
              <Text style={styles.legendaTexto}>
                Rebaixamento ({zonaQueda}º–{tabela.length}º)
              </Text>
            </View>
          ) : null}
        </View>
      </Section>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  legenda: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaco.lg,
  },
  legendaItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.sm,
  },
  legendaMarca: {
    borderRadius: 2,
    height: 12,
    width: 4,
  },
  legendaTexto: {
    color: cores.textoSecundario,
    fontSize: 12,
    fontWeight: '700',
  },
});

export default Competition;
