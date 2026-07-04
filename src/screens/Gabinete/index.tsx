/**
 * Gabinete de troféus (Módulo 15). Grade de conquistas: desbloqueadas em cor,
 * bloqueadas em cinza com descrição oculta. Cabeçalho com % de conclusão.
 */

import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {IconeGlifo} from '../../components/Icone';
import {AppHeader, ScreenContainer} from '../../components/ui';
import {useAppNavigation} from '../../navigation/types';
import {useAchievementsStore} from '../../store/useAchievementsStore';
import {useGameStore} from '../../store/useGameStore';
import {
  calcularRetrospectiva,
  type PartidaRetro,
} from '../../engine/season/retrospectiva';
import {cores, espaco, raio, sombra, tipografia} from '../../theme';
import {nomeClube} from '../../utils/formatters';
import type {EstadoFinanceiro} from '../../types';

const ESTADO_FINANCEIRO: Record<
  EstadoFinanceiro,
  {rotulo: string; cor: string}
> = {
  SAUDAVEL: {rotulo: 'Saudável', cor: cores.primaria},
  ATENCAO: {rotulo: 'Atenção', cor: cores.secundaria},
  CRITICO: {rotulo: 'Crítico', cor: cores.perigo},
  FALENCIA: {rotulo: 'Falência', cor: cores.perigo},
};

function Gabinete(): React.JSX.Element {
  const nav = useAppNavigation();
  const conquistas = useAchievementsStore(state => state.conquistas);
  const reputacaoTecnico = useGameStore(state => state.reputacaoTecnico);
  const estadoFinanceiro = useGameStore(state => state.estadoFinanceiro);
  const clubeUsuarioId = useGameStore(state => state.clubeUsuarioId);
  const partidas = useGameStore(state => state.partidas);
  const clubes = useGameStore(state => state.clubes);
  const jogadores = useGameStore(state => state.jogadores);

  const desbloqueadas = conquistas.filter(c => c.desbloqueada).length;
  const total = conquistas.length;
  const financeiro = ESTADO_FINANCEIRO[estadoFinanceiro];

  // Retrospectiva da temporada — balanço e recordes derivados das partidas.
  const retro = React.useMemo(() => {
    if (!clubeUsuarioId) {
      return null;
    }
    const jogadas: PartidaRetro[] = partidas
      .filter(
        partida =>
          partida.jogada &&
          (partida.timeCasa === clubeUsuarioId ||
            partida.timeFora === clubeUsuarioId),
      )
      .sort((a, b) => a.rodada - b.rodada)
      .map(partida => ({
        timeCasa: partida.timeCasa,
        timeFora: partida.timeFora,
        placarCasa: partida.placarCasa ?? 0,
        placarFora: partida.placarFora ?? 0,
        gols: partida.eventos
          .filter(evento => evento.tipo === 'gol')
          .map(evento => ({
            timeId: evento.timeId,
            jogadorId: evento.jogadorId,
          })),
      }));
    if (jogadas.length === 0) {
      return null;
    }
    return calcularRetrospectiva(jogadas, clubeUsuarioId);
  }, [partidas, clubeUsuarioId]);

  const artilheiroNome = retro?.artilheiro
    ? (jogadores.find(j => j.id === retro.artilheiro?.jogadorId)?.apelido ??
      jogadores.find(j => j.id === retro.artilheiro?.jogadorId)?.nome ??
      'Desconhecido')
    : null;

  return (
    <ScreenContainer scroll>
      <AppHeader
        titulo="Gabinete"
        subtitulo={`${desbloqueadas}/${total} conquistas`}
        onBack={() => nav.goBack()}
      />

      {clubeUsuarioId ? (
        <View style={styles.carreiraCard}>
          <View style={styles.carreiraItem}>
            <Text style={styles.carreiraRotulo}>Reputação do técnico</Text>
            <Text style={styles.carreiraValor}>{reputacaoTecnico}/100</Text>
            <View style={styles.barraFundo}>
              <View
                style={[
                  styles.barraPreenchida,
                  {width: `${reputacaoTecnico}%`},
                ]}
              />
            </View>
          </View>
          <View style={styles.carreiraItem}>
            <Text style={styles.carreiraRotulo}>Finanças</Text>
            <View
              style={[styles.estadoChip, {backgroundColor: `${financeiro.cor}22`}]}>
              <Text style={[styles.estadoTexto, {color: financeiro.cor}]}>
                {financeiro.rotulo}
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      {retro ? (
        <View style={styles.retroCard}>
          <Text style={styles.retroTitulo}>Retrospectiva da temporada</Text>
          <View style={styles.retroLinha}>
            <Text style={styles.retroRotulo}>Campanha</Text>
            <Text style={styles.retroValor}>
              {retro.vitorias}V {retro.empates}E {retro.derrotas}D ·{' '}
              {retro.aproveitamento}%
            </Text>
          </View>
          <View style={styles.retroLinha}>
            <Text style={styles.retroRotulo}>Gols</Text>
            <Text style={styles.retroValor}>
              {retro.golsPro} pró · {retro.golsContra} contra (
              {retro.saldo >= 0 ? '+' : ''}
              {retro.saldo})
            </Text>
          </View>
          {retro.maiorVitoria ? (
            <View style={styles.retroLinha}>
              <Text style={styles.retroRotulo}>Maior vitória</Text>
              <Text style={styles.retroValor} numberOfLines={1}>
                {retro.maiorVitoria.golsFavor}x{retro.maiorVitoria.golsContra} vs{' '}
                {nomeClube(clubes, retro.maiorVitoria.adversarioId)}
              </Text>
            </View>
          ) : null}
          {retro.maiorDerrota ? (
            <View style={styles.retroLinha}>
              <Text style={styles.retroRotulo}>Maior derrota</Text>
              <Text style={styles.retroValor} numberOfLines={1}>
                {retro.maiorDerrota.golsFavor}x{retro.maiorDerrota.golsContra} vs{' '}
                {nomeClube(clubes, retro.maiorDerrota.adversarioId)}
              </Text>
            </View>
          ) : null}
          {retro.maiorSequenciaVitorias >= 2 ? (
            <View style={styles.retroLinha}>
              <Text style={styles.retroRotulo}>Melhor sequência</Text>
              <Text style={styles.retroValor}>
                {retro.maiorSequenciaVitorias} vitórias seguidas
              </Text>
            </View>
          ) : null}
          {retro.artilheiro && artilheiroNome ? (
            <View style={styles.retroLinha}>
              <Text style={styles.retroRotulo}>Artilheiro</Text>
              <Text style={styles.retroValor} numberOfLines={1}>
                {artilheiroNome} ({retro.artilheiro.gols}{' '}
                {retro.artilheiro.gols === 1 ? 'gol' : 'gols'})
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.grade}>
        {conquistas.map(conquista => (
          <View
            key={conquista.id}
            style={[
              styles.card,
              conquista.desbloqueada ? styles.cardAtivo : styles.cardInativo,
            ]}>
            <IconeGlifo
              nome={conquista.desbloqueada ? conquista.icone : 'lock-outline'}
              tamanho={32}
              cor={
                conquista.desbloqueada
                  ? conquista.corIcone
                  : cores.textoSecundario
              }
            />
            <Text
              style={[
                styles.nome,
                conquista.desbloqueada ? null : styles.textoInativo,
              ]}
              numberOfLines={1}>
              {conquista.nome}
            </Text>
            <Text style={styles.descricao} numberOfLines={2}>
              {conquista.desbloqueada ? conquista.descricao : '???'}
            </Text>
            {conquista.desbloqueada && conquista.dataDesbloqueio ? (
              <Text style={styles.data}>{conquista.dataDesbloqueio}</Text>
            ) : null}
          </View>
        ))}
      </View>
    </ScreenContainer>
  );
}

export default Gabinete;

const styles = StyleSheet.create({
  retroCard: {
    backgroundColor: cores.superficieElevada,
    borderColor: cores.bordaTransl,
    borderRadius: raio.lg,
    borderWidth: 1,
    gap: espaco.xs,
    marginBottom: espaco.md,
    padding: espaco.md,
    ...sombra.card,
  },
  retroTitulo: {
    color: cores.texto,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: espaco.xs,
  },
  retroLinha: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: espaco.md,
  },
  retroRotulo: {
    color: cores.textoSecundario,
    fontSize: 12.5,
    fontWeight: '600',
  },
  retroValor: {
    color: cores.texto,
    flexShrink: 1,
    fontSize: 12.5,
    fontWeight: '800',
    textAlign: 'right',
  },
  carreiraCard: {
    backgroundColor: cores.superficieElevada,
    borderColor: cores.bordaTransl,
    borderRadius: raio.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: espaco.lg,
    marginBottom: espaco.md,
    padding: espaco.md,
    ...sombra.card,
  },
  carreiraItem: {
    flex: 1,
    gap: espaco.xs,
  },
  carreiraRotulo: {
    color: cores.textoSecundario,
    fontSize: 12,
    fontWeight: '700',
  },
  carreiraValor: {
    color: cores.texto,
    ...tipografia.numero,
  },
  barraFundo: {
    backgroundColor: cores.fundo,
    borderRadius: raio.sm,
    height: 6,
    overflow: 'hidden',
  },
  barraPreenchida: {
    backgroundColor: cores.primaria,
    height: 6,
  },
  estadoChip: {
    alignSelf: 'flex-start',
    borderRadius: raio.sm,
    paddingHorizontal: espaco.sm,
    paddingVertical: espaco.xs,
  },
  estadoTexto: {
    fontSize: 14,
    fontWeight: '800',
  },
  grade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaco.sm,
  },
  card: {
    alignItems: 'center',
    borderRadius: raio.lg,
    borderWidth: 1,
    gap: espaco.xs,
    minHeight: 132,
    padding: espaco.md,
    width: '48%',
    ...sombra.card,
  },
  cardAtivo: {
    backgroundColor: cores.superficieElevada,
    borderColor: cores.bordaTransl,
  },
  cardInativo: {
    backgroundColor: cores.fundo,
    borderColor: cores.bordaTransl,
    opacity: 0.75,
  },
  nome: {
    color: cores.texto,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  textoInativo: {
    color: cores.textoSecundario,
  },
  descricao: {
    color: cores.textoSecundario,
    fontSize: 11,
    textAlign: 'center',
  },
  data: {
    color: cores.primaria,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
});
