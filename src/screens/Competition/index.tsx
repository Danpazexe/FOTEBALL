/**
 * Tela de competições (aba "Competições"): exibe a tabela de classificação do
 * Brasileirão da divisão do clube do usuário, destacando-o, com legenda das
 * zonas de acesso/Libertadores e de rebaixamento (ajustadas por divisão).
 */

import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {ClassificationTable} from '../../components/ClassificationTable';
import {ScreenContainer, Section, TextoVazio} from '../../components/ui';
import {calcularArtilheiros} from '../../engine/season/artilheiros';
import {selecionarClubeUsuario, useGameStore} from '../../store/useGameStore';
import {cores, espaco, raio, tipografia} from '../../theme';
import {siglaClube} from '../../utils/formatters';

const DIVISAO_PADRAO = 'Série A';
/** Divisão mais baixa da pirâmide (não tem rebaixamento). */
const ULTIMA_DIVISAO = 'Série C';

function Competition(): React.JSX.Element {
  const tabela = useGameStore(state => state.tabela);
  const clubes = useGameStore(state => state.clubes);
  const jogadores = useGameStore(state => state.jogadores);
  const clubeUsuarioId = useGameStore(state => state.clubeUsuarioId);
  const clubeUsuario = useGameStore(selecionarClubeUsuario);
  const temporadaAtual = useGameStore(state => state.temporadaAtual);

  const artilheiros = React.useMemo(
    () => calcularArtilheiros(jogadores, 10),
    [jogadores],
  );

  const divisao = clubeUsuario?.divisao ?? DIVISAO_PADRAO;
  const ehSerieA = divisao === DIVISAO_PADRAO;
  const ehUltima = divisao === ULTIMA_DIVISAO;
  const zonaQueda = ehUltima ? null : Math.max(5, tabela.length - 3);
  const rotuloTopo = ehSerieA ? 'Libertadores (1º–4º)' : 'Acesso (1º–4º)';

  return (
    <ScreenContainer scroll>
      <Section titulo={`Brasileirão ${divisao} ${temporadaAtual}`}>
        <ClassificationTable
          tabela={tabela}
          clubes={clubes}
          clubeDestaqueId={clubeUsuarioId}
          zonaQueda={zonaQueda}
        />

        <View style={styles.legenda}>
          <View style={styles.legendaItem}>
            <View
              style={[styles.legendaMarca, {backgroundColor: cores.primaria}]}
            />
            <Text style={styles.legendaTexto}>{rotuloTopo}</Text>
          </View>
          {zonaQueda !== null ? (
            <View style={styles.legendaItem}>
              <View
                style={[styles.legendaMarca, {backgroundColor: cores.perigo}]}
              />
              <Text style={styles.legendaTexto}>
                Rebaixamento ({zonaQueda}º–{tabela.length}º)
              </Text>
            </View>
          ) : null}
        </View>
      </Section>

      <Section titulo="Artilheiros">
        {artilheiros.length === 0 ? (
          <TextoVazio>Nenhum gol marcado na temporada ainda.</TextoVazio>
        ) : (
          artilheiros.map((linha, indice) => {
            const ehUsuario = linha.clubeId === clubeUsuarioId;
            return (
              <View
                key={linha.jogadorId}
                style={[styles.artLinha, ehUsuario ? styles.artDestaque : null]}>
                <Text style={styles.artPos}>{indice + 1}º</Text>
                <View style={styles.artInfo}>
                  <Text style={styles.artNome} numberOfLines={1}>
                    {linha.nome}
                  </Text>
                  <Text style={styles.artClube}>
                    {linha.clubeId ? siglaClube(clubes, linha.clubeId) : '—'}
                    {linha.assistencias > 0
                      ? ` · ${linha.assistencias} assist.`
                      : ''}
                  </Text>
                </View>
                <Text style={styles.artGols}>{linha.gols}</Text>
              </View>
            );
          })
        )}
      </Section>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  legenda: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaco.lg,
  },
  legendaItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.sm,
  },
  legendaMarca: {
    borderRadius: 2,
    height: 12,
    width: 4,
  },
  legendaTexto: {
    color: cores.textoSecundario,
    fontSize: 12,
    fontWeight: '700',
  },
  artLinha: {
    alignItems: 'center',
    borderRadius: raio.sm,
    flexDirection: 'row',
    gap: espaco.md,
    paddingHorizontal: espaco.sm,
    paddingVertical: espaco.sm,
  },
  artDestaque: {
    backgroundColor: `${cores.primaria}1A`,
  },
  artPos: {
    color: cores.textoSecundario,
    fontSize: 13,
    fontWeight: '800',
    width: 28,
  },
  artInfo: {
    flex: 1,
  },
  artNome: {
    color: cores.texto,
    fontSize: 15,
    fontWeight: '700',
  },
  artClube: {
    color: cores.textoSecundario,
    fontSize: 12,
    fontWeight: '600',
  },
  artGols: {
    ...tipografia.numero,
    color: cores.primaria,
  },
});

export default Competition;
