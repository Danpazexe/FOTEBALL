import React, {useMemo, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import Chip from '../../components/Chip';
import MiniPlayerCard from '../../components/MiniPlayerCard';
import Painel from '../../components/Painel';
import StatBar from '../../components/StatBar';
import {
  AppHeader,
  Metric,
  MetricsRow,
  ScreenContainer,
  Section,
  TextoVazio,
} from '../../components/ui';
import {calcularFolhaSalarial} from '../../engine/finance/financeEngine';
import {useAppNavigation} from '../../navigation/types';
import {
  selecionarClubeUsuario,
  useGameStore,
  useJogadoresUsuario,
} from '../../store/useGameStore';
import {cores, espaco} from '../../theme';
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
 * Aba Elenco — "Galeria de Ativos": grade de mini-cartas (tier + glow) com
 * filtro por posição. Tocar uma carta abre o detalhe do jogador (onde ficam as
 * ações de vender/emprestar).
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

  // Contagem por posição — alimenta o número no chip de filtro (ver carências
  // do elenco de relance, ex.: "ZAG 4").
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
    <ScreenContainer scroll>
      <AppHeader
        titulo="Elenco"
        subtitulo={`${resumo.total} jogadores · média ${resumo.media} · folha ${moedaCompacta(
          resumo.folha,
        )}`}
      />

      <MetricsRow>
        <Metric label="Jogadores" valor={`${resumo.total}`} />
        <Metric label="Média OVR" valor={`${resumo.media}`} />
        <Metric label="Valor" valor={moedaCompacta(resumo.valor)} />
      </MetricsRow>
      {resumo.indisponiveis > 0 ? (
        <Text style={styles.aviso}>
          {resumo.indisponiveis} jogador(es) indisponível(eis) (lesão/suspensão).
        </Text>
      ) : null}

      <Section>
        <View style={styles.chipsRow}>
          {FILTROS.map(opcao => {
            const n =
              opcao === 'Todos' ? jogadores.length : contagem[opcao] ?? 0;
            return (
              <Chip
                key={opcao}
                label={`${opcao} ${n}`}
                ativo={filtro === opcao}
                cor={cores.primaria}
                onPress={() => setFiltro(opcao)}
              />
            );
          })}
        </View>
      </Section>

      {jogadoresFiltrados.length === 0 ? (
        <TextoVazio>Nenhum jogador nesta posição.</TextoVazio>
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
        <Section titulo="Resumo do elenco">
          <Painel>
            <View style={styles.resumo}>
              <ResumoLinha label="Força ofensiva" valor={forca.ataque} />
              <ResumoLinha label="Meio-campo" valor={forca.meio} />
              <ResumoLinha label="Defesa" valor={forca.defesa} />
              <Text style={styles.risco}>
                {resumo.indisponiveis > 0
                  ? `Risco: ${resumo.indisponiveis} jogador(es) indisponível(eis)`
                  : 'Sem desfalques no momento'}
              </Text>
            </View>
          </Painel>
        </Section>
      ) : null}
    </ScreenContainer>
  );
}

function ResumoLinha({
  label,
  valor,
}: {
  label: string;
  valor: number;
}): React.JSX.Element {
  return (
    <View style={styles.resumoLinha}>
      <Text style={styles.resumoLabel}>{label}</Text>
      <View style={styles.resumoBar}>
        <StatBar
          valor={Math.round(valor)}
          cor={cores.primaria}
          mostrarValor={false}
        />
      </View>
    </View>
  );
}

export default Squad;

const styles = StyleSheet.create({
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaco.sm,
  },
  grade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaco.sm,
  },
  aviso: {
    color: cores.aviso,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: espaco.md,
  },
  resumo: {
    gap: espaco.md,
  },
  resumoLinha: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.md,
  },
  resumoLabel: {
    color: cores.texto,
    fontSize: 13,
    fontWeight: '700',
    width: 104,
  },
  resumoBar: {
    flex: 1,
  },
  risco: {
    color: cores.aviso,
    fontSize: 12,
    fontWeight: '700',
    marginTop: espaco.xs,
  },
});
