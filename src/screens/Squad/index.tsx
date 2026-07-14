/**
 * Aba Elenco (North Star — fiel ao mockup). Header com busca e filtro por ícone,
 * abas em pílula (Todos/Titulares/Reservas), jogador em DESTAQUE (avatar, nome,
 * posição/idade, anel de overall "GER" e dois selos: papel + moral) e a lista
 * escaneável numa moldura: avatar · posição · nome · idade · overall · condição
 * física · humor — com destaque para lesão/suspensão. Tocar abre o detalhe.
 */
import React, {useMemo, useState} from 'react';
import {ScrollView, StyleSheet, TextInput, View} from 'react-native';

import {
  AppBar,
  Badge,
  Card,
  Chip,
  Divider,
  Icon,
  IconButton,
  OverallRing,
  PositionBadge,
  ProgressBar,
  Pressable,
  Screen,
  SegmentedTabs,
  Text,
  espacamento,
  raios,
  useTheme,
  type CorTexto,
} from '../../design-system';
import type {IconeNome} from '../../components/Icone';
import PlayerAvatar from '../../components/PlayerAvatar';
import {useElencoNavigation} from '../../navigation/types';
import {
  selecionarClubeUsuario,
  useGameStore,
  useJogadoresUsuario,
} from '../../store/useGameStore';
import type {Player, Position} from '../../types';

type Aba = 'todos' | 'titulares' | 'reservas';
type FiltroPosicao = 'Todos' | Position;

const ABAS: Array<{chave: Aba; rotulo: string}> = [
  {chave: 'todos', rotulo: 'Todos'},
  {chave: 'titulares', rotulo: 'Titulares'},
  {chave: 'reservas', rotulo: 'Reservas'},
];

const FILTROS: FiltroPosicao[] = [
  'Todos', 'GOL', 'ZAG', 'LD', 'LE', 'VOL', 'MC', 'MEI', 'PD', 'PE', 'SA', 'CA',
];

/**
 * Bem-estar do jogador combinando MORAL (ânimo) e CONDIÇÃO FÍSICA (cansaço).
 * A condição pesa: um jogador exausto aparece "cansado" mesmo com moral boa —
 * antes o emote só olhava a moral (quase uniforme) e ficava sempre verde.
 */
function humorJogador(
  moral: number,
  condicao: number,
): {icone: IconeNome; cor: CorTexto; rotulo: string} {
  // Moral muito baixa domina: jogador desanimado.
  if (moral < 35) {
    return {icone: 'humor-ruim', cor: 'danger', rotulo: 'Desanimado'};
  }
  // Exausto (condição crítica) — vermelho, precisa poupar.
  if (condicao < 45) {
    return {icone: 'humor-cansado', cor: 'danger', rotulo: 'Exausto'};
  }
  // Cansado (condição baixa) — âmbar.
  if (condicao < 65) {
    return {icone: 'humor-cansado', cor: 'warning', rotulo: 'Cansado'};
  }
  // Moral apenas ok — neutro.
  if (moral < 65) {
    return {icone: 'humor-neutro', cor: 'warning', rotulo: 'Neutro'};
  }
  // Tudo em ordem — feliz.
  return {icone: 'humor-bom', cor: 'success', rotulo: 'Ótimo'};
}

function nomeCurto(jogador: Player): string {
  return jogador.apelido ?? jogador.nome;
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function Squad(): React.JSX.Element {
  const nav = useElencoNavigation();
  const {cores} = useTheme();
  const jogadores = useJogadoresUsuario();
  const clubeUsuario = useGameStore(selecionarClubeUsuario);
  const [aba, setAba] = useState<Aba>('todos');
  const [filtro, setFiltro] = useState<FiltroPosicao>('Todos');
  const [busca, setBusca] = useState('');
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [filtroAberto, setFiltroAberto] = useState(false);

  const titularesIds = useMemo(
    () =>
      new Set(
        clubeUsuario?.formacaoAtual?.titulares.map(t => t.jogadorId) ?? [],
      ),
    [clubeUsuario],
  );

  const jogadoresFiltrados = useMemo(() => {
    const alvo = normalizar(busca.trim());
    return jogadores
      .filter(j => {
        if (aba === 'titulares') {
          return titularesIds.has(j.id);
        }
        if (aba === 'reservas') {
          return !titularesIds.has(j.id);
        }
        return true;
      })
      .filter(j => filtro === 'Todos' || j.posicaoPrincipal === filtro)
      .filter(j => alvo === '' || normalizar(nomeCurto(j)).includes(alvo));
  }, [jogadores, aba, filtro, busca, titularesIds]);

  // Jogador em destaque: o capitão, ou o de maior overall.
  const destaque = useMemo(() => {
    if (jogadores.length === 0) {
      return null;
    }
    const capitao = jogadores.find(j => j.id === clubeUsuario?.capitaoId);
    return capitao ?? jogadores.reduce((m, j) => (j.overall > m.overall ? j : m));
  }, [jogadores, clubeUsuario]);

  const abrir = (id: string) => nav.navigate('PlayerDetail', {jogadorId: id});

  return (
    <Screen
      scroll
      header={
        <AppBar
          title="Elenco"
          right={
            <View style={styles.headerAcoes}>
              <IconButton
                icone="busca"
                onPress={() => setBuscaAberta(v => !v)}
                accessibilityLabel="Buscar jogador"
                tom={buscaAberta ? 'brand' : 'textPrimary'}
              />
              <IconButton
                icone="filtro"
                onPress={() => setFiltroAberto(v => !v)}
                accessibilityLabel="Filtrar por posição"
                tom={filtroAberto || filtro !== 'Todos' ? 'brand' : 'textPrimary'}
              />
              <IconButton
                icone="lesao"
                onPress={() => nav.navigate('DepartamentoMedico')}
                accessibilityLabel="Departamento médico"
              />
            </View>
          }
        />
      }>
      <SegmentedTabs
        abas={ABAS.map(a => ({chave: a.chave, rotulo: a.rotulo}))}
        ativa={aba}
        onSelect={c => setAba(c as Aba)}
      />

      {buscaAberta ? (
        <TextInput
          value={busca}
          onChangeText={setBusca}
          autoFocus
          placeholder="Buscar por nome"
          placeholderTextColor={cores.textMuted}
          accessibilityLabel="Buscar por nome"
          style={[
            styles.busca,
            {
              backgroundColor: cores.surfaceSubtle,
              borderColor: cores.border,
              color: cores.textPrimary,
            },
          ]}
        />
      ) : null}

      {filtroAberto ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}>
          {FILTROS.map(opcao => (
            <Chip
              key={opcao}
              label={opcao}
              selected={filtro === opcao}
              onPress={() => setFiltro(opcao)}
            />
          ))}
        </ScrollView>
      ) : null}

      {destaque ? (
        <DestaqueJogador
          jogador={destaque}
          ehCapitao={destaque.id === clubeUsuario?.capitaoId}
          corDivisor={cores.border}
          onPress={() => abrir(destaque.id)}
        />
      ) : null}

      {jogadoresFiltrados.length === 0 ? (
        <Text variant="bodyM" color="textSecondary">
          Nenhum jogador neste filtro.
        </Text>
      ) : (
        <Card variante="outlined" padding={0}>
          {jogadoresFiltrados.map((jogador, i) => (
            <React.Fragment key={jogador.id}>
              {i > 0 ? <Divider /> : null}
              <LinhaJogador
                jogador={jogador}
                ehCapitao={jogador.id === clubeUsuario?.capitaoId}
                onPress={() => abrir(jogador.id)}
              />
            </React.Fragment>
          ))}
        </Card>
      )}
    </Screen>
  );
}

/** Card do jogador em destaque (avatar + nome + posição/idade + anel + selos). */
function DestaqueJogador({
  jogador,
  ehCapitao,
  corDivisor,
  onPress,
}: {
  jogador: Player;
  ehCapitao: boolean;
  corDivisor: string;
  onPress: () => void;
}): React.JSX.Element {
  const humor = humorJogador(jogador.moral, jogador.condicaoFisica);
  const tag = ehCapitao
    ? 'Capitão'
    : jogador.overall >= 80
    ? 'Craque'
    : 'Peça-chave';

  return (
    <Card variante="interactive" onPress={onPress} style={styles.destaque}>
      <View style={styles.destaqueTopo}>
        <PlayerAvatar id={jogador.id} tamanho={56} />
        <View style={styles.destaqueInfo}>
          <View style={styles.linhaNome}>
            <Text variant="titleM" numberOfLines={1}>
              {nomeCurto(jogador)}
            </Text>
            {ehCapitao ? <Badge label="C" tom="brand" solido /> : null}
          </View>
          <Text variant="labelM" color="textSecondary">
            {jogador.posicaoPrincipal} · {jogador.idade} anos
          </Text>
        </View>
        <OverallRing valor={jogador.overall} tamanho={52} rotulo="GER" />
      </View>

      <Divider />

      <View style={styles.selos}>
        <View style={styles.selo}>
          <Icon nome="ficha" size={16} color="textSecondary" />
          <Text variant="labelM" numberOfLines={1}>
            {tag}
          </Text>
          <Icon nome="estrela" size={16} color="accent" />
        </View>
        <View style={[styles.divisorVertical, {backgroundColor: corDivisor}]} />
        <View style={styles.selo}>
          <Icon nome={humor.icone} size={16} color={humor.cor} />
          <Text variant="labelM" numberOfLines={1} color={humor.cor}>
            {humor.rotulo}
          </Text>
        </View>
      </View>
    </Card>
  );
}

/** Linha da lista: avatar · posição · nome · idade · overall · condição · humor. */
function LinhaJogador({
  jogador,
  ehCapitao,
  onPress,
}: {
  jogador: Player;
  ehCapitao: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const {esporte} = useTheme();
  const cf = jogador.condicaoFisica;
  const corCf =
    cf >= 75 ? esporte.fitness.high : cf >= 50 ? esporte.fitness.medium : esporte.fitness.low;
  const indisponivel = jogador.lesionado || jogador.suspenso;
  const humor = humorJogador(jogador.moral, jogador.condicaoFisica);

  return (
    <Pressable
      onPress={onPress}
      style={styles.linha}
      accessibilityLabel={`${nomeCurto(jogador)}, ${jogador.posicaoPrincipal}, overall ${jogador.overall}`}>
      <PlayerAvatar id={jogador.id} tamanho={40} />
      <PositionBadge posicao={jogador.posicaoPrincipal} tamanho="sm" />
      <View style={styles.linhaNomeWrap}>
        <Text variant="labelL" numberOfLines={1}>
          {nomeCurto(jogador)}
        </Text>
        {ehCapitao ? (
          <Text variant="caption" color="brand" weight="800">
            C
          </Text>
        ) : null}
      </View>
      <Text variant="labelM" color="textSecondary" tabular style={styles.colIdade}>
        {jogador.idade}
      </Text>
      <Text variant="titleM" tabular style={styles.colOvr}>
        {jogador.overall}
      </Text>
      <View style={styles.colCf}>
        <ProgressBar valor={jogador.condicaoFisica} cor={corCf} altura={6} />
      </View>
      {indisponivel ? (
        <Icon
          nome={jogador.lesionado ? 'lesao' : 'cartao'}
          size={18}
          color="danger"
        />
      ) : (
        <Icon nome={humor.icone} size={18} color={humor.cor} />
      )}
    </Pressable>
  );
}

export default Squad;

const styles = StyleSheet.create({
  headerAcoes: {flexDirection: 'row', alignItems: 'center', gap: espacamento[1]},
  busca: {
    borderRadius: raios.md,
    borderWidth: 1,
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: espacamento[3],
    paddingVertical: espacamento[2],
  },
  chipsRow: {flexDirection: 'row', gap: espacamento[2], paddingRight: espacamento[4]},
  // Destaque
  destaque: {gap: espacamento[3]},
  destaqueTopo: {flexDirection: 'row', alignItems: 'center', gap: espacamento[3]},
  destaqueInfo: {flex: 1, gap: 3},
  linhaNome: {flexDirection: 'row', alignItems: 'center', gap: espacamento[2]},
  selos: {flexDirection: 'row', alignItems: 'center'},
  selo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[2],
  },
  divisorVertical: {width: 1, alignSelf: 'stretch', marginHorizontal: espacamento[3]},
  // Linha
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[3],
    minHeight: 56,
    paddingHorizontal: espacamento[3],
    paddingVertical: espacamento[1],
  },
  linhaNomeWrap: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: espacamento[2]},
  colIdade: {minWidth: 22, textAlign: 'right'},
  colOvr: {minWidth: 24, textAlign: 'right'},
  colCf: {width: 40},
});
