/**
 * Central do Clube — tela raiz da aba CLUBE (hub). Mostra a identidade do clube
 * e um menu das áreas de gestão (Visão geral, Finanças, Patrocínios, Conquistas…)
 * agrupadas. Cada item navega para a tela real da área — nada de item sem
 * destino. Novas áreas entram aqui conforme as telas são construídas.
 */
import React from 'react';
import {StyleSheet, View} from 'react-native';

import {
  AppBar,
  Card,
  Divider,
  MenuRow,
  Screen,
  TeamCrest,
  Text,
  espacamento,
} from '../../design-system';
import {
  selecionarClubeUsuario,
  useGameStore,
  useJogadoresUsuario,
} from '../../store/useGameStore';
import {useClubeNavigation} from '../../navigation/types';

type ItemHub = {
  readonly icone: import('../../components/Icone').IconeNome;
  readonly titulo: string;
  readonly descricao: string;
  readonly ir: (nav: ReturnType<typeof useClubeNavigation>) => void;
  readonly count?: number;
};

function CentralClube(): React.JSX.Element {
  const nav = useClubeNavigation();
  const clube = useGameStore(selecionarClubeUsuario);
  const jogadores = useJogadoresUsuario();
  const temporada = useGameStore(state => state.temporadaAtual);

  const moral =
    jogadores.length === 0
      ? 0
      : jogadores.reduce((s, j) => s + j.moral, 0) / jogadores.length / 10;

  const gestao: ItemHub[] = [
    {
      icone: 'estadio',
      titulo: 'Visão geral',
      descricao: 'Estádio, torcida e reputação',
      ir: n => n.navigate('Club'),
    },
    {
      icone: 'dinheiro',
      titulo: 'Finanças',
      descricao: 'Saldo, receitas e despesas',
      ir: n => n.navigate('Financas'),
    },
  ];

  const historico: ItemHub[] = [
    {
      icone: 'medalha',
      titulo: 'Carreira do técnico',
      descricao: 'Jornada, campanha e conquistas',
      ir: n => n.navigate('Carreira'),
    },
    {
      icone: 'trofeu',
      titulo: 'Conquistas',
      descricao: 'Títulos e histórico do clube',
      ir: n => n.navigate('Gabinete'),
    },
  ];

  return (
    <Screen scroll header={<AppBar title="Clube" />}>
      {/* Identidade do clube */}
      <Card variante="outlined" style={estilos.identidade}>
        <TeamCrest
          clubeId={clube?.id ?? ''}
          sigla={clube?.sigla ?? ''}
          size={56}
        />
        <View style={estilos.identidadeInfo}>
          <Text variant="titleL" numberOfLines={1}>
            {clube?.nome ?? 'Meu Clube'}
          </Text>
          <Text variant="labelM" color="textSecondary">
            {temporada ? `${temporada} · ` : ''}
            {clube?.divisao ?? 'Série A'}
          </Text>
        </View>
        <View style={estilos.identidadeStat}>
          <Text variant="titleM" color="success" tabular>
            {moral.toFixed(1).replace('.', ',')}
          </Text>
          <Text variant="caption" color="textSecondary">
            Moral
          </Text>
        </View>
      </Card>

      <SecaoHub titulo="Gestão" itens={gestao} nav={nav} />
      <SecaoHub titulo="Estrutura e histórico" itens={historico} nav={nav} />
    </Screen>
  );
}

function SecaoHub({
  titulo,
  itens,
  nav,
}: {
  titulo: string;
  itens: ItemHub[];
  nav: ReturnType<typeof useClubeNavigation>;
}): React.JSX.Element {
  return (
    <View style={estilos.secao}>
      <Text variant="labelM" color="textSecondary" style={estilos.secaoTitulo}>
        {titulo.toUpperCase()}
      </Text>
      <Card variante="outlined" padding={0} style={estilos.lista}>
        {itens.map((item, i) => (
          <React.Fragment key={item.titulo}>
            {i > 0 ? <Divider /> : null}
            <MenuRow
              icone={item.icone}
              titulo={item.titulo}
              descricao={item.descricao}
              count={item.count}
              onPress={() => item.ir(nav)}
            />
          </React.Fragment>
        ))}
      </Card>
    </View>
  );
}

export default CentralClube;

const estilos = StyleSheet.create({
  identidade: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[3],
  },
  identidadeInfo: {flex: 1, gap: 2},
  identidadeStat: {alignItems: 'center'},
  secao: {gap: espacamento[2]},
  secaoTitulo: {letterSpacing: 1},
  lista: {paddingHorizontal: espacamento[3]},
});
