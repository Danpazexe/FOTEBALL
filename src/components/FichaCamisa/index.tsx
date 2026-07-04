/**
 * FichaCamisa — ficha de jogador estilo Soccer Manager / EA FC para o CAMPO.
 *
 * Uma CAMISA na cor viva do time (corDoTime), com o OVERALL como número no
 * peito, o NOME embaixo e uma linha compacta com posição · pé dominante · % de
 * adaptação (penalidade fora de posição). Sem escudo, sem moldura pesada — leve
 * e legível no gramado. Escala pelo `largura` (usada pequena no campo e maior
 * como fantasma do arraste).
 */

import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Svg, {Path, Rect} from 'react-native-svg';

import {nivelAdaptacao} from '../../engine/tactics/adaptacao';
import {contrasteTexto, corAdaptacao, cores, corDoTime} from '../../theme';
import type {PernaDominante, Player, Position} from '../../types';

// Silhueta de camisa (viewBox 100x100): gola no topo, mangas nas laterais,
// corpo até a barra. Preenchida com a cor do time.
const CAMISA =
  'M50 14 C44 14 41 17 38 19 L22 15 C19 14 16 16 15 19 L9 37 C8 40 10 44 13 45 L30 50 L28 86 C28 90 31 92 35 92 L65 92 C69 92 72 90 72 86 L70 50 L87 45 C90 44 92 40 91 37 L85 19 C84 16 81 14 78 15 L62 19 C59 17 56 14 50 14 Z';

function ultimoNome(jogador: Player): string {
  if (jogador.apelido) {
    return jogador.apelido;
  }
  const partes = jogador.nome.split(' ');
  return partes[partes.length - 1] ?? jogador.nome;
}

/** Pé dominante em 1 letra: D = direito, E = esquerdo, A = ambidestro. */
function rotuloPerna(perna: PernaDominante): string {
  return perna === 'Ambidestro' ? 'A' : perna;
}

/**
 * Ícone de chuteira (cleat) — silhueta lateral com o bico à direita, cano baixo
 * e 2 travas na sola. Preenchido na cor do pé dominante (estilo EA FC).
 */
function Chuteira({
  cor,
  tamanho,
}: {
  cor: string;
  tamanho: number;
}): React.JSX.Element {
  return (
    <Svg width={tamanho} height={Math.round(tamanho * 0.6)} viewBox="0 0 24 15">
      <Path
        d="M3 5 C3 3.8 4 3.5 5.2 3.9 C6 4.1 6.4 4.8 6.6 5.8 L7 8 C11 6.9 15 7.4 19 9.2 C21 10 22.6 10.8 23 12 C23.2 12.7 22.6 13 21.6 13 L5 13 C3.6 13 3 12 3 10 Z"
        fill={cor}
      />
      <Rect x="6.5" y="13" width="2.4" height="1.7" rx="0.6" fill={cor} />
      <Rect x="13" y="13" width="2.4" height="1.7" rx="0.6" fill={cor} />
    </Svg>
  );
}

type FichaCamisaProps = {
  jogador: Player;
  posicaoEscalada: Position;
  largura: number;
};

function FichaCamisa({
  jogador,
  posicaoEscalada,
  largura,
}: FichaCamisaProps): React.JSX.Element {
  const cor = corDoTime(jogador.clubeId ?? jogador.id);
  const corTexto = contrasteTexto(cor);
  const adaptacao = nivelAdaptacao(jogador, posicaoEscalada);
  const corRend = corAdaptacao(adaptacao.nivel);
  const rendimento = Math.round(adaptacao.fator * 100);
  const naoNatural = adaptacao.nivel !== 'natural';
  const indisponivel = jogador.lesionado || jogador.suspenso;
  const corPe =
    jogador.pernaDominante === 'Ambidestro' ? cores.primaria : cores.secundaria;

  const ladoCamisa = Math.round(largura * 0.82);
  const fonteOverall = Math.round(ladoCamisa * 0.4);
  const fonteNome = Math.max(9, Math.round(largura * 0.135));
  const fonteInfo = Math.max(8, Math.round(largura * 0.11));

  return (
    <View style={[styles.wrap, indisponivel ? styles.indisponivel : null]}>
      <View style={{width: ladoCamisa, height: ladoCamisa}}>
        <Svg
          width={ladoCamisa}
          height={ladoCamisa}
          viewBox="0 0 100 100"
          style={StyleSheet.absoluteFill}>
          <Path
            d={CAMISA}
            fill={cor}
            stroke="rgba(15, 30, 61, 0.30)"
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
        </Svg>
        <View style={styles.overallWrap} pointerEvents="none">
          <Text style={[styles.overall, {color: corTexto, fontSize: fonteOverall}]}>
            {jogador.overall}
          </Text>
        </View>
      </View>

      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[styles.nome, {fontSize: fonteNome}]}>
        {ultimoNome(jogador).toUpperCase()}
      </Text>

      <View style={styles.linhaInfo}>
        <Text style={[styles.pos, {fontSize: fonteInfo}]}>{posicaoEscalada}</Text>
        <Text style={[styles.sep, {fontSize: fonteInfo}]}>·</Text>
        <Chuteira cor={corPe} tamanho={Math.round(fonteInfo * 1.9)} />
        <Text style={[styles.pe, {color: corPe, fontSize: fonteInfo}]}>
          {rotuloPerna(jogador.pernaDominante)}
        </Text>
        {naoNatural ? (
          <>
            <Text style={[styles.sep, {fontSize: fonteInfo}]}>·</Text>
            <Text style={[styles.rend, {color: corRend, fontSize: fonteInfo}]}>
              {rendimento}%
            </Text>
          </>
        ) : null}
      </View>
    </View>
  );
}

export default FichaCamisa;

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 1,
  },
  indisponivel: {
    opacity: 0.55,
  },
  overallWrap: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    // O número fica no CORPO da camisa (abaixo da gola/mangas).
    top: '30%',
  },
  overall: {
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  nome: {
    color: cores.texto,
    fontWeight: '900',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  linhaInfo: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
  },
  pos: {
    color: cores.textoSecundario,
    fontWeight: '800',
  },
  sep: {
    color: cores.textoMuted,
  },
  pe: {
    fontWeight: '900',
  },
  rend: {
    fontWeight: '900',
  },
});
