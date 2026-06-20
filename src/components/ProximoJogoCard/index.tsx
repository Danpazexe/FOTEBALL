import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import type {ForcaTime} from '../../engine/simulation/teamStrength';
import {cores, corDoTime, espaco} from '../../theme';
import type {Clube, Partida} from '../../types';
import BarrasForca from '../BarrasForca';
import Escudo from '../Escudo';
import Icone from '../Icone';
import OverallBadge from '../OverallBadge';
import Painel from '../Painel';
import {Botao} from '../ui';

type ProximoJogoCardProps = {
  partida: Partida;
  clubeCasa: Clube;
  clubeFora: Clube;
  forcaCasa: ForcaTime;
  forcaFora: ForcaTime;
  mandoCasa: boolean;
  onEscalar: () => void;
  onJogar: () => void;
  /** Bloqueia o botão Jogar (ex.: treino obrigatório ainda não feito). */
  jogarDesabilitado?: boolean;
};

function ProximoJogoCard({
  partida,
  clubeCasa,
  clubeFora,
  forcaCasa,
  forcaFora,
  mandoCasa,
  onEscalar,
  onJogar,
  jogarDesabilitado,
}: ProximoJogoCardProps): React.JSX.Element {
  return (
    <Painel destaque="primaria" acento={cores.primaria}>
      <View style={styles.conteudo}>
      <View style={styles.topoLinha}>
        <Text style={styles.rodada}>Rodada {partida.rodada}</Text>
        <View style={styles.mando}>
          <Icone
            nome={mandoCasa ? 'casa' : 'aviao'}
            tamanho={13}
            cor={cores.textoSecundario}
          />
          <Text style={styles.mandoTexto}>
            {mandoCasa ? 'Em casa' : 'Fora'}
          </Text>
        </View>
      </View>

      <View style={styles.confronto}>
        <View style={styles.time}>
          <Escudo clubeId={clubeCasa.id} sigla={clubeCasa.sigla} tamanho={46} />
          <Text style={styles.nome} numberOfLines={1}>
            {clubeCasa.nome}
          </Text>
          <OverallBadge overall={Math.round(forcaCasa.overall)} size={24} />
        </View>

        <Text style={styles.vs}>VS</Text>

        <View style={styles.time}>
          <Escudo clubeId={clubeFora.id} sigla={clubeFora.sigla} tamanho={46} />
          <Text style={styles.nome} numberOfLines={1}>
            {clubeFora.nome}
          </Text>
          <OverallBadge overall={Math.round(forcaFora.overall)} size={24} />
        </View>
      </View>

      <BarrasForca
        casa={forcaCasa}
        fora={forcaFora}
        corCasa={corDoTime(clubeCasa.id)}
        corFora={corDoTime(clubeFora.id)}
      />

      <View style={styles.acoes}>
        <View style={styles.acaoFlex}>
          <Botao
            variante="secundaria"
            icone="tatica"
            titulo="Escalar"
            onPress={onEscalar}
          />
        </View>
        <View style={styles.acaoFlex}>
          <Botao
            variante="ouro"
            icone="jogar"
            titulo="Jogar"
            onPress={onJogar}
            disabled={jogarDesabilitado}
          />
        </View>
      </View>
      </View>
    </Painel>
  );
}

export default ProximoJogoCard;

const styles = StyleSheet.create({
  conteudo: {
    gap: espaco.md,
  },
  topoLinha: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rodada: {
    color: cores.textoSecundario,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  mando: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.xs,
  },
  mandoTexto: {
    color: cores.texto,
    fontSize: 12,
    fontWeight: '600',
  },
  confronto: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  time: {
    alignItems: 'center',
    flex: 1,
    gap: espaco.xs,
  },
  nome: {
    color: cores.texto,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  vs: {
    color: cores.textoSecundario,
    fontSize: 16,
    fontWeight: '900',
    paddingHorizontal: espaco.sm,
  },
  acoes: {
    flexDirection: 'row',
    gap: espaco.sm,
  },
  acaoFlex: {
    flex: 1,
  },
});
