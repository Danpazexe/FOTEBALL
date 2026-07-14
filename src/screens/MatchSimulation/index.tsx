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

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Animated, ScrollView, StyleSheet, View} from 'react-native';

import {trocarTitular} from '../../api/database/seed/defaults';
import {
  definirSomHabilitado,
  definirVolumeEfeitos,
  iniciarTorcida,
  inicializarSons,
  pararTorcida,
  tocarBolaNaTrave,
  tocarCartaoAmarelo,
  tocarChancePerdida,
  tocarContusao,
  tocarExpulsao,
  tocarFalhaGoleiro,
  tocarFimDeJogo,
  tocarGol,
  tocarGolContra,
  tocarInicio,
  tocarIntervalo,
  tocarPenalti,
  tocarSubstituicao,
  tocarVarAnulado,
  tocarVarChecando,
} from '../../audio/sons';
import {suprimirMusica} from '../../audio/musica';
import {salvarAgora} from '../../store/autosave';
import {
  AppBar,
  Box,
  Button,
  Card,
  Chip,
  Divider,
  Icon,
  IconButton,
  Screen,
  SectionHeader,
  Tabs,
  TeamCrest,
  Text,
  espacamento,
  raios,
  useTheme,
  type CorTexto,
} from '../../design-system';
import type {IconeNome} from '../../components/Icone';
import {type LadoLance} from '../../components/MatchNarration/LanceLimpo';
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
  acrescimosDaSeed,
  calcularEstatisticasFinais,
  calcularPossePartida,
  iniciarPartidaAoVivo,
  simularMinuto,
  type EstadoPartidaAoVivo,
} from '../../engine/simulation/matchSimulator';
import {confrontoDoClube} from '../../engine/season/copaEngine';
import {hashString} from '../../engine/simulation/rng';
import {
  selecionarClubeUsuario,
  selecionarCopaNaVez,
  selecionarProximoJogo,
  useGameStore,
} from '../../store/useGameStore';
import {corDoTime} from '../../theme';
import {nomeClube, siglaClube} from '../../utils/formatters';
import {rotuloMinuto} from '../../utils/minutoPartida';
import type {
  Clube,
  EventoPartida,
  Formacao,
  Partida,
  Player,
  TabelaClassificacao,
} from '../../types';
import {useAppNavigation, useAppRoute} from '../../navigation/types';
import {useFocusEffect} from '@react-navigation/native';

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
// Velocidades de tempo (multiplicadores). A cada tick o relógio avança
// PASSO_BASE × multiplicador segundos de jogo: 1x é o ritmo base, 10x voa.
const MULTIPLICADORES = [1, 2, 5, 10] as const;
const TICK_MS = 90;
const PASSO_BASE_SEG = 6;

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
  /** Acréscimos do 2º tempo deste jogo (mesma fórmula por seed do store). */
  acrescimos: number;
};

/** Placar de um jogo para render (derivado do estado vivo a cada minuto). */
type PlacarAoVivo = {
  id: string;
  nomeCasa: string;
  nomeFora: string;
  idCasa: string;
  idFora: string;
  siglaCasa: string;
  siglaFora: string;
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
      acrescimos: acrescimosDaSeed(
        st.rodadaAtual * 1000 + jogosRodada.indexOf(jogo),
      ),
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
    // Cada jogo tem seu próprio fim (90 + acréscimos dele), então nunca passa do
    // total mesmo que o relógio da SUA partida vá além.
    const alvoJogo = Math.min(alvo, DURACAO + jogo.acrescimos);
    while (jogo.minutoSimulado < alvoJogo) {
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
  const {cores} = useTheme();
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
  const [corCasa, setCorCasa] = useState<string>(corDoTime(''));
  const [corFora, setCorFora] = useState<string>(corDoTime(''));

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
  const marcosRef = useRef({
    intervalo: false,
    segundoTempo: false,
    acrescimos: false,
    fim: false,
  });
  const comitadoRef = useRef(false);

  const pulsePlacar = useRef(new Animated.Value(1)).current;
  const golsPulseRef = useRef(0);
  const golsSomRef = useRef({usuario: 0, adversario: 0});
  // "Sabor" do gol mais recente para escolher o som certo (gol contra / falha do
  // goleiro têm gravação dedicada; os demais usam a festa/lamento padrão).
  const saborGolRef = useRef<'normal' | 'contra' | 'falhaGoleiro'>('normal');

  const [relogioSeg, setRelogioSeg] = useState(0);
  // Acréscimos do 2º tempo (2–5 min), determinísticos pela seed da partida (mesma
  // fórmula do motor headless → o placar ao vivo bate com o simularPartida do store).
  const [acrescimos, setAcrescimos] = useState(3);
  const duracaoTotal = DURACAO + acrescimos;
  const duracaoTotalSeg = duracaoTotal * 60;
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
    definirVolumeEfeitos(estado.config.volumeEfeitos);
    inicializarSons();
    iniciarTorcida();
    tocarInicio();

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
      const meu = estado.copa ? confrontoDoClube(estado.copa, userId) : null;
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
      const seedPartida = hashString(meu.id) % 1_000_000;
      estadoRef.current = iniciarPartidaAoVivo(seedPartida);
      setAcrescimos(acrescimosDaSeed(seedPartida));

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
      const seedPartida =
        estado.rodadaAtual * 1000 +
        (proximo.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % 1000);
      estadoRef.current = iniciarPartidaAoVivo(seedPartida);
      setAcrescimos(acrescimosDaSeed(seedPartida));
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

  // Música de fundo: silencia enquanto a TELA da partida está em foco e retoma
  // ao sair. Como o resultado é uma tela SEPARADA (esta desfoca ao navegar pra
  // lá), a música volta já na tela de resultado — não fica muda "após a partida".
  useFocusEffect(
    useCallback(() => {
      suprimirMusica(true);
      return () => suprimirMusica(false);
    }, []),
  );

  const minuto = Math.min(duracaoTotal, Math.floor(relogioSeg / 60));
  const terminou = fixture !== null && relogioSeg >= duracaoTotalSeg;

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
        if (atual >= duracaoTotalSeg) {
          return duracaoTotalSeg;
        }
        const prox = atual + passoSeg;
        if (
          pausarNoIntervaloRef.current &&
          !segundoTempoLiberado &&
          prox >= SEG_INTERVALO
        ) {
          return SEG_INTERVALO;
        }
        return Math.min(prox, duracaoTotalSeg);
      });
    }, tickMs);
    return () => clearInterval(id);
  }, [
    fixture,
    terminou,
    pausado,
    intervalo,
    segundoTempoLiberado,
    multiplicador,
    duracaoTotalSeg,
  ]);

  // SIMULAÇÃO AO VIVO: simula os minutos ainda não simulados até o minuto atual,
  // recalculando a força a partir da escalação ATUAL (subs valem aqui).
  useEffect(() => {
    const estado = estadoRef.current;
    if (!fixture || !estado) {
      return;
    }
    const alvo = Math.min(minuto, duracaoTotal);
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
    const jogadoresCasa = usuarioEhCasa
      ? jogadoresUsuario
      : jogadoresAdversario;
    const jogadoresFora = usuarioEhCasa
      ? jogadoresAdversario
      : jogadoresUsuario;

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
      // Linha de detalhe = O QUE ACONTECEU (ação), não só o nome. Todo lance
      // ganha um rótulo claro; contexto extra (assistência/pênalti/falta) entra
      // junto quando existe.
      if (ev.tipo === 'gol') {
        placarPill = `${estado.placarCasa} - ${estado.placarFora}`;
        const assist = ev.jogadorAssistenciaId
          ? nomesRef.current[ev.jogadorAssistenciaId] ?? 'assistência'
          : undefined;
        detalhe = ev.penaltiData
          ? nomeFalta
            ? `Gol de pênalti · falta de ${nomeFalta}`
            : 'Gol de pênalti'
          : /falha do goleiro/i.test(ev.descricao)
          ? 'Gol · falha do goleiro'
          : /falha grave da defesa/i.test(ev.descricao)
          ? 'Gol · falha da defesa'
          : /falta/i.test(ev.descricao)
          ? 'Golaço de falta'
          : assist
          ? `Gol · assistência de ${assist}`
          : 'Gol!';
      } else if (ev.tipo === 'gol_contra') {
        placarPill = `${estado.placarCasa} - ${estado.placarFora}`;
        detalhe = 'Gol contra';
      } else if (ev.tipo === 'bola_trave') {
        detalhe = 'Na trave!';
      } else if (ev.tipo === 'substituicao') {
        autor = ev.jogadorEntraId
          ? nomesRef.current[ev.jogadorEntraId] ?? 'Reserva'
          : nomeAutor;
        detalhe = `Substituição · sai ${nomeAutor}`;
      } else if (ev.tipo === 'penalti') {
        detalhe = nomeFalta
          ? `Pênalti perdido · falta de ${nomeFalta}`
          : 'Pênalti perdido';
      } else if (ev.tipo === 'cartao_amarelo') {
        detalhe = 'Cartão amarelo';
      } else if (ev.tipo === 'cartao_vermelho') {
        detalhe = /segundo amarelo/i.test(ev.descricao)
          ? 'Expulso · 2º amarelo'
          : 'Cartão vermelho';
      } else if (ev.tipo === 'chance_perdida') {
        detalhe = /anulado/i.test(ev.descricao)
          ? 'Gol anulado pelo VAR'
          : 'Chance perdida';
      } else if (ev.tipo === 'lesao') {
        detalhe = 'Lesão';
      } else if (ev.tipo === 'falta_cobranca') {
        detalhe = 'Cobrança de falta perigosa';
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
      if (
        proximoMinuto === MINUTO_INTERVALO + 1 &&
        !marcosRef.current.segundoTempo
      ) {
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
        if (ev.tipo === 'gol_contra') {
          saborGolRef.current = 'contra';
        } else if (ev.tipo === 'gol') {
          saborGolRef.current = /falha do goleiro/i.test(ev.descricao)
            ? 'falhaGoleiro'
            : 'normal';
        }
        // VAR intervindo (pênalti flagrado): "atenção, o VAR está checando" antes
        // do desfecho. Chamada direta (gated) porque o gol converte o lote.
        if (comSomDeLance && ev.descricao.includes('VAR flagra')) {
          tocarVarChecando();
        }
        if (ev.tipo === 'cartao_vermelho') {
          registrarSom(3, () => tocarExpulsao(doUsuario));
        } else if (ev.tipo === 'penalti') {
          // Pênalti do VAR já é anunciado pelo "VAR checando" acima — não dobra o apito.
          if (!ev.descricao.includes('VAR flagra')) {
            registrarSom(2, () => tocarPenalti());
          }
        } else if (ev.tipo === 'lesao') {
          registrarSom(1, () => tocarContusao());
        } else if (ev.tipo === 'cartao_amarelo') {
          registrarSom(1, () => tocarCartaoAmarelo());
        } else if (ev.tipo === 'substituicao') {
          registrarSom(1, () => tocarSubstituicao());
        } else if (ev.tipo === 'chance_perdida') {
          // O VAR anula gol virando um 'chance_perdida' com "anulado" na descrição.
          if (ev.descricao.includes('anulado')) {
            registrarSom(2, () => tocarVarAnulado());
          } else {
            registrarSom(1, () => tocarChancePerdida());
          }
        } else if (ev.tipo === 'bola_trave') {
          registrarSom(2, () => tocarBolaNaTrave());
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
      // Aos 90': anuncia os minutos de acréscimo (o jogo segue até 90+X).
      if (
        proximoMinuto === DURACAO &&
        acrescimos > 0 &&
        !marcosRef.current.acrescimos
      ) {
        marcosRef.current.acrescimos = true;
        novosItens.push({
          minuto: DURACAO,
          tipo: 'acrescimos',
          descricao: `⏱️ O árbitro assinala +${acrescimos} ${
            acrescimos === 1 ? 'minuto' : 'minutos'
          } de acréscimo`,
          lado: 'neutro',
        });
      }
      if (proximoMinuto === duracaoTotal && !marcosRef.current.fim) {
        marcosRef.current.fim = true;
        novosItens.push({
          minuto: duracaoTotal,
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
    if (
      somDoLote &&
      estado.placarCasa + estado.placarFora === golsAntesDoLote
    ) {
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
      idCasa: jogo.clubeCasa.id,
      idFora: jogo.clubeFora.id,
      siglaCasa: jogo.clubeCasa.sigla,
      siglaFora: jogo.clubeFora.sigla,
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
  }, [
    minuto,
    fixture,
    siglaCasa,
    siglaFora,
    corCasa,
    corFora,
    acrescimos,
    duracaoTotal,
  ]);

  // Pulso + som quando o placar aumenta.
  const totalGols = placar.casa + placar.fora;
  useEffect(() => {
    if (totalGols > golsPulseRef.current) {
      Animated.sequence([
        Animated.timing(pulsePlacar, {
          toValue: 1.12,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(pulsePlacar, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    }
    golsPulseRef.current = totalGols;
  }, [totalGols, pulsePlacar]);

  // Som de gol por lado: a festa é do usuário, o lamento é do adversário. Gol
  // contra e gol de falha do goleiro têm gravação dedicada (ver saborGolRef).
  useEffect(() => {
    const usuarioEhCasa = ladoUsuarioRef.current === 'casa';
    const golsUsuario = usuarioEhCasa ? placar.casa : placar.fora;
    const golsAdversario = usuarioEhCasa ? placar.fora : placar.casa;
    const houveGol =
      golsUsuario > golsSomRef.current.usuario ||
      golsAdversario > golsSomRef.current.adversario;
    if (houveGol) {
      const doUsuario = golsUsuario > golsSomRef.current.usuario;
      if (saborGolRef.current === 'contra') {
        tocarGolContra();
      } else if (saborGolRef.current === 'falhaGoleiro') {
        tocarFalhaGoleiro();
      } else {
        tocarGol(doUsuario);
      }
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
      // Usuário manda o jogo: gols dele = placar da casa. No empate, os pênaltis
      // são resolvidos pela ENGINE dentro de avancarFaseCopa (modo manager) —
      // igual aos confrontos de CPU, sem disputa interativa.
      const golsUsuario = e.placarCasa;
      const golsAdversario = e.placarFora;
      useGameStore.getState().avancarFaseCopa({golsUsuario, golsAdversario});
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
    // Salva JÁ o resultado — não espera o debounce do autosave (se o app fechar
    // logo após a partida, o progresso não pode se perder). Na Copa o confronto
    // já foi resolvido acima (avancarFaseCopa), então o save reflete a fase certa.
    salvarAgora();
  }, [terminou, fixture, nav]);

  const retomarSegundoTempo = () => {
    setSegundoTempoLiberado(true);
    setIntervalo(false);
  };

  const pularParaFim = () => {
    setSegundoTempoLiberado(true);
    setIntervalo(false);
    setPausado(false);
    setRelogioSeg(duracaoTotalSeg);
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
    ? calcularPublicoJogo(
        clubeCasaObj,
        posicaoMandante > 0 ? posicaoMandante : 10,
      )
    : undefined;
  const condicoes = estadoRef.current?.estatisticas;

  const clubeForaObj =
    ladoUsuarioRef.current === 'casa' ? adversarioRef.current : clubeUsuario;
  const clubeCasaId = clubeCasaObj?.id ?? '';
  const clubeForaId = clubeForaObj?.id ?? '';
  const momentum = condicoes?.momentumPorMinuto ?? [];
  const finCasa = condicoes?.casa.finalizacoes ?? 0;
  const alvoCasa = condicoes?.casa.finalizacoesNoAlvo ?? 0;
  const estadoRotulo = terminou
    ? 'Fim'
    : intervalo
    ? 'Intervalo'
    : `${rotuloMinuto(minuto)}'`;
  const temOutrosJogos = outrosJogosRef.current.length > 0;

  return (
    <Screen
      header={<AppBar title="Central da partida" />}>
      <View style={styles.corpo}>
        <View style={styles.meta}>
          <Text variant="labelL" color="textSecondary" align="center">
            {modoCopa
              ? 'Copa do Brasil'
              : `${clubeUsuario?.divisao ?? 'Brasileirão'} · Rodada ${
                  fixture.rodada
                }`}
          </Text>
          {estadioCasa ? (
            <Text variant="caption" color="textMuted" align="center">
              {estadioCasa.nome}
            </Text>
          ) : null}
        </View>

        <Animated.View style={{transform: [{scale: pulsePlacar}]}}>
          <Box bg="scoreboard" radius="lg" padding={4} gap={3}>
            <View style={styles.placarLinha}>
              <View style={styles.placarTime}>
                <TeamCrest clubeId={clubeCasaId} sigla={siglaCasa} size={44} />
                <Text
                  variant="labelL"
                  color="onScoreboard"
                  weight="800"
                  numberOfLines={1}>
                  {siglaCasa}
                </Text>
              </View>
              <View style={styles.placarCentro}>
                <View style={styles.placarNums}>
                  <Text variant="scoreXL" color="onScoreboard" tabular>
                    {placar.casa}
                  </Text>
                  <Text
                    variant="scoreXL"
                    color="onScoreboard"
                    style={styles.placarTraco}>
                    –
                  </Text>
                  <Text variant="scoreXL" color="onScoreboard" tabular>
                    {placar.fora}
                  </Text>
                </View>
                <View
                  style={[
                    styles.minutoPill,
                    {backgroundColor: terminou ? cores.textMuted : cores.brand},
                  ]}>
                  <Text variant="labelM" color="onBrand" weight="800" tabular>
                    {estadoRotulo}
                  </Text>
                </View>
              </View>
              <View style={styles.placarTime}>
                <TeamCrest clubeId={clubeForaId} sigla={siglaFora} size={44} />
                <Text
                  variant="labelL"
                  color="onScoreboard"
                  weight="800"
                  numberOfLines={1}>
                  {siglaFora}
                </Text>
              </View>
            </View>

            <MomentoChart momentum={momentum} />

            <View style={styles.statsRow}>
              <CelulaStat valor={`${posseCasa}%`} rotulo="Posse de bola" />
              <View
                style={[styles.statDiv, {backgroundColor: cores.onScoreboard}]}
              />
              <CelulaStat valor={String(finCasa)} rotulo="Finalizações" />
              <View
                style={[styles.statDiv, {backgroundColor: cores.onScoreboard}]}
              />
              <CelulaStat valor={String(alvoCasa)} rotulo="No alvo" />
            </View>
          </Box>
        </Animated.View>

        {publico !== undefined || condicoes || estadioCasa ? (
          <View style={styles.condicoes}>
            {publico !== undefined ? (
              <View style={styles.condItem}>
                <Icon nome="publico" size={14} color="textMuted" />
                <Text variant="caption" color="textSecondary">
                  {publico.toLocaleString('pt-BR')}
                </Text>
              </View>
            ) : null}
            {condicoes ? (
              <View style={styles.condItem}>
                <Icon
                  nome={iconeClima(condicoes.clima)}
                  size={14}
                  color="textMuted"
                />
                <Text variant="caption" color="textSecondary">
                  {condicoes.clima} · {condicoes.temperatura}°C
                </Text>
              </View>
            ) : null}
            {estadioCasa ? (
              <View style={styles.condItem}>
                <Icon nome="gramado" size={14} color="textMuted" />
                <Text variant="caption" color="textSecondary">
                  {rotuloGramado(estadioCasa.nivelInfraestrutura)}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {temOutrosJogos ? (
          <Tabs
            abas={[
              {chave: 'lances', rotulo: 'Eventos'},
              {chave: 'rodada', rotulo: 'Rodada'},
              {chave: 'tabela', rotulo: 'Tabela'},
            ]}
            ativa={abaFeed}
            onSelect={c => setAbaFeed(c as typeof abaFeed)}
          />
        ) : (
          <SectionHeader titulo="Eventos da partida" />
        )}

        <ScrollView
          style={styles.feed}
          contentContainerStyle={styles.feedConteudo}
          showsVerticalScrollIndicator={false}>

          {abaFeed === 'rodada' && temOutrosJogos ? (
            placaresRodada.length === 0 ? (
              <Text variant="bodyM" color="textSecondary">
                Sem outros jogos nesta rodada.
              </Text>
            ) : (
              <Card variante="outlined" padding={0}>
                {placaresRodada.map((item, i) => (
                  <React.Fragment key={item.id}>
                    {i > 0 ? <Divider /> : null}
                    <LinhaRodada
                      item={item}
                      minuto={minuto}
                      duracaoTotal={duracaoTotal}
                    />
                  </React.Fragment>
                ))}
              </Card>
            )
          ) : abaFeed === 'tabela' && temOutrosJogos ? (
            <Card variante="outlined" padding={0}>
              {tabelaAoVivo.map((item, index) => (
                <React.Fragment key={item.clubeId}>
                  {index > 0 ? <Divider /> : null}
                  <LinhaTabela
                    item={item}
                    index={index}
                    total={tabelaAoVivo.length}
                    nome={nomeClube(clubes, item.clubeId)}
                    sigla={siglaClube(clubes, item.clubeId)}
                    ehUsuario={item.clubeId === clubeUsuario?.id}
                  />
                </React.Fragment>
              ))}
            </Card>
          ) : eventosFeed.length === 0 ? (
            <Text variant="bodyM" color="textSecondary">
              A partida vai começar…
            </Text>
          ) : (
            <Card variante="outlined" padding={0}>
              {eventosFeed.map((item, index) => (
                <React.Fragment key={`${item.minuto}_${item.tipo}_${index}`}>
                  {index > 0 ? <Divider /> : null}
                  <LinhaEvento item={item} />
                </React.Fragment>
              ))}
            </Card>
          )}
        </ScrollView>

        <View style={styles.controles}>
          {terminou ? (
            <Button
              titulo={modoCopa ? 'Continuar' : 'Ver detalhes da partida'}
              fullWidth
              onPress={() =>
                modoCopa
                  ? nav.navigate('MainTabs')
                  : nav.navigate('MatchResult', {partidaId: fixture.id})
              }
            />
          ) : intervalo ? (
            <>
              <Text variant="caption" color="textSecondary" align="center">
                Intervalo — faça ajustes e retome quando quiser.
              </Text>
              <View style={styles.linhaBotoes}>
                <View style={styles.flex}>
                  <Button
                    titulo="Ajustar time"
                    variante="secondary"
                    icone="substituicao"
                    fullWidth
                    onPress={() => setAjustesVisivel(true)}
                  />
                </View>
                <View style={styles.flex}>
                  <Button
                    titulo="Retomar 2º T"
                    icone="jogar"
                    fullWidth
                    onPress={retomarSegundoTempo}
                  />
                </View>
              </View>
            </>
          ) : pausado ? (
            <View style={styles.linhaBotoes}>
              <View style={styles.flex}>
                <Button
                  titulo="Ajustar time"
                  variante="secondary"
                  icone="substituicao"
                  fullWidth
                  onPress={() => setAjustesVisivel(true)}
                />
              </View>
              <View style={styles.flex}>
                <Button
                  titulo="Retomar"
                  icone="jogar"
                  fullWidth
                  onPress={() => setPausado(false)}
                />
              </View>
            </View>
          ) : (
            <>
              <View style={styles.linhaLive}>
                <View style={styles.velocidade}>
                  <Icon nome="relogio" size={16} color="textSecondary" />
                  {MULTIPLICADORES.map(mult => (
                    <Chip
                      key={mult}
                      label={`${mult}x`}
                      selected={multiplicador === mult}
                      onPress={() => setMultiplicador(mult)}
                    />
                  ))}
                </View>
                <View style={styles.acoesLive}>
                  <IconButton
                    icone="pausar"
                    variante="soft"
                    accessibilityLabel="Pausar"
                    onPress={() => setPausado(true)}
                  />
                  <IconButton
                    icone="apito"
                    variante="soft"
                    accessibilityLabel="Apitar"
                    onPress={apitar}
                  />
                </View>
              </View>
              <Button
                titulo="Ajustar time"
                icone="substituicao"
                fullWidth
                onPress={() => {
                  setPausado(true);
                  setAjustesVisivel(true);
                }}
              />
              <Text variant="caption" color="textMuted" align="center">
                {MAX_SUBSTITUICOES - subsFeitas} de {MAX_SUBSTITUICOES}{' '}
                substituições restantes
              </Text>
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
    </Screen>
  );
}

/** Cor/ícone do evento por tipo, para a timeline de lances. */
function infoEvento(tipo: string): {
  nome?: IconeNome;
  corKey?: CorTexto;
  cartao?: 'amarelo' | 'vermelho';
} {
  switch (tipo) {
    case 'gol':
      return {nome: 'bola', corKey: 'success'};
    case 'gol_contra':
      return {nome: 'bola', corKey: 'warning'};
    case 'bola_trave':
      return {nome: 'chance', corKey: 'warning'};
    case 'substituicao':
      return {nome: 'substituicao', corKey: 'brand'};
    case 'lesao':
      return {nome: 'lesao', corKey: 'danger'};
    case 'penalti':
      return {nome: 'penalti', corKey: 'warning'};
    case 'chance_perdida':
      return {nome: 'chance', corKey: 'textMuted'};
    case 'cartao_amarelo':
      return {cartao: 'amarelo'};
    case 'cartao_vermelho':
      return {cartao: 'vermelho'};
    default:
      return {};
  }
}

/** Linha da timeline de eventos: minuto · nó · placar · autor/detalhe. */
function LinhaEvento({item}: {item: ItemTimeline}): React.JSX.Element {
  const {cores, esporte} = useTheme();
  if (item.lado === 'neutro') {
    return (
      <View style={styles.marco}>
        <Text variant="caption" color="textSecondary" weight="700">
          {item.descricao}
        </Text>
        {item.placarPill ? (
          <View style={[styles.marcoPill, {borderColor: cores.border}]}>
            <Text variant="caption" weight="800" tabular>
              {item.placarPill}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }
  const info = infoEvento(item.tipo);
  const ehSub = item.tipo === 'substituicao';
  const corCartao =
    info.cartao === 'amarelo' ? esporte.match.cardYellow : esporte.match.cardRed;
  return (
    <View style={styles.evento}>
      <Text
        variant="labelM"
        color="textSecondary"
        tabular
        style={styles.eventoMin}>
        {rotuloMinuto(item.minuto)}'
      </Text>
      <View style={styles.eventoNode}>
        {info.cartao ? (
          <View style={[styles.eventoCartao, {backgroundColor: corCartao}]} />
        ) : info.nome ? (
          <Icon nome={info.nome} size={18} color={info.corKey ?? 'textPrimary'} />
        ) : (
          <View style={[styles.eventoDot, {backgroundColor: cores.textMuted}]} />
        )}
      </View>
      {item.placarPill ? (
        <View style={[styles.eventoPlacar, {borderColor: esporte.match.goal}]}>
          <Text variant="caption" weight="800" tabular>
            {item.placarPill}
          </Text>
        </View>
      ) : null}
      <View style={styles.eventoInfo}>
        <View style={styles.eventoNomeLinha}>
          <Text variant="labelL" numberOfLines={1} style={styles.flex}>
            {item.autor ?? item.descricao}
          </Text>
          {ehSub ? <Icon nome="seta-cima" size={14} color="success" /> : null}
        </View>
        {item.detalhe ? (
          <View style={styles.eventoNomeLinha}>
            <Text
              variant="caption"
              color="textSecondary"
              numberOfLines={1}
              style={styles.flex}>
              {item.detalhe}
            </Text>
            {ehSub ? <Icon nome="seta-baixo" size={14} color="danger" /> : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** Linha de placar ao vivo de outro jogo da rodada. */
function LinhaRodada({
  item,
  minuto,
  duracaoTotal,
}: {
  item: PlacarAoVivo;
  minuto: number;
  duracaoTotal: number;
}): React.JSX.Element {
  const fim = minuto >= duracaoTotal;
  // Como na tabela: quem está ganhando embolsaria +3 (empate não soma "vitória").
  const casaGanhando = item.golsCasa > item.golsFora;
  const foraGanhando = item.golsFora > item.golsCasa;
  return (
    <View style={styles.rodada}>
      <TeamCrest clubeId={item.idCasa} sigla={item.siglaCasa} size={20} />
      <Text
        variant="labelM"
        weight={casaGanhando ? '800' : '600'}
        numberOfLines={1}
        style={styles.rodadaNomeEsq}>
        {item.nomeCasa}
      </Text>
      {casaGanhando ? (
        <Text variant="caption" weight="800" color="success" tabular>
          +3
        </Text>
      ) : null}
      <Text variant="labelL" tabular style={styles.rodadaPlacar}>
        {item.golsCasa} - {item.golsFora}
      </Text>
      {foraGanhando ? (
        <Text variant="caption" weight="800" color="success" tabular>
          +3
        </Text>
      ) : null}
      <Text
        variant="labelM"
        weight={foraGanhando ? '800' : '600'}
        numberOfLines={1}
        style={styles.rodadaNomeDir}>
        {item.nomeFora}
      </Text>
      <TeamCrest clubeId={item.idFora} sigla={item.siglaFora} size={20} />
      <Text
        variant="caption"
        color={fim ? 'textMuted' : 'danger'}
        tabular
        style={styles.rodadaMin}>
        {fim ? 'FIM' : `${rotuloMinuto(minuto)}'`}
      </Text>
    </View>
  );
}

/** Linha da classificação ao vivo: zona · escudo · nome · J · SG · PTS. */
function LinhaTabela({
  item,
  index,
  total,
  nome,
  sigla,
  ehUsuario,
}: {
  item: TabelaClassificacao;
  index: number;
  total: number;
  nome: string;
  sigla: string;
  ehUsuario: boolean;
}): React.JSX.Element {
  const {cores} = useTheme();
  const corPos: CorTexto =
    index < 4 ? 'success' : index >= total - 4 ? 'danger' : 'textSecondary';
  return (
    <View
      style={[
        styles.tabela,
        ehUsuario ? {backgroundColor: cores.brandSoft} : null,
      ]}>
      <View style={styles.tabelaZonaWrap}>
        {index < 4 ? (
          <View style={[styles.tabelaZona, {backgroundColor: cores.success}]} />
        ) : index >= total - 4 ? (
          <View style={[styles.tabelaZona, {backgroundColor: cores.danger}]} />
        ) : null}
      </View>
      <Text variant="labelM" color={corPos} tabular style={styles.tabelaPos}>
        {index + 1}
      </Text>
      <TeamCrest clubeId={item.clubeId} sigla={sigla} size={20} />
      <Text variant="labelM" numberOfLines={1} style={styles.flex}>
        {nome}
      </Text>
      <Text
        variant="caption"
        color="textSecondary"
        tabular
        style={styles.tabelaCol}>
        {item.jogos}
      </Text>
      <Text
        variant="caption"
        color="textSecondary"
        tabular
        style={styles.tabelaCol}>
        {item.saldoGols > 0 ? `+${item.saldoGols}` : item.saldoGols}
      </Text>
      <Text variant="labelL" tabular style={styles.tabelaPts}>
        {item.pontos}
      </Text>
    </View>
  );
}

/** Célula de estatística sobre o scoreboard (número + rótulo). */
function CelulaStat({
  valor,
  rotulo,
}: {
  valor: string;
  rotulo: string;
}): React.JSX.Element {
  return (
    <View style={styles.statCel}>
      <Text variant="titleL" color="onScoreboard" tabular>
        {valor}
      </Text>
      <Text
        variant="caption"
        color="onScoreboard"
        align="center"
        style={styles.statRot}>
        {rotulo}
      </Text>
    </View>
  );
}

/** "Momento da partida": barras de momentum por minuto (−1..1, casa=verde). */
function MomentoChart({momentum}: {momentum: number[]}): React.JSX.Element {
  const {cores, esporte} = useTheme();
  const HALF = 22;
  return (
    <View style={styles.momento}>
      <Text
        variant="caption"
        color="onScoreboard"
        align="center"
        style={styles.momentoTitulo}>
        Momento da partida
      </Text>
      <View style={styles.momentoBarras}>
        {momentum.length === 0 ? (
          <View style={styles.momentoVazio}>
            <View
              style={[styles.momentoBase, {backgroundColor: cores.onScoreboard}]}
            />
          </View>
        ) : (
          momentum.map((m, i) => {
            const alt = Math.min(1, Math.abs(m)) * HALF;
            return (
              <View key={i} style={styles.momentoCol}>
                <View style={styles.momentoTopo}>
                  {m > 0 ? (
                    <View
                      style={[
                        styles.momentoBar,
                        {height: alt, backgroundColor: esporte.match.goal},
                      ]}
                    />
                  ) : null}
                </View>
                <View style={styles.momentoFundo}>
                  {m < 0 ? (
                    <View
                      style={[
                        styles.momentoBar,
                        {height: alt, backgroundColor: esporte.match.cardRed},
                      ]}
                    />
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  corpo: {flex: 1, padding: espacamento[4], gap: espacamento[3]},
  meta: {alignItems: 'center', gap: 2},

  // Scoreboard
  placarLinha: {flexDirection: 'row', alignItems: 'center'},
  placarTime: {flex: 1, alignItems: 'center', gap: espacamento[1]},
  placarCentro: {alignItems: 'center', gap: espacamento[2]},
  placarNums: {flexDirection: 'row', alignItems: 'center'},
  placarTraco: {opacity: 0.5, marginHorizontal: espacamento[2]},
  minutoPill: {
    borderRadius: raios.sm,
    paddingHorizontal: espacamento[2],
    paddingVertical: 2,
  },
  statsRow: {flexDirection: 'row', alignItems: 'stretch'},
  statCel: {flex: 1, alignItems: 'center', gap: 2},
  statRot: {opacity: 0.65, textTransform: 'uppercase', letterSpacing: 0.4},
  statDiv: {
    width: StyleSheet.hairlineWidth,
    opacity: 0.2,
    marginHorizontal: espacamento[2],
  },

  // Momento da partida
  momento: {gap: espacamento[1]},
  momentoTitulo: {opacity: 0.7, textTransform: 'uppercase', letterSpacing: 0.5},
  momentoBarras: {flexDirection: 'row', alignItems: 'stretch', height: 44},
  momentoVazio: {flex: 1, justifyContent: 'center'},
  momentoBase: {height: 2, borderRadius: 1, opacity: 0.25},
  momentoCol: {flex: 1, marginHorizontal: 0.3},
  momentoTopo: {flex: 1, justifyContent: 'flex-end'},
  momentoFundo: {flex: 1, justifyContent: 'flex-start'},
  momentoBar: {width: '100%', borderRadius: 1},

  // Condições
  condicoes: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: espacamento[3],
  },
  condItem: {flexDirection: 'row', alignItems: 'center', gap: espacamento[1]},

  // Feed + controles
  feed: {flex: 1},
  feedConteudo: {paddingBottom: espacamento[2]},
  controles: {gap: espacamento[2]},
  linhaBotoes: {flexDirection: 'row', gap: espacamento[2]},
  flex: {flex: 1},
  linhaLive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacamento[2],
  },
  velocidade: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[1],
    flexShrink: 1,
  },
  acoesLive: {flexDirection: 'row', alignItems: 'center', gap: espacamento[1]},

  // Timeline de eventos
  marco: {
    alignItems: 'center',
    gap: espacamento[1],
    paddingVertical: espacamento[2],
  },
  marcoPill: {
    borderWidth: 1,
    borderRadius: raios.sm,
    paddingHorizontal: espacamento[2],
    paddingVertical: 1,
  },
  evento: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[2],
    paddingVertical: espacamento[2],
    paddingHorizontal: espacamento[3],
    minHeight: 52,
  },
  eventoMin: {minWidth: 30, textAlign: 'center'},
  eventoNode: {width: 26, alignItems: 'center', justifyContent: 'center'},
  eventoCartao: {width: 11, height: 15, borderRadius: 2},
  eventoDot: {width: 10, height: 10, borderRadius: raios.full},
  eventoPlacar: {
    borderWidth: 1.5,
    borderRadius: raios.sm,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  eventoInfo: {flex: 1, gap: 1},
  eventoNomeLinha: {flexDirection: 'row', alignItems: 'center', gap: espacamento[1]},

  // Rodada ao vivo
  rodada: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[2],
    paddingVertical: espacamento[2],
    paddingHorizontal: espacamento[3],
    minHeight: 44,
  },
  rodadaNomeEsq: {flex: 1, textAlign: 'right'},
  rodadaNomeDir: {flex: 1, textAlign: 'left'},
  rodadaPlacar: {minWidth: 40, textAlign: 'center'},
  rodadaMin: {minWidth: 28, textAlign: 'right'},

  // Tabela ao vivo
  tabela: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[2],
    paddingVertical: espacamento[2],
    paddingRight: espacamento[3],
    minHeight: 40,
  },
  tabelaZonaWrap: {width: 3, alignSelf: 'stretch'},
  tabelaZona: {flex: 1, borderTopRightRadius: 2, borderBottomRightRadius: 2},
  tabelaPos: {minWidth: 18, textAlign: 'center'},
  tabelaCol: {minWidth: 24, textAlign: 'center'},
  tabelaPts: {minWidth: 30, textAlign: 'right'},
});

export default MatchSimulation;
