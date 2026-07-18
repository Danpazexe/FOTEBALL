/**
 * Seleção de liga/competição para iniciar a carreira, por país e divisão.
 * Ativas: Séries A–D (Brasil), Primera División (Argentina), Premier League e
 * Championship (Inglaterra). As demais aparecem como "Em breve". DS v2.
 */

import React from 'react';
import {Image, StyleSheet, View, type ImageSourcePropType} from 'react-native';

import {
  LOGO_CHAMPIONSHIP,
  LOGO_PREMIER,
  LOGO_PRIMERA,
  LOGO_SERIE_A,
  LOGO_SERIE_B,
  LOGO_SERIE_C,
  LOGO_SERIE_D,
} from '../../assets/escudos';
import {
  AppBar,
  Badge,
  Box,
  Card,
  Icon,
  Screen,
  Text,
  espacamento,
} from '../../design-system';
import {useAppNavigation} from '../../navigation/types';

type Liga = {
  id: string;
  nome: string;
  divisao: string;
  clubes?: number;
  ativa: boolean;
  logo?: ImageSourcePropType;
  /** Divisão (no seed) montada ao escolher esta liga. */
  divisaoSeed?: string;
};

type Pais = {
  pais: string;
  ligas: Liga[];
};

const COMPETICOES: Pais[] = [
  {
    pais: 'Brasil',
    ligas: [
      {
        id: 'br_serie_a',
        nome: 'Brasileirão Série A',
        divisao: '1ª Divisão',
        clubes: 20,
        ativa: true,
        logo: LOGO_SERIE_A,
        divisaoSeed: 'Série A',
      },
      {
        id: 'br_serie_b',
        nome: 'Brasileirão Série B',
        divisao: '2ª Divisão',
        clubes: 20,
        ativa: true,
        logo: LOGO_SERIE_B,
        divisaoSeed: 'Série B',
      },
      {
        id: 'br_serie_c',
        nome: 'Brasileirão Série C',
        divisao: '3ª Divisão',
        clubes: 20,
        ativa: true,
        logo: LOGO_SERIE_C,
        divisaoSeed: 'Série C',
      },
      {
        id: 'br_serie_d',
        nome: 'Brasileirão Série D',
        divisao: '4ª Divisão · grupos + mata-mata',
        clubes: 96,
        ativa: true,
        logo: LOGO_SERIE_D,
        divisaoSeed: 'Série D',
      },
      // A Copa do Brasil NÃO é ponto de entrada de carreira — ela roda junto do
      // Brasileirão (Série A/B) e é jogada dentro da temporada. Por isso não
      // aparece aqui como "liga a escolher".
    ],
  },
  {
    pais: 'Argentina',
    ligas: [
      {
        id: 'ar_primera',
        nome: 'Primera División',
        divisao: '1ª Divisão',
        clubes: 20,
        ativa: true,
        logo: LOGO_PRIMERA,
        divisaoSeed: 'Primera División',
      },
    ],
  },
  {
    pais: 'Inglaterra',
    ligas: [
      {
        id: 'eng_premier',
        nome: 'Premier League',
        divisao: '1ª Divisão',
        clubes: 20,
        ativa: true,
        logo: LOGO_PREMIER,
        divisaoSeed: 'Premier League',
      },
      {
        id: 'eng_championship',
        nome: 'Championship',
        divisao: '2ª Divisão',
        clubes: 24,
        ativa: true,
        logo: LOGO_CHAMPIONSHIP,
        divisaoSeed: 'Championship',
      },
    ],
  },
  {
    pais: 'Espanha',
    ligas: [{id: 'esp_laliga', nome: 'LaLiga', divisao: '1ª Divisão', ativa: false}],
  },
];

function LeagueSelect(): React.JSX.Element {
  const nav = useAppNavigation();

  return (
    <Screen
      scroll
      header={
        <AppBar title="Nova carreira" subtitle="Escolha a liga" onBack={nav.goBack} />
      }>

      {COMPETICOES.map(grupo => (
        <View key={grupo.pais} style={styles.grupo}>
          <Text variant="labelM" color="textSecondary" style={styles.caps}>
            {grupo.pais}
          </Text>
          {grupo.ligas.map(liga => (
            <Card
              key={liga.id}
              variante={liga.ativa ? 'interactive' : 'outlined'}
              accessibilityLabel={liga.nome}
              onPress={
                liga.ativa
                  ? () => nav.navigate('NewCareer', {divisao: liga.divisaoSeed})
                  : undefined
              }
              style={[styles.card, liga.ativa ? null : styles.inativo]}>
              {liga.logo ? (
                <Image
                  source={liga.logo}
                  style={styles.logo}
                  resizeMode="contain"
                />
              ) : (
                <Box
                  bg="surfaceSubtle"
                  bordered
                  radius="sm"
                  align="center"
                  justify="center"
                  style={styles.logo}>
                  <Icon nome="tabela" size={26} color="textSecondary" />
                </Box>
              )}
              <View style={styles.flex}>
                <Text
                  variant="titleM"
                  color={liga.ativa ? 'textPrimary' : 'textSecondary'}
                  numberOfLines={1}>
                  {liga.nome}
                </Text>
                <Text variant="caption" color="textSecondary">
                  {liga.divisao}
                  {liga.clubes ? ` · ${liga.clubes} clubes` : ''}
                </Text>
              </View>
              {liga.ativa ? (
                <Icon nome="avancar" size={22} color="brand" />
              ) : (
                <Badge label="Em breve" tom="neutral" />
              )}
            </Card>
          ))}
        </View>
      ))}
    </Screen>
  );
}

export default LeagueSelect;

const styles = StyleSheet.create({
  grupo: {gap: espacamento[2]},
  caps: {textTransform: 'uppercase', letterSpacing: 1},
  card: {flexDirection: 'row', alignItems: 'center', gap: espacamento[3]},
  inativo: {opacity: 0.55},
  logo: {width: 48, height: 48},
  flex: {flex: 1},
});
