/**
 * Academia de base. Lista os jovens das peneiras da temporada com potencial em
 * letra (B/A/S). O técnico promove ao elenco ou libera. Migrada ao DS v2.
 */

import React from 'react';
import {StyleSheet, View} from 'react-native';

import OverallBadge from '../../components/OverallBadge';
import {
  AppBar,
  Button,
  Card,
  Screen,
  Text,
  espacamento,
  raios,
  useTheme,
  type CorTexto,
} from '../../design-system';
import {
  faixaPotencial,
  type FaixaPotencial,
} from '../../engine/progression/academiaEngine';
import {useAppNavigation} from '../../navigation/types';
import {useGameStore} from '../../store/useGameStore';
import {moeda} from '../../utils/formatters';

function corFaixa(faixa: FaixaPotencial): CorTexto {
  if (faixa === 'S') {
    return 'accent';
  }
  if (faixa === 'A') {
    return 'brand';
  }
  return 'textSecondary';
}

function Academia(): React.JSX.Element {
  const nav = useAppNavigation();
  const {cores} = useTheme();
  const jovens = useGameStore(state => state.jovensDisponiveis);
  const promoverJovem = useGameStore(state => state.promoverJovem);
  const liberarJovem = useGameStore(state => state.liberarJovem);

  return (
    <Screen scroll>
      <AppBar
        title="Academia de Base"
        subtitle={`${jovens.length} jovens nas peneiras`}
        onBack={() => nav.goBack()}
      />

      {jovens.length === 0 ? (
        <Text variant="bodyM" color="textSecondary">
          Nenhum jovem disponível. Novas peneiras surgem a cada temporada.
        </Text>
      ) : (
        <View style={styles.lista}>
          {jovens.map(jovem => {
            const faixa = faixaPotencial(jovem.potencial);
            const corF = corFaixa(faixa);
            return (
              <Card key={jovem.id} variante="outlined" style={styles.card}>
                <OverallBadge overall={jovem.overall} />
                <View style={styles.main}>
                  <Text variant="titleM" numberOfLines={1}>
                    {jovem.nome}
                  </Text>
                  <Text variant="caption" color="textSecondary">
                    {jovem.posicao} · {jovem.idade} anos ·{' '}
                    {moeda(jovem.salarioBase)}/mês
                  </Text>
                  <View style={styles.potencialLinha}>
                    <Text variant="caption" color="textSecondary">
                      Potencial
                    </Text>
                    <View
                      style={[
                        styles.faixaChip,
                        {borderColor: cores[corF]},
                        faixa === 'S' ? {backgroundColor: cores.accentSoft} : null,
                      ]}>
                      <Text variant="labelL" color={corF}>
                        {faixa}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.acoes}>
                  <Button
                    variante="primary"
                    tamanho="sm"
                    icone="check"
                    titulo="Promover"
                    onPress={() => promoverJovem(jovem.id)}
                  />
                  <Button
                    variante="ghost"
                    tamanho="sm"
                    titulo="Liberar"
                    onPress={() => liberarJovem(jovem.id)}
                  />
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

export default Academia;

const styles = StyleSheet.create({
  lista: {gap: espacamento[2]},
  card: {flexDirection: 'row', alignItems: 'center', gap: espacamento[3]},
  main: {flex: 1, gap: 3},
  potencialLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[2],
    marginTop: 2,
  },
  faixaChip: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: raios.sm,
    borderWidth: 1.5,
    minWidth: 26,
    paddingHorizontal: espacamento[2],
    paddingVertical: 1,
  },
  acoes: {gap: espacamento[1]},
});
