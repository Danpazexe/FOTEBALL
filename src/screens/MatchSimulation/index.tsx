/**
 * Tela de partida narrada — simulação AO VIVO (estilo Brasfoot).
 *
 * O jogo NÃO é pré-carregado: cada minuto é simulado na hora, conforme o
 * relógio avança. Por isso as decisões do usuário durante a partida (pausar e
 * fazer substituições) influenciam o restante do jogo — a força do time é
 * recalculada a cada minuto a partir da escalação atual.
 *
 * Para no intervalo (45') e só continua quando o usuário aperta "Retomar";
 * também há "Pausar" a qualquer momento para mexer no time. Ao terminar, o
 * resultado é fechado e os demais jogos da rodada (IA) são simulados.
 */

import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {trocarTitular} from '../../api/database/seed/defaults';
import {
  definirSomHabilitado,
  iniciarTorcida,
  inicializarSons,
  pararTorcida,
  tocarCartaoAmarelo,
  tocarChancePerdida,
  tocarContusao,
  tocarExpulsao,
  tocarFimDeJogo,
  tocarGol,
  tocarIntervalo,
  tocarPenaltiPerdido,
  tocarVarAnulado,
} from '../../audio/sons';
import {Botao, ScreenContainer} from '../../components/ui';
import Icone, {type IconeNome} from '../../components/Icone';
import {LanceLimpo, type LadoLance} from '../../components/MatchNarration/LanceLimpo';
import AjustesPartida from '../../components/MatchNarration/AjustesPartida';
import {calcularPublicoJogo} from '../../engine/finance/financeEngine';
import {
  narrarEvento,
  narrarFim,
  narrarInicio,
  narrarIntervalo,
  narrarSegundoTempo,
} from '../../engine/simulation/narrativeTemplates';
import {
  calcularContextoMinuto,
  calcularEstatisticasFinais,
  calcularPossePartida,
  disputarPenaltis,
  iniciarPartidaAoVivo,
  simularMinuto,
  type EstadoPartidaAoVivo,
} from '../../engine/simulation/matchSimulator';
import {confrontoDoClube} from '../../engine/season/copaEngine';
import {criarRNGComSeed, hashString} from '../../engine/simulation/rng';
import {
  selecionarClubeUsuario,
  selecionarCopaNaVez,
  selecionarProximoJogo,
  useGameStore,
} from '../../store/useGameStore';
import {acentos, cores, corDoTime, espaco, raio, sombra, suaves} from '../../theme';
import {nomeClube, siglaClube} from '../../utils/formatters';
import type {
  Clube,
  EventoPartida,
  Formacao,
  Partida,
  Player,
  TabelaClassificacao,
} from '../../types';
import {useAppNavigation, useAppRoute} from '../../navigation/types';

type ItemTimeline = {
  minuto: number;
  tipo: string;
  descricao: string;
  lado: LadoLance;
  sigla?: string;
  corTime?: string;
  timeId?: string;
  /** Campos do lance "clean": nome principal, linha cinza e pill de placar. */
  autor?: string;
  detalhe?: string;
  placarPill?: string;
};

const MINUTO_INTERVALO = 45;
const DURACAO = 90;
// Limite oficial do Brasileirão: 5 substituições por equipe.
const MAX_SUBSTITUICOES = 5;
const SEG_INTERVALO = MINUTO_INTERVALO * 60;
const DURACAO_SEG = DURACAO * 60;
// Velocidades de tempo (multiplicadores). A cada tick o relógio avança
// PASSO_BASE × multiplicador segundos de jogo: 1x é o ritmo base, 10x voa.
const MULTIPLICADORES = [1, 2, 5, 10] as const;
const TICK_MS = 90;
const PASSO_BASE_SEG = 6;

function mediaOverall(jogadores: Player[]): number {
  if (jogadores.length === 0) {
    return 60;
  }
  return jogadores.reduce((soma, j) => soma + j.overall, 0) / jogadores.length;
}

function mapearNomesJogadores(jogadores: Player[]): Record<string, string> {
  const mapa: Record<string, string> = {};
  for (const jogador of jogadores) {
    mapa[jogador.id] = jogador.apelido ?? jogador.nome;
  }
  return mapa;
}

/** Um dos OUTROS jogos da rodada, simulado AO VIVO junto com o do usuário. */
type JogoAoVivo = {
  id: string;
  timeCasa: string;
  timeFora: string;
  nomeCasa: string;
  nomeFora: string;
  corCasa: string;
  corFora: string;
  clubeCasa: Clube;
  clubeFora: Clube;
  jogadoresCasa: Player[];
  jogadoresFora: Player[];
  /** Estado vivo (placar/eventos evoluem minuto a minuto). */
  estado: EstadoPartidaAoVivo;
  minutoSimulado: number;
};

/** Placar de um jogo para render (derivado do estado vivo a cada minuto). */
type PlacarAoVivo = {
  id: string;
  nomeCasa: string;
  nomeFora: string;
  corCasa: string;
  corFora: string;
  golsCasa: number;
  golsFora: number;
};

/**
 * Cria os estados VIVOS dos outros jogos da rodada (minuto 0, nada simulado
 * ainda). Cada jogo usa a MESMA seed que o store usará ao concluir a rodada,
 * então — como o motor é determinístico — o que roda ao vivo aqui é
 * bit-a-bit igual ao que fica persistido no fim. Nada é "setado": os placares
 * nascem 0×0 e evoluem de verdade conforme o relógio anda.
 */
function criarJogosAoVivo(
  st: {
    partidas: Partida[];
    clubes: Clube[];
    jogadores: Player[];
    rodadaAtual: number;
  },
  partidaUsuarioId: string,
): JogoAoVivo[] {
  const jogosRodada = st.partidas.filter(
    p => p.rodada === st.rodadaAtual && !p.jogada,
  );
  const lista: JogoAoVivo[] = [];
  for (const jogo of jogosRodada) {
    if (jogo.id === partidaUsuarioId) {
      continue;
    }
    const clubeCasa = st.clubes.find(c => c.id === jogo.timeCasa);
    const clubeFora = st.clubes.find(c => c.id === jogo.timeFora);
    if (
      !clubeCasa?.formacaoAtual ||
      !clubeCasa.taticaAtual ||
      !clubeFora?.formacaoAtual ||
      !clubeFora.taticaAtual
    ) {
      continue; // clube sem formação válida fica fora da rodada ao vivo.
    }
    lista.push({
      id: jogo.id,
      timeCasa: jogo.timeCasa,
      timeFora: jogo.timeFora,
      nomeCasa: nomeClube(st.clubes, jogo.timeCasa),
      nomeFora: nomeClube(st.clubes, jogo.timeFora),
      corCasa: corDoTime(jogo.timeCasa),
      corFora: corDoTime(jogo.timeFora),
      clubeCasa,
      clubeFora,
      jogadoresCasa: st.jogadores.filter(j => j.clubeId === clubeCasa.id),
      jogadoresFora: st.jogadores.filter(j => j.clubeId === clubeFora.id),
      estado: iniciarPartidaAoVivo(
        st.rodadaAtual * 1000 + jogosRodada.indexOf(jogo),
      ),
      minutoSimulado: 0,
    });
  }
  return lista;
}

/**
 * Avança CADA jogo ao vivo da rodada até o minuto `alvo` (mesmo caminho da
 * partida do usuário: recalcula o contexto por minuto → fadiga, expulsões e
 * substituições da IA valem). Muta os estados; devolve nada.
 */
function avancarJogosAoVivo(jogos: JogoAoVivo[], alvo: number): void {
  for (const jogo of jogos) {
    while (jogo.minutoSimulado < alvo) {
      let ctx;
      try {
        ctx = calcularContextoMinuto(
          jogo.clubeCasa,
          jogo.clubeFora,
          jogo.jogadoresCasa,
          jogo.jogadoresFora,
          jogo.estado,
        );
      } catch {
        break;
      }
      simularMinuto(jogo.estado, ctx);
      jogo.minutoSimulado += 1;
    }
  }
}

/**
 * Classificação AO VIVO: parte da tabela ANTES da rodada e soma os resultados
 * PARCIAIS de todos os jogos da rodada (o do usuário incluso). Um time ganhando
 * 1×0 aos 30' já aparece provisoriamente com 3 pontos.
 */
function projetarTabela(
  base: TabelaClassificacao[],
  resultados: Array<{
    timeCasa: string;
    timeFora: string;
    golsCasa: number;
    golsFora: number;
  }>,
): TabelaClassificacao[] {
  const mapa = new Map<string, TabelaClassificacao>(
    base.map(e => [e.clubeId, {...e}]),
  );
  const garantir = (id: string): TabelaClassificacao => {
    const existente = mapa.get(id);
    if (existente) {
      return existente;
    }
    const nova: TabelaClassificacao = {
      clubeId: id,
      pontos: 0,
      jogos: 0,
      vitorias: 0,
      empates: 0,
      derrotas: 0,
      golsPro: 0,
      golsContra: 0,
      saldoGols: 0,
    };
    mapa.set(id, nova);
    return nova;
  };
  for (const r of resultados) {
    const casa = garantir(r.timeCasa);
    const fora = garantir(r.timeFora);
    casa.jogos += 1;
    fora.jogos += 1;
    casa.golsPro += r.golsCasa;
    casa.golsContra += r.golsFora;
    fora.golsPro += r.golsFora;
    fora.golsContra += r.golsCasa;
    if (r.golsCasa > r.golsFora) {
      casa.pontos += 3;
      casa.vitorias += 1;
      fora.derrotas += 1;
    } else if (r.golsCasa < r.golsFora) {
      fora.pontos += 3;
      fora.vitorias += 1;
      casa.derrotas += 1;
    } else {
      casa.pontos += 1;
      fora.pontos += 1;
      casa.empates += 1;
      fora.empates += 1;
    }
  }
  return [...mapa.values()]
    .map(e => ({...e, saldoGols: e.golsPro - e.golsContra}))
    .sort(
      (a, b) =>
        b.pontos - a.pontos ||
        b.saldoGols - a.saldoGols ||
        b.golsPro - a.golsPro,
    );
}

function rotuloGramado(nivelInfraestrutura: number): string {
  if (nivelInfraestrutura >= 4) {
    return 'Ótimo';
  }
  if (nivelInfraestrutura === 3) {
    return 'Bom';
  }
  if (nivelInfraestrutura === 2) {
    return 'Regular';
  }
  return 'Ruim';
}

function iconeClima(clima: string): IconeNome {
  if (clima === 'Chuvoso') {
    return 'clima-chuva';
  }
  if (clima === 'Nublado') {
    return 'clima-nublado';
  }
  return 'clima-sol';
}

function MatchSimulation(): React.JSX.Element | null {
  const nav = useAppNavigation();
  const route = useAppRoute<'MatchSimulation'>();
  const modoCopa = route.params?.copa === true;
  const clubeUsuario = useGameStore(selecionarClubeUsuario);
  const clubes = useGameStore(state => state.clubes);
  const jogadores = useGameStore(state => state.jogadores);
  const tabela = useGameStore(state => state.tabela);
  const atualizarFormacaoUsuario = useGameStore(
    state => state.atualizarFormacaoUsuario,
  );
  const atualizarTaticaUsuario = useGameStore(
    state => state.atualizarTaticaUsuario,
  );

  const iniciado = useRef(false);
  const [fixture, setFixture] = useState<Partida | null>(null);
  const [siglaCasa, setSiglaCasa] = useState('');
  const [siglaFora, setSiglaFora] = useState('');
  const [corCasa, setCorCasa] = useState<string>(cores.primaria);
  const [corFora, setCorFora] = useState<string>(cores.primaria);

  const estadoRef = useRef<EstadoPartidaAoVivo | null>(null);
  const minutoSimuladoRef = useRef(0);
  const adversarioRef = useRef<Clube | null>(null);
  const modoCopaRef = useRef(false);
  // Jogadores do adversário da Copa (pode ser de outra divisão → vêm do mestre).
  const jogadoresAdversarioRef = useRef<Player[]>([]);
  const nomeCasaRef = useRef('');
  const nomeForaRef = useRef('');
  const nomesRef = useRef<Record<string, string>>({});
  const ladoUsuarioRef = useRef<LadoLance>('casa');
  const pausarNoIntervaloRef = useRef(true);
  const marcosRef = useRef({intervalo: false, segundoTempo: false, fim: false});
  const comitadoRef = useRef(false);

  const pulsePlacar = useRef(new Animated.Value(1)).current;
  const golsPulseRef = useRef(0);
  const golsSomRef = useRef({usuario: 0, adversario: 0});

  const [relogioSeg, setRelogioSeg] = useState(0);
  const [multiplicador, setMultiplicador] = useState<number>(() =>
    useGameStore.getState().config.velocidadeNarracao === 'rapido' ? 5 : 2,
  );
  const [pausado, setPausado] = useState(false);
  const [intervalo, setIntervalo] = useState(false);
  const [segundoTempoLiberado, setSegundoTempoLiberado] = useState(false);

  const [eventos, setEventos] = useState<ItemTimeline[]>([]);
  const [placar, setPlacar] = useState({casa: 0, fora: 0});
  // Aba do feed: lances da partida · placares da rodada · tabela ao vivo.
  const [abaFeed, setAbaFeed] = useState<'lances' | 'rodada' | 'tabela'>(
    'lances',
  );
  // Estados VIVOS dos outros jogos da rodada (avançam junto com o relógio) e os
  // espelhos de UI (placares + classificação ao vivo).
  const outrosJogosRef = useRef<JogoAoVivo[]>([]);
  const tabelaBaseRef = useRef<TabelaClassificacao[]>([]);
  const [placaresRodada, setPlacaresRodada] = useState<PlacarAoVivo[]>([]);
  const [tabelaAoVivo, setTabelaAoVivo] = useState<TabelaClassificacao[]>([]);
  // Posse REAL vinda da engine (acumulada minuto a minuto) — espelho de UI,
  // como o placar; a fonte da verdade é o EstadoPartidaAoVivo.
  const [posse, setPosse] = useState({casa: 50, fora: 50});
  const [subsFeitas, setSubsFeitas] = useState(0);
  const [ajustesVisivel, setAjustesVisivel] = useState(false);
  // Jogadores que já saíram não podem voltar (regra oficial).
  const [jaSairam, setJaSairam] = useState<Set<string>>(() => new Set());

  // Prepara a partida do usuário (sem simular nada ainda).
  useEffect(() => {
    if (iniciado.current) {
      return;
    }
    iniciado.current = true;

    const estado = useGameStore.getState();
    pausarNoIntervaloRef.current = estado.config.pausarNoIntervalo;
    definirSomHabilitado(estado.config.som);
    inicializarSons();
    iniciarTorcida();

    const userId = estado.clubeUsuarioId;
    if (!userId) {
      nav.goBack();
      return;
    }

    // Retrato da escalação ANTES do jogo: as substituições/ajustes feitos durante
    // a partida valem só para ela; ao concluir/abandonar a escalação é restaurada.
    estado.prepararPartidaAoVivo();

    let fixtureMontada: Partida;

    if (modoCopa) {
      // Confronto de mata-mata: o usuário manda o jogo; adversário pode ser de
      // outra divisão (clube/jogadores vêm do conjunto-mestre).
      modoCopaRef.current = true;
      const meu = estado.copa
        ? confrontoDoClube(estado.copa, userId)
        : null;
      // Só joga no dia: a Copa precisa ser o compromisso da vez.
      if (!meu || !selecionarCopaNaVez(estado)) {
        nav.goBack();
        return;
      }
      const adversarioId = meu.timeA === userId ? meu.timeB : meu.timeA;
      const advClube =
        estado.todosClubes.find(c => c.id === adversarioId) ??
        estado.clubes.find(c => c.id === adversarioId) ??
        null;
      if (!advClube) {
        nav.goBack();
        return;
      }
      const advDoMestre = estado.todosJogadores.filter(
        j => j.clubeId === adversarioId,
      );
      const advJogadores =
        advDoMestre.length > 0
          ? advDoMestre
          : estado.jogadores.filter(j => j.clubeId === adversarioId);

      ladoUsuarioRef.current = 'casa';
      adversarioRef.current = advClube;
      jogadoresAdversarioRef.current = advJogadores;
      nomeCasaRef.current = nomeClube(estado.clubes, userId);
      nomeForaRef.current = advClube.nome;
      nomesRef.current = mapearNomesJogadores([
        ...estado.jogadores,
        ...advJogadores,
      ]);
      estadoRef.current = iniciarPartidaAoVivo(hashString(meu.id) % 1_000_000);

      setSiglaCasa(siglaClube(estado.clubes, userId));
      setSiglaFora(advClube.sigla);
      setCorCasa(corDoTime(userId));
      setCorFora(corDoTime(adversarioId));
      fixtureMontada = {
        id: meu.id,
        competicaoId: 'copa_brasil',
        rodada: 0,
        data: estado.dataAtual,
        timeCasa: userId,
        timeFora: adversarioId,
        placarCasa: 0,
        placarFora: 0,
        eventos: [],
        jogada: false,
        modoJogado: 'interativo',
      };
    } else {
      const proximo = selecionarProximoJogo(estado);
      if (!proximo) {
        nav.goBack();
        return;
      }
      const ehCasa = proximo.timeCasa === userId;
      ladoUsuarioRef.current = ehCasa ? 'casa' : 'fora';
      const adversarioId = ehCasa ? proximo.timeFora : proximo.timeCasa;
      adversarioRef.current =
        estado.clubes.find(clube => clube.id === adversarioId) ?? null;
      nomeCasaRef.current = nomeClube(estado.clubes, proximo.timeCasa);
      nomeForaRef.current = nomeClube(estado.clubes, proximo.timeFora);
      nomesRef.current = mapearNomesJogadores(estado.jogadores);
      estadoRef.current = iniciarPartidaAoVivo(
        estado.rodadaAtual * 1000 +
          (proximo.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % 1000),
      );
      setSiglaCasa(siglaClube(estado.clubes, proximo.timeCasa));
      setSiglaFora(siglaClube(estado.clubes, proximo.timeFora));
      outrosJogosRef.current = criarJogosAoVivo(estado, proximo.id);
      tabelaBaseRef.current = estado.tabela;
      setCorCasa(corDoTime(proximo.timeCasa));
      setCorFora(corDoTime(proximo.timeFora));
      fixtureMontada = proximo;
    }

    setEventos([
      {
        minuto: 0,
        tipo: 'inicio',
        descricao: narrarInicio(nomeCasaRef.current, nomeForaRef.current),
        lado: 'neutro',
      },
    ]);
    setFixture(fixtureMontada);
  }, [nav, modoCopa]);

  // Se o usuário sair da partida sem concluí-la, desfaz as trocas in-game (o
  // concluirPartidaAoVivo já restaura no caminho normal, tornando isto um no-op).
  useEffect(() => {
    return () => {
      pararTorcida();
      useGameStore.getState().restaurarFormacaoPreLive();
    };
  }, []);

  const minuto = Math.min(DURACAO, Math.floor(relogioSeg / 60));
  const terminou = fixture !== null && relogioSeg >= DURACAO_SEG;

  // Intervalo: ao chegar aos 45:00 para e espera o usuário.
  useEffect(() => {
    if (
      pausarNoIntervaloRef.current &&
      relogioSeg >= SEG_INTERVALO &&
      !segundoTempoLiberado &&
      !terminou
    ) {
      setIntervalo(true);
    }
  }, [relogioSeg, segundoTempoLiberado, terminou]);

  // Relógio (segundos de jogo). Para no fim, no intervalo ou pausado.
  useEffect(() => {
    if (!fixture || terminou || pausado || intervalo) {
      return;
    }
    const tickMs = TICK_MS;
    const passoSeg = PASSO_BASE_SEG * multiplicador;
    const id = setInterval(() => {
      setRelogioSeg(atual => {
        if (atual >= DURACAO_SEG) {
          return DURACAO_SEG;
        }
        const prox = atual + passoSeg;
        if (
          pausarNoIntervaloRef.current &&
          !segundoTempoLiberado &&
          prox >= SEG_INTERVALO
        ) {
          return SEG_INTERVALO;
        }
        return Math.min(prox, DURACAO_SEG);
      });
    }, tickMs);
    return () => clearInterval(id);
  }, [fixture, terminou, pausado, intervalo, segundoTempoLiberado, multiplicador]);

  // SIMULAÇÃO AO VIVO: simula os minutos ainda não simulados até o minuto atual,
  // recalculando a força a partir da escalação ATUAL (subs valem aqui).
  useEffect(() => {
    const estado = estadoRef.current;
    if (!fixture || !estado) {
      return;
    }
    const alvo = Math.min(minuto, DURACAO);
    if (minutoSimuladoRef.current >= alvo) {
      return;
    }

    const st = useGameStore.getState();
    const usuario = st.clubes.find(c => c.id === st.clubeUsuarioId);
    const adversario = adversarioRef.current;
    if (!usuario || !adversario) {
      return;
    }
    const usuarioEhCasa = ladoUsuarioRef.current === 'casa';
    const clubeCasa = usuarioEhCasa ? usuario : adversario;
    const clubeFora = usuarioEhCasa ? adversario : usuario;
    // Na Copa, o adversário pode ser de outra divisão (jogadores do mestre).
    const jogadoresUsuario = st.jogadores.filter(j => j.clubeId === usuario.id);
    const jogadoresAdversario = modoCopaRef.current
      ? jogadoresAdversarioRef.current
      : st.jogadores.filter(j => j.clubeId === adversario.id);
    const jogadoresCasa = usuarioEhCasa ? jogadoresUsuario : jogadoresAdversario;
    const jogadoresFora = usuarioEhCasa ? jogadoresAdversario : jogadoresUsuario;

    // Sons de lance: só no avanço normal (lotes de 1–2 minutos). Ao pular
    // tempo, um lote de 45' viraria uma rajada de efeitos sobrepostos.
    const comSomDeLance = alvo - minutoSimuladoRef.current <= 2;
    const golsAntesDoLote = estado.placarCasa + estado.placarFora;
    const lote: {som: (() => void) | null; prioridade: number} = {
      som: null,
      prioridade: 0,
    };
    const registrarSom = (prioridade: number, efeito: () => void) => {
      if (comSomDeLance && prioridade > lote.prioridade) {
        lote.prioridade = prioridade;
        lote.som = efeito;
      }
    };

    const novosItens: ItemTimeline[] = [];
    const criarItem = (ev: EventoPartida): ItemTimeline => {
      const ehCasa = ev.timeId === fixture.timeCasa;
      const nomeAutor = nomesRef.current[ev.jogadorId] ?? 'Jogador';

      // Campos do lance "clean" (modelo SofaScore): nome + detalhe em cinza.
      let autor: string | undefined = nomeAutor;
      let detalhe: string | undefined;
      let placarPill: string | undefined;
      const nomeFalta = ev.jogadorFaltaId
        ? nomesRef.current[ev.jogadorFaltaId]
        : undefined;
      if (ev.tipo === 'gol') {
        placarPill = `${estado.placarCasa} - ${estado.placarFora}`;
        detalhe = ev.jogadorAssistenciaId
          ? `(${nomesRef.current[ev.jogadorAssistenciaId] ?? 'assistência'})`
          : ev.penaltiData
            ? nomeFalta
              ? `(pênalti · falta de ${nomeFalta})`
              : '(pênalti)'
            : undefined;
      } else if (ev.tipo === 'substituicao') {
        autor = ev.jogadorEntraId
          ? nomesRef.current[ev.jogadorEntraId] ?? 'Reserva'
          : nomeAutor;
        detalhe = `(${nomeAutor})`;
      } else if (ev.tipo === 'penalti') {
        detalhe = nomeFalta
          ? `(pênalti desperdiçado · falta de ${nomeFalta})`
          : '(pênalti desperdiçado)';
      }

      return {
        minuto: ev.minuto,
        tipo: ev.tipo,
        descricao: narrarEvento(ev, {
          nomeJogador: nomeAutor,
          nomeJogadorEntra: ev.jogadorEntraId
            ? nomesRef.current[ev.jogadorEntraId] ?? 'o reserva'
            : undefined,
          nomeTime: ehCasa ? nomeCasaRef.current : nomeForaRef.current,
          placar: `${estado.placarCasa} x ${estado.placarFora}`,
        }),
        lado: ehCasa ? 'casa' : 'fora',
        sigla: ehCasa ? siglaCasa : siglaFora,
        corTime: ehCasa ? corCasa : corFora,
        timeId: ev.timeId,
        autor,
        detalhe,
        placarPill,
      };
    };

    while (minutoSimuladoRef.current < alvo) {
      const proximoMinuto = minutoSimuladoRef.current + 1;
      if (proximoMinuto === MINUTO_INTERVALO + 1 && !marcosRef.current.segundoTempo) {
        marcosRef.current.segundoTempo = true;
        novosItens.push({
          minuto: MINUTO_INTERVALO + 1,
          tipo: 'segundo_tempo',
          descricao: narrarSegundoTempo(),
          lado: 'neutro',
        });
      }
      // Recalcula o contexto por minuto (passando o estado): expulsões,
      // lesões e fadiga acumuladas valem no resto do jogo.
      let ctx;
      try {
        ctx = calcularContextoMinuto(
          clubeCasa,
          clubeFora,
          jogadoresCasa,
          jogadoresFora,
          estado,
        );
      } catch {
        break;
      }
      const novos = simularMinuto(estado, ctx);
      minutoSimuladoRef.current = proximoMinuto;
      for (const ev of novos) {
        novosItens.push(criarItem(ev));
        const doUsuario =
          (ev.timeId === fixture.timeCasa) ===
          (ladoUsuarioRef.current === 'casa');
        if (ev.tipo === 'cartao_vermelho') {
          registrarSom(3, () => tocarExpulsao(doUsuario));
        } else if (ev.tipo === 'penalti') {
          registrarSom(2, () => tocarPenaltiPerdido(doUsuario));
        } else if (ev.tipo === 'lesao') {
          registrarSom(1, () => tocarContusao());
        } else if (ev.tipo === 'cartao_amarelo') {
          registrarSom(1, () => tocarCartaoAmarelo());
        } else if (ev.tipo === 'chance_perdida') {
          // O VAR anula gol virando um 'chance_perdida' com "anulado" na descrição.
          if (ev.descricao.includes('anulado')) {
            registrarSom(2, () => tocarVarAnulado());
          } else {
            registrarSom(1, () => tocarChancePerdida());
          }
        }
      }
      if (proximoMinuto === MINUTO_INTERVALO && !marcosRef.current.intervalo) {
        marcosRef.current.intervalo = true;
        registrarSom(4, tocarIntervalo);
        novosItens.push({
          minuto: MINUTO_INTERVALO,
          tipo: 'intervalo',
          descricao: narrarIntervalo(
            nomeCasaRef.current,
            nomeForaRef.current,
            estado.placarCasa,
            estado.placarFora,
          ),
          lado: 'neutro',
          placarPill: `${estado.placarCasa} - ${estado.placarFora}`,
        });
      }
      if (proximoMinuto === DURACAO && !marcosRef.current.fim) {
        marcosRef.current.fim = true;
        novosItens.push({
          minuto: DURACAO,
          tipo: 'fim',
          descricao: narrarFim(
            nomeCasaRef.current,
            nomeForaRef.current,
            estado.placarCasa,
            estado.placarFora,
          ),
          lado: 'neutro',
          placarPill: `${estado.placarCasa} - ${estado.placarFora}`,
        });
      }
    }

    // O gol tem som próprio (efeito do placar) e vence os demais do lote.
    const somDoLote = lote.som;
    if (somDoLote && estado.placarCasa + estado.placarFora === golsAntesDoLote) {
      somDoLote();
    }

    if (novosItens.length > 0) {
      setEventos(prev => [...prev, ...novosItens]);
    }
    setPlacar({casa: estado.placarCasa, fora: estado.placarFora});
    setPosse(calcularPossePartida(estado));

    // RODADA AO VIVO: os outros jogos avançam até o mesmo minuto que o seu.
    // Nada pré-computado — cada placar evolui de verdade, minuto a minuto.
    avancarJogosAoVivo(outrosJogosRef.current, alvo);
    const placares: PlacarAoVivo[] = outrosJogosRef.current.map(jogo => ({
      id: jogo.id,
      nomeCasa: jogo.nomeCasa,
      nomeFora: jogo.nomeFora,
      corCasa: jogo.corCasa,
      corFora: jogo.corFora,
      golsCasa: jogo.estado.placarCasa,
      golsFora: jogo.estado.placarFora,
    }));
    setPlacaresRodada(placares);

    // Classificação ao vivo: tabela pré-rodada + resultados PARCIAIS de todos
    // os jogos (o seu incluso), reordenada em tempo real.
    const resultadosParciais = [
      ...outrosJogosRef.current.map(jogo => ({
        timeCasa: jogo.timeCasa,
        timeFora: jogo.timeFora,
        golsCasa: jogo.estado.placarCasa,
        golsFora: jogo.estado.placarFora,
      })),
      {
        timeCasa: fixture.timeCasa,
        timeFora: fixture.timeFora,
        golsCasa: estado.placarCasa,
        golsFora: estado.placarFora,
      },
    ];
    setTabelaAoVivo(projetarTabela(tabelaBaseRef.current, resultadosParciais));
  }, [minuto, fixture, siglaCasa, siglaFora, corCasa, corFora]);

  // Pulso + som quando o placar aumenta.
  const totalGols = placar.casa + placar.fora;
  useEffect(() => {
    if (totalGols > golsPulseRef.current) {
      Animated.sequence([
        Animated.timing(pulsePlacar, {toValue: 1.12, duration: 160, useNativeDriver: true}),
        Animated.timing(pulsePlacar, {toValue: 1, duration: 160, useNativeDriver: true}),
      ]).start();
    }
    golsPulseRef.current = totalGols;
  }, [totalGols, pulsePlacar]);

  // Som de gol por lado: a festa é do usuário, o lamento é do adversário.
  useEffect(() => {
    const usuarioEhCasa = ladoUsuarioRef.current === 'casa';
    const golsUsuario = usuarioEhCasa ? placar.casa : placar.fora;
    const golsAdversario = usuarioEhCasa ? placar.fora : placar.casa;
    if (golsUsuario > golsSomRef.current.usuario) {
      tocarGol(true);
    } else if (golsAdversario > golsSomRef.current.adversario) {
      tocarGol(false);
    }
    golsSomRef.current = {usuario: golsUsuario, adversario: golsAdversario};
  }, [placar]);

  // Fecha a partida e simula o resto da rodada ao terminar.
  useEffect(() => {
    if (!(terminou && fixture && estadoRef.current && !comitadoRef.current)) {
      return;
    }
    comitadoRef.current = true;
    pararTorcida();
    tocarFimDeJogo();
    const e = estadoRef.current;
    if (modoCopaRef.current) {
      // Usuário manda o jogo: gols dele = placar da casa. Empate → pênaltis.
      const golsUsuario = e.placarCasa;
      const golsAdversario = e.placarFora;
      let vencedorPenaltis: string | undefined;
      if (golsUsuario === golsAdversario) {
        const meus = useGameStore
          .getState()
          .jogadores.filter(j => j.clubeId === fixture.timeCasa);
        vencedorPenaltis = disputarPenaltis(
          criarRNGComSeed(hashString(`${fixture.id}_pen`)),
          mediaOverall(meus),
          mediaOverall(jogadoresAdversarioRef.current),
          fixture.timeCasa,
          fixture.timeFora,
        );
      }
      useGameStore
        .getState()
        .avancarFaseCopa({golsUsuario, golsAdversario, vencedorPenaltis});
      nav.navigate('Copa');
    } else {
      useGameStore
        .getState()
        .concluirPartidaAoVivo(
          fixture.id,
          e.eventos,
          e.placarCasa,
          e.placarFora,
          calcularPossePartida(e),
          calcularEstatisticasFinais(e),
        );
    }
  }, [terminou, fixture, nav]);

  const retomarSegundoTempo = () => {
    setSegundoTempoLiberado(true);
    setIntervalo(false);
  };

  const pularParaFim = () => {
    setSegundoTempoLiberado(true);
    setIntervalo(false);
    setPausado(false);
    setRelogioSeg(DURACAO_SEG);
  };

  // Apito do árbitro: encerra o tempo atual. No 1º tempo vai ao intervalo; no
  // 2º tempo, encerra a partida.
  const apitar = () => {
    if (relogioSeg < SEG_INTERVALO && !segundoTempoLiberado) {
      setPausado(false);
      setRelogioSeg(SEG_INTERVALO);
      setIntervalo(true);
    } else {
      pularParaFim();
    }
  };

  const realizarSubstituicao = (slotIndex: number, entranteId: string) => {
    const formacao = clubeUsuario?.formacaoAtual;
    if (!formacao || subsFeitas >= MAX_SUBSTITUICOES) {
      return;
    }
    const saiId = formacao.titulares[slotIndex]?.jogadorId;
    if (!saiId || saiId === entranteId) {
      return;
    }
    const entrante = jogadores.find(jogador => jogador.id === entranteId);
    if (!entrante || entrante.lesionado || entrante.suspenso) {
      return;
    }
    const nomeSai = nomesRef.current[saiId] ?? 'o titular';
    const nomeEntra = nomesRef.current[entranteId] ?? 'o reserva';
    const lado = ladoUsuarioRef.current;

    atualizarFormacaoUsuario(trocarTitular(formacao, slotIndex, entranteId));
    setJaSairam(atual => {
      const proximo = new Set(atual);
      proximo.add(saiId);
      return proximo;
    });

    // Registra a troca nos eventos PERSISTIDOS da partida: é o que permite à
    // súmula calcular minutos jogados e mostrar a linha do tempo completa.
    if (clubeUsuario) {
      estadoRef.current?.eventos.push({
        minuto,
        tipo: 'substituicao',
        timeId: clubeUsuario.id,
        jogadorId: saiId,
        jogadorEntraId: entranteId,
        descricao: `Substituição: sai ${nomeSai}, entra ${nomeEntra}.`,
      });
    }

    setEventos(atuais => [
      ...atuais,
      {
        minuto,
        tipo: 'substituicao',
        descricao: `Substituição: sai ${nomeSai}, entra ${nomeEntra}.`,
        lado,
        sigla: lado === 'casa' ? siglaCasa : siglaFora,
        corTime: corDoTime(clubeUsuario?.id ?? ''),
        timeId: clubeUsuario?.id,
        autor: nomeEntra,
        detalhe: `(${nomeSai})`,
      },
    ]);
    setSubsFeitas(n => n + 1);
  };

  // Feed "clean": lance mais RECENTE no topo (como o modelo) — o novo evento
  // aparece sem auto-scroll. Empate de minuto mantém o mais novo acima.
  const eventosFeed = useMemo(
    () =>
      eventos
        .map((item, indice) => ({item, indice}))
        .sort((a, b) => b.item.minuto - a.item.minuto || b.indice - a.indice)
        .map(({item}) => item),
    [eventos],
  );

  if (!fixture) {
    return null;
  }

  const formacaoUsuario: Formacao | null = clubeUsuario?.formacaoAtual ?? null;
  const elencoUsuario = clubeUsuario
    ? jogadores.filter(jogador => jogador.clubeId === clubeUsuario.id)
    : [];

  // Posse de bola REAL: acumulada pela engine a cada minuto simulado (domínio
  // de meio-campo atual + tática + placar + lances do minuto). Substituições,
  // expulsões e fadiga movem este número de verdade — nada é inventado na UI.
  const posseCasa = posse.casa;

  // Condições do jogo (modelo): estádio do mandante, público pela fórmula
  // REAL da bilheteria (posição atual na tabela) e clima sorteado pela engine.
  const clubeCasaObj =
    ladoUsuarioRef.current === 'casa' ? clubeUsuario : adversarioRef.current;
  const estadioCasa = clubeCasaObj?.estadio;
  const posicaoMandante = clubeCasaObj
    ? tabela.findIndex(linha => linha.clubeId === clubeCasaObj.id) + 1
    : 0;
  const publico = clubeCasaObj
    ? calcularPublicoJogo(clubeCasaObj, posicaoMandante > 0 ? posicaoMandante : 10)
    : undefined;
  const condicoes = estadoRef.current?.estatisticas;

  return (
    <ScreenContainer>
      <View style={styles.conteudo}>
        <View style={styles.topo}>
          <Animated.View style={{transform: [{scale: pulsePlacar}]}}>
            <View style={styles.placarCard}>
              <View style={styles.placarTimes}>
                <Text
                  style={[styles.placarNome, styles.placarNomeEsq]}
                  numberOfLines={1}>
                  {nomeCasaRef.current}
                </Text>
                <Text style={styles.placarNumeros}>
                  {placar.casa} <Text style={styles.placarTraco}>-</Text>{' '}
                  {placar.fora}
                </Text>
                <Text
                  style={[styles.placarNome, styles.placarNomeDir]}
                  numberOfLines={1}>
                  {nomeForaRef.current}
                </Text>
              </View>
              <Text style={styles.placarMeta}>
                {modoCopa
                  ? 'Copa do Brasil'
                  : `${clubeUsuario?.divisao ?? 'Brasileirão'} · Rodada ${fixture.rodada}`}
                {' | '}
                {terminou
                  ? 'Fim de jogo'
                  : intervalo
                    ? 'Intervalo'
                    : `${minuto}' ao vivo`}
              </Text>
              <View style={styles.metaChips}>
                {estadioCasa ? (
                  <View style={styles.metaChip}>
                    <Icone
                      nome="estadio"
                      tamanho={12}
                      cor={cores.textoSecundario}
                    />
                    <Text style={styles.metaChipTexto} numberOfLines={1}>
                      {estadioCasa.nome}
                    </Text>
                  </View>
                ) : null}
                {publico !== undefined ? (
                  <View style={styles.metaChip}>
                    <Icone
                      nome="publico"
                      tamanho={12}
                      cor={cores.textoSecundario}
                    />
                    <Text style={styles.metaChipTexto}>
                      {publico.toLocaleString('pt-BR')}
                    </Text>
                  </View>
                ) : null}
                {condicoes ? (
                  <View style={styles.metaChip}>
                    <Icone
                      nome={iconeClima(condicoes.clima)}
                      tamanho={12}
                      cor={cores.textoSecundario}
                    />
                    <Text style={styles.metaChipTexto}>
                      {condicoes.clima} · {condicoes.temperatura}°C
                    </Text>
                  </View>
                ) : null}
                {estadioCasa ? (
                  <View style={styles.metaChip}>
                    <Icone
                      nome="gramado"
                      tamanho={12}
                      cor={cores.textoSecundario}
                    />
                    <Text style={styles.metaChipTexto}>
                      {rotuloGramado(estadioCasa.nivelInfraestrutura)}
                    </Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.posseRow}>
                <View style={styles.posseTrack}>
                  <View
                    style={[
                      styles.posseFill,
                      {flex: posseCasa, backgroundColor: corCasa},
                    ]}
                  />
                  <View
                    style={[
                      styles.posseFill,
                      {flex: 100 - posseCasa, backgroundColor: corFora},
                    ]}
                  />
                </View>
                <Text style={styles.posseTexto}>
                  Posse {posseCasa}% / {100 - posseCasa}%
                </Text>
              </View>
            </View>
          </Animated.View>
        </View>

        {outrosJogosRef.current.length > 0 ? (
          <View style={styles.abasFeed}>
            {(['lances', 'rodada', 'tabela'] as const).map(chave => (
              <Pressable
                key={chave}
                style={[
                  styles.abaFeed,
                  abaFeed === chave && styles.abaFeedAtiva,
                ]}
                onPress={() => setAbaFeed(chave)}>
                <Text
                  style={[
                    styles.abaFeedTexto,
                    abaFeed === chave && styles.abaFeedTextoAtivo,
                  ]}>
                  {chave === 'lances'
                    ? 'Lances'
                    : chave === 'rodada'
                      ? 'Rodada'
                      : 'Tabela'}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {abaFeed === 'rodada' && outrosJogosRef.current.length > 0 ? (
          <FlatList
            style={styles.lista}
            contentContainerStyle={styles.listaConteudo}
            data={placaresRodada}
            keyExtractor={item => item.id}
            renderItem={({item}) => (
              <View style={styles.jogoRodada}>
                <View
                  style={[styles.jogoFaixa, {backgroundColor: item.corCasa}]}
                />
                <Text
                  style={[styles.jogoNome, styles.jogoNomeEsq]}
                  numberOfLines={1}>
                  {item.nomeCasa}
                </Text>
                <Text style={styles.jogoPlacar}>
                  {item.golsCasa} - {item.golsFora}
                </Text>
                <Text style={styles.jogoNome} numberOfLines={1}>
                  {item.nomeFora}
                </Text>
                <View
                  style={[styles.jogoFaixa, {backgroundColor: item.corFora}]}
                />
                <Text style={styles.jogoMinuto}>
                  {minuto >= DURACAO ? 'FIM' : `${minuto}'`}
                </Text>
              </View>
            )}
          />
        ) : abaFeed === 'tabela' && outrosJogosRef.current.length > 0 ? (
          <FlatList
            style={styles.lista}
            contentContainerStyle={styles.listaConteudo}
            data={tabelaAoVivo}
            keyExtractor={item => item.clubeId}
            renderItem={({item, index}) => {
              const ehUsuario = item.clubeId === clubeUsuario?.id;
              // Zonas (BRASFOOT §): G4 = acesso/topo (verde), Z4 = rebaixamento
              // (vermelho); o restante fica neutro.
              const total = tabelaAoVivo.length;
              const zona =
                index < 4
                  ? {faixa: acentos.verde, badge: suaves.verde, texto: acentos.verde}
                  : index >= total - 4
                    ? {faixa: acentos.vermelho, badge: suaves.vermelho, texto: acentos.vermelho}
                    : null;
              return (
                <View
                  style={[
                    styles.tabelaLinha,
                    ehUsuario && styles.tabelaLinhaUsuario,
                  ]}>
                  <View
                    style={[
                      styles.tabelaZona,
                      {backgroundColor: zona?.faixa ?? 'transparent'},
                    ]}
                  />
                  <View
                    style={[
                      styles.tabelaPosBadge,
                      zona ? {backgroundColor: zona.badge} : null,
                    ]}>
                    <Text
                      style={[
                        styles.tabelaPos,
                        zona ? {color: zona.texto} : null,
                      ]}>
                      {index + 1}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.jogoFaixa,
                      {backgroundColor: corDoTime(item.clubeId)},
                    ]}
                  />
                  <Text style={styles.tabelaNome} numberOfLines={1}>
                    {nomeClube(clubes, item.clubeId)}
                  </Text>
                  <Text style={styles.tabelaCol}>{item.jogos}</Text>
                  <Text style={styles.tabelaCol}>
                    {item.saldoGols > 0 ? `+${item.saldoGols}` : item.saldoGols}
                  </Text>
                  <Text style={styles.tabelaPts}>{item.pontos}</Text>
                </View>
              );
            }}
            ListHeaderComponent={
              <View style={[styles.tabelaLinha, styles.tabelaHeader]}>
                <View style={styles.tabelaZona} />
                <View style={styles.tabelaPosBadge}>
                  <Text style={styles.tabelaPos}>#</Text>
                </View>
                <View style={styles.jogoFaixa} />
                <Text style={styles.tabelaNome}>CLUBE</Text>
                <Text style={styles.tabelaCol}>J</Text>
                <Text style={styles.tabelaCol}>SG</Text>
                <Text style={styles.tabelaPts}>PTS</Text>
              </View>
            }
            ListFooterComponent={
              <View style={styles.tabelaLegenda}>
                <View style={[styles.legendaPonto, {backgroundColor: acentos.verde}]} />
                <Text style={styles.legendaTexto}>Acesso</Text>
                <View style={[styles.legendaPonto, {backgroundColor: acentos.vermelho}]} />
                <Text style={styles.legendaTexto}>Rebaixamento</Text>
              </View>
            }
          />
        ) : (
          <FlatList
            style={styles.lista}
            contentContainerStyle={styles.listaConteudo}
            data={eventosFeed}
            keyExtractor={(item, index) => `${item.minuto}_${item.tipo}_${index}`}
            renderItem={({item}) => (
              <LanceLimpo
                minuto={item.minuto}
                tipo={item.tipo}
                lado={item.lado}
                autor={item.autor}
                detalhe={item.detalhe}
                placarPill={item.placarPill}
                descricao={item.descricao}
              />
            )}
          />
        )}

        <View style={styles.controles}>
          {terminou ? (
            // UM botão só: liga → detalhes da partida (o "Continuar" vive lá);
            // Copa → seguir direto (o confronto não persiste súmula).
            <Botao
              titulo={modoCopa ? 'Continuar' : 'Ver detalhes da partida'}
              onPress={() =>
                modoCopa
                  ? nav.navigate('MainTabs')
                  : nav.navigate('MatchResult', {partidaId: fixture.id})
              }
            />
          ) : intervalo ? (
            <>
              <Text style={styles.avisoIntervalo}>
                Intervalo — faça ajustes e retome quando quiser.
              </Text>
              <View style={styles.linhaBotoes}>
                <View style={styles.botaoFlex}>
                  <BotaoIcone
                    nome="substituicao"
                    titulo="Ajustes"
                    variante="secundaria"
                    onPress={() => setAjustesVisivel(true)}
                  />
                </View>
                <View style={styles.botaoFlex}>
                  <BotaoIcone
                    nome="jogar"
                    titulo="Retomar (2º T)"
                    onPress={retomarSegundoTempo}
                  />
                </View>
              </View>
            </>
          ) : pausado ? (
            <View style={styles.linhaBotoes}>
              <View style={styles.botaoFlex}>
                <BotaoIcone
                  nome="substituicao"
                  titulo="Ajustes"
                  variante="secundaria"
                  onPress={() => setAjustesVisivel(true)}
                />
              </View>
              <View style={styles.botaoFlex}>
                <BotaoIcone
                  nome="jogar"
                  titulo="Retomar"
                  onPress={() => setPausado(false)}
                />
              </View>
            </View>
          ) : (
            <>
              <View style={styles.linhaVelocidade}>
                <Icone
                  nome="relogio"
                  tamanho={15}
                  cor={cores.textoSecundario}
                />
                {MULTIPLICADORES.map(mult => {
                  const ativo = multiplicador === mult;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      key={mult}
                      onPress={() => setMultiplicador(mult)}
                      style={[
                        styles.chipVel,
                        ativo ? styles.chipVelAtivo : null,
                      ]}>
                      <Text
                        style={[
                          styles.chipVelTexto,
                          ativo ? styles.chipVelTextoAtivo : null,
                        ]}>
                        {mult}x
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.linhaBotoes}>
                <View style={styles.botaoFlex}>
                  <BotaoIcone
                    nome="substituicao"
                    titulo="Ajustes"
                    variante="secundaria"
                    onPress={() => {
                      setPausado(true);
                      setAjustesVisivel(true);
                    }}
                  />
                </View>
                <View style={styles.botaoFlex}>
                  <BotaoIcone
                    nome="pausar"
                    titulo="Pausar"
                    variante="secundaria"
                    onPress={() => setPausado(true)}
                  />
                </View>
                <View style={styles.botaoFlex}>
                  <BotaoIcone nome="apito" titulo="Apitar" onPress={apitar} />
                </View>
              </View>
            </>
          )}
        </View>
      </View>

      {ajustesVisivel && formacaoUsuario && clubeUsuario?.taticaAtual ? (
        <AjustesPartida
          formacao={formacaoUsuario}
          tatica={clubeUsuario.taticaAtual}
          elenco={elencoUsuario}
          nomes={nomesRef.current}
          subsRestantes={MAX_SUBSTITUICOES - subsFeitas}
          jaSairamIds={jaSairam}
          onSubstituir={realizarSubstituicao}
          onAtualizarFormacao={atualizarFormacaoUsuario}
          onAtualizarTatica={atualizarTaticaUsuario}
          onFechar={() => setAjustesVisivel(false)}
        />
      ) : null}
    </ScreenContainer>
  );
}

/** Botão com ícone à esquerda do título. */
function BotaoIcone({
  nome,
  titulo,
  onPress,
  variante = 'primaria',
  disabled,
}: {
  nome: React.ComponentProps<typeof Icone>['nome'];
  titulo: string;
  onPress: () => void;
  variante?: 'primaria' | 'secundaria';
  disabled?: boolean;
}): React.JSX.Element {
  const primaria = variante === 'primaria';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.botaoIcone,
        primaria ? styles.botaoIconePrimaria : styles.botaoIconeSecundaria,
        disabled ? styles.botaoIconeDisabled : null,
      ]}>
      <Icone
        nome={nome}
        tamanho={16}
        cor={primaria ? cores.contrastePrimaria : cores.texto}
      />
      <Text
        style={primaria ? styles.botaoIconeTextoPrimaria : styles.botaoIconeTexto}>
        {titulo}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  conteudo: {
    flex: 1,
    gap: espaco.md,
    padding: espaco.lg,
  },
  topo: {
    gap: espaco.md,
  },
  placarCard: {
    backgroundColor: cores.superficie,
    borderColor: cores.borda,
    borderRadius: raio.lg,
    borderWidth: 1,
    gap: espaco.sm,
    padding: espaco.lg,
    ...sombra.suave,
  },
  placarTimes: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.sm,
  },
  placarNome: {
    color: cores.texto,
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
  },
  placarNomeEsq: {
    textAlign: 'right',
  },
  placarNomeDir: {
    textAlign: 'left',
  },
  placarNumeros: {
    color: cores.texto,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  placarTraco: {
    color: cores.textoSecundario,
  },
  placarMeta: {
    color: cores.textoSecundario,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  metaChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaco.xs,
    justifyContent: 'center',
  },
  metaChip: {
    alignItems: 'center',
    backgroundColor: cores.fundo,
    borderRadius: raio.pill,
    flexDirection: 'row',
    gap: 4,
    maxWidth: 190,
    paddingHorizontal: espaco.sm,
    paddingVertical: 3,
  },
  metaChipTexto: {
    color: cores.textoSecundario,
    fontSize: 11,
    fontWeight: '700',
  },
  posseRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.md,
    marginTop: espaco.xs,
  },
  posseTrack: {
    backgroundColor: cores.fundoBase,
    borderRadius: raio.pill,
    flex: 1,
    flexDirection: 'row',
    gap: 2,
    height: 8,
    overflow: 'hidden',
  },
  posseFill: {
    height: '100%',
  },
  posseTexto: {
    color: cores.textoSecundario,
    fontSize: 12,
    fontWeight: '700',
  },
  lista: {
    flex: 1,
  },
  listaConteudo: {
    gap: espaco.sm,
    paddingVertical: espaco.sm,
  },
  abasFeed: {
    backgroundColor: cores.fundoBase,
    borderRadius: raio.pill,
    flexDirection: 'row',
    padding: 3,
  },
  abaFeed: {
    alignItems: 'center',
    borderRadius: raio.pill,
    flex: 1,
    paddingVertical: 7,
  },
  abaFeedAtiva: {
    backgroundColor: cores.superficie,
    ...sombra.suave,
  },
  abaFeedTexto: {
    color: cores.textoSecundario,
    fontSize: 12,
    fontWeight: '700',
  },
  abaFeedTextoAtivo: {
    color: cores.texto,
  },
  jogoRodada: {
    alignItems: 'center',
    backgroundColor: cores.superficie,
    borderColor: cores.borda,
    borderRadius: raio.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: espaco.sm,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
  },
  jogoFaixa: {
    borderRadius: 2,
    height: 18,
    width: 3,
  },
  jogoNome: {
    color: cores.texto,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  jogoNomeEsq: {
    textAlign: 'right',
  },
  jogoPlacar: {
    color: cores.texto,
    fontSize: 15,
    fontWeight: '900',
    minWidth: 44,
    textAlign: 'center',
  },
  jogoMinuto: {
    color: cores.primaria,
    fontSize: 11,
    fontWeight: '800',
    minWidth: 30,
    textAlign: 'right',
  },
  tabelaLinha: {
    alignItems: 'center',
    backgroundColor: cores.superficie,
    borderColor: cores.borda,
    borderRadius: raio.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: espaco.sm,
    paddingHorizontal: espaco.md,
    paddingVertical: 7,
  },
  tabelaHeader: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    paddingVertical: 2,
  },
  tabelaLinhaUsuario: {
    backgroundColor: cores.superficieAlt,
    borderColor: cores.primaria,
  },
  tabelaZona: {
    borderRadius: 2,
    height: 22,
    width: 4,
  },
  tabelaPosBadge: {
    alignItems: 'center',
    borderRadius: raio.sm,
    justifyContent: 'center',
    minWidth: 24,
    paddingVertical: 2,
  },
  tabelaPos: {
    color: cores.textoSecundario,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  tabelaNome: {
    color: cores.texto,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  tabelaCol: {
    color: cores.textoSecundario,
    fontSize: 12,
    fontWeight: '700',
    minWidth: 26,
    textAlign: 'center',
  },
  tabelaPts: {
    color: cores.texto,
    fontSize: 14,
    fontWeight: '900',
    minWidth: 30,
    textAlign: 'right',
  },
  tabelaLegenda: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.xs,
    justifyContent: 'center',
    paddingTop: espaco.sm,
  },
  legendaPonto: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  legendaTexto: {
    color: cores.textoSecundario,
    fontSize: 11,
    fontWeight: '700',
    marginRight: espaco.sm,
  },
  controles: {
    gap: espaco.sm,
  },
  avisoIntervalo: {
    color: cores.secundaria,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  linhaBotoes: {
    flexDirection: 'row',
    gap: espaco.sm,
  },
  linhaVelocidade: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.sm,
  },
  botaoFlex: {
    flex: 1,
  },
  chipVel: {
    alignItems: 'center',
    borderColor: cores.bordaTransl,
    borderRadius: raio.pill,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 40,
  },
  chipVelAtivo: {
    backgroundColor: cores.primaria,
    borderColor: cores.primaria,
  },
  chipVelTexto: {
    color: cores.texto,
    fontSize: 13,
    fontWeight: '800',
  },
  chipVelTextoAtivo: {
    color: cores.contrastePrimaria,
  },
  botaoIcone: {
    alignItems: 'center',
    borderRadius: raio.sm,
    flexDirection: 'row',
    gap: espaco.sm,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: espaco.md,
  },
  botaoIconePrimaria: {
    backgroundColor: cores.primaria,
  },
  botaoIconeSecundaria: {
    borderColor: cores.borda,
    borderWidth: 1,
  },
  botaoIconeDisabled: {
    opacity: 0.45,
  },
  botaoIconeTexto: {
    color: cores.texto,
    fontSize: 14,
    fontWeight: '800',
  },
  botaoIconeTextoPrimaria: {
    color: cores.contrastePrimaria,
    fontSize: 14,
    fontWeight: '800',
  },
});

export default MatchSimulation;
