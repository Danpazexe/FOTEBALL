import React, {useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import MiniPlayerCard from '../../components/MiniPlayerCard';
import {
  AppHeader,
  Metric,
  MetricsRow,
  ScreenContainer,
  Section,
  TextoVazio,
} from '../../components/ui';
import {useAppNavigation} from '../../navigation/types';
import {useJogadoresUsuario} from '../../store/useGameStore';
import {cores, espaco, raio} from '../../theme';
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
    return {total, media, valor, indisponiveis};
  }, [jogadores]);

  return (
    <ScreenContainer scroll>
      <AppHeader titulo="Elenco" subtitulo={`${resumo.total} jogadores`} />

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
            const ativo = filtro === opcao;
            return (
              <Pressable
                accessibilityRole="button"
                key={opcao}
                onPress={() => setFiltro(opcao)}
                style={[styles.chip, ativo ? styles.chipAtivo : null]}>
                <Text
                  style={[
                    styles.chipTexto,
                    ativo ? styles.chipTextoAtivo : null,
                  ]}>
                  {opcao}
                </Text>
              </Pressable>
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
              onPress={() =>
                nav.navigate('PlayerDetail', {jogadorId: jogador.id})
              }
            />
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}

export default Squad;

const styles = StyleSheet.create({
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaco.sm,
  },
  chip: {
    borderColor: cores.bordaClara,
    borderRadius: raio.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: espaco.md,
  },
  chipAtivo: {
    backgroundColor: cores.primaria,
    borderColor: cores.primaria,
  },
  chipTexto: {
    color: cores.texto,
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextoAtivo: {
    color: cores.contrastePrimaria,
  },
  grade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaco.sm,
  },
  aviso: {
    color: cores.secundaria,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: espaco.md,
  },
});
