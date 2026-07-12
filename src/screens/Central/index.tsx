/**
 * Central do Técnico — hub de atalhos para as telas de gestão, agrupados por
 * contexto: Elenco e Tática em DESTAQUE no topo (uso diário), depois Gestão e
 * Competição & carreira. Movida da Home para descongestioná-la.
 */

import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {AppHeader, ScreenContainer} from '../../components/ui';
import Icone, {type IconeNome} from '../../components/Icone';
import {useAppNavigation, type RootNavigation} from '../../navigation/types';
import {cores, espaco, raio, sombra} from '../../theme';

type Atalho = {
  rotulo: string;
  icone: IconeNome;
  descricao?: string;
  ir: (nav: RootNavigation) => void;
};

const DESTAQUES: Atalho[] = [
  {
    rotulo: 'Elenco',
    icone: 'elenco',
    descricao: 'Jogadores e status',
    ir: nav => nav.navigate('MainTabs', {screen: 'Elenco'}),
  },
  {
    rotulo: 'Tática',
    icone: 'tatica',
    descricao: 'Escalação e estratégia',
    ir: nav => nav.navigate('Tactics'),
  },
  {
    rotulo: 'Treino',
    icone: 'apito',
    descricao: 'Treino da semana',
    ir: nav => nav.navigate('Semana'),
  },
];

const GRUPOS: {titulo: string; itens: Atalho[]}[] = [
  {
    titulo: 'Gestão',
    itens: [
      {rotulo: 'Mercado', icone: 'mercado', ir: nav => nav.navigate('TransferMarket')},
      {rotulo: 'Contrato', icone: 'dinheiro', ir: nav => nav.navigate('Contratos')},
    ],
  },
  {
    titulo: 'Competição & carreira',
    itens: [
      {rotulo: 'Copa', icone: 'trofeu', ir: nav => nav.navigate('Copa')},
      {rotulo: 'Base', icone: 'base', ir: nav => nav.navigate('Academia')},
      {rotulo: 'Troféus', icone: 'medalha', ir: nav => nav.navigate('Gabinete')},
    ],
  },
  {
    titulo: 'Sistema',
    itens: [
      {rotulo: 'Ajustes', icone: 'ajustes', ir: nav => nav.navigate('Settings')},
    ],
  },
];

function Central(): React.JSX.Element {
  const nav = useAppNavigation();

  return (
    <ScreenContainer scroll>
      <AppHeader titulo="Central do Técnico" subtitulo="Gestão do clube" />

      {/* Destaques — uso diário (Elenco / Tática). */}
      <View style={styles.destaquesRow}>
        {DESTAQUES.map(item => (
          <Pressable
            key={item.rotulo}
            accessibilityRole="button"
            accessibilityLabel={item.rotulo}
            onPress={() => item.ir(nav)}
            style={({pressed}) => [
              styles.destaque,
              pressed ? styles.pressed : null,
            ]}>
            <Icone nome={item.icone} tamanho={30} cor={cores.primaria} />
            <Text style={styles.destaqueTitulo}>{item.rotulo}</Text>
            {item.descricao ? (
              <Text style={styles.destaqueSub} numberOfLines={1}>
                {item.descricao}
              </Text>
            ) : null}
          </Pressable>
        ))}
      </View>

      {GRUPOS.map(grupo => (
        <View key={grupo.titulo} style={styles.grupo}>
          <Text style={styles.grupoTitulo}>{grupo.titulo}</Text>
          <View style={styles.grid}>
            {grupo.itens.map(item => (
              <Pressable
                key={item.rotulo}
                accessibilityRole="button"
                accessibilityLabel={item.rotulo}
                onPress={() => item.ir(nav)}
                style={({pressed}) => [
                  styles.chip,
                  pressed ? styles.pressed : null,
                ]}>
                <Icone nome={item.icone} tamanho={24} cor={cores.primaria} />
                <Text style={styles.chipTexto} numberOfLines={1}>
                  {item.rotulo}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </ScreenContainer>
  );
}

export default Central;

const styles = StyleSheet.create({
  destaquesRow: {
    flexDirection: 'row',
    gap: espaco.md,
    paddingHorizontal: espaco.lg,
    paddingTop: espaco.md,
  },
  destaque: {
    backgroundColor: cores.superficie,
    borderColor: cores.borda,
    borderRadius: raio.lg,
    borderWidth: 1,
    flex: 1,
    gap: espaco.xs,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.lg,
    ...sombra.suave,
  },
  destaqueTitulo: {
    color: cores.texto,
    fontSize: 17,
    fontWeight: '900',
    marginTop: espaco.xs,
  },
  destaqueSub: {
    color: cores.textoSecundario,
    fontSize: 12,
  },
  grupo: {
    gap: espaco.sm,
    paddingHorizontal: espaco.lg,
    paddingTop: espaco.lg,
  },
  grupoTitulo: {
    color: cores.textoSecundario,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaco.md,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: cores.superficie,
    borderColor: cores.borda,
    borderRadius: raio.lg,
    borderWidth: 1,
    flexBasis: '30%',
    flexGrow: 1,
    gap: espaco.sm,
    paddingVertical: espaco.lg,
    ...sombra.suave,
  },
  chipTexto: {
    color: cores.texto,
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    backgroundColor: cores.superficieAlt,
    transform: [{scale: 0.99}],
  },
});
