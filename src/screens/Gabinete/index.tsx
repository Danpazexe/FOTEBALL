/**
 * Gabinete de troféus. Reputação, finanças, jornada do técnico, propostas,
 * retrospectiva da temporada e grade de conquistas. Migrado ao Design System v2.
 */

import React from 'react';
import {StyleSheet, View} from 'react-native';

import {IconeGlifo} from '../../components/Icone';
import StatCard from '../../components/StatCard';
import {
  AppBar,
  Badge,
  Button,
  Card,
  EmptyState,
  Screen,
  Text,
  espacamento,
  raios,
  useTheme,
} from '../../design-system';
import {useConfirm, useToast} from '../../components/feedback';
import {useAppNavigation} from '../../navigation/types';
import {useAchievementsStore} from '../../store/useAchievementsStore';
import {useGameStore} from '../../store/useGameStore';
import {
  calcularRetrospectiva,
  type PartidaRetro,
} from '../../engine/season/retrospectiva';
import {calcularJornada} from '../../engine/carreira/jornada';
import {proporEmpregos} from '../../engine/carreira/propostas';
import {nomeClube} from '../../utils/formatters';
import type {EstadoFinanceiro} from '../../types';

type TomBadge = 'success' | 'accent' | 'danger';

const ESTADO_FINANCEIRO: Record<
  EstadoFinanceiro,
  {rotulo: string; tom: TomBadge}
> = {
  SAUDAVEL: {rotulo: 'Saudável', tom: 'success'},
  ATENCAO: {rotulo: 'Atenção', tom: 'accent'},
  CRITICO: {rotulo: 'Crítico', tom: 'danger'},
  FALENCIA: {rotulo: 'Falência', tom: 'danger'},
};

function Barra({pct}: {pct: number}): React.JSX.Element {
  const {cores} = useTheme();
  return (
    <View style={[styles.barraFundo, {backgroundColor: cores.surfaceSubtle}]}>
      <View
        style={[styles.barra, {width: `${pct}%`, backgroundColor: cores.brand}]}
      />
    </View>
  );
}

function RetroLinha({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
}): React.JSX.Element {
  return (
    <View style={styles.retroLinha}>
      <Text variant="bodyM" color="textSecondary">
        {rotulo}
      </Text>
      <Text
        variant="labelL"
        color={destaque ? 'accent' : 'textPrimary'}
        numberOfLines={1}
        style={styles.retroValor}>
        {valor}
      </Text>
    </View>
  );
}

function Gabinete(): React.JSX.Element {
  const nav = useAppNavigation();
  const confirm = useConfirm();
  const toast = useToast();
  const {cores} = useTheme();
  const conquistas = useAchievementsStore(state => state.conquistas);
  const reputacaoTecnico = useGameStore(state => state.reputacaoTecnico);
  const estadoFinanceiro = useGameStore(state => state.estadoFinanceiro);
  const clubeUsuarioId = useGameStore(state => state.clubeUsuarioId);
  const partidas = useGameStore(state => state.partidas);
  const clubes = useGameStore(state => state.clubes);
  const jogadores = useGameStore(state => state.jogadores);
  const todosClubes = useGameStore(state => state.todosClubes);
  const assumirClube = useGameStore(state => state.assumirClube);

  const desbloqueadas = conquistas.filter(c => c.desbloqueada).length;
  const total = conquistas.length;
  const conquistasPct = total > 0 ? Math.round((desbloqueadas / total) * 100) : 0;
  const financeiro = ESTADO_FINANCEIRO[estadoFinanceiro];

  const jornada = clubeUsuarioId ? calcularJornada(reputacaoTecnico) : null;

  const propostas = React.useMemo(() => {
    if (!clubeUsuarioId) {
      return [];
    }
    const atual = todosClubes.find(clube => clube.id === clubeUsuarioId);
    if (!atual) {
      return [];
    }
    return proporEmpregos({
      reputacaoTecnico,
      clubeAtualId: clubeUsuarioId,
      reputacaoClubeAtual: atual.reputacao,
      clubes: todosClubes,
    });
  }, [clubeUsuarioId, todosClubes, reputacaoTecnico]);

  async function aceitarProposta(clubeId: string, nome: string): Promise<void> {
    const ok = await confirm({
      titulo: `Assumir o ${nome}?`,
      mensagem:
        'Você deixa o clube atual e recomeça a temporada no comando do novo clube. Sua reputação é preservada.',
      confirmarLabel: 'Aceitar proposta',
    });
    if (!ok) {
      return;
    }
    assumirClube(clubeId);
    toast(`Agora você comanda o ${nome}.`, 'sucesso');
    nav.navigate('MainTabs');
  }

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
    <Screen
      scroll
      header={
        <AppBar
          title="Gabinete"
          subtitle={`${desbloqueadas}/${total} conquistas`}
          onBack={() => nav.goBack()}
        />
      }>

      {clubeUsuarioId ? (
        <Card variante="outlined" style={styles.carreiraCard}>
          <View style={styles.carreiraItem}>
            <Text variant="labelM" color="textSecondary" style={styles.caps}>
              Reputação do técnico
            </Text>
            <Text variant="titleL" tabular>
              {reputacaoTecnico}
              <Text variant="labelM" color="textMuted">
                /100
              </Text>
            </Text>
            <Barra pct={reputacaoTecnico} />
          </View>
          <View style={styles.carreiraItem}>
            <Text variant="labelM" color="textSecondary" style={styles.caps}>
              Finanças
            </Text>
            <View style={styles.selfStart}>
              <Badge label={financeiro.rotulo} tom={financeiro.tom} />
            </View>
          </View>
        </Card>
      ) : (
        <EmptyState
          icone="clube"
          title="Nenhum clube no comando"
          description="Assuma um clube para acompanhar reputação, finanças, jornada e a retrospectiva da temporada."
        />
      )}

      {jornada ? (
        <Card variante="outlined" style={styles.card}>
          <View style={styles.rowBetween}>
            <Text variant="labelM" color="textSecondary" style={styles.caps}>
              Jornada do técnico
            </Text>
            <Text variant="labelL" color="brand">
              {jornada.estagioAtual}
            </Text>
          </View>
          <Text variant="caption" color="textSecondary">
            {jornada.descricaoAtual}
          </Text>
          <Barra pct={Math.round(jornada.progressoAteProximo * 100)} />
          <Text variant="caption" color="textMuted">
            {jornada.proximoMarco
              ? `Próximo: ${jornada.proximoMarco.estagio} (rep. ${jornada.proximoMarco.reputacaoMinima})`
              : 'Auge da carreira alcançado.'}
          </Text>
        </Card>
      ) : null}

      {propostas.length > 0 ? (
        <Card variante="outlined" style={styles.card}>
          <Text variant="labelM" color="textSecondary" style={styles.caps}>
            Propostas de clubes
          </Text>
          {propostas.map(proposta => (
            <View key={proposta.clubeId} style={styles.propostaLinha}>
              <View style={styles.flex}>
                <Text variant="titleM" numberOfLines={1}>
                  {proposta.nome}
                </Text>
                <Text variant="caption" color="textSecondary" numberOfLines={1}>
                  {proposta.divisao} · reputação {proposta.reputacao}
                </Text>
              </View>
              <Button
                titulo="Assumir"
                variante="secondary"
                tamanho="sm"
                onPress={() => aceitarProposta(proposta.clubeId, proposta.nome)}
              />
            </View>
          ))}
        </Card>
      ) : null}

      {clubeUsuarioId ? (
        <Card variante="outlined" style={styles.card}>
          <Text variant="labelM" color="textSecondary" style={styles.caps}>
            Retrospectiva da temporada
          </Text>
          {retro ? (
            <>
              <View style={styles.statRow}>
                <StatCard
                  label="Aproveitamento"
                  valor={`${retro.aproveitamento}%`}
                  sub={`${retro.vitorias}V · ${retro.empates}E · ${retro.derrotas}D`}
                />
                <StatCard
                  label="Saldo de gols"
                  valor={`${retro.saldo >= 0 ? '+' : ''}${retro.saldo}`}
                  sub={`${retro.golsPro} pró · ${retro.golsContra} contra`}
                  corValor={retro.saldo >= 0 ? cores.success : cores.danger}
                />
              </View>
              {retro.maiorVitoria ? (
                <RetroLinha
                  rotulo="Maior vitória"
                  valor={`${retro.maiorVitoria.golsFavor}x${retro.maiorVitoria.golsContra} vs ${nomeClube(clubes, retro.maiorVitoria.adversarioId)}`}
                />
              ) : null}
              {retro.maiorDerrota ? (
                <RetroLinha
                  rotulo="Maior derrota"
                  valor={`${retro.maiorDerrota.golsFavor}x${retro.maiorDerrota.golsContra} vs ${nomeClube(clubes, retro.maiorDerrota.adversarioId)}`}
                />
              ) : null}
              {retro.maiorSequenciaVitorias >= 2 ? (
                <RetroLinha
                  rotulo="Melhor sequência"
                  valor={`${retro.maiorSequenciaVitorias} vitórias seguidas`}
                />
              ) : null}
              {retro.artilheiro && artilheiroNome ? (
                <RetroLinha
                  rotulo="Artilheiro"
                  destaque
                  valor={`${artilheiroNome} (${retro.artilheiro.gols} ${retro.artilheiro.gols === 1 ? 'gol' : 'gols'})`}
                />
              ) : null}
            </>
          ) : (
            <Text variant="bodyM" color="textSecondary">
              Jogue a primeira partida da temporada para ver seu balanço e
              recordes aqui.
            </Text>
          )}
        </Card>
      ) : null}

      <View style={styles.rowBetween}>
        <Text variant="labelM" color="textSecondary" style={styles.caps}>
          Conquistas
        </Text>
        <Text variant="titleM" tabular>
          {conquistasPct}%
        </Text>
      </View>
      <Barra pct={conquistasPct} />
      <View style={styles.grade}>
        {conquistas.map(conquista => (
          <Card
            key={conquista.id}
            variante="outlined"
            style={[styles.conquistaCard, conquista.desbloqueada ? null : styles.inativo]}>
            <IconeGlifo
              nome={conquista.desbloqueada ? conquista.icone : 'lock-outline'}
              tamanho={32}
              cor={
                conquista.desbloqueada ? conquista.corIcone : cores.textSecondary
              }
            />
            <Text
              variant="labelL"
              color={conquista.desbloqueada ? 'textPrimary' : 'textSecondary'}
              numberOfLines={1}
              align="center">
              {conquista.nome}
            </Text>
            <Text
              variant="caption"
              color="textSecondary"
              numberOfLines={2}
              align="center">
              {conquista.desbloqueada ? conquista.descricao : '???'}
            </Text>
            {conquista.desbloqueada && conquista.dataDesbloqueio ? (
              <Text variant="caption" color="brand" tabular>
                {conquista.dataDesbloqueio}
              </Text>
            ) : null}
          </Card>
        ))}
      </View>
    </Screen>
  );
}

export default Gabinete;

const styles = StyleSheet.create({
  caps: {textTransform: 'uppercase', letterSpacing: 1},
  carreiraCard: {flexDirection: 'row', gap: espacamento[4]},
  carreiraItem: {flex: 1, gap: espacamento[1]},
  selfStart: {alignSelf: 'flex-start'},
  card: {gap: espacamento[2]},
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  propostaLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[3],
  },
  flex: {flex: 1},
  statRow: {flexDirection: 'row', gap: espacamento[2]},
  retroLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacamento[3],
  },
  retroValor: {flexShrink: 1, textAlign: 'right'},
  grade: {flexDirection: 'row', flexWrap: 'wrap', gap: espacamento[2]},
  conquistaCard: {
    width: '48%',
    minHeight: 132,
    alignItems: 'center',
    gap: espacamento[1],
  },
  inativo: {opacity: 0.75},
  barraFundo: {height: 6, borderRadius: raios.sm, overflow: 'hidden'},
  barra: {height: 6},
});
