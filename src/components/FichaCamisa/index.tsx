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
import Svg, {G, Path} from 'react-native-svg';

import {nivelAdaptacao} from '../../engine/tactics/adaptacao';
import {contrasteTexto, corAdaptacao, cores, corDoClube} from '../../theme';
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

// Chuteira lateral (bico à direita): corpo + 5 travas na sola, num só path.
// viewBox base ~ 6..95 x 11..40. O par usa transform pra espelhar a esquerda.
const CHUTEIRA_D =
  'M12 34 C7 34 5.5 30 5.5 25 C5.5 17 8 12 14 11 C24 9.5 40 10 56 13 C72 16 84 20 92 27 C94.5 29 95 31.5 92.5 33 C92 33.6 91 34 90 34 L15 34 C13 34 12.5 34 12 34 Z M13 34 L18 34 L17 39.8 L14 39.8 Z M25 34 L30 34 L29 39.8 L26 39.8 Z M52 34 L57 34 L56 39.8 L53 39.8 Z M66 34 L71 34 L70 39.8 L67 39.8 Z M80 34 L85 34 L84 39.8 L81 39.8 Z';

/**
 * Par de chuteiras estilo EA FC: a do PÉ DOMINANTE fica PREENCHIDA, a outra em
 * CONTORNO (ambidestro = as duas preenchidas). A esquerda é espelhada (bico p/
 * a esquerda). Recriada a partir da referência do usuário.
 */
function ParChuteiras({
  perna,
  tamanho,
}: {
  perna: PernaDominante;
  tamanho: number;
}): React.JSX.Element {
  const cor = cores.primariaEscura;
  const esqCheia = perna === 'E' || perna === 'Ambidestro';
  const dirCheia = perna === 'D' || perna === 'Ambidestro';
  const altura = Math.round((tamanho * 44) / 196);
  return (
    <Svg width={tamanho} height={altura} viewBox="0 0 196 44">
      <G transform="translate(96,2) scale(-1,1)">
        <Path
          d={CHUTEIRA_D}
          fill={esqCheia ? cor : 'none'}
          stroke={cor}
          strokeWidth={2.4}
          strokeLinejoin="round"
        />
      </G>
      <G transform="translate(100,2)">
        <Path
          d={CHUTEIRA_D}
          fill={dirCheia ? cor : 'none'}
          stroke={cor}
          strokeWidth={2.4}
          strokeLinejoin="round"
        />
      </G>
    </Svg>
  );
}

type FichaCamisaProps = {
  jogador: Player;
  posicaoEscalada: Position;
  largura: number;
  /** Braçadeira © do capitão do time. */
  ehCapitao?: boolean;
};

function FichaCamisa({
  jogador,
  posicaoEscalada,
  largura,
  ehCapitao = false,
}: FichaCamisaProps): React.JSX.Element {
  const cor = corDoClube(jogador.clubeId ?? jogador.id);
  const corTexto = contrasteTexto(cor);
  const adaptacao = nivelAdaptacao(jogador, posicaoEscalada);
  const corRend = corAdaptacao(adaptacao.nivel);
  const rendimento = Math.round(adaptacao.fator * 100);
  const naoNatural = adaptacao.nivel !== 'natural';
  const indisponivel = jogador.lesionado || jogador.suspenso;

  const ladoCamisa = Math.round(largura * 0.82);
  // Overall menor pra caber DENTRO da camisa (o torso vai de ~50% a ~92%).
  const fonteOverall = Math.round(ladoCamisa * 0.26);
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
        {ehCapitao ? (
          <View style={styles.capitao} pointerEvents="none">
            <Text style={styles.capitaoTxt}>©</Text>
          </View>
        ) : null}
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
        <ParChuteiras
          perna={jogador.pernaDominante}
          tamanho={Math.round(fonteInfo * 3.4)}
        />
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
    // O número fica CENTRADO no torso da camisa (região ~40%..100% => centro ~70%).
    top: '40%',
  },
  capitao: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.secundaria,
    borderWidth: 1,
    borderColor: cores.superficie,
  },
  capitaoTxt: {
    color: cores.contrastePrimaria,
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 12,
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
  rend: {
    fontWeight: '900',
  },
});
