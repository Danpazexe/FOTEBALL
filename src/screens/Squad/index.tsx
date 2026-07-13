/**
 * Aba Elenco (North Star). Jogador em destaque no topo, abas Todos/Titulares/
 * Reservas e lista escaneável: posição, avatar, nome/idade, overall, condição
 * física e moral — com destaque para lesão/suspensão. Filtro por posição e o
 * resumo de força do elenco seguem preservados. Tocar abre o detalhe.
 */
import React, {useMemo, useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';

import {
  AppBar,
  Avatar,
  Badge,
  Card,
  Chip,
  Divider,
  Icon,
  ProgressBar,
  Pressable,
  Screen,
  Tabs,
  Text,
  espacamento,
  raios,
  useTheme,
  type CorTexto,
} from '../../design-system';
import type {IconeNome} from '../../components/Icone';
import {calcularFolhaSalarial} from '../../engine/finance/financeEngine';
import {useAppNavigation} from '../../navigation/types';
import {
  selecionarClubeUsuario,
  useGameStore,
  useJogadoresUsuario,
} from '../../store/useGameStore';
import {forcaDoClube} from '../../utils/forca';
import {moedaCompacta} from '../../utils/formatters';
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

/** Ícone + cor de humor pela moral (10–100). */
function humorJogador(moral: number): {icone: IconeNome; cor: CorTexto} {
  if (moral >= 70) {
    return {icone: 'humor-bom', cor: 'success'};
  }
  if (moral >= 40) {
    return {icone: 'humor-neutro', cor: 'warning'};
  }
  return {icone: 'humor-ruim', cor: 'danger'};
}

function nomeCurto(jogador: Player): string {
  return jogador.apelido ?? jogador.nome;
}

function Squad(): React.JSX.Element {
  const nav = useAppNavigation();
  const jogadores = useJogadoresUsuario();
  const clubeUsuario = useGameStore(selecionarClubeUsuario);
  const todosJogadores = useGameStore(state => state.jogadores);
  const [aba, setAba] = useState<Aba>('todos');
  const [filtro, setFiltro] = useState<FiltroPosicao>('Todos');

  const titularesIds = useMemo(
    () =>
      new Set(
        clubeUsuario?.formacaoAtual?.titulares.map(t => t.jogadorId) ?? [],
      ),
    [clubeUsuario],
  );

  const jogadoresFiltrados = useMemo(() => {
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
      .filter(j => filtro === 'Todos' || j.posicaoPrincipal === filtro);
  }, [jogadores, aba, filtro, titularesIds]);

  const resumo = useMemo(() => {
    const total = jogadores.length;
    const media =
      total === 0
        ? 0
        : Math.round(jogadores.reduce((s, j) => s + j.overall, 0) / total);
    const indisponiveis = jogadores.filter(
      j => j.lesionado || j.suspenso,
    ).length;
    const folha = calcularFolhaSalarial(jogadores);
    return {total, media, indisponiveis, folha};
  }, [jogadores]);

  // Jogador em destaque: o capitão, ou o de maior overall.
  const destaque = useMemo(() => {
    if (jogadores.length === 0) {
      return null;
    }
    const capitao = jogadores.find(j => j.id === clubeUsuario?.capitaoId);
    return (
      capitao ??
      jogadores.reduce((m, j) => (j.overall > m.overall ? j : m))
    );
  }, [jogadores, clubeUsuario]);

  const forca = useMemo(
    () => (clubeUsuario ? forcaDoClube(clubeUsuario, todosJogadores) : null),
    [clubeUsuario, todosJogadores],
  );

  const abrir = (id: string) => nav.navigate('PlayerDetail', {jogadorId: id});

  return (
    <Screen scroll header={<AppBarElenco resumo={resumo} />}>
      {destaque ? (
        <DestaqueJogador
          jogador={destaque}
          ehCapitao={destaque.id === clubeUsuario?.capitaoId}
          onPress={() => abrir(destaque.id)}
        />
      ) : null}

      <Tabs
        abas={ABAS.map(a => ({chave: a.chave, rotulo: a.rotulo}))}
        ativa={aba}
        onSelect={c => setAba(c as Aba)}
      />

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

      {jogadoresFiltrados.length === 0 ? (
        <Text variant="bodyM" color="textSecondary">
          Nenhum jogador neste filtro.
        </Text>
      ) : (
        <View style={styles.lista}>
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
        </View>
      )}

      {forca ? (
        <Card variante="outlined" padding={4} style={styles.resumo}>
          <Text variant="labelM" color="textSecondary" style={styles.caps}>
            Resumo do elenco
          </Text>
          <ResumoLinha label="Força ofensiva" valor={forca.ataque} />
          <ResumoLinha label="Meio-campo" valor={forca.meio} />
          <ResumoLinha label="Defesa" valor={forca.defesa} />
          <Text
            variant="caption"
            color={resumo.indisponiveis > 0 ? 'warning' : 'textSecondary'}>
            {resumo.indisponiveis > 0
              ? `Risco: ${resumo.indisponiveis} jogador(es) indisponível(eis)`
              : 'Sem desfalques no momento'}
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}

/** Cabeçalho fixo do Elenco. */
function AppBarElenco({
  resumo,
}: {
  resumo: {total: number; media: number; folha: number};
}): React.JSX.Element {
  return (
    <AppBar
      title="Elenco"
      subtitle={`${resumo.total} jogadores · média ${resumo.media} · folha ${moedaCompacta(
        resumo.folha,
      )}`}
    />
  );
}

/** Card do jogador em destaque (avatar + nome + posição/idade + overall + tags). */
function DestaqueJogador({
  jogador,
  ehCapitao,
  onPress,
}: {
  jogador: Player;
  ehCapitao: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const humor = humorJogador(jogador.moral);
  const tag = ehCapitao
    ? 'Capitão'
    : jogador.overall >= 80
    ? 'Craque'
    : 'Peça-chave';
  const moralLabel =
    jogador.moral >= 70
      ? 'Moral alta'
      : jogador.moral >= 40
      ? 'Moral ok'
      : 'Moral baixa';
  const moralTom = humor.cor === 'success' ? 'success' : humor.cor === 'warning' ? 'accent' : 'danger';

  return (
    <Card variante="elevated" onPress={onPress} style={styles.destaque}>
      <Avatar nome={nomeCurto(jogador)} tamanho={56} tom="brand" />
      <View style={styles.destaqueInfo}>
        <View style={styles.linhaNome}>
          <Text variant="titleM" numberOfLines={1}>
            {nomeCurto(jogador)}
          </Text>
          {ehCapitao ? <Badge label="C" tom="accent" /> : null}
        </View>
        <Text variant="labelM" color="textSecondary">
          {jogador.posicaoPrincipal} · {jogador.idade} anos
        </Text>
        <View style={styles.destaqueChips}>
          <Badge label={tag} tom="brand" />
          <Badge label={moralLabel} tom={moralTom} />
        </View>
      </View>
      <View style={styles.destaqueOvr}>
        <Text variant="scoreXL" tabular>
          {jogador.overall}
        </Text>
        <Text variant="caption" color="textSecondary">
          OVR
        </Text>
      </View>
    </Card>
  );
}

/** Linha da lista: posição · avatar · nome/idade · overall · condição · moral. */
function LinhaJogador({
  jogador,
  ehCapitao,
  onPress,
}: {
  jogador: Player;
  ehCapitao: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const {cores, esporte} = useTheme();
  const cf = jogador.condicaoFisica;
  const corCf =
    cf >= 75 ? esporte.fitness.high : cf >= 50 ? esporte.fitness.medium : esporte.fitness.low;
  const indisponivel = jogador.lesionado || jogador.suspenso;
  const humor = humorJogador(jogador.moral);

  return (
    <Pressable
      onPress={onPress}
      style={styles.linha}
      accessibilityLabel={`${nomeCurto(jogador)}, ${jogador.posicaoPrincipal}, overall ${jogador.overall}`}>
      <View style={[styles.posBadge, {backgroundColor: cores.surfaceSubtle}]}>
        <Text variant="caption" color="textSecondary" weight="800">
          {jogador.posicaoPrincipal}
        </Text>
      </View>
      <Avatar nome={nomeCurto(jogador)} tamanho={36} />
      <View style={styles.linhaInfo}>
        <View style={styles.linhaNome}>
          <Text variant="labelL" numberOfLines={1}>
            {nomeCurto(jogador)}
          </Text>
          {ehCapitao ? (
            <Text variant="caption" color="accent" weight="800">
              C
            </Text>
          ) : null}
        </View>
        <Text variant="caption" color="textSecondary">
          {jogador.idade} anos
        </Text>
      </View>
      <Text variant="titleM" tabular style={styles.linhaOvr}>
        {jogador.overall}
      </Text>
      <View style={styles.linhaCf}>
        <ProgressBar valor={jogador.condicaoFisica} cor={corCf} altura={5} />
      </View>
      {indisponivel ? (
        <Icon
          nome={jogador.lesionado ? 'lesao' : 'cartao'}
          size={16}
          color="danger"
        />
      ) : (
        <Icon nome={humor.icone} size={16} color={humor.cor} />
      )}
    </Pressable>
  );
}

function ResumoLinha({
  label,
  valor,
}: {
  label: string;
  valor: number;
}): React.JSX.Element {
  const pct = Math.max(0, Math.min(100, (Math.round(valor) / 99) * 100));
  return (
    <View style={styles.resumoLinha}>
      <Text variant="labelM" style={styles.resumoLabel}>
        {label}
      </Text>
      <ProgressBar valor={pct} altura={9} style={styles.resumoBar} />
    </View>
  );
}

export default Squad;

const styles = StyleSheet.create({
  chipsRow: {flexDirection: 'row', gap: espacamento[2], paddingRight: espacamento[4]},
  lista: {gap: 0},
  // Destaque
  destaque: {flexDirection: 'row', alignItems: 'center', gap: espacamento[3]},
  destaqueInfo: {flex: 1, gap: 3},
  destaqueChips: {flexDirection: 'row', flexWrap: 'wrap', gap: espacamento[1], marginTop: 2},
  destaqueOvr: {alignItems: 'center'},
  linhaNome: {flexDirection: 'row', alignItems: 'center', gap: espacamento[1]},
  // Linha
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[2],
    minHeight: 56,
    paddingVertical: espacamento[1],
  },
  posBadge: {
    width: 34,
    height: 22,
    borderRadius: raios.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linhaInfo: {flex: 1, gap: 1},
  linhaOvr: {minWidth: 26, textAlign: 'right'},
  linhaCf: {width: 44},
  // Resumo
  resumo: {gap: espacamento[3]},
  caps: {textTransform: 'uppercase', letterSpacing: 1},
  resumoLinha: {flexDirection: 'row', alignItems: 'center', gap: espacamento[3]},
  resumoLabel: {width: 104},
  resumoBar: {flex: 1},
});
