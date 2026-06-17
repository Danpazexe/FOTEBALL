/**
 * Tela de competições (aba "Competições"): exibe a tabela de classificação
 * do Brasileirão Série A da temporada atual, destacando o clube do usuário,
 * com legenda curta das zonas de Libertadores e rebaixamento.
 */

import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {ClassificationTable} from '../../components/ClassificationTable';
import {ScreenContainer, Section} from '../../components/ui';
import {useGameStore} from '../../store/useGameStore';
import {cores, espaco} from '../../theme';

function Competition(): React.JSX.Element {
  const tabela = useGameStore(state => state.tabela);
  const clubes = useGameStore(state => state.clubes);
  const clubeUsuarioId = useGameStore(state => state.clubeUsuarioId);
  const temporadaAtual = useGameStore(state => state.temporadaAtual);

  return (
    <ScreenContainer scroll>
      <Section titulo={`Brasileirão Série A ${temporadaAtual}`}>
        <ClassificationTable
          tabela={tabela}
          clubes={clubes}
          clubeDestaqueId={clubeUsuarioId}
        />

        <View style={styles.legenda}>
          <View style={styles.legendaItem}>
            <View
              style={[styles.legendaMarca, {backgroundColor: cores.primaria}]}
            />
            <Text style={styles.legendaTexto}>Libertadores (1º–4º)</Text>
          </View>
          <View style={styles.legendaItem}>
            <View
              style={[styles.legendaMarca, {backgroundColor: cores.perigo}]}
            />
            <Text style={styles.legendaTexto}>Rebaixamento (17º–20º)</Text>
          </View>
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
