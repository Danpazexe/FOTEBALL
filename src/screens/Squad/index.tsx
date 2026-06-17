import React, {useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import PlayerCard from '../../components/PlayerCard';
import {
  AppHeader,
  Metric,
  MetricsRow,
  ScreenContainer,
  Section,
  TextoVazio,
} from '../../components/ui';
import {useConfirm, useToast} from '../../components/feedback';
import {useAppNavigation} from '../../navigation/types';
import {
  precoVenda,
  useGameStore,
  useJogadoresUsuario,
} from '../../store/useGameStore';
import {cores, espaco, raio} from '../../theme';
import {moeda, moedaCompacta} from '../../utils/formatters';
import type {Player, Position} from '../../types';

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
 * Aba Elenco: lista os jogadores do clube do usuário com filtro por posição
 * principal e ação de vender. Cada jogador abre o detalhe ao ser tocado.
 */
function Squad() {
  const nav = useAppNavigation();
  const jogadores = useJogadoresUsuario();
  const venderJogador = useGameStore(state => state.venderJogador);
  const confirmarAcoes = useGameStore(state => state.config.confirmarAcoes);
  const confirm = useConfirm();
  const toast = useToast();
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

  const handleVender = async (jogador: Player) => {
    const ok = !confirmarAcoes
      ? true
      : await confirm({
          titulo: `Vender ${jogador.nome}?`,
          mensagem: `${jogador.posicaoPrincipal} · ${jogador.idade} anos · Overall ${jogador.overall}`,
          detalhes: [{rotulo: 'Clube recebe', valor: moeda(precoVenda(jogador))}],
          confirmarLabel: 'Vender',
          perigo: true,
        });
    if (!ok) {
      return;
    }
    const resultado = venderJogador(jogador.id);
    toast(resultado.mensagem, resultado.ok ? 'sucesso' : 'erro');
  };

  return (
    <ScreenContainer scroll>
      <AppHeader titulo="Elenco" />

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

      <Section>
        {jogadoresFiltrados.length === 0 ? (
          <TextoVazio>Nenhum jogador nesta posição.</TextoVazio>
        ) : (
          <View style={styles.lista}>
            {jogadoresFiltrados.map(jogador => (
              <PlayerCard
                key={jogador.id}
                jogador={jogador}
                onPress={() =>
                  nav.navigate('PlayerDetail', {jogadorId: jogador.id})
                }
                acaoLabel="Vender"
                onAcao={() => handleVender(jogador)}
                legendaExtra={`Condição ${jogador.condicaoFisica}% · Pot. ${jogador.potencial}`}
              />
            ))}
          </View>
        )}
      </Section>
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
    borderColor: cores.borda,
    borderRadius: raio.sm,
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
  lista: {
    gap: espaco.sm,
  },
  aviso: {
    color: cores.secundaria,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: espaco.md,
  },
});
