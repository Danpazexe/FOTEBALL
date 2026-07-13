/**
 * Notícias (aba Início). Feed DERIVADO de eventos reais do jogo — resultados das
 * partidas, transferências do histórico financeiro e lesões do elenco — sem
 * inventar dado e sem estado persistente novo (derivação pura). Abas por
 * categoria e "lido/não lido" apenas na sessão. DS v2.
 */
import React, {useMemo, useState} from 'react';
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
  Text,
  espacamento,
  raios,
  useTheme,
  type CorTexto,
} from '../../design-system';
import type {IconeNome} from '../../components/Icone';
import {selecionarClubeUsuario, useGameStore} from '../../store/useGameStore';
import {useInicioNavigation} from '../../navigation/types';
import {siglaClube} from '../../utils/formatters';

type Categoria = 'clube' | 'mercado' | 'partida';
type Aba = 'todas' | Categoria;

type Noticia = {
  id: string;
  categoria: Categoria;
  titulo: string;
  subtitulo: string;
  icone: IconeNome;
  tom: CorTexto;
};

const ABAS: Array<{chave: Aba; rotulo: string}> = [
  {chave: 'todas', rotulo: 'Todas'},
  {chave: 'partida', rotulo: 'Partidas'},
  {chave: 'mercado', rotulo: 'Mercado'},
  {chave: 'clube', rotulo: 'Clube'},
];

function Noticias(): React.JSX.Element {
  const nav = useInicioNavigation();
  const [aba, setAba] = useState<Aba>('todas');
  const [lidas, setLidas] = useState<ReadonlySet<string>>(() => new Set());

  const partidas = useGameStore(state => state.partidas);
  const clubes = useGameStore(state => state.clubes);
  const jogadores = useGameStore(state => state.jogadores);
  const clubeUsuarioId = useGameStore(state => state.clubeUsuarioId);
  const clube = useGameStore(selecionarClubeUsuario);

  const noticias = useMemo<Noticia[]>(() => {
    if (!clubeUsuarioId || !clube) {
      return [];
    }
    const lista: Noticia[] = [];

    // Partidas — últimos resultados do clube.
    partidas
      .filter(
        p =>
          p.jogada &&
          (p.timeCasa === clubeUsuarioId || p.timeFora === clubeUsuarioId) &&
          p.placarCasa !== undefined &&
          p.placarFora !== undefined,
      )
      .sort((a, b) => b.rodada - a.rodada)
      .slice(0, 6)
      .forEach(p => {
        const ehCasa = p.timeCasa === clubeUsuarioId;
        const pro = (ehCasa ? p.placarCasa : p.placarFora) ?? 0;
        const con = (ehCasa ? p.placarFora : p.placarCasa) ?? 0;
        const advId = ehCasa ? p.timeFora : p.timeCasa;
        const adv = siglaClube(clubes, advId);
        const venceu = pro > con;
        const empatou = pro === con;
        lista.push({
          id: `p_${p.id}`,
          categoria: 'partida',
          titulo: venceu
            ? `Vitória sobre o ${adv} por ${pro} a ${con}`
            : empatou
            ? `Empate com o ${adv} em ${pro} a ${con}`
            : `Derrota para o ${adv} por ${con} a ${pro}`,
          subtitulo: `Rodada ${p.rodada} · ${ehCasa ? 'em casa' : 'fora'}`,
          icone: 'bola',
          tom: venceu ? 'success' : empatou ? 'textSecondary' : 'danger',
        });
      });

    // Mercado — transferências do histórico financeiro.
    clube.financas.historicoTransacoes
      .filter(
        t =>
          t.categoria === 'contratacoes' || t.categoria === 'vendaJogadores',
      )
      .slice(0, 5)
      .forEach((t, i) => {
        const compra = t.categoria === 'contratacoes';
        lista.push({
          id: `m_${i}_${t.data}`,
          categoria: 'mercado',
          titulo: compra ? 'Reforço confirmado' : 'Negócio fechado',
          subtitulo: t.descricao,
          icone: 'mercado',
          tom: 'brand',
        });
      });

    // Clube — lesões no elenco.
    jogadores
      .filter(j => j.clubeId === clubeUsuarioId && j.lesionado)
      .slice(0, 5)
      .forEach(j => {
        lista.push({
          id: `l_${j.id}`,
          categoria: 'clube',
          titulo: `${j.apelido ?? j.nome} no departamento médico`,
          subtitulo: `Lesionado · ${j.diasLesao} dia(s) de recuperação`,
          icone: 'lesao',
          tom: 'danger',
        });
      });

    return lista;
  }, [partidas, clubes, jogadores, clubeUsuarioId, clube]);

  const filtradas =
    aba === 'todas' ? noticias : noticias.filter(n => n.categoria === aba);

  const marcarLida = (id: string) =>
    setLidas(prev => new Set(prev).add(id));

  return (
    <Screen
      scroll
      header={
        <AppHeader
          title="Notícias"
          onBack={() => (nav.canGoBack() ? nav.goBack() : undefined)}
        />
      }>
      <SegmentedTabs abas={ABAS} ativa={aba} onSelect={c => setAba(c as Aba)} />

      {filtradas.length === 0 ? (
        <View style={styles.vazio}>
          <EmptyState
            icone="conversa"
            title="Sem notícias por aqui"
            description="As novidades do clube, do mercado e das partidas aparecem aqui."
          />
        </View>
      ) : (
        <Card variante="outlined" padding={0} style={styles.listaCard}>
          {filtradas.map((n, i) => {
            const lida = lidas.has(n.id);
            return (
              <React.Fragment key={n.id}>
                {i > 0 ? <Divider /> : null}
                <Pressavel n={n} lida={lida} onPress={() => marcarLida(n.id)} />
              </React.Fragment>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}

function Pressavel({
  n,
  lida,
  onPress,
}: {
  n: Noticia;
  lida: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const {cores} = useTheme();
  return (
    <Pressable style={styles.linha} onPress={onPress} accessibilityLabel={n.titulo}>
      <View style={[styles.icone, {backgroundColor: cores.surfaceSubtle}]}>
        <Icon nome={n.icone} size="sm" color={n.tom} />
      </View>
      <View style={styles.flex}>
        <Text variant="labelL" numberOfLines={2}>
          {n.titulo}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {n.subtitulo}
        </Text>
      </View>
      {!lida ? (
        <View style={[styles.pontoNovo, {backgroundColor: cores.brand}]} />
      ) : null}
    </Pressable>
  );
}

export default Noticias;

const styles = StyleSheet.create({
  flex: {flex: 1},
  vazio: {flex: 1, justifyContent: 'center', paddingVertical: espacamento[8]},
  listaCard: {paddingHorizontal: espacamento[3]},
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[3],
    paddingVertical: espacamento[3],
  },
  icone: {
    width: 40,
    height: 40,
    borderRadius: raios.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pontoNovo: {width: 9, height: 9, borderRadius: raios.full},
});
