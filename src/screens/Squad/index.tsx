import React, {useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import MiniPlayerCard from '../../components/MiniPlayerCard';
import {
  AppBar,
  Card,
  Chip,
  Screen,
  StatValue,
  Text,
  espacamento,
  raios,
  useTheme,
} from '../../design-system';
import {calcularFolhaSalarial} from '../../engine/finance/financeEngine';
import {useAppNavigation} from '../../navigation/types';
import {
  selecionarClubeUsuario,
  useGameStore,
  useJogadoresUsuario,
} from '../../store/useGameStore';
import {forcaDoClube} from '../../utils/forca';
import {moedaCompacta} from '../../utils/formatters';
import type {Position} from '../../types';

type FiltroPosicao = 'Todos' | Position;

const FILTROS: FiltroPosicao[] = [
  'Todos',
  'GOL',
  'ZAG',
  'LD',
  'LE',
  'VOL',
  'MC',
  'MEI',
  'PD',
  'PE',
  'SA',
  'CA',
];

/**
 * Aba Elenco — grade de mini-cartas (tier) com filtro por posição. Tocar uma
 * carta abre o detalhe do jogador. Migrada ao Design System v2.
 */
function Squad() {
  const nav = useAppNavigation();
  const jogadores = useJogadoresUsuario();
  const clubeUsuario = useGameStore(selecionarClubeUsuario);
  const todosJogadores = useGameStore(state => state.jogadores);
  const [filtro, setFiltro] = useState<FiltroPosicao>('Todos');

  const jogadoresFiltrados = useMemo(() => {
    if (filtro === 'Todos') {
      return jogadores;
    }
    return jogadores.filter(jogador => jogador.posicaoPrincipal === filtro);
  }, [jogadores, filtro]);

  const resumo = useMemo(() => {
    const total = jogadores.length;
    const media =
      total === 0
        ? 0
        : Math.round(jogadores.reduce((s, j) => s + j.overall, 0) / total);
    const valor = jogadores.reduce((s, j) => s + j.valorMercado, 0);
    const indisponiveis = jogadores.filter(
      j => j.lesionado || j.suspenso,
    ).length;
    const folha = calcularFolhaSalarial(jogadores);
    return {total, media, valor, indisponiveis, folha};
  }, [jogadores]);

  // Contagem por posição — alimenta o número no chip de filtro.
  const contagem = useMemo(() => {
    const mapa: Partial<Record<Position, number>> = {};
    for (const jogador of jogadores) {
      mapa[jogador.posicaoPrincipal] =
        (mapa[jogador.posicaoPrincipal] ?? 0) + 1;
    }
    return mapa;
  }, [jogadores]);

  const forca = useMemo(
    () => (clubeUsuario ? forcaDoClube(clubeUsuario, todosJogadores) : null),
    [clubeUsuario, todosJogadores],
  );

  return (
    <Screen scroll>
      <AppBar
        title="Elenco"
        subtitle={`${resumo.total} jogadores · média ${resumo.media} · folha ${moedaCompacta(
          resumo.folha,
        )}`}
      />

      <View style={styles.metricsRow}>
        <StatValue label="Jogadores" value={`${resumo.total}`} style={styles.metric} />
        <StatValue label="Média OVR" value={`${resumo.media}`} style={styles.metric} />
        <StatValue label="Valor" value={moedaCompacta(resumo.valor)} style={styles.metric} />
      </View>
      {resumo.indisponiveis > 0 ? (
        <Text variant="labelM" color="warning">
          {resumo.indisponiveis} jogador(es) indisponível(eis) (lesão/suspensão).
        </Text>
      ) : null}

      <View style={styles.chipsRow}>
        {FILTROS.map(opcao => {
          const n = opcao === 'Todos' ? jogadores.length : contagem[opcao] ?? 0;
          return (
            <Chip
              key={opcao}
              label={`${opcao} ${n}`}
              selected={filtro === opcao}
              onPress={() => setFiltro(opcao)}
            />
          );
        })}
      </View>

      {jogadoresFiltrados.length === 0 ? (
        <Text variant="bodyM" color="textSecondary">
          Nenhum jogador nesta posição.
        </Text>
      ) : (
        <View style={styles.grade}>
          {jogadoresFiltrados.map(jogador => (
            <MiniPlayerCard
              key={jogador.id}
              jogador={jogador}
              ehCapitao={clubeUsuario?.capitaoId === jogador.id}
              onPress={() =>
                nav.navigate('PlayerDetail', {jogadorId: jogador.id})
              }
            />
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
          <Text variant="caption" color="warning">
            {resumo.indisponiveis > 0
              ? `Risco: ${resumo.indisponiveis} jogador(es) indisponível(eis)`
              : 'Sem desfalques no momento'}
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}

function ResumoLinha({
  label,
  valor,
}: {
  label: string;
  valor: number;
}): React.JSX.Element {
  const {cores} = useTheme();
  const pct = Math.max(0, Math.min(100, (Math.round(valor) / 99) * 100));
  return (
    <View style={styles.resumoLinha}>
      <Text variant="labelM" style={styles.resumoLabel}>
        {label}
      </Text>
      <View style={[styles.resumoTrack, {backgroundColor: cores.surfaceSubtle}]}>
        <View
          style={[
            styles.resumoFill,
            {width: `${pct}%`, backgroundColor: cores.brand},
          ]}
        />
      </View>
    </View>
  );
}

export default Squad;

const styles = StyleSheet.create({
  metricsRow: {flexDirection: 'row', gap: espacamento[3]},
  metric: {flex: 1},
  chipsRow: {flexDirection: 'row', flexWrap: 'wrap', gap: espacamento[2]},
  grade: {flexDirection: 'row', flexWrap: 'wrap', gap: espacamento[2]},
  resumo: {gap: espacamento[3]},
  caps: {textTransform: 'uppercase', letterSpacing: 1},
  resumoLinha: {flexDirection: 'row', alignItems: 'center', gap: espacamento[3]},
  resumoLabel: {width: 104},
  resumoTrack: {
    flex: 1,
    height: 9,
    borderRadius: raios.full,
    overflow: 'hidden',
  },
  resumoFill: {height: '100%', borderRadius: raios.full},
});
