/**
 * Copa do Brasil — tela de chaveamento (bracket). Fases e confrontos com escudo,
 * placar e vencedor, destacando o clube do usuário. Migrada ao Design System v2.
 */

import React from 'react';
import {Image, StyleSheet, View} from 'react-native';

import Escudo from '../../components/Escudo';
import {LOGO_COPA} from '../../assets/escudos';
import {
  AppBar,
  Button,
  Card,
  Icon,
  Screen,
  Text,
  espacamento,
  useTheme,
} from '../../design-system';
import {useToast} from '../../components/feedback';
import {
  confrontoDoClube,
  type ConfrontoCopa,
} from '../../engine/season/copaEngine';
import {useAppNavigation} from '../../navigation/types';
import {selecionarCopaNaVez, useGameStore} from '../../store/useGameStore';
import {formatarDataCurta} from '../../utils/datas';
import {nomeClube, siglaClube} from '../../utils/formatters';
import type {Clube} from '../../types';

function Copa(): React.JSX.Element {
  const nav = useAppNavigation();
  const toast = useToast();
  const copa = useGameStore(state => state.copa);
  const todosClubes = useGameStore(state => state.todosClubes);
  const clubeUsuarioId = useGameStore(state => state.clubeUsuarioId);
  const avancarFaseCopa = useGameStore(state => state.avancarFaseCopa);
  const avancarParaData = useGameStore(state => state.avancarParaData);
  const copaNaVez = useGameStore(selecionarCopaNaVez);

  if (!copa) {
    return (
      <Screen scroll>
        <AppBar title="Copa do Brasil" onBack={() => nav.goBack()} />
        <Text variant="bodyM" color="textSecondary">
          Nenhuma Copa em andamento.
        </Text>
      </Screen>
    );
  }

  const meuConfronto = confrontoDoClube(copa, clubeUsuarioId);
  const faseAtual = copa.fases[copa.faseAtual];
  const eliminado = !copa.campeao && !meuConfronto;

  const irParaODiaDoJogo = () => {
    if (faseAtual.data) {
      avancarParaData(faseAtual.data);
    }
  };
  const jogarAoVivo = () => {
    irParaODiaDoJogo();
    nav.navigate('MatchSimulation', {copa: true});
  };
  const simularConfronto = () => {
    irParaODiaDoJogo();
    avancarFaseCopa();
    toast('Confronto da Copa disputado.', 'sucesso');
  };
  const avancarChave = () => {
    avancarFaseCopa();
    toast('Fase da Copa disputada.', 'sucesso');
  };

  return (
    <Screen scroll>
      <AppBar
        title="Copa do Brasil"
        subtitle={
          copa.campeao
            ? 'Competição encerrada'
            : `${faseAtual.nome} · ${copa.temporada}`
        }
        onBack={() => nav.goBack()}
      />

      <Image source={LOGO_COPA} style={styles.logo} resizeMode="contain" />

      {copa.campeao ? (
        <Card variante="outlined" style={styles.campeaoCard}>
          <Icon nome="trofeu" size={28} color="accent" />
          <Text variant="titleM">
            Campeão: {nomeClube(todosClubes, copa.campeao)}
          </Text>
        </Card>
      ) : meuConfronto ? (
        <View style={styles.section}>
          <Text variant="labelM" color="textSecondary" style={styles.caps}>
            Seu confronto · {faseAtual.nome}
          </Text>
          <Text variant="titleM">
            {nomeClube(todosClubes, meuConfronto.timeA)} x{' '}
            {nomeClube(todosClubes, meuConfronto.timeB)}
          </Text>
          {copaNaVez ? (
            <View style={styles.acoes}>
              <View style={styles.flex}>
                <Button
                  variante="primary"
                  icone="jogar"
                  titulo="Jogar ao vivo"
                  onPress={jogarAoVivo}
                  fullWidth
                />
              </View>
              <View style={styles.flex}>
                <Button
                  variante="secondary"
                  icone="simular"
                  titulo="Simular"
                  onPress={simularConfronto}
                  fullWidth
                />
              </View>
            </View>
          ) : (
            <Card variante="outlined" style={styles.aguardando}>
              <Icon nome="relogio" size={15} color="accent" />
              <Text variant="bodyM" color="textSecondary" style={styles.flex}>
                Disponível em {formatarDataCurta(faseAtual.data)} — dispute as
                rodadas da liga até a data do jogo.
              </Text>
            </Card>
          )}
        </View>
      ) : eliminado ? (
        <View style={styles.section}>
          <Text variant="labelM" color="textSecondary" style={styles.caps}>
            Você está fora
          </Text>
          <Text variant="bodyM" color="textSecondary">
            Seu clube foi eliminado. Acompanhe o restante da chave.
          </Text>
          <Button
            variante="secondary"
            icone="simular"
            titulo="Avançar fase"
            onPress={avancarChave}
            fullWidth
          />
        </View>
      ) : null}

      {[...copa.fases].reverse().map(fase => (
        <View key={fase.nome} style={styles.section}>
          <Text variant="labelM" color="textSecondary" style={styles.caps}>
            {fase.nome}
          </Text>
          {fase.confrontos.map(confronto => (
            <ConfrontoRow
              key={confronto.id}
              confronto={confronto}
              clubes={todosClubes}
              clubeUsuarioId={clubeUsuarioId}
            />
          ))}
        </View>
      ))}
    </Screen>
  );
}

function LadoConfronto({
  clubeId,
  clubes,
  gols,
  vencedor,
  destaque,
}: {
  clubeId: string;
  clubes: Clube[];
  gols?: number;
  vencedor: boolean;
  destaque: boolean;
}): React.JSX.Element {
  return (
    <View style={styles.lado}>
      <Escudo clubeId={clubeId} sigla={siglaClube(clubes, clubeId)} tamanho={20} />
      <Text
        variant="bodyM"
        color={vencedor ? 'brand' : 'textPrimary'}
        numberOfLines={1}
        style={[styles.flex, vencedor || destaque ? styles.bold : null]}>
        {nomeClube(clubes, clubeId)}
      </Text>
      <Text
        variant="titleM"
        color={vencedor ? 'brand' : 'textPrimary'}
        tabular
        style={styles.gols}>
        {gols ?? '–'}
      </Text>
    </View>
  );
}

function ConfrontoRow({
  confronto,
  clubes,
  clubeUsuarioId,
}: {
  confronto: ConfrontoCopa;
  clubes: Clube[];
  clubeUsuarioId: string | null;
}): React.JSX.Element {
  const {cores} = useTheme();
  const envolveUsuario =
    !!clubeUsuarioId &&
    (confronto.timeA === clubeUsuarioId || confronto.timeB === clubeUsuarioId);
  return (
    <Card
      variante="outlined"
      padding={2}
      style={[styles.confronto, envolveUsuario ? {borderColor: cores.brand} : null]}>
      <LadoConfronto
        clubeId={confronto.timeA}
        clubes={clubes}
        gols={confronto.golsA}
        vencedor={confronto.vencedor === confronto.timeA}
        destaque={confronto.timeA === clubeUsuarioId}
      />
      <LadoConfronto
        clubeId={confronto.timeB}
        clubes={clubes}
        gols={confronto.golsB}
        vencedor={confronto.vencedor === confronto.timeB}
        destaque={confronto.timeB === clubeUsuarioId}
      />
      {confronto.vencedorPenaltis ? (
        <Text variant="caption" color="textSecondary" style={styles.penaltis}>
          Pênaltis: {siglaClube(clubes, confronto.vencedorPenaltis)}
        </Text>
      ) : null}
    </Card>
  );
}

export default Copa;

const styles = StyleSheet.create({
  logo: {alignSelf: 'center', height: 90, width: '70%'},
  campeaoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacamento[2],
  },
  section: {gap: espacamento[2]},
  caps: {textTransform: 'uppercase', letterSpacing: 1},
  acoes: {flexDirection: 'row', gap: espacamento[2]},
  flex: {flex: 1},
  aguardando: {flexDirection: 'row', alignItems: 'center', gap: espacamento[2]},
  confronto: {gap: 4},
  lado: {flexDirection: 'row', alignItems: 'center', gap: espacamento[2]},
  bold: {fontWeight: '900'},
  gols: {minWidth: 24, textAlign: 'right'},
  penaltis: {fontStyle: 'italic'},
});
