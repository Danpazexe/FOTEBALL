/**
 * Timeline de eventos da partida narrada: linha por lance (minuto · nó ·
 * placar · autor/detalhe) e marcos neutros (início/intervalo/fim).
 * Presentacional puro — extraído da tela MatchSimulation.
 */
import React from 'react';
import {StyleSheet, View} from 'react-native';

import type {IconeNome} from '../../components/Icone';
import {
  Icon,
  Text,
  espacamento,
  raios,
  useTheme,
  type CorTexto,
} from '../../design-system';
import {ehMinutoAcrescimo, rotuloMinuto} from '../../utils/minutoPartida';

/** Lado do lance na partida (morava no LanceLimpo, aposentado pela Timeline). */
export type LadoLance = 'casa' | 'fora' | 'neutro';

export type ItemTimeline = {
  minuto: number;
  tipo: string;
  descricao: string;
  lado: LadoLance;
  sigla?: string;
  corTime?: string;
  timeId?: string;
  /** Campos do lance "clean": nome principal, linha cinza e pill de placar. */
  autor?: string;
  detalhe?: string;
  placarPill?: string;
};

function infoEvento(tipo: string): {
  nome?: IconeNome;
  corKey?: CorTexto;
  cartao?: 'amarelo' | 'vermelho';
} {
  switch (tipo) {
    case 'gol':
      return {nome: 'bola', corKey: 'success'};
    case 'gol_contra':
      return {nome: 'bola', corKey: 'warning'};
    case 'bola_trave':
      return {nome: 'chance', corKey: 'warning'};
    case 'substituicao':
      return {nome: 'substituicao', corKey: 'brand'};
    case 'lesao':
      return {nome: 'lesao', corKey: 'danger'};
    case 'penalti':
      return {nome: 'penalti', corKey: 'warning'};
    case 'chance_perdida':
      return {nome: 'chance', corKey: 'textMuted'};
    case 'cartao_amarelo':
      return {cartao: 'amarelo'};
    case 'cartao_vermelho':
      return {cartao: 'vermelho'};
    default:
      return {};
  }
}

/** Linha da timeline de eventos: minuto · nó · placar · autor/detalhe. */
export function LinhaEvento({item}: {item: ItemTimeline}): React.JSX.Element {
  const {cores, esporte} = useTheme();
  if (item.lado === 'neutro') {
    return (
      <View style={styles.marco}>
        <Text variant="caption" color="textSecondary" weight="700">
          {item.descricao}
        </Text>
        {item.placarPill ? (
          <View style={[styles.marcoPill, {borderColor: cores.border}]}>
            <Text variant="caption" weight="800" tabular>
              {item.placarPill}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }
  const info = infoEvento(item.tipo);
  const ehSub = item.tipo === 'substituicao';
  const corCartao =
    info.cartao === 'amarelo' ? esporte.match.cardYellow : esporte.match.cardRed;
  return (
    <View style={styles.evento}>
      <Text
        variant="labelM"
        color={ehMinutoAcrescimo(item.minuto) ? 'danger' : 'textSecondary'}
        tabular
        style={styles.eventoMin}>
        {rotuloMinuto(item.minuto)}'
      </Text>
      <View style={styles.eventoNode}>
        {info.cartao ? (
          <View style={[styles.eventoCartao, {backgroundColor: corCartao}]} />
        ) : info.nome ? (
          <Icon nome={info.nome} size={18} color={info.corKey ?? 'textPrimary'} />
        ) : (
          <View style={[styles.eventoDot, {backgroundColor: cores.textMuted}]} />
        )}
      </View>
      {item.placarPill ? (
        <View style={[styles.eventoPlacar, {borderColor: esporte.match.goal}]}>
          <Text variant="caption" weight="800" tabular>
            {item.placarPill}
          </Text>
        </View>
      ) : null}
      <View style={styles.eventoInfo}>
        <View style={styles.eventoNomeLinha}>
          <Text variant="labelL" numberOfLines={1} style={styles.flex}>
            {item.autor ?? item.descricao}
          </Text>
          {ehSub ? <Icon nome="seta-cima" size={14} color="success" /> : null}
        </View>
        {item.detalhe ? (
          <View style={styles.eventoNomeLinha}>
            <Text
              variant="caption"
              color="textSecondary"
              numberOfLines={1}
              style={styles.flex}>
              {item.detalhe}
            </Text>
            {ehSub ? <Icon nome="seta-baixo" size={14} color="danger" /> : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  marco: {
    alignItems: 'center',
    gap: espacamento[1],
    paddingVertical: espacamento[2],
  },
  marcoPill: {
    borderWidth: 1,
    borderRadius: raios.sm,
    paddingHorizontal: espacamento[2],
    paddingVertical: 1,
  },
  evento: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[2],
    paddingVertical: espacamento[2],
    paddingHorizontal: espacamento[3],
    minHeight: 52,
  },
  eventoMin: {minWidth: 30, textAlign: 'center'},
  eventoNode: {width: 26, alignItems: 'center', justifyContent: 'center'},
  eventoCartao: {width: 11, height: 15, borderRadius: 2},
  eventoDot: {width: 10, height: 10, borderRadius: raios.full},
  eventoPlacar: {
    borderWidth: 1.5,
    borderRadius: raios.sm,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  eventoInfo: {flex: 1, gap: 1},
  eventoNomeLinha: {flexDirection: 'row', alignItems: 'center', gap: espacamento[1]},
});
