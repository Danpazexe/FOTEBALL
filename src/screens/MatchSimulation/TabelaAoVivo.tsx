/**
 * Blocos AO VIVO da aba "Rodada": placares parciais dos outros jogos e a
 * classificação projetada com os resultados em andamento.
 * Presentacional puro — extraído da tela MatchSimulation.
 */
import React from 'react';
import {StyleSheet, View} from 'react-native';

import {
  TeamCrest,
  Text,
  espacamento,
  useTheme,
  type CorTexto,
} from '../../design-system';
import type {TabelaClassificacao} from '../../types';
import {rotuloMinuto} from '../../utils/minutoPartida';
import type {PlacarAoVivo} from './jogosAoVivo';

/** Linha de placar ao vivo de outro jogo da rodada. */
export function LinhaRodada({
  item,
  minuto,
  duracaoTotal,
}: {
  item: PlacarAoVivo;
  minuto: number;
  duracaoTotal: number;
}): React.JSX.Element {
  const fim = minuto >= duracaoTotal;
  const casaGanhando = item.golsCasa > item.golsFora;
  const foraGanhando = item.golsFora > item.golsCasa;
  return (
    <View style={styles.rodada}>
      <TeamCrest clubeId={item.idCasa} sigla={item.siglaCasa} size={20} />
      <Text
        variant="labelM"
        weight={casaGanhando ? '800' : '600'}
        numberOfLines={1}
        style={styles.rodadaNomeEsq}>
        {item.nomeCasa}
      </Text>
      <Text variant="labelL" tabular style={styles.rodadaPlacar}>
        {item.golsCasa} - {item.golsFora}
      </Text>
      <Text
        variant="labelM"
        weight={foraGanhando ? '800' : '600'}
        numberOfLines={1}
        style={styles.rodadaNomeDir}>
        {item.nomeFora}
      </Text>
      <TeamCrest clubeId={item.idFora} sigla={item.siglaFora} size={20} />
      <Text
        variant="caption"
        color={fim ? 'textMuted' : 'danger'}
        tabular
        style={styles.rodadaMin}>
        {fim ? 'FIM' : `${rotuloMinuto(minuto)}'`}
      </Text>
    </View>
  );
}

/** Cabeçalho da classificação ao vivo — deixa claro que "Rod" é o que o clube
 * embolsa NESTA rodada (+3/+1/+0), separado do total de pontos "P". */
export function CabecalhoTabelaAoVivo(): React.JSX.Element {
  return (
    <View style={styles.tabela}>
      <View style={styles.tabelaZonaWrap} />
      <Text variant="caption" color="textMuted" tabular style={styles.tabelaPos}>
        #
      </Text>
      <View style={styles.tabelaCrestSpacer} />
      <Text variant="caption" color="textMuted" style={styles.flex}>
        Clube
      </Text>
      <Text variant="caption" color="textMuted" style={styles.tabelaCol}>
        J
      </Text>
      <Text variant="caption" color="textMuted" style={styles.tabelaCol}>
        SG
      </Text>
      <Text variant="caption" color="textMuted" style={styles.tabelaDelta}>
        Rod
      </Text>
      <Text variant="caption" color="textMuted" style={styles.tabelaPts}>
        P
      </Text>
    </View>
  );
}

/** Linha da classificação ao vivo: zona · escudo · nome · J · SG · Rod · PTS. */
export function LinhaTabela({
  item,
  index,
  total,
  nome,
  sigla,
  ehUsuario,
  pontosRodada,
}: {
  item: TabelaClassificacao;
  index: number;
  total: number;
  nome: string;
  sigla: string;
  ehUsuario: boolean;
  /** Pontos que o clube embolsa nesta rodada (+3/+1/+0); undefined = não joga. */
  pontosRodada?: number;
}): React.JSX.Element {
  const {cores} = useTheme();
  const corPos: CorTexto =
    index < 4 ? 'success' : index >= total - 4 ? 'danger' : 'textSecondary';
  const corDelta: CorTexto =
    pontosRodada === 3
      ? 'success'
      : pontosRodada === 1
      ? 'textSecondary'
      : 'textMuted';
  return (
    <View
      style={[
        styles.tabela,
        ehUsuario ? {backgroundColor: cores.brandSoft} : null,
      ]}>
      <View style={styles.tabelaZonaWrap}>
        {index < 4 ? (
          <View style={[styles.tabelaZona, {backgroundColor: cores.success}]} />
        ) : index >= total - 4 ? (
          <View style={[styles.tabelaZona, {backgroundColor: cores.danger}]} />
        ) : null}
      </View>
      <Text variant="labelM" color={corPos} tabular style={styles.tabelaPos}>
        {index + 1}
      </Text>
      <TeamCrest clubeId={item.clubeId} sigla={sigla} size={20} />
      <Text variant="labelM" numberOfLines={1} style={styles.flex}>
        {nome}
      </Text>
      <Text
        variant="caption"
        color="textSecondary"
        tabular
        style={styles.tabelaCol}>
        {item.jogos}
      </Text>
      <Text
        variant="caption"
        color="textSecondary"
        tabular
        style={styles.tabelaCol}>
        {item.saldoGols > 0 ? `+${item.saldoGols}` : item.saldoGols}
      </Text>
      <Text
        variant="caption"
        weight="800"
        color={corDelta}
        tabular
        style={styles.tabelaDelta}>
        {pontosRodada === undefined ? '' : `+${pontosRodada}`}
      </Text>
      <Text variant="labelL" tabular style={styles.tabelaPts}>
        {item.pontos}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  rodada: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[2],
    paddingVertical: espacamento[2],
    paddingHorizontal: espacamento[3],
    minHeight: 44,
  },
  rodadaNomeEsq: {flex: 1, textAlign: 'right'},
  rodadaNomeDir: {flex: 1, textAlign: 'left'},
  rodadaPlacar: {minWidth: 40, textAlign: 'center'},
  rodadaMin: {minWidth: 28, textAlign: 'right'},
  tabela: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[2],
    paddingVertical: espacamento[2],
    paddingRight: espacamento[3],
    minHeight: 40,
  },
  tabelaZonaWrap: {width: 3, alignSelf: 'stretch'},
  tabelaZona: {flex: 1, borderTopRightRadius: 2, borderBottomRightRadius: 2},
  tabelaPos: {minWidth: 18, textAlign: 'center'},
  tabelaCol: {minWidth: 24, textAlign: 'center'},
  tabelaDelta: {minWidth: 24, textAlign: 'center'},
  tabelaPts: {minWidth: 30, textAlign: 'right'},
  tabelaCrestSpacer: {width: 20},
});
