/**
 * Gabinete de troféus (Módulo 15). Grade de conquistas: desbloqueadas em cor,
 * bloqueadas em cinza com descrição oculta. Cabeçalho com % de conclusão.
 */

import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {IconeGlifo} from '../../components/Icone';
import Chip from '../../components/Chip';
import StatCard from '../../components/StatCard';
import {AppHeader, Botao, ScreenContainer} from '../../components/ui';
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
import {cores, espaco, raio, sombra, tabular, tipografia} from '../../theme';
import {nomeClube} from '../../utils/formatters';
import type {EstadoFinanceiro} from '../../types';

const ESTADO_FINANCEIRO: Record<
  EstadoFinanceiro,
  {rotulo: string; cor: string}
> = {
  // Cor de ESTADO (não o acento âmbar): aviso amarelo para atenção, vermelho
  // para crítico/falência — o âmbar-refletor fica reservado ao que decide.
  SAUDAVEL: {rotulo: 'Saudável', cor: cores.primaria},
  ATENCAO: {rotulo: 'Atenção', cor: cores.aviso},
  CRITICO: {rotulo: 'Crítico', cor: cores.perigo},
  FALENCIA: {rotulo: 'Falência', cor: cores.perigo},
};

function Gabinete(): React.JSX.Element {
  const nav = useAppNavigation();
  const confirm = useConfirm();
  const toast = useToast();
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

  // Jornada do técnico — estágio de carreira pela reputação + próximo marco.
  const jornada = clubeUsuarioId ? calcularJornada(reputacaoTecnico) : null;

  // Propostas de clubes maiores (a reputação abrindo portas).
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
            <Text style={styles.secaoRotulo}>Reputação do técnico</Text>
            <Text style={styles.carreiraValor}>
              <Text style={tabular}>{reputacaoTecnico}</Text>
              <Text style={styles.carreiraDe}>/100</Text>
            </Text>
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
            <Text style={styles.secaoRotulo}>Finanças</Text>
            <Chip
              label={financeiro.rotulo}
              tom="suave"
              cor={financeiro.cor}
              style={styles.financasChip}
            />
          </View>
        </View>
      ) : (
        <View style={styles.vazioCard}>
          <IconeGlifo
            nome="briefcase-outline"
            tamanho={30}
            cor={cores.textoMuted}
          />
          <Text style={styles.vazioTitulo}>Nenhum clube no comando</Text>
          <Text style={styles.vazioTexto}>
            Assuma um clube para acompanhar reputação, finanças, jornada e a
            retrospectiva da temporada.
          </Text>
        </View>
      )}

      {jornada ? (
        <View style={styles.retroCard}>
          <View style={styles.jornadaTopo}>
            <Text style={styles.secaoRotulo}>Jornada do técnico</Text>
            <Text style={styles.jornadaEstagio}>{jornada.estagioAtual}</Text>
          </View>
          <Text style={styles.jornadaDescricao}>{jornada.descricaoAtual}</Text>
          <View style={styles.barraFundo}>
            <View
              style={[
                styles.barraPreenchida,
                {width: `${Math.round(jornada.progressoAteProximo * 100)}%`},
              ]}
            />
          </View>
          <Text style={styles.jornadaProximo}>
            {jornada.proximoMarco ? (
              <>
                Próximo: {jornada.proximoMarco.estagio} (rep.{' '}
                <Text style={tabular}>
                  {jornada.proximoMarco.reputacaoMinima}
                </Text>
                )
              </>
            ) : (
              'Auge da carreira alcançado.'
            )}
          </Text>
        </View>
      ) : null}

      {propostas.length > 0 ? (
        <View style={styles.retroCard}>
          <Text style={styles.secaoRotulo}>Propostas de clubes</Text>
          {propostas.map(proposta => (
            <View key={proposta.clubeId} style={styles.propostaLinha}>
              <View style={styles.propostaInfo}>
                <Text style={styles.propostaNome} numberOfLines={1}>
                  {proposta.nome}
                </Text>
                <Text style={styles.propostaSub} numberOfLines={1}>
                  {proposta.divisao} · reputação{' '}
                  <Text style={tabular}>{proposta.reputacao}</Text>
                </Text>
              </View>
              <View style={styles.propostaAcao}>
                <Botao
                  titulo="Assumir"
                  variante="secundaria"
                  onPress={() =>
                    aceitarProposta(proposta.clubeId, proposta.nome)
                  }
                />
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {clubeUsuarioId ? (
        <View style={styles.retroCard}>
          <Text style={styles.secaoRotulo}>Retrospectiva da temporada</Text>
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
                  corValor={retro.saldo >= 0 ? cores.sucesso : cores.perigo}
                />
              </View>
              {retro.maiorVitoria ? (
                <View style={styles.retroLinha}>
                  <Text style={styles.retroRotulo}>Maior vitória</Text>
                  <Text style={[styles.retroValor, tabular]} numberOfLines={1}>
                    {retro.maiorVitoria.golsFavor}x
                    {retro.maiorVitoria.golsContra} vs{' '}
                    {nomeClube(clubes, retro.maiorVitoria.adversarioId)}
                  </Text>
                </View>
              ) : null}
              {retro.maiorDerrota ? (
                <View style={styles.retroLinha}>
                  <Text style={styles.retroRotulo}>Maior derrota</Text>
                  <Text style={[styles.retroValor, tabular]} numberOfLines={1}>
                    {retro.maiorDerrota.golsFavor}x
                    {retro.maiorDerrota.golsContra} vs{' '}
                    {nomeClube(clubes, retro.maiorDerrota.adversarioId)}
                  </Text>
                </View>
              ) : null}
              {retro.maiorSequenciaVitorias >= 2 ? (
                <View style={styles.retroLinha}>
                  <Text style={styles.retroRotulo}>Melhor sequência</Text>
                  <Text style={styles.retroValor}>
                    <Text style={tabular}>{retro.maiorSequenciaVitorias}</Text>{' '}
                    vitórias seguidas
                  </Text>
                </View>
              ) : null}
              {retro.artilheiro && artilheiroNome ? (
                <View style={styles.retroLinha}>
                  <Text style={styles.retroRotulo}>Artilheiro</Text>
                  <Text
                    style={[styles.retroValor, styles.retroDestaque]}
                    numberOfLines={1}>
                    {artilheiroNome} (
                    <Text style={tabular}>{retro.artilheiro.gols}</Text>{' '}
                    {retro.artilheiro.gols === 1 ? 'gol' : 'gols'})
                  </Text>
                </View>
              ) : null}
            </>
          ) : (
            <Text style={styles.vazioTexto}>
              Jogue a primeira partida da temporada para ver seu balanço e
              recordes aqui.
            </Text>
          )}
        </View>
      ) : null}

      <View style={styles.conquistasTopo}>
        <Text style={styles.secaoRotulo}>Conquistas</Text>
        <Text style={styles.conquistasPct}>{conquistasPct}%</Text>
      </View>
      <View style={[styles.barraFundo, styles.barraConquistas]}>
        <View style={[styles.barraPreenchida, {width: `${conquistasPct}%`}]} />
      </View>
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
  secaoRotulo: {
    color: cores.textoSecundario,
    ...tipografia.secao,
  },
  retroCard: {
    backgroundColor: cores.superficieElevada,
    borderColor: cores.bordaTransl,
    borderRadius: raio.lg,
    borderWidth: 1,
    gap: espaco.sm,
    marginBottom: espaco.md,
    padding: espaco.md,
    ...sombra.card,
  },
  statRow: {
    flexDirection: 'row',
    gap: espaco.sm,
  },
  jornadaTopo: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  jornadaEstagio: {
    color: cores.primaria,
    fontSize: 14,
    fontWeight: '900',
  },
  jornadaDescricao: {
    color: cores.textoSecundario,
    fontSize: 12.5,
  },
  jornadaProximo: {
    color: cores.textoMuted,
    fontSize: 11.5,
    fontWeight: '700',
  },
  propostaLinha: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.md,
    justifyContent: 'space-between',
  },
  propostaInfo: {
    flex: 1,
    gap: espaco.xs,
  },
  propostaNome: {
    color: cores.texto,
    fontSize: 14,
    fontWeight: '800',
  },
  propostaSub: {
    color: cores.textoSecundario,
    fontSize: 12,
  },
  propostaAcao: {
    minWidth: 110,
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
  retroDestaque: {
    color: cores.secundaria,
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
  carreiraValor: {
    color: cores.texto,
    ...tipografia.numero,
  },
  carreiraDe: {
    color: cores.textoMuted,
    fontSize: 14,
    fontWeight: '800',
  },
  financasChip: {
    alignSelf: 'flex-start',
  },
  barraFundo: {
    backgroundColor: cores.fundo,
    borderRadius: raio.sm,
    height: 6,
    overflow: 'hidden',
  },
  barraConquistas: {
    marginBottom: espaco.md,
  },
  barraPreenchida: {
    backgroundColor: cores.primaria,
    height: 6,
  },
  vazioCard: {
    alignItems: 'center',
    backgroundColor: cores.superficieElevada,
    borderColor: cores.bordaTransl,
    borderRadius: raio.lg,
    borderWidth: 1,
    gap: espaco.xs,
    marginBottom: espaco.md,
    padding: espaco.xl,
    ...sombra.card,
  },
  vazioTitulo: {
    color: cores.texto,
    fontSize: 14,
    fontWeight: '800',
    marginTop: espaco.xs,
  },
  vazioTexto: {
    color: cores.textoSecundario,
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
  },
  conquistasTopo: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: espaco.sm,
  },
  conquistasPct: {
    color: cores.texto,
    ...tipografia.numero,
    ...tabular,
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
    marginTop: espaco.xs,
    ...tabular,
  },
});
