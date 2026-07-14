/**
 * Série D — chaveamento do MATA-MATA (carreira na D). Fases com agregado
 * ida/volta, vencedor e pênaltis, destacando o clube. Migrada ao Design System v2.
 */

import React from 'react';
import {Image, StyleSheet, View} from 'react-native';

import {LOGO_SERIE_D} from '../../assets/escudos';
import Escudo from '../../components/Escudo';
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
import type {ConfrontoMataMata} from '../../engine/competitions';
import {useAppNavigation} from '../../navigation/types';
import {useGameStore} from '../../store/useGameStore';
import {nomeClube, siglaClube} from '../../utils/formatters';
import type {Clube} from '../../types';

function SerieD(): React.JSX.Element {
  const nav = useAppNavigation();
  const toast = useToast();
  const carreira = useGameStore(state => state.serieDCarreira);
  const todosClubes = useGameStore(state => state.todosClubes);
  const clubeUsuarioId = useGameStore(state => state.clubeUsuarioId);
  const avancarMataMata = useGameStore(state => state.avancarMataMataDaCarreira);

  if (!carreira) {
    return (
      <Screen
        scroll
        header={<AppBar title="Série D" onBack={() => nav.goBack()} />}>
        <Text variant="bodyM" color="textSecondary">
          Mata-mata da Série D não iniciado.
        </Text>
      </Screen>
    );
  }

  const meuConfronto = carreira.faseCorrente?.confrontos.find(
    confronto =>
      !confronto.vencedor &&
      (confronto.clubeA === clubeUsuarioId ||
        confronto.clubeB === clubeUsuarioId),
  );
  const fasesParaMostrar = [
    ...(carreira.faseCorrente ? [carreira.faseCorrente] : []),
    ...[...carreira.fasesResolvidas].reverse(),
  ];

  const disputar = () => {
    avancarMataMata();
    toast('Confronto disputado.', 'sucesso');
  };

  const subtitulo =
    carreira.fase === 'campeao'
      ? 'Campeão da Série D!'
      : carreira.fase === 'eliminado'
      ? 'Sua campanha terminou'
      : carreira.faseCorrente?.nome ?? 'Mata-mata';

  return (
    <Screen
      scroll
      header={
        <AppBar
          title="Série D · Mata-mata"
          subtitle={subtitulo}
          onBack={() => nav.goBack()}
        />
      }>

      <Image source={LOGO_SERIE_D} style={styles.logo} resizeMode="contain" />

      {carreira.fase === 'campeao' ? (
        <Card variante="outlined" style={styles.desfechoCard}>
          <Icon nome="trofeu" size={28} color="accent" />
          <Text variant="titleM" style={styles.flex}>
            Campeão da Série D e acesso à Série C!
          </Text>
        </Card>
      ) : carreira.fase === 'eliminado' ? (
        <Card variante="outlined" style={styles.desfechoCard}>
          <Icon
            nome={carreira.acessoConquistado ? 'trofeu' : 'apito'}
            size={24}
            color={carreira.acessoConquistado ? 'success' : 'textMuted'}
          />
          <Text variant="titleM" style={styles.flex}>
            {carreira.acessoConquistado
              ? 'Eliminado, mas com o ACESSO à Série C garantido!'
              : 'Eliminado, sem acesso nesta temporada.'}
          </Text>
        </Card>
      ) : meuConfronto ? (
        <View style={styles.section}>
          <Text variant="labelM" color="textSecondary" style={styles.caps}>
            Seu confronto · {carreira.faseCorrente?.nome ?? ''}
          </Text>
          <Text variant="titleM">
            {nomeClube(todosClubes, meuConfronto.clubeA)} x{' '}
            {nomeClube(todosClubes, meuConfronto.clubeB)}
          </Text>
          <Text variant="caption" color="textSecondary">
            Ida na casa de {siglaClube(todosClubes, meuConfronto.clubeA)} · volta
            na casa de {siglaClube(todosClubes, meuConfronto.clubeB)} (melhor
            campanha)
          </Text>
          <Button
            variante="primary"
            icone="simular"
            titulo="Disputar confronto"
            onPress={disputar}
            fullWidth
          />
        </View>
      ) : null}

      {fasesParaMostrar.map(fase => (
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

function Lado({
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
  confronto: ConfrontoMataMata;
  clubes: Clube[];
  clubeUsuarioId: string | null;
}): React.JSX.Element {
  const {cores} = useTheme();
  const envolveUsuario =
    !!clubeUsuarioId &&
    (confronto.clubeA === clubeUsuarioId ||
      confronto.clubeB === clubeUsuarioId);
  const temVolta =
    confronto.golsVoltaA !== undefined && confronto.golsVoltaB !== undefined;
  return (
    <Card
      variante="outlined"
      padding={2}
      style={[styles.confronto, envolveUsuario ? {borderColor: cores.brand} : null]}>
      <Lado
        clubeId={confronto.clubeA}
        clubes={clubes}
        gols={confronto.agregadoA}
        vencedor={confronto.vencedor === confronto.clubeA}
        destaque={confronto.clubeA === clubeUsuarioId}
      />
      <Lado
        clubeId={confronto.clubeB}
        clubes={clubes}
        gols={confronto.agregadoB}
        vencedor={confronto.vencedor === confronto.clubeB}
        destaque={confronto.clubeB === clubeUsuarioId}
      />
      {confronto.vencedor && temVolta ? (
        <Text variant="caption" color="textSecondary" style={styles.detalhe}>
          ida {confronto.golsIdaA}–{confronto.golsIdaB} · volta{' '}
          {confronto.golsVoltaB}–{confronto.golsVoltaA}
        </Text>
      ) : null}
      {confronto.decididoPor === 'PENALTIS' ? (
        <Text variant="caption" color="textSecondary" style={styles.detalhe}>
          Pênaltis: {confronto.penaltisA}–{confronto.penaltisB} (vence{' '}
          {siglaClube(clubes, confronto.vencedor ?? '')})
        </Text>
      ) : null}
    </Card>
  );
}

export default SerieD;

const styles = StyleSheet.create({
  logo: {alignSelf: 'center', height: 84, width: '60%'},
  desfechoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacamento[2],
  },
  section: {gap: espacamento[2]},
  caps: {textTransform: 'uppercase', letterSpacing: 1},
  flex: {flex: 1},
  confronto: {gap: 4},
  lado: {flexDirection: 'row', alignItems: 'center', gap: espacamento[2]},
  bold: {fontWeight: '900'},
  gols: {minWidth: 24, textAlign: 'right'},
  detalhe: {fontStyle: 'italic'},
});
