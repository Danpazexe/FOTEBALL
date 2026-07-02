/**
 * Carta de jogador dinâmica (estilo card de futebol/fantasy).
 *
 * Usa o modelo `Player` atual do jogo: deriva nome, overall, posição e os 6
 * stats a partir dos `atributos` reais (sem inventar dados). O tema (Especial/
 * Lendário/Ouro/Prata/Bronze) segue as faixas de overall do jogo. Moldura,
 * fundo e boneco-placeholder em react-native-svg (já linkado).
 */

import React from 'react';
import {Dimensions, StyleSheet, Text, View} from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

import Escudo from '../Escudo';
import FaceJogador from '../FaceJogador';
import Icone from '../Icone';
import {corDoTime, nivelCarta} from '../../theme';
import type {Player} from '../../types';

/** Cor da moral: alta (verde), média (amarelo), baixa (vermelho). */
function corMoral(moral: number): string {
  if (moral >= 75) {
    return '#22C55E';
  }
  if (moral >= 50) {
    return '#F59E0B';
  }
  return '#EF4444';
}

type CartaJogadorProps = {
  jogador: Player;
  largura?: number;
};

type StatCarta = {value: number; label: string};

// Card maior por padrão (cabe os stats com folga). Limita pela largura da tela.
const LARGURA_PADRAO = Math.min(340, Dimensions.get('window').width - 36);

/** 6 stats no formato do card, derivados dos atributos do jogo. */
function statsDoJogador(jogador: Player): StatCarta[] {
  const a = jogador.atributos;
  if (jogador.posicaoPrincipal === 'GOL') {
    return [
      {label: 'VEL', value: a.velocidade},
      {label: 'REF', value: a.reflexos},
      {label: 'PAS', value: a.passe},
      {label: 'POS', value: a.posicionamento},
      {label: 'DEF', value: a.marcacao},
      {label: 'FIS', value: a.forca},
    ];
  }
  return [
    {label: 'VEL', value: a.velocidade},
    {label: 'FIN', value: a.finalizacao},
    {label: 'PAS', value: a.passe},
    {label: 'DRI', value: a.drible},
    {label: 'DEF', value: Math.round((a.marcacao + a.desarme) / 2)},
    {label: 'FIS', value: Math.round((a.forca + a.resistencia) / 2)},
  ];
}

function CartaJogador({
  jogador,
  largura = LARGURA_PADRAO,
}: CartaJogadorProps): React.JSX.Element {
  const tema = nivelCarta(jogador.overall);
  const altura = largura * 1.42;
  const nome = (jogador.apelido ?? jogador.nome).toUpperCase();
  const stats = statsDoJogador(jogador);
  const esquerda = stats.slice(0, 3);
  const direita = stats.slice(3, 6);
  const escala = largura / 260;
  const statusIndisponivel = jogador.lesionado
    ? {icone: 'lesao' as const, rotulo: 'LESIONADO'}
    : jogador.suspenso
    ? {icone: 'cartao' as const, rotulo: 'SUSPENSO'}
    : null;

  return (
    <View style={[styles.card, {width: largura, height: altura}]}>
      <Svg
        width={largura}
        height={altura}
        viewBox="0 0 260 370"
        style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="cardGradient" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={tema.primary} stopOpacity="0.95" />
            <Stop offset="0.42" stopColor={tema.background} stopOpacity="1" />
            <Stop offset="1" stopColor={tema.background2} stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id="shineGradient" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.26" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </LinearGradient>
        </Defs>

        <Path
          d="M34 16 Q130 -4 226 16 L240 300 Q234 340 130 356 Q26 340 20 300 L34 16 Z"
          fill="url(#cardGradient)"
          stroke={tema.border}
          strokeWidth="5"
        />
        <Path
          d="M44 28 Q130 9 216 28 L228 298 Q222 332 130 344 Q38 332 32 298 L44 28 Z"
          fill="none"
          stroke={tema.border}
          strokeWidth="1.5"
          opacity="0.75"
        />
        <Path
          d="M42 35 L218 32 L80 210 Z"
          fill="url(#shineGradient)"
          opacity="0.18"
        />
        <Path
          d="M54 245 C94 222 166 222 207 245"
          stroke={tema.primary}
          strokeWidth="2"
          fill="none"
          opacity="0.95"
        />
        <Path
          d="M72 225 L194 225"
          stroke={tema.border}
          strokeWidth="1"
          opacity="0.35"
        />

        {/* A face procedural (estilo figurinha) é sobreposta fora do SVG. */}

        {/* Faixa escura na metade inferior: dá contraste para o nome e os stats
            (texto dourado some sobre o boneco cinza). Recortada na forma da carta. */}
        <Path
          d="M26 180 L234 180 L240 300 Q234 340 130 356 Q26 340 20 300 Z"
          fill="#080B14"
          opacity="0.8"
        />
        <Path
          d="M40 188 L220 188"
          stroke={tema.border}
          strokeWidth="1.2"
          opacity="0.5"
        />
      </Svg>

      {/* Face procedural do jogador (determinística pelo id) */}
      <View style={[styles.faceArea, {top: 52 * escala, left: 76 * escala}]}>
        <FaceJogador
          seed={jogador.id}
          tamanho={108 * escala}
          corCamisa={jogador.clubeId ? corDoTime(jogador.clubeId) : undefined}
          corFundo="rgba(255, 255, 255, 0.12)"
        />
      </View>

      {/* Overall + posição */}
      <View style={[styles.ratingArea, {top: 44 * escala, left: 34 * escala}]}>
        <Text style={[styles.overall, {color: tema.text, fontSize: 40 * escala}]}>
          {jogador.overall}
        </Text>
        <Text style={[styles.position, {color: tema.text, fontSize: 18 * escala}]}>
          {jogador.posicaoPrincipal}
        </Text>
        {jogador.clubeId ? (
          <View style={{marginTop: 4 * escala}}>
            <Escudo
              clubeId={jogador.clubeId}
              sigla={jogador.posicaoPrincipal}
              tamanho={Math.round(26 * escala)}
            />
          </View>
        ) : null}
      </View>

      {/* Moral + status (lesão/suspensão) no canto superior direito */}
      <View style={[styles.statusArea, {top: 46 * escala, right: 30 * escala}]}>
        <View style={styles.moralBadge}>
          <View
            style={[
              styles.moralPonto,
              {backgroundColor: corMoral(jogador.moral)},
            ]}
          />
          <Text style={[styles.moralValor, {color: tema.text, fontSize: 15 * escala}]}>
            {jogador.moral}
          </Text>
        </View>
        {statusIndisponivel ? (
          <View style={[styles.statusBadge, {marginTop: 5 * escala}]}>
            <Icone
              nome={statusIndisponivel.icone}
              tamanho={Math.round(12 * escala)}
              cor="#EF4444"
            />
            <Text style={[styles.statusTexto, {fontSize: 9 * escala}]}>
              {statusIndisponivel.rotulo}
            </Text>
          </View>
        ) : null}
      </View>

      <Text
        style={[
          styles.cardType,
          {color: tema.mutedText, top: 192 * escala, fontSize: 11 * escala},
        ]}>
        {tema.tipo}
      </Text>

      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[
          styles.name,
          {color: tema.text, top: 207 * escala, fontSize: 23 * escala},
        ]}>
        {nome}
      </Text>

      <View style={[styles.statsArea, {top: 238 * escala}]}>
        <View style={styles.statsColumn}>
          {esquerda.map(s => (
            <Stat key={s.label} value={s.value} label={s.label} color={tema.text} escala={escala} />
          ))}
        </View>
        <View
          style={[
            styles.divider,
            {backgroundColor: tema.border, height: 66 * escala},
          ]}
        />
        <View style={styles.statsColumn}>
          {direita.map(s => (
            <Stat key={s.label} value={s.value} label={s.label} color={tema.text} escala={escala} />
          ))}
        </View>
      </View>
    </View>
  );
}

function Stat({
  value,
  label,
  color,
  escala,
}: {
  value: number;
  label: string;
  color: string;
  escala: number;
}): React.JSX.Element {
  return (
    <View style={styles.statRow}>
      <Text style={[styles.statValue, {color, fontSize: 20 * escala}]}>{value}</Text>
      <Text style={[styles.statLabel, {color, fontSize: 17 * escala}]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  faceArea: {
    position: 'absolute',
    zIndex: 2,
  },
  ratingArea: {
    alignItems: 'center',
    position: 'absolute',
    zIndex: 4,
  },
  statusArea: {
    alignItems: 'center',
    position: 'absolute',
    zIndex: 4,
  },
  moralBadge: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  moralPonto: {
    borderRadius: 5,
    height: 9,
    width: 9,
  },
  moralValor: {
    fontWeight: '900',
  },
  statusBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(8,11,20,0.78)',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  statusTexto: {
    color: '#EF4444',
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  overall: {
    fontWeight: '900',
  },
  position: {
    fontWeight: '900',
    marginTop: 2,
  },
  cardType: {
    fontWeight: '800',
    letterSpacing: 1,
    position: 'absolute',
    textAlign: 'center',
    textTransform: 'uppercase',
    width: '100%',
    zIndex: 4,
  },
  name: {
    fontWeight: '900',
    letterSpacing: 0.5,
    position: 'absolute',
    textAlign: 'center',
    width: '72%',
    zIndex: 4,
  },
  statsArea: {
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'absolute',
    width: '74%',
    zIndex: 4,
  },
  statsColumn: {
    width: 78,
  },
  divider: {
    marginHorizontal: 8,
    opacity: 0.65,
    width: 1,
  },
  statRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    marginBottom: 3,
  },
  statValue: {
    fontWeight: '900',
    minWidth: 26,
  },
  statLabel: {
    fontWeight: '800',
  },
});

export default CartaJogador;
