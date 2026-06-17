import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {cores, corOverall, espaco, nivelCarta, raio} from '../../theme';
import type {Player} from '../../types';
import {
  atributosDestaquePorPosicao,
  SIGLA_ATRIBUTO,
} from '../../utils/atributosDestaque';
import {moedaCompacta} from '../../utils/formatters';
import Icone from '../Icone';
import OverallBadge from '../OverallBadge';

type PlayerCardProps = {
  jogador: Player;
  onPress?: () => void;
  acaoLabel?: string;
  onAcao?: () => void;
  legendaExtra?: string;
};

/** Cor da moral: alta (verde), média (amarelo), baixa (vermelho). */
function corMoral(moral: number): string {
  if (moral >= 75) {
    return cores.primaria;
  }
  if (moral >= 50) {
    return cores.secundaria;
  }
  return cores.perigo;
}

function PlayerCard({
  jogador,
  onPress,
  acaoLabel,
  onAcao,
  legendaExtra,
}: PlayerCardProps) {
  const tier = nivelCarta(jogador.overall);
  const destaques = atributosDestaquePorPosicao(jogador.posicaoPrincipal);
  const indisponivel = jogador.lesionado || jogador.suspenso;

  const conteudo = (
    <>
      {/* Faixa de raridade na borda esquerda */}
      <View style={[styles.faixaRaridade, {backgroundColor: tier.border}]} />

      <OverallBadge overall={jogador.overall} />

      <View style={styles.main}>
        <View style={styles.nomeLinha}>
          <Text style={styles.nome} numberOfLines={1}>
            {jogador.apelido ?? jogador.nome}
          </Text>
          {jogador.lesionado ? (
            <Icone nome="lesao" tamanho={14} cor={cores.perigo} />
          ) : jogador.suspenso ? (
            <Icone nome="cartao" tamanho={14} cor={cores.perigo} />
          ) : null}
        </View>
        <Text style={styles.legenda}>
          {jogador.posicaoPrincipal} · {jogador.idade} anos ·{' '}
          {moedaCompacta(jogador.valorMercado)}
        </Text>

        {/* Atributos-chave da posição */}
        <View style={styles.atributos}>
          {destaques.map(chave => (
            <View key={chave} style={styles.atributoChip}>
              <Text style={styles.atributoSigla}>{SIGLA_ATRIBUTO[chave]}</Text>
              <Text
                style={[
                  styles.atributoValor,
                  {color: corOverall(jogador.atributos[chave])},
                ]}>
                {jogador.atributos[chave]}
              </Text>
            </View>
          ))}
          <View style={styles.moralChip}>
            <View
              style={[styles.moralPonto, {backgroundColor: corMoral(jogador.moral)}]}
            />
            <Text style={styles.moralTexto}>{jogador.moral}</Text>
          </View>
        </View>

        {legendaExtra ? (
          <Text style={styles.legendaExtra}>{legendaExtra}</Text>
        ) : null}
      </View>

      {acaoLabel && onAcao ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAcao}
          style={styles.botao}>
          <Text style={styles.botaoTexto}>{acaoLabel}</Text>
        </Pressable>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={[styles.linha, indisponivel ? styles.linhaIndisponivel : null]}>
        {conteudo}
      </Pressable>
    );
  }

  return (
    <View style={[styles.linha, indisponivel ? styles.linhaIndisponivel : null]}>
      {conteudo}
    </View>
  );
}

export default PlayerCard;

const styles = StyleSheet.create({
  linha: {
    alignItems: 'center',
    backgroundColor: cores.superficieAlt,
    borderColor: cores.borda,
    borderRadius: raio.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: espaco.md,
    minHeight: 78,
    overflow: 'hidden',
    paddingLeft: espaco.md,
    paddingRight: espaco.sm,
    paddingVertical: espaco.sm,
  },
  linhaIndisponivel: {
    opacity: 0.7,
  },
  faixaRaridade: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 4,
  },
  main: {
    flex: 1,
    gap: 3,
  },
  nomeLinha: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.xs,
  },
  nome: {
    color: cores.texto,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '800',
  },
  legenda: {
    color: cores.textoSecundario,
    fontSize: 12,
  },
  atributos: {
    flexDirection: 'row',
    gap: espaco.xs,
    marginTop: 2,
  },
  atributoChip: {
    alignItems: 'center',
    backgroundColor: cores.fundo,
    borderRadius: raio.sm,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: espaco.sm,
    paddingVertical: 2,
  },
  atributoSigla: {
    color: cores.textoSecundario,
    fontSize: 9,
    fontWeight: '800',
  },
  atributoValor: {
    fontSize: 12,
    fontWeight: '900',
  },
  moralChip: {
    alignItems: 'center',
    backgroundColor: cores.fundo,
    borderRadius: raio.sm,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: espaco.sm,
    paddingVertical: 2,
  },
  moralPonto: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  moralTexto: {
    color: cores.texto,
    fontSize: 12,
    fontWeight: '800',
  },
  legendaExtra: {
    color: cores.textoSecundario,
    fontSize: 12,
    marginTop: 2,
  },
  botao: {
    alignItems: 'center',
    borderColor: cores.primaria,
    borderRadius: raio.sm,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: espaco.md,
  },
  botaoTexto: {
    color: cores.primaria,
    fontSize: 12,
    fontWeight: '800',
  },
});
