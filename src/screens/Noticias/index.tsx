/**
 * Notícias (aba Início) — feed RICO estilo Sofascore, DERIVADO de dados reais do
 * jogo (resultados, tabela, elenco, mercado, próximo jogo). Nada é inventado: a
 * derivação vive em `../../news/gerarNoticias` (contrato em `../../news/tipos`) e
 * é PURA e determinística. Esta tela só MONTA a entrada a partir do store, exibe o
 * herói de destaque + abas + feed, e mapeia a ação de cada notícia para a
 * navegação real. "Lido/não lido" existe apenas na sessão. DS v2.
 */
import React, {useCallback, useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import {
  AppHeader,
  Card,
  Divider,
  EmptyState,
  Icon,
  Pressable,
  Screen,
  SegmentedTabs,
  TeamCrest,
  Text,
  espacamento,
  raios,
  useTheme,
  type CorTexto,
} from '../../design-system';
import PlayerAvatar from '../../components/PlayerAvatar';
import {gerarFeedNoticias} from '../../news/gerarNoticias';
import type {
  AcaoNoticia,
  EntradaFeedNoticias,
  FeedNoticias,
  Noticia,
  NoticiaCategoria,
} from '../../news/tipos';
import {
  selecionarClubeUsuario,
  selecionarProximoJogo,
  useGameStore,
} from '../../store/useGameStore';
import {useAppNavigation} from '../../navigation/types';
import {siglaClube} from '../../utils/formatters';

type Aba = 'todas' | NoticiaCategoria;

const ABAS: Array<{chave: Aba; rotulo: string}> = [
  {chave: 'todas', rotulo: 'Todas'},
  {chave: 'partida', rotulo: 'Partidas'},
  {chave: 'mercado', rotulo: 'Mercado'},
  {chave: 'clube', rotulo: 'Clube'},
];

/** Pílula de forma (V/E/D): cor de reforço + letra por token (cor nunca é o único sinal). */
const CORES_FORMA: Record<
  'V' | 'E' | 'D',
  {bg: CorTexto; texto: CorTexto}
> = {
  V: {bg: 'success', texto: 'onBrand'},
  E: {bg: 'border', texto: 'textPrimary'},
  D: {bg: 'danger', texto: 'onBrand'},
};

function Noticias(): React.JSX.Element {
  const nav = useAppNavigation();
  const {cores} = useTheme();
  const [aba, setAba] = useState<Aba>('todas');
  const [lidas, setLidas] = useState<ReadonlySet<string>>(() => new Set());

  const clubeId = useGameStore(state => state.clubeUsuarioId);
  const clube = useGameStore(selecionarClubeUsuario);
  const clubes = useGameStore(state => state.clubes);
  const jogadores = useGameStore(state => state.jogadores);
  const partidas = useGameStore(state => state.partidas);
  const tabela = useGameStore(state => state.tabela);
  const rodadaAtual = useGameStore(state => state.rodadaAtual);
  const proximoJogo = useGameStore(selecionarProximoJogo);

  const feed = useMemo<FeedNoticias>(() => {
    if (!clubeId || !clube) {
      return {destaque: null, noticias: []};
    }
    const entrada: EntradaFeedNoticias = {
      clubeId,
      clube,
      clubes,
      jogadores,
      partidas,
      tabela,
      rodadaAtual,
      proximoJogo,
      divisao: clube.divisao ?? 'Série A',
    };
    return gerarFeedNoticias(entrada);
  }, [
    clubeId,
    clube,
    clubes,
    jogadores,
    partidas,
    tabela,
    rodadaAtual,
    proximoJogo,
  ]);

  const filtradas = useMemo<Noticia[]>(
    () =>
      aba === 'todas'
        ? feed.noticias
        : feed.noticias.filter(n => n.categoria === aba),
    [feed.noticias, aba],
  );

  const navegar = useCallback(
    (acao: AcaoNoticia) => {
      switch (acao.tipo) {
        case 'partida':
          nav.navigate('MatchResult', {partidaId: acao.partidaId});
          break;
        case 'prejogo':
          nav.navigate('PreJogo');
          break;
        case 'medico':
          nav.navigate('MainTabs', {
            screen: 'Elenco',
            params: {screen: 'DepartamentoMedico'},
          });
          break;
        case 'classificacao':
          // Aba "Partidas" (Competition) → tela interna Classificação (Competition).
          nav.navigate('MainTabs', {
            screen: 'Competition',
            params: {screen: 'Competition'},
          });
          break;
        case 'elenco':
          nav.navigate('MainTabs', {
            screen: 'Elenco',
            params: {screen: 'Squad'},
          });
          break;
      }
    },
    [nav],
  );

  const abrirNoticia = useCallback(
    (n: Noticia) => {
      setLidas(prev => new Set(prev).add(n.id));
      if (n.acao) {
        navegar(n.acao);
      }
    },
    [navegar],
  );

  if (!clubeId || !clube) {
    return (
      <Screen
        header={
          <AppHeader
            title="Notícias"
            onBack={nav.canGoBack() ? () => nav.goBack() : undefined}
          />
        }>
        <View style={styles.vazio}>
          <EmptyState
            icone="conversa"
            title="Sem clube selecionado"
            description="Comece uma carreira para acompanhar as notícias do seu time."
          />
        </View>
      </Screen>
    );
  }

  const destaque = feed.destaque;
  const vazio = !destaque && filtradas.length === 0;

  return (
    <Screen
      scroll
      header={
        <AppHeader
          title="Notícias"
          onBack={nav.canGoBack() ? () => nav.goBack() : undefined}
        />
      }>
      {destaque ? (
        <Hero
          destaque={destaque}
          clubes={clubes}
          onPress={() => navegar(destaque.acao)}
        />
      ) : null}

      <SegmentedTabs
        abas={ABAS}
        ativa={aba}
        onSelect={c => setAba(c as Aba)}
      />

      {vazio ? (
        <View style={styles.vazio}>
          <EmptyState
            icone="conversa"
            title="Sem notícias por aqui"
            description="As novidades do clube, do mercado e das partidas aparecem aqui."
          />
        </View>
      ) : filtradas.length === 0 ? (
        <Text variant="caption" color="textSecondary" align="center" style={styles.semCategoria}>
          {aba === 'todas'
            ? 'Sem notícias por enquanto.'
            : 'Nada nesta categoria por enquanto.'}
        </Text>
      ) : (
        <Card variante="outlined" padding={0} style={styles.listaCard}>
          {filtradas.map((n, i) => (
            <React.Fragment key={n.id}>
              {i > 0 ? <Divider /> : null}
              <ItemNoticia
                n={n}
                clubes={clubes}
                lida={lidas.has(n.id)}
                onPress={() => abrirNoticia(n)}
                cores={cores}
              />
            </React.Fragment>
          ))}
        </Card>
      )}
    </Screen>
  );
}

// ─── Herói de destaque ───────────────────────────────────────────────────────

function Hero({
  destaque,
  clubes,
  onPress,
}: {
  destaque: NonNullable<FeedNoticias['destaque']>;
  clubes: EntradaFeedNoticias['clubes'];
  onPress: () => void;
}): React.JSX.Element {
  const cta =
    destaque.tipo === 'proximo_jogo' ? 'Ver pré-jogo ›' : 'Ver relatório ›';
  return (
    <Card
      variante="interactive"
      onPress={onPress}
      accessibilityLabel={`${destaque.titulo}. ${destaque.subtitulo}`}>
      <View style={styles.heroConfronto}>
        <TeamCrest
          clubeId={destaque.clubeCasaId}
          sigla={siglaClube(clubes, destaque.clubeCasaId)}
          size={40}
        />
        <Text variant="titleM" color="textMuted" style={styles.heroVs}>
          ×
        </Text>
        <TeamCrest
          clubeId={destaque.clubeForaId}
          sigla={siglaClube(clubes, destaque.clubeForaId)}
          size={40}
        />
      </View>

      <Text variant="titleM" align="center" numberOfLines={2}>
        {destaque.titulo}
      </Text>
      <Text
        variant="caption"
        color="textSecondary"
        align="center"
        numberOfLines={1}
        style={styles.heroSub}>
        {destaque.subtitulo}
      </Text>

      {destaque.formaUsuario.length > 0 ? (
        <View style={styles.heroForma}>
          {destaque.formaUsuario.map((r, i) => (
            <FormaPill key={`${i}-${r}`} resultado={r} />
          ))}
        </View>
      ) : null}

      <Text
        variant="labelM"
        color="brand"
        align="center"
        style={styles.heroCta}>
        {cta}
      </Text>
    </Card>
  );
}

function FormaPill({
  resultado,
}: {
  resultado: 'V' | 'E' | 'D';
}): React.JSX.Element {
  const {cores} = useTheme();
  const {bg, texto} = CORES_FORMA[resultado];
  return (
    <View style={[styles.formaPill, {backgroundColor: cores[bg]}]}>
      <Text variant="caption" weight="800" color={texto}>
        {resultado}
      </Text>
    </View>
  );
}

// ─── Item do feed ────────────────────────────────────────────────────────────

function ItemNoticia({
  n,
  clubes,
  lida,
  onPress,
  cores,
}: {
  n: Noticia;
  clubes: EntradaFeedNoticias['clubes'];
  lida: boolean;
  onPress: () => void;
  cores: ReturnType<typeof useTheme>['cores'];
}): React.JSX.Element {
  const seloTom: CorTexto = n.seloTom ?? 'textSecondary';
  const seloTabular = n.selo ? /[0-9]/.test(n.selo) : false;
  const rotulo = n.selo ? `${n.titulo}. ${n.selo}` : n.titulo;

  return (
    <Pressable
      style={styles.linha}
      onPress={onPress}
      accessibilityLabel={rotulo}>
      <View style={styles.visual}>
        {n.clubeId ? (
          <TeamCrest
            clubeId={n.clubeId}
            sigla={siglaClube(clubes, n.clubeId)}
            size={36}
          />
        ) : n.jogadorId ? (
          <PlayerAvatar id={n.jogadorId} tamanho={36} />
        ) : (
          <View style={[styles.disco, {backgroundColor: cores.surfaceSubtle}]}>
            <Icon nome={n.icone} size="sm" color={n.tom} />
          </View>
        )}
      </View>

      <View style={styles.flex}>
        <Text variant="labelL" numberOfLines={2}>
          {n.titulo}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {n.subtitulo}
        </Text>
      </View>

      <View style={styles.direita}>
        {n.selo ? (
          <View style={[styles.selo, {backgroundColor: cores.surfaceSubtle}]}>
            <Text variant="labelM" color={seloTom} tabular={seloTabular}>
              {n.selo}
            </Text>
          </View>
        ) : null}
        {!lida ? (
          <View style={[styles.pontoNovo, {backgroundColor: cores.brand}]} />
        ) : null}
      </View>
    </Pressable>
  );
}

export default Noticias;

const styles = StyleSheet.create({
  flex: {flex: 1},
  vazio: {flex: 1, justifyContent: 'center', paddingVertical: espacamento[8]},
  semCategoria: {paddingVertical: espacamento[6]},
  listaCard: {paddingHorizontal: espacamento[3]},

  // Herói
  heroConfronto: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacamento[3],
    marginBottom: espacamento[3],
  },
  heroVs: {marginHorizontal: espacamento[1]},
  heroSub: {marginTop: espacamento[1]},
  heroForma: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: espacamento[1],
    marginTop: espacamento[3],
  },
  heroCta: {marginTop: espacamento[3]},
  formaPill: {
    width: 20,
    height: 20,
    borderRadius: raios.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Item
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[3],
    minHeight: 44,
    paddingVertical: espacamento[3],
  },
  visual: {width: 36, height: 36},
  disco: {
    width: 36,
    height: 36,
    borderRadius: raios.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  direita: {flexDirection: 'row', alignItems: 'center', gap: espacamento[2]},
  selo: {
    minWidth: 28,
    paddingHorizontal: espacamento[2],
    paddingVertical: 2,
    borderRadius: raios.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pontoNovo: {width: 9, height: 9, borderRadius: raios.full},
});
