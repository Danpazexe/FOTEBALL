/**
 * Gabinete de troféus (Módulo 15). Grade de conquistas: desbloqueadas em cor,
 * bloqueadas em cinza com descrição oculta. Cabeçalho com % de conclusão.
 */

import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {AppHeader, ScreenContainer} from '../../components/ui';
import {useAppNavigation} from '../../navigation/types';
import {useAchievementsStore} from '../../store/useAchievementsStore';
import {cores, espaco, raio} from '../../theme';

function Gabinete(): React.JSX.Element {
  const nav = useAppNavigation();
  const conquistas = useAchievementsStore(state => state.conquistas);

  const desbloqueadas = conquistas.filter(c => c.desbloqueada).length;
  const total = conquistas.length;

  return (
    <ScreenContainer scroll>
      <AppHeader
        titulo="Gabinete"
        subtitulo={`${desbloqueadas}/${total} conquistas`}
        onBack={() => nav.goBack()}
      />

      <View style={styles.grade}>
        {conquistas.map(conquista => (
          <View
            key={conquista.id}
            style={[
              styles.card,
              conquista.desbloqueada ? styles.cardAtivo : styles.cardInativo,
            ]}>
            <MaterialCommunityIcons
              name={conquista.desbloqueada ? conquista.icone : 'lock-outline'}
              size={32}
              color={conquista.desbloqueada ? conquista.corIcone : cores.textoSecundario}
            />
            <Text
              style={[
                styles.nome,
                conquista.desbloqueada ? null : styles.textoInativo,
              ]}
              numberOfLines={1}>
              {conquista.nome}
            </Text>
            <Text style={styles.descricao} numberOfLines={2}>
              {conquista.desbloqueada ? conquista.descricao : '???'}
            </Text>
            {conquista.desbloqueada && conquista.dataDesbloqueio ? (
              <Text style={styles.data}>{conquista.dataDesbloqueio}</Text>
            ) : null}
          </View>
        ))}
      </View>
    </ScreenContainer>
  );
}

export default Gabinete;

const styles = StyleSheet.create({
  grade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaco.sm,
  },
  card: {
    alignItems: 'center',
    borderRadius: raio.md,
    borderWidth: 1,
    gap: espaco.xs,
    minHeight: 132,
    padding: espaco.md,
    width: '48%',
  },
  cardAtivo: {
    backgroundColor: cores.superficie,
    borderColor: cores.borda,
  },
  cardInativo: {
    backgroundColor: cores.fundo,
    borderColor: cores.borda,
    opacity: 0.75,
  },
  nome: {
    color: cores.texto,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  textoInativo: {
    color: cores.textoSecundario,
  },
  descricao: {
    color: cores.textoSecundario,
    fontSize: 11,
    textAlign: 'center',
  },
  data: {
    color: cores.primaria,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
});
