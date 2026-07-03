import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import type {ForcaTime} from '../../engine/simulation/teamStrength';
import {cores, espaco, raio, sombra} from '../../theme';
import type {Clube, Partida} from '../../types';
import {formatarDataCurta} from '../../utils/datas';
import Painel from '../Painel';

type ProximoJogoCardProps = {
  partida: Partida;
  clubeCasa: Clube;
  clubeFora: Clube;
  forcaCasa: ForcaTime;
  forcaFora: ForcaTime;
  mandoCasa: boolean;
  onJogar: () => void;
  /** Bloqueia o botão Jogar (ex.: treino obrigatório ainda não feito). */
  jogarDesabilitado?: boolean;
};

const LINHAS: Array<{rotulo: string; chave: keyof ForcaTime}> = [
  {rotulo: 'ATA', chave: 'ataque'},
  {rotulo: 'MEI', chave: 'meio'},
  {rotulo: 'DEF', chave: 'defesa'},
];

/**
 * Card "Próximo Jogo" da Home (Premium UI v0.0.3): rótulo + data dourada,
 * confronto em siglas grandes, barras de força do TIME DO USUÁRIO (1 número) e
 * o CTA dourado JOGAR à direita. Quando bloqueado, JOGAR fica glass apagado.
 */
function ProximoJogoCard({
  partida,
  clubeCasa,
  clubeFora,
  forcaCasa,
  forcaFora,
  mandoCasa,
  onJogar,
  jogarDesabilitado,
}: ProximoJogoCardProps): React.JSX.Element {
  const forcaUsuario = mandoCasa ? forcaCasa : forcaFora;
  const forcaAdversario = mandoCasa ? forcaFora : forcaCasa;
  const favorito = forcaUsuario.overall >= forcaAdversario.overall;
  const estadio = clubeCasa.estadio?.nome ?? '';

  return (
    <Painel acento={cores.secundaria}>
      <View style={styles.conteudo}>
        <View style={styles.topo}>
          <Text style={styles.label}>Próximo Jogo</Text>
          <Text style={styles.data}>{formatarDataCurta(partida.data)}</Text>
        </View>

        <Text style={styles.siglas}>
          {clubeCasa.sigla} <Text style={styles.x}>×</Text> {clubeFora.sigla}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {estadio ? `${estadio} · ` : ''}
          {mandoCasa ? 'casa' : 'fora'} · {favorito ? 'favorito' : 'azarão'}
        </Text>

        <View style={styles.barrasRow}>
          <View style={styles.barrasCol}>
            {LINHAS.map(linha => {
              const valor = Math.round(forcaUsuario[linha.chave]);
              const pct = Math.max(0, Math.min(100, (valor / 99) * 100));
              return (
                <View key={linha.chave} style={styles.forcaLinha}>
                  <Text style={styles.forcaLabel}>{linha.rotulo}</Text>
                  <View style={styles.forcaTrack}>
                    <View style={[styles.forcaFill, {width: `${pct}%`}]} />
                  </View>
                  <Text style={styles.forcaNum}>{valor}</Text>
                </View>
              );
            })}
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={jogarDesabilitado}
            onPress={onJogar}
            style={({pressed}) => [
              styles.jogar,
              jogarDesabilitado ? styles.jogarDisabled : null,
              pressed && !jogarDesabilitado ? styles.jogarPressed : null,
            ]}>
            <Text
              style={[
                styles.jogarTexto,
                jogarDesabilitado ? styles.jogarTextoDisabled : null,
              ]}>
              JOGAR
            </Text>
          </Pressable>
        </View>
      </View>
    </Painel>
  );
}

export default ProximoJogoCard;

const styles = StyleSheet.create({
  conteudo: {
    gap: espaco.sm,
  },
  topo: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    color: cores.textoSecundario,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  data: {
    color: cores.secundaria,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  siglas: {
    color: cores.texto,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  x: {
    color: cores.textoSecundario,
  },
  sub: {
    color: cores.textoSecundario,
    fontSize: 12,
  },
  barrasRow: {
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: espaco.md,
    marginTop: espaco.xs,
  },
  barrasCol: {
    flex: 1,
    gap: espaco.sm,
    justifyContent: 'center',
  },
  forcaLinha: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.sm,
  },
  forcaLabel: {
    color: cores.textoSecundario,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    width: 30,
  },
  forcaTrack: {
    backgroundColor: cores.fundoBase,
    borderRadius: raio.pill,
    flex: 1,
    height: 9,
    overflow: 'hidden',
  },
  forcaFill: {
    backgroundColor: cores.primaria,
    borderRadius: raio.pill,
    height: '100%',
  },
  forcaNum: {
    color: cores.texto,
    fontSize: 16,
    fontWeight: '900',
    minWidth: 26,
    textAlign: 'right',
  },
  jogar: {
    alignItems: 'center',
    backgroundColor: cores.secundaria,
    borderRadius: raio.lg,
    justifyContent: 'center',
    paddingHorizontal: espaco.lg,
    width: 116,
    ...sombra.ouro,
  },
  jogarDisabled: {
    // Vidro do tema (véu azul-marinho) — o rgba branco sumia no tema claro.
    backgroundColor: cores.glass,
    borderColor: cores.bordaTransl,
    borderWidth: 1,
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  jogarPressed: {
    opacity: 0.92,
    transform: [{scale: 0.975}],
  },
  jogarTexto: {
    color: cores.contrastePrimaria,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  jogarTextoDisabled: {
    color: cores.textoMuted,
  },
});
