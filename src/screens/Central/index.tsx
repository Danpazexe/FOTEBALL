/**
 * Central do Técnico — hub de atalhos para as telas de gestão (elenco, mercado,
 * treino, tática, clube, contratos, copa, base, troféus). Movida da Home para
 * descongestioná-la; a Home abre esta tela por um atalho.
 */

import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {AppHeader, ScreenContainer} from '../../components/ui';
import Icone, {type IconeNome} from '../../components/Icone';
import {useAppNavigation} from '../../navigation/types';
import {cores, espaco, raio, sombra} from '../../theme';

function Central(): React.JSX.Element {
  const nav = useAppNavigation();

  const atalhos: {rotulo: string; icone: IconeNome; onPress: () => void}[] = [
    {
      rotulo: 'Elenco',
      icone: 'elenco',
      onPress: () => nav.navigate('MainTabs', {screen: 'Squad'}),
    },
    {
      rotulo: 'Mercado',
      icone: 'mercado',
      onPress: () => nav.navigate('TransferMarket'),
    },
    {rotulo: 'Treino', icone: 'apito', onPress: () => nav.navigate('Semana')},
    {
      rotulo: 'Tática',
      icone: 'tatica',
      onPress: () => nav.navigate('MainTabs', {screen: 'Tactics'}),
    },
    {
      rotulo: 'Clube',
      icone: 'clube',
      onPress: () => nav.navigate('MainTabs', {screen: 'Club'}),
    },
    {
      rotulo: 'Contrato',
      icone: 'dinheiro',
      onPress: () => nav.navigate('Contratos'),
    },
    {rotulo: 'Copa', icone: 'trofeu', onPress: () => nav.navigate('Copa')},
    {rotulo: 'Base', icone: 'base', onPress: () => nav.navigate('Academia')},
    {
      rotulo: 'Troféus',
      icone: 'medalha',
      onPress: () => nav.navigate('Gabinete'),
    },
  ];

  return (
    <ScreenContainer scroll>
      <AppHeader
        titulo="Central do Técnico"
        subtitulo="Gestão do clube"
        onBack={() => nav.goBack()}
      />
      <View style={styles.grid}>
        {atalhos.map(item => (
          <Pressable
            key={item.rotulo}
            accessibilityRole="button"
            accessibilityLabel={item.rotulo}
            onPress={item.onPress}
            style={({pressed}) => [
              styles.chip,
              pressed ? styles.chipPressed : null,
            ]}>
            <Icone nome={item.icone} tamanho={26} cor={cores.primaria} />
            <Text style={styles.chipTexto} numberOfLines={1}>
              {item.rotulo}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScreenContainer>
  );
}

export default Central;

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaco.md,
    padding: espaco.lg,
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
  chipPressed: {
    backgroundColor: cores.superficieAlt,
    transform: [{scale: 0.99}],
  },
  chipTexto: {
    color: cores.texto,
    fontSize: 14,
    fontWeight: '700',
  },
});
