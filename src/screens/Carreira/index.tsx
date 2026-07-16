/**
 * Carreira do Técnico (aba Clube). Estágio da jornada (reputação → nome), campanha
 * da temporada derivada das partidas (J/V/E/D + aproveitamento), confiança da
 * diretoria e conquistas desbloqueadas. Tudo derivado de dado REAL. DS v2.
 */
import React, {useMemo} from 'react';
import {StyleSheet, View} from 'react-native';

import {
  AppHeader,
  Card,
  Divider,
  EmptyState,
  Icon,
  OverallRing,
  ProgressBar,
  Screen,
  TeamCrest,
  Text,
  espacamento,
  useTheme,
} from '../../design-system';
import {calcularJornada} from '../../engine/carreira/jornada';
import {selecionarClubeUsuario, useGameStore} from '../../store/useGameStore';
import {useAchievementsStore} from '../../store/useAchievementsStore';
import {useClubeNavigation} from '../../navigation/types';

function Carreira(): React.JSX.Element {
  const nav = useClubeNavigation();
  const {cores} = useTheme();
  const clube = useGameStore(selecionarClubeUsuario);
  const clubeUsuarioId = useGameStore(state => state.clubeUsuarioId);
  const partidas = useGameStore(state => state.partidas);
  const reputacaoTecnico = useGameStore(state => state.reputacaoTecnico);
  const conquistas = useAchievementsStore(state => state.conquistas);

  const voltar = () =>
    nav.canGoBack() ? nav.goBack() : nav.navigate('CentralClube');

  const campanha = useMemo(() => {
    let jogos = 0;
    let vitorias = 0;
    let empates = 0;
    let derrotas = 0;
    if (clubeUsuarioId) {
      for (const p of partidas) {
        if (!p.jogada || p.placarCasa === undefined || p.placarFora === undefined) {
          continue;
        }
        const ehCasa = p.timeCasa === clubeUsuarioId;
        const ehFora = p.timeFora === clubeUsuarioId;
        if (!ehCasa && !ehFora) {
          continue;
        }
        const pro = ehCasa ? p.placarCasa : p.placarFora;
        const con = ehCasa ? p.placarFora : p.placarCasa;
        jogos += 1;
        if (pro > con) {
          vitorias += 1;
        } else if (pro === con) {
          empates += 1;
        } else {
          derrotas += 1;
        }
      }
    }
    const aproveitamento =
      jogos > 0 ? Math.round(((vitorias * 3 + empates) / (jogos * 3)) * 100) : 0;
    return {jogos, vitorias, empates, derrotas, aproveitamento};
  }, [partidas, clubeUsuarioId]);

  const jornada = calcularJornada(reputacaoTecnico);
  const desbloqueadas = useMemo(
    () => conquistas.filter(c => c.desbloqueada),
    [conquistas],
  );

  if (!clube) {
    return (
      <Screen header={<AppHeader title="Carreira" onBack={voltar} />}>
        <View style={styles.vazio}>
          <EmptyState
            icone="medalha"
            title="Sem carreira ativa"
            description="Inicie ou carregue uma carreira para ver o seu histórico."
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll header={<AppHeader title="Carreira" onBack={voltar} />}>
      {/* Estágio da jornada */}
      <Card variante="outlined" style={styles.jornadaCard}>
        <View style={styles.jornadaTopo}>
          <TeamCrest clubeId={clube.id} sigla={clube.sigla} size={48} />
          <View style={styles.flex}>
            <Text variant="titleL" numberOfLines={1}>
              {jornada.estagioAtual}
            </Text>
            <Text variant="labelM" color="textSecondary" numberOfLines={2}>
              {jornada.descricaoAtual}
            </Text>
          </View>
        </View>
        {jornada.proximoMarco ? (
          <>
            <ProgressBar valor={jornada.progressoAteProximo * 100} />
            <Text variant="caption" color="textMuted">
              Próximo estágio: {jornada.proximoMarco.estagio}
            </Text>
          </>
        ) : null}
      </Card>

      {/* Campanha (J/V/E/D) */}
      <Text variant="labelM" color="textSecondary" style={styles.caps}>
        Desempenho geral
      </Text>
      <Card variante="outlined" style={styles.statsRow}>
        <CelulaStat valor={campanha.jogos} rotulo="Jogos" />
        <Divider vertical />
        <CelulaStat valor={campanha.vitorias} rotulo="Vitórias" tom="success" />
        <Divider vertical />
        <CelulaStat valor={campanha.empates} rotulo="Empates" />
        <Divider vertical />
        <CelulaStat valor={campanha.derrotas} rotulo="Derrotas" tom="danger" />
      </Card>

      {/* Aproveitamento + Confiança (anéis) */}
      <Card variante="outlined" style={styles.aneisRow}>
        <View style={styles.anel}>
          <OverallRing valor={campanha.aproveitamento} tamanho={64} rotulo="Aprov." />
        </View>
        <View style={[styles.divisorV, {backgroundColor: cores.border}]} />
        <View style={styles.anel}>
          <OverallRing valor={reputacaoTecnico} tamanho={64} rotulo="Diretoria" />
        </View>
      </Card>

      {/* Conquistas */}
      <View style={styles.secao}>
        <Text variant="labelM" color="textSecondary" style={styles.caps}>
          Conquistas ({desbloqueadas.length})
        </Text>
        {desbloqueadas.length === 0 ? (
          <Text variant="bodyM" color="textSecondary">
            Nenhuma conquista ainda. Vá em busca de títulos!
          </Text>
        ) : (
          <Card variante="outlined" padding={0} style={styles.listaCard}>
            {desbloqueadas.map((c, i) => (
              <React.Fragment key={c.id}>
                {i > 0 ? <Divider /> : null}
                <View style={styles.conquista}>
                  <View style={[styles.medalha, {backgroundColor: cores.accentSoft}]}>
                    <Icon nome="trofeu" size="sm" color="accent" />
                  </View>
                  <View style={styles.flex}>
                    <Text variant="labelL" numberOfLines={1}>
                      {c.nome}
                    </Text>
                    <Text variant="caption" color="textSecondary" numberOfLines={1}>
                      {c.descricao}
                    </Text>
                  </View>
                </View>
              </React.Fragment>
            ))}
          </Card>
        )}
      </View>
    </Screen>
  );
}

function CelulaStat({
  valor,
  rotulo,
  tom = 'textPrimary',
}: {
  valor: number;
  rotulo: string;
  tom?: 'textPrimary' | 'success' | 'danger';
}): React.JSX.Element {
  return (
    <View style={styles.celula}>
      <Text variant="titleL" color={tom} tabular>
        {valor}
      </Text>
      <Text variant="caption" color="textSecondary">
        {rotulo}
      </Text>
    </View>
  );
}

export default Carreira;

const styles = StyleSheet.create({
  flex: {flex: 1},
  vazio: {flex: 1, justifyContent: 'center', padding: espacamento[4]},
  caps: {textTransform: 'uppercase', letterSpacing: 1},
  jornadaCard: {gap: espacamento[2]},
  jornadaTopo: {flexDirection: 'row', alignItems: 'center', gap: espacamento[3]},
  statsRow: {flexDirection: 'row', alignItems: 'center'},
  celula: {flex: 1, alignItems: 'center', gap: 2},
  aneisRow: {flexDirection: 'row', alignItems: 'center'},
  anel: {flex: 1, alignItems: 'center'},
  divisorV: {width: StyleSheet.hairlineWidth, alignSelf: 'stretch'},
  secao: {gap: espacamento[2]},
  listaCard: {paddingHorizontal: espacamento[3]},
  conquista: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[3],
    paddingVertical: espacamento[2],
  },
  medalha: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
