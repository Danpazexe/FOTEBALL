/**
 * Central do Técnico — hub de atalhos para as telas de gestão, agrupados por
 * contexto: Elenco/Tática/Treino em DESTAQUE no topo (uso diário), depois Gestão,
 * Competição & carreira e Sistema. Primeira tela migrada ao Design System v2.
 */

import React from 'react';
import {StyleSheet, View} from 'react-native';

import {
  AppBar,
  Card,
  Icon,
  Screen,
  Text,
  espacamento,
} from '../../design-system';
import type {IconeNome} from '../../components/Icone';
import {useAppNavigation, type RootNavigation} from '../../navigation/types';

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
    <Screen scroll>
      <AppBar title="Central do Técnico" subtitle="Gestão do clube" />

      {/* Destaques — uso diário (Elenco / Tática / Treino). */}
      <View style={estilos.destaquesRow}>
        {DESTAQUES.map(item => (
          <Card
            key={item.rotulo}
            variante="interactive"
            onPress={() => item.ir(nav)}
            style={estilos.destaque}>
            <Icon nome={item.icone} size="xl" color="brand" />
            <Text variant="titleM" style={estilos.destaqueTitulo}>
              {item.rotulo}
            </Text>
            {item.descricao ? (
              <Text variant="caption" color="textSecondary" numberOfLines={1}>
                {item.descricao}
              </Text>
            ) : null}
          </Card>
        ))}
      </View>

      {GRUPOS.map(grupo => (
        <View key={grupo.titulo} style={estilos.grupo}>
          <Text
            variant="labelM"
            color="textSecondary"
            style={estilos.grupoTitulo}>
            {grupo.titulo.toUpperCase()}
          </Text>
          <View style={estilos.grid}>
            {grupo.itens.map(item => (
              <Card
                key={item.rotulo}
                variante="interactive"
                onPress={() => item.ir(nav)}
                style={estilos.chip}>
                <Icon nome={item.icone} size="lg" color="brand" />
                <Text variant="labelL" numberOfLines={1}>
                  {item.rotulo}
                </Text>
              </Card>
            ))}
          </View>
        </View>
      ))}
    </Screen>
  );
}

export default Central;

const estilos = StyleSheet.create({
  destaquesRow: {flexDirection: 'row', gap: espacamento[3]},
  destaque: {flex: 1, gap: espacamento[1]},
  destaqueTitulo: {marginTop: espacamento[1]},
  grupo: {gap: espacamento[2], marginTop: espacamento[4]},
  grupoTitulo: {letterSpacing: 1},
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: espacamento[3]},
  chip: {
    flexBasis: '30%',
    flexGrow: 1,
    alignItems: 'center',
    gap: espacamento[2],
  },
});
