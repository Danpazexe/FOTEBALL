/**
 * Calendário da temporada (raiz da aba Partidas) — fiel ao mockup do épico.
 * De cima para baixo:
 *  1. navegação por semana (‹ Mês Ano ›) + tira dos 7 dias, com o dia atual em
 *     destaque e um ponto nos dias com jogo do clube;
 *  2. "Próximo jogo": card-herói com escudos, data e competição do próximo
 *     compromisso (liga OU copa, o que vier primeiro);
 *  3. "Agenda do dia": o que o avanço processa hoje — a sessão do plano de
 *     treino, recuperação, análise do adversário e descanso (dados reais);
 *  4. "Pipeline diário": os passos que o motor roda a cada dia avançado;
 *  5. AVANÇAR ATÉ O PRÓXIMO JOGO (ação principal) → processa os dias e abre o
 *     pré-jogo (ou o confronto da Copa);
 *  6. abaixo, o calendário completo (Resultados / Próximos), preservado.
 */
import React, {useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import Escudo from '../../components/Escudo';
import {
  AppBar,
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  Icon,
  IconButton,
  MatchCard,
  Screen,
  SegmentedTabs,
  Text,
  espacamento,
  raios,
  useTheme,
} from '../../design-system';
import {sessaoDoCiclo} from '../../engine/progression/planoTreinoEngine';
import {buscarTreino, INTENSIDADES} from '../../engine/progression/treinoTipos';
import {usePartidasNavigation} from '../../navigation/types';
import {
  selecionarConfrontoCopaUsuario,
  selecionarProximoJogo,
  useGameStore,
  type Compromisso,
} from '../../store/useGameStore';
import {nomeClube, siglaClube} from '../../utils/formatters';
import {
  adicionarDias,
  diaDaSemana,
  formatarDataCurta,
  horarioProvavel,
  indiceDiaSemana,
  nomeMes,
} from '../../utils/datas';
import type {IconeNome} from '../../components/Icone';

type Aba = 'proximos' | 'resultados';

type Jogo = {
  id: string;
  ordem: string;
  data: string;
  casa: {clubeId: string; sigla: string};
  fora: {clubeId: string; sigla: string};
  encerrado: boolean;
  placarCasa?: number;
  placarFora?: number;
  quando: string;
  competicao: string;
  proximo: boolean;
  tipo: 'liga' | 'copa';
  partidaId?: string;
};

/** Segunda-feira da semana que contém `iso` (a tira começa na segunda). */
function segundaDaSemana(iso: string): string {
  // indiceDiaSemana: 0=Dom … 6=Sáb. Deslocamento até a segunda anterior.
  const desloc = (indiceDiaSemana(iso) + 6) % 7;
  return adicionarDias(iso, -desloc);
}

/** Uma atividade da "Agenda do dia". */
type ItemAgenda = {
  hora: string;
  titulo: string;
  detalhe: string;
  icone: IconeNome;
};

/** Passos que o motor processa por dia avançado (informativo). */
const PIPELINE: {icone: IconeNome; rotulo: string}[] = [
  {icone: 'tendencia', rotulo: 'Treino'},
  {icone: 'lesao', rotulo: 'Recuperação'},
  {icone: 'estrela', rotulo: 'Moral'},
  {icone: 'mercado', rotulo: 'Mercado'},
  {icone: 'base', rotulo: 'Base'},
];

function Calendario(): React.JSX.Element {
  const {cores} = useTheme();
  const nav = usePartidasNavigation();
  const [aba, setAba] = useState<Aba>('proximos');
  const [semanaOffset, setSemanaOffset] = useState(0);

  const partidas = useGameStore(state => state.partidas);
  const clubes = useGameStore(state => state.clubes);
  const todosClubes = useGameStore(state => state.todosClubes);
  const jogadores = useGameStore(state => state.jogadores);
  const copa = useGameStore(state => state.copa);
  const clubeUsuarioId = useGameStore(state => state.clubeUsuarioId);
  const rodadaAtual = useGameStore(state => state.rodadaAtual);
  const temporadaAtual = useGameStore(state => state.temporadaAtual);
  const dataAtual = useGameStore(state => state.dataAtual);
  const planoTreino = useGameStore(state => state.planoTreino);
  const avancarParaData = useGameStore(state => state.avancarParaData);
  // Seletores ESTÁVEIS (referência existente): combinamos em useMemo. Não usar
  // selecionarProximoCompromisso como seletor do zustand — ele cria um objeto
  // novo a cada chamada e dispara re-render infinito (Object.is sempre difere).
  const proximoJogoLiga = useGameStore(selecionarProximoJogo);
  const confrontoCopa = useGameStore(selecionarConfrontoCopaUsuario);
  const compromisso = useMemo<Compromisso | null>(() => {
    const liga: Compromisso | null = proximoJogoLiga
      ? {tipo: 'liga', partida: proximoJogoLiga, data: proximoJogoLiga.data}
      : null;
    const faseCopa = copa?.fases[copa.faseAtual];
    const cpo: Compromisso | null =
      confrontoCopa && faseCopa?.data
        ? {
            tipo: 'copa',
            confronto: confrontoCopa,
            faseNome: faseCopa.nome,
            data: faseCopa.data,
          }
        : null;
    if (!liga) {
      return cpo;
    }
    if (!cpo) {
      return liga;
    }
    // Datas ISO comparam lexicograficamente; a Copa entra quando sua data chega.
    return cpo.data <= liga.data ? cpo : liga;
  }, [proximoJogoLiga, confrontoCopa, copa]);
  const divisao = useGameStore(
    state =>
      state.clubes.find(c => c.id === state.clubeUsuarioId)?.divisao ??
      'Brasileirão',
  );

  const jogos = useMemo<Jogo[]>(() => {
    if (!clubeUsuarioId) {
      return [];
    }
    const lista: Jogo[] = [];
    for (const p of partidas) {
      if (p.timeCasa !== clubeUsuarioId && p.timeFora !== clubeUsuarioId) {
        continue;
      }
      lista.push({
        id: p.id,
        ordem: p.data,
        data: p.data,
        casa: {clubeId: p.timeCasa, sigla: siglaClube(clubes, p.timeCasa)},
        fora: {clubeId: p.timeFora, sigla: siglaClube(clubes, p.timeFora)},
        encerrado: p.jogada,
        placarCasa: p.placarCasa ?? undefined,
        placarFora: p.placarFora ?? undefined,
        quando: formatarDataCurta(p.data),
        competicao: divisao,
        proximo: !p.jogada && p.rodada === rodadaAtual,
        tipo: 'liga',
        partidaId: p.id,
      });
    }
    if (copa) {
      copa.fases.forEach((fase, indice) => {
        const c = fase.confrontos.find(
          x => x.timeA === clubeUsuarioId || x.timeB === clubeUsuarioId,
        );
        if (!c || !fase.data) {
          return;
        }
        lista.push({
          id: `copa-${indice}`,
          ordem: fase.data,
          data: fase.data,
          casa: {clubeId: c.timeA, sigla: siglaClube(todosClubes, c.timeA)},
          fora: {clubeId: c.timeB, sigla: siglaClube(todosClubes, c.timeB)},
          encerrado: c.vencedor !== undefined && c.vencedor !== null,
          quando: formatarDataCurta(fase.data),
          competicao: 'Copa do Brasil',
          proximo: !c.vencedor && indice === copa.faseAtual,
          tipo: 'copa',
        });
      });
    }
    return lista.sort((a, b) => a.ordem.localeCompare(b.ordem));
  }, [partidas, clubes, todosClubes, copa, clubeUsuarioId, rodadaAtual, divisao]);

  const filtrados = useMemo(() => {
    const arr = jogos.filter(j =>
      aba === 'resultados' ? j.encerrado : !j.encerrado,
    );
    return aba === 'resultados' ? arr.reverse() : arr;
  }, [jogos, aba]);

  // ── Tira da semana ────────────────────────────────────────────────────────
  const diasComJogo = useMemo(() => new Set(jogos.map(j => j.data)), [jogos]);
  const segunda = useMemo(
    () => segundaDaSemana(adicionarDias(dataAtual, semanaOffset * 7)),
    [dataAtual, semanaOffset],
  );
  const semana = useMemo(
    () => Array.from({length: 7}, (_, i) => adicionarDias(segunda, i)),
    [segunda],
  );
  const {ano: anoMes, mes} = useMemo(() => {
    const meio = adicionarDias(segunda, 3); // quinta — representa o mês da semana
    const [ano, m] = meio.split('-').map(Number);
    return {ano, mes: m};
  }, [segunda]);

  // ── Próximo compromisso (herói) ───────────────────────────────────────────
  const heroi = useMemo(() => {
    if (!compromisso) {
      return null;
    }
    const nomes = compromisso.tipo === 'copa' ? todosClubes : clubes;
    const casaId =
      compromisso.tipo === 'liga'
        ? compromisso.partida.timeCasa
        : compromisso.confronto.timeA;
    const foraId =
      compromisso.tipo === 'liga'
        ? compromisso.partida.timeFora
        : compromisso.confronto.timeB;
    const competicao =
      compromisso.tipo === 'liga' ? divisao : compromisso.faseNome;
    return {
      casaId,
      foraId,
      casaNome: nomeClube(nomes, casaId),
      foraNome: nomeClube(nomes, foraId),
      casaSigla: siglaClube(nomes, casaId),
      foraSigla: siglaClube(nomes, foraId),
      data: compromisso.data,
      competicao,
      copa: compromisso.tipo === 'copa',
    };
  }, [compromisso, clubes, todosClubes, divisao]);

  // ── Agenda do dia (derivada do estado real) ───────────────────────────────
  const agenda = useMemo<ItemAgenda[]>(() => {
    const sessao = sessaoDoCiclo(planoTreino, rodadaAtual);
    const treino = buscarTreino(sessao.treinoId);
    const emRecuperacao = jogadores.filter(
      j =>
        j.clubeId === clubeUsuarioId && (j.lesionado || j.condicaoFisica < 70),
    ).length;
    const itens: ItemAgenda[] = [
      {
        hora: '09:00',
        titulo: treino ? treino.nome : 'Treino',
        detalhe: `${INTENSIDADES[sessao.intensidade].rotulo} · sessão do plano`,
        icone: 'tendencia',
      },
      {
        hora: '11:30',
        titulo: 'Recuperação',
        detalhe:
          emRecuperacao > 0
            ? `${emRecuperacao} em fisioterapia/academia`
            : 'Academia e fisioterapia',
        icone: 'lesao',
      },
    ];
    if (heroi) {
      itens.push({
        hora: '15:00',
        titulo: 'Análise de adversário',
        detalhe:
          heroi.casaId === clubeUsuarioId ? heroi.foraNome : heroi.casaNome,
        icone: 'tatica',
      });
    }
    itens.push({
      hora: '17:00',
      titulo: 'Descanso',
      detalhe: 'Período livre',
      icone: 'relogio',
    });
    return itens;
  }, [planoTreino, rodadaAtual, jogadores, clubeUsuarioId, heroi]);

  const aoTocar = (j: Jogo) => {
    if (j.tipo === 'copa') {
      nav.navigate('Copa');
    } else if (j.encerrado && j.partidaId) {
      nav.navigate('MatchResult', {partidaId: j.partidaId});
    } else if (j.proximo) {
      nav.navigate('PreJogo');
    }
  };

  const avancarAteProximoJogo = () => {
    if (!compromisso) {
      return;
    }
    avancarParaData(compromisso.data);
    if (compromisso.tipo === 'copa') {
      nav.navigate('MatchSimulation', {copa: true});
    } else {
      nav.navigate('PreJogo');
    }
  };

  return (
    <Screen
      scroll
      header={
        <AppBar
          title="Calendário"
          subtitle={`Temporada ${temporadaAtual}`}
          right={
            <IconButton
              icone="tabela"
              onPress={() => nav.navigate('Competition')}
              accessibilityLabel="Ver classificação"
            />
          }
        />
      }>
      {/* 1 · Navegação por semana + tira dos dias */}
      <Card>
        <View style={estilos.mesLinha}>
          <IconButton
            icone="voltar"
            onPress={() => setSemanaOffset(o => o - 1)}
            accessibilityLabel="Semana anterior"
          />
          <Text variant="titleM">
            {nomeMes(mes)} {anoMes}
          </Text>
          <IconButton
            icone="avancar"
            onPress={() => setSemanaOffset(o => o + 1)}
            accessibilityLabel="Próxima semana"
          />
        </View>
        <View style={estilos.semana}>
          {semana.map(dia => {
            const hoje = dia === dataAtual;
            const temJogo = diasComJogo.has(dia);
            const nro = Number(dia.slice(8, 10));
            return (
              <View key={dia} style={estilos.diaCol}>
                <Text variant="caption" color="textSecondary">
                  {diaDaSemana(dia)}
                </Text>
                <View
                  style={[
                    estilos.diaBolha,
                    hoje ? {backgroundColor: cores.brand} : null,
                  ]}>
                  <Text
                    variant="labelL"
                    tabular
                    color={hoje ? 'onBrand' : 'textPrimary'}>
                    {nro}
                  </Text>
                </View>
                <View
                  style={[
                    estilos.pontoJogo,
                    temJogo ? {backgroundColor: cores.brand} : null,
                  ]}
                />
              </View>
            );
          })}
        </View>
      </Card>

      {/* 2 · Próximo jogo */}
      <View style={estilos.secao}>
        <Text variant="labelM" color="textSecondary" style={estilos.caps}>
          Próximo jogo
        </Text>
        {heroi ? (
          <Card>
            <View style={estilos.heroiTopo}>
              <View style={estilos.heroiTime}>
                <Escudo
                  clubeId={heroi.casaId}
                  sigla={heroi.casaSigla}
                  tamanho={48}
                />
                <Text variant="titleM" align="center" numberOfLines={1}>
                  {heroi.casaSigla}
                </Text>
              </View>
              <View style={estilos.heroiMeio}>
                {heroi.copa ? <Badge label="Copa" tom="brand" solido /> : null}
                <Text variant="titleL" color="textSecondary">
                  vs
                </Text>
              </View>
              <View style={estilos.heroiTime}>
                <Escudo
                  clubeId={heroi.foraId}
                  sigla={heroi.foraSigla}
                  tamanho={48}
                />
                <Text variant="titleM" align="center" numberOfLines={1}>
                  {heroi.foraSigla}
                </Text>
              </View>
            </View>
            <Divider />
            <View style={estilos.heroiInfo}>
              <Text variant="bodyM" color="textSecondary">
                {formatarDataCurta(heroi.data)} · {horarioProvavel(heroi.data)}
              </Text>
              <Text variant="labelM" color="brand">
                {heroi.competicao}
              </Text>
            </View>
          </Card>
        ) : (
          <Card>
            <Text variant="bodyM" color="textSecondary" align="center">
              Sem jogos futuros nesta temporada.
            </Text>
          </Card>
        )}
      </View>

      {/* 3 · Agenda do dia */}
      <View style={estilos.secao}>
        <Text variant="labelM" color="textSecondary" style={estilos.caps}>
          Agenda do dia
        </Text>
        <Card padding={0}>
          {agenda.map((item, i) => (
            <View key={`${item.hora}-${item.titulo}`}>
              {i > 0 ? <Divider /> : null}
              <View style={estilos.agendaLinha}>
                <Text
                  variant="labelL"
                  color="textSecondary"
                  tabular
                  style={estilos.agendaHora}>
                  {item.hora}
                </Text>
                <Icon nome={item.icone} size={18} color="textSecondary" />
                <View style={estilos.flex}>
                  <Text variant="titleM">{item.titulo}</Text>
                  <Text variant="caption" color="textSecondary">
                    {item.detalhe}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </Card>
      </View>

      {/* 4 · Pipeline diário */}
      <View style={estilos.secao}>
        <Text variant="labelM" color="textSecondary" style={estilos.caps}>
          Pipeline diário
        </Text>
        <View style={estilos.pipeline}>
          {PIPELINE.map(passo => (
            <View key={passo.rotulo} style={estilos.pipelineItem}>
              <View style={[estilos.pipelineIcone, {borderColor: cores.border}]}>
                <Icon nome={passo.icone} size={18} color="textSecondary" />
              </View>
              <Text variant="caption" color="textSecondary">
                {passo.rotulo}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* 5 · Ação principal */}
      {compromisso ? (
        <Button
          titulo="AVANÇAR ATÉ O PRÓXIMO JOGO"
          onPress={avancarAteProximoJogo}
          fullWidth
        />
      ) : null}

      {/* 6 · Calendário completo (preservado) */}
      <View style={estilos.secao}>
        <Text variant="labelM" color="textSecondary" style={estilos.caps}>
          Calendário completo
        </Text>
        <SegmentedTabs
          abas={[
            {chave: 'resultados', rotulo: 'Resultados'},
            {chave: 'proximos', rotulo: 'Próximos'},
          ]}
          ativa={aba}
          onSelect={c => setAba(c as Aba)}
        />

        {filtrados.length === 0 ? (
          <View style={estilos.vazio}>
            <EmptyState
              icone="calendario"
              title={
                aba === 'resultados'
                  ? 'Nenhum jogo disputado ainda'
                  : 'Sem jogos futuros'
              }
              description={
                aba === 'resultados'
                  ? 'Os resultados aparecem aqui após cada partida.'
                  : 'O calendário da temporada aparece aqui.'
              }
            />
          </View>
        ) : (
          <View style={estilos.lista}>
            {filtrados.map(j => (
              <View key={j.id} style={estilos.item}>
                {j.proximo ? (
                  <View style={estilos.proximoTag}>
                    <Badge label="Próximo jogo" tom="brand" solido />
                  </View>
                ) : null}
                <MatchCard
                  casa={j.casa}
                  fora={j.fora}
                  status={j.encerrado ? 'encerrado' : 'agendado'}
                  placarCasa={j.placarCasa}
                  placarFora={j.placarFora}
                  quando={j.quando}
                  competicao={j.competicao}
                  onPress={
                    j.tipo === 'copa' || j.encerrado || j.proximo
                      ? () => aoTocar(j)
                      : undefined
                  }
                />
              </View>
            ))}
          </View>
        )}
      </View>
      <View style={{height: espacamento[6]}} />
    </Screen>
  );
}

export default Calendario;

const estilos = StyleSheet.create({
  mesLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  semana: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: espacamento[3],
  },
  diaCol: {alignItems: 'center', gap: espacamento[1], flex: 1},
  diaBolha: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pontoJogo: {width: 5, height: 5, borderRadius: 3},
  secao: {gap: espacamento[2], marginTop: espacamento[4]},
  caps: {textTransform: 'uppercase', letterSpacing: 1},
  heroiTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroiTime: {alignItems: 'center', gap: espacamento[2], flex: 1},
  heroiMeio: {alignItems: 'center', gap: espacamento[1], flex: 1},
  heroiInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  agendaLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[3],
    paddingHorizontal: espacamento[3],
    paddingVertical: espacamento[3],
  },
  agendaHora: {width: 44},
  flex: {flex: 1},
  pipeline: {flexDirection: 'row', justifyContent: 'space-between'},
  pipelineItem: {alignItems: 'center', gap: espacamento[1], flex: 1},
  pipelineIcone: {
    width: 40,
    height: 40,
    borderRadius: raios.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vazio: {flex: 1, justifyContent: 'center', paddingVertical: espacamento[6]},
  lista: {gap: espacamento[3]},
  item: {gap: espacamento[1]},
  proximoTag: {alignSelf: 'flex-start'},
});
