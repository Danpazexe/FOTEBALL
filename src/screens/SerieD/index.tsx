/**
 * Série D — tela de chaveamento do MATA-MATA (carreira na D).
 *
 * Mostra as fases da chave do usuário (fasesResolvidas + fase corrente), com
 * placar agregado, vencedor e pênaltis, destacando o clube do usuário. Quando o
 * usuário tem um confronto em aberto, oferece disputá-lo (simulação por ora — a
 * fase de grupos é que se joga ao vivo). Eliminado/campeão, mostra o desfecho.
 */

import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';

import {LOGO_SERIE_D} from '../../assets/escudos';
import {
  AppHeader,
  Botao,
  ScreenContainer,
  Section,
  TextoVazio,
} from '../../components/ui';
import Escudo from '../../components/Escudo';
import Icone from '../../components/Icone';
import {useToast} from '../../components/feedback';
import type {ConfrontoMataMata} from '../../engine/competitions';
import {useAppNavigation} from '../../navigation/types';
import {useGameStore} from '../../store/useGameStore';
import {cores, espaco, raio, sombra, tipografia} from '../../theme';
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
      <ScreenContainer>
        <AppHeader titulo="Série D" onBack={() => nav.goBack()} />
        <TextoVazio>Mata-mata da Série D não iniciado.</TextoVazio>
      </ScreenContainer>
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
        : (carreira.faseCorrente?.nome ?? 'Mata-mata');

  return (
    <ScreenContainer scroll>
      <AppHeader
        titulo="Série D · Mata-mata"
        subtitulo={subtitulo}
        onBack={() => nav.goBack()}
      />

      <Image source={LOGO_SERIE_D} style={styles.logo} resizeMode="contain" />

      {carreira.fase === 'campeao' ? (
        <View style={styles.desfechoCard}>
          <Icone nome="trofeu" tamanho={28} cor={cores.secundaria} />
          <Text style={styles.desfechoTexto}>
            Campeão da Série D e acesso à Série C!
          </Text>
        </View>
      ) : carreira.fase === 'eliminado' ? (
        <View style={styles.desfechoCard}>
          <Icone
            nome={carreira.acessoConquistado ? 'trofeu' : 'apito'}
            tamanho={24}
            cor={carreira.acessoConquistado ? cores.sucesso : cores.textoMuted}
          />
          <Text style={styles.desfechoTexto}>
            {carreira.acessoConquistado
              ? 'Eliminado, mas com o ACESSO à Série C garantido!'
              : 'Eliminado, sem acesso nesta temporada.'}
          </Text>
        </View>
      ) : meuConfronto ? (
        <Section titulo={`Seu confronto · ${carreira.faseCorrente?.nome ?? ''}`}>
          <Text style={styles.confrontoDestaque}>
            {nomeClube(todosClubes, meuConfronto.clubeA)} x{' '}
            {nomeClube(todosClubes, meuConfronto.clubeB)}
          </Text>
          <Text style={styles.mandoTexto}>
            Ida na casa de {siglaClube(todosClubes, meuConfronto.clubeA)} · volta
            na casa de {siglaClube(todosClubes, meuConfronto.clubeB)} (melhor
            campanha)
          </Text>
          <Botao
            variante="ouro"
            icone="simular"
            titulo="Disputar confronto"
            onPress={disputar}
          />
        </Section>
      ) : null}

      {fasesParaMostrar.map(fase => (
        <Section key={fase.nome} titulo={fase.nome}>
          <View style={styles.lista}>
            {fase.confrontos.map(confronto => (
              <ConfrontoRow
                key={confronto.id}
                confronto={confronto}
                clubes={todosClubes}
                clubeUsuarioId={clubeUsuarioId}
              />
            ))}
          </View>
        </Section>
      ))}
    </ScreenContainer>
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
        style={[
          styles.ladoNome,
          vencedor ? styles.vencedor : null,
          destaque ? styles.destaque : null,
        ]}
        numberOfLines={1}>
        {nomeClube(clubes, clubeId)}
      </Text>
      <Text style={[styles.gols, vencedor ? styles.vencedor : null]}>
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
  const envolveUsuario =
    !!clubeUsuarioId &&
    (confronto.clubeA === clubeUsuarioId ||
      confronto.clubeB === clubeUsuarioId);
  const temVolta =
    confronto.golsVoltaA !== undefined && confronto.golsVoltaB !== undefined;
  return (
    <View
      style={[
        styles.confronto,
        envolveUsuario ? styles.confrontoUsuario : null,
      ]}>
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
        <Text style={styles.detalhe}>
          ida {confronto.golsIdaA}–{confronto.golsIdaB} · volta{' '}
          {confronto.golsVoltaB}–{confronto.golsVoltaA}
        </Text>
      ) : null}
      {confronto.decididoPor === 'PENALTIS' ? (
        <Text style={styles.detalhe}>
          Pênaltis: {confronto.penaltisA}–{confronto.penaltisB} (vence{' '}
          {siglaClube(clubes, confronto.vencedor ?? '')})
        </Text>
      ) : null}
    </View>
  );
}

export default SerieD;

const styles = StyleSheet.create({
  logo: {
    alignSelf: 'center',
    height: 84,
    marginBottom: espaco.md,
    width: '60%',
  },
  desfechoCard: {
    ...sombra.card,
    alignItems: 'center',
    backgroundColor: cores.superficieElevada,
    borderColor: cores.bordaTransl,
    borderRadius: raio.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: espaco.sm,
    justifyContent: 'center',
    marginBottom: espaco.lg,
    padding: espaco.lg,
  },
  desfechoTexto: {
    color: cores.texto,
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
  },
  confrontoDestaque: {
    color: cores.texto,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  mandoTexto: {
    color: cores.textoSecundario,
    fontSize: 12.5,
    marginBottom: espaco.md,
  },
  lista: {
    gap: espaco.sm,
  },
  confronto: {
    ...sombra.card,
    backgroundColor: cores.superficieElevada,
    borderColor: cores.bordaTransl,
    borderRadius: raio.lg,
    borderWidth: 1,
    gap: 4,
    padding: espaco.sm,
  },
  confrontoUsuario: {
    borderColor: cores.primaria,
    borderWidth: 1,
  },
  lado: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.sm,
  },
  ladoNome: {
    color: cores.texto,
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  gols: {
    ...tipografia.numero,
    color: cores.texto,
    minWidth: 24,
    textAlign: 'right',
  },
  vencedor: {
    color: cores.primaria,
    fontWeight: '900',
  },
  destaque: {
    fontWeight: '900',
  },
  detalhe: {
    color: cores.textoSecundario,
    fontSize: 11,
    fontStyle: 'italic',
  },
});
