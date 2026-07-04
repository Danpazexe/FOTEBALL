/**
 * Mini-carta de jogador (Premium UI v0.0.3 — "Galeria de Ativos").
 * Carta vertical que herda o visual do tier: fundo + borda + glow da raridade,
 * overall grande, posição, silhueta do jogador, nome em caixa-alta, selo do tier
 * e uma StatBar (verde) do overall. Toque abre o PlayerDetail.
 */
import React from 'react';
import {Dimensions, Pressable, StyleSheet, Text, View} from 'react-native';

import {cores, espaco, glowDoTier, nivelCarta, raio} from '../../theme';
import type {Player} from '../../types';
import FaceJogador from '../FaceJogador';
import Icone from '../Icone';
import StatBar from '../StatBar';

// 3 colunas: largura da tela − padding da tela (lg×2) − 2 gaps.
const LARGURA_PADRAO = Math.floor(
  (Dimensions.get('window').width - espaco.lg * 2 - espaco.sm * 2) / 3,
);

type MiniPlayerCardProps = {
  jogador: Player;
  onPress?: () => void;
  largura?: number;
};

function MiniPlayerCard({
  jogador,
  onPress,
  largura = LARGURA_PADRAO,
}: MiniPlayerCardProps): React.JSX.Element {
  const tier = nivelCarta(jogador.overall);
  const indisponivel = jogador.lesionado || jogador.suspenso;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({pressed}) => [
        styles.card,
        glowDoTier(jogador.overall),
        {
          backgroundColor: tier.background,
          borderColor: tier.border,
          width: largura,
        },
        indisponivel ? styles.indisponivel : null,
        pressed ? styles.pressed : null,
      ]}>
      <View style={styles.topo}>
        <Text style={[styles.overall, {color: tier.text}]}>
          {jogador.overall}
        </Text>
        <View style={styles.posWrap}>
          {indisponivel ? (
            <Icone
              nome={jogador.lesionado ? 'lesao' : 'cartao'}
              tamanho={11}
              cor={cores.perigo}
            />
          ) : null}
          <Text style={[styles.pos, {color: tier.text}]}>
            {jogador.posicaoPrincipal}
          </Text>
        </View>
      </View>

      {/* Face do jogador: foto real (se baixada) ou fallback de iniciais. */}
      <View style={styles.faceWrap}>
        <FaceJogador
          jogadorId={jogador.id}
          nome={jogador.nome}
          overall={jogador.overall}
          tamanho={46}
        />
      </View>

      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[styles.nome, {color: tier.text}]}>
        {(jogador.apelido ?? jogador.nome).toUpperCase()}
      </Text>
      <Text style={[styles.tipo, {color: tier.primary}]}>
        {tier.tipo.toUpperCase()}
      </Text>

      <StatBar valor={jogador.overall} cor={cores.primaria} mostrarValor={false} />
    </Pressable>
  );
}

export default MiniPlayerCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: raio.lg,
    borderWidth: 1.5,
    gap: espaco.xs,
    paddingHorizontal: espaco.sm,
    paddingVertical: espaco.sm,
  },
  indisponivel: {
    opacity: 0.78,
  },
  pressed: {
    opacity: 0.9,
    transform: [{scale: 0.97}],
  },
  topo: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  overall: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  posWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  pos: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  faceWrap: {
    alignSelf: 'center',
    marginVertical: 2,
  },
  nome: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  tipo: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
  },
});
