import React from 'react';
import {StyleSheet, View} from 'react-native';

import type {ForcaTime} from '../../engine/simulation/teamStrength';
import type {Clube, Partida} from '../../types';
import {formatarDataCurta} from '../../utils/datas';
import {Button, Card, Text, espacamento, raios, useTheme} from '../../design-system';

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
 * Card "Próximo Jogo" da Home: rótulo + data, confronto em siglas grandes,
 * barras de força do TIME DO USUÁRIO e o CTA JOGAR. Migrado ao Design System v2.
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
  const {cores} = useTheme();
  const forcaUsuario = mandoCasa ? forcaCasa : forcaFora;
  const forcaAdversario = mandoCasa ? forcaFora : forcaCasa;
  const favorito = forcaUsuario.overall >= forcaAdversario.overall;
  const estadio = clubeCasa.estadio?.nome ?? '';

  return (
    <Card variante="status" status="accent" padding={4} style={styles.conteudo}>
      <View style={styles.topo}>
        <Text variant="labelM" color="textSecondary" style={styles.caps}>
          Próximo Jogo
        </Text>
        <Text variant="labelM" color="accent">
          {formatarDataCurta(partida.data)}
        </Text>
      </View>

      <Text variant="scoreXL" tabular>
        {clubeCasa.sigla} <Text variant="scoreXL" color="textMuted">×</Text>{' '}
        {clubeFora.sigla}
      </Text>
      <Text variant="bodyM" color="textSecondary" numberOfLines={1}>
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
                <Text
                  variant="labelM"
                  color="textSecondary"
                  style={styles.forcaLabel}>
                  {linha.rotulo}
                </Text>
                <View
                  style={[styles.forcaTrack, {backgroundColor: cores.surfaceSubtle}]}>
                  <View
                    style={[
                      styles.forcaFill,
                      {width: `${pct}%`, backgroundColor: cores.brand},
                    ]}
                  />
                </View>
                <Text variant="titleM" tabular style={styles.forcaNum}>
                  {valor}
                </Text>
              </View>
            );
          })}
        </View>

        <Button
          titulo="JOGAR"
          onPress={onJogar}
          disabled={jogarDesabilitado}
          style={styles.jogar}
        />
      </View>
    </Card>
  );
}

export default ProximoJogoCard;

const styles = StyleSheet.create({
  conteudo: {gap: espacamento[2]},
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  caps: {textTransform: 'uppercase', letterSpacing: 1},
  barrasRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: espacamento[3],
    marginTop: espacamento[1],
  },
  barrasCol: {flex: 1, gap: espacamento[2], justifyContent: 'center'},
  forcaLinha: {flexDirection: 'row', alignItems: 'center', gap: espacamento[2]},
  forcaLabel: {width: 30},
  forcaTrack: {flex: 1, height: 9, borderRadius: raios.full, overflow: 'hidden'},
  forcaFill: {height: '100%', borderRadius: raios.full},
  forcaNum: {minWidth: 26, textAlign: 'right'},
  jogar: {width: 116},
});
