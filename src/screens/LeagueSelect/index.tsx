/**
 * Seleção de liga/competição para iniciar a carreira.
 *
 * Organizado por país (nacionalidade) e divisão. O Brasileirão Série A, B e C
 * estão ativos — as demais ligas aparecem como "Em breve" (desativadas) para
 * deixar clara a estrutura planejada. Cada divisão exibe seu próprio emblema.
 */

import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';

import {
  LOGO_SERIE_A,
  LOGO_SERIE_B,
  LOGO_SERIE_C,
  LOGO_SERIE_D,
} from '../../assets/escudos';
import {AppHeader, ScreenContainer} from '../../components/ui';
import Icone from '../../components/Icone';
import {useAppNavigation} from '../../navigation/types';
import {cores, espaco, raio, sombra} from '../../theme';

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
      {id: 'br_copa', nome: 'Copa do Brasil', divisao: 'Mata-mata', ativa: false},
    ],
  },
  {
    pais: 'Argentina',
    ligas: [
      {id: 'ar_primera', nome: 'Liga Profesional', divisao: '1ª Divisão', ativa: false},
    ],
  },
  {
    pais: 'Inglaterra',
    ligas: [
      {id: 'eng_premier', nome: 'Premier League', divisao: '1ª Divisão', ativa: false},
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
    <ScreenContainer>
      <View style={styles.headerWrap}>
        <AppHeader titulo="Nova carreira" subtitulo="Escolha a liga" onBack={nav.goBack} />
      </View>

      <ScrollView contentContainerStyle={styles.lista}>
        {COMPETICOES.map(grupo => (
          <View key={grupo.pais} style={styles.grupo}>
            <Text style={styles.pais}>{grupo.pais}</Text>
            {grupo.ligas.map(liga => (
              <Pressable
                key={liga.id}
                accessibilityRole="button"
                disabled={!liga.ativa}
                onPress={() =>
                  liga.ativa &&
                  nav.navigate('NewCareer', {divisao: liga.divisaoSeed})
                }
                style={[styles.card, liga.ativa ? null : styles.cardInativo]}>
                {liga.logo ? (
                  <Image source={liga.logo} style={styles.logo} resizeMode="contain" />
                ) : (
                  <View style={styles.logoPlaceholder}>
                    <Icone nome="tabela" tamanho={26} cor={cores.textoSecundario} />
                  </View>
                )}
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardNome, liga.ativa ? null : styles.textoInativo]}>
                    {liga.nome}
                  </Text>
                  <Text style={styles.cardLegenda}>
                    {liga.divisao}
                    {liga.clubes ? ` · ${liga.clubes} clubes` : ''}
                  </Text>
                </View>
                {liga.ativa ? (
                  <Icone nome="avancar" tamanho={22} cor={cores.primaria} />
                ) : (
                  <View style={styles.tag}>
                    <Text style={styles.tagTexto}>Em breve</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: espaco.lg,
    paddingTop: espaco.lg,
  },
  lista: {
    gap: espaco.lg,
    padding: espaco.lg,
    paddingBottom: espaco.xl * 2,
  },
  grupo: {
    gap: espaco.sm,
  },
  pais: {
    color: cores.textoSecundario,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  card: {
    alignItems: 'center',
    backgroundColor: cores.superficieElevada,
    borderColor: cores.bordaTransl,
    borderRadius: raio.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: espaco.md,
    padding: espaco.md,
    ...sombra.card,
  },
  cardInativo: {
    opacity: 0.55,
  },
  logo: {
    height: 48,
    width: 48,
  },
  logoPlaceholder: {
    alignItems: 'center',
    backgroundColor: cores.superficieElevada,
    borderColor: cores.bordaTransl,
    borderRadius: raio.sm,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  cardInfo: {
    flex: 1,
    gap: espaco.xs,
  },
  cardNome: {
    color: cores.texto,
    fontSize: 16,
    fontWeight: '800',
  },
  textoInativo: {
    color: cores.textoSecundario,
  },
  cardLegenda: {
    color: cores.textoSecundario,
    fontSize: 12,
    fontWeight: '600',
  },
  tag: {
    backgroundColor: cores.glass,
    borderColor: cores.bordaTransl,
    borderRadius: raio.pill,
    borderWidth: 1,
    paddingHorizontal: espaco.sm,
    paddingVertical: espaco.xs,
  },
  tagTexto: {
    color: cores.textoSecundario,
    fontSize: 11,
    fontWeight: '700',
  },
});

export default LeagueSelect;
