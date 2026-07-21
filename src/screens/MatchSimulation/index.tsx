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

import {trocarTitular} from '../../engine/tactics/escalacao';
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
  corDoTime,
  espacamento,
  raios,
  useTheme,
} from '../../design-system';
import type {IconeNome} from '../../components/Icone';
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
import {ehEventoGol} from '../../types';
import {useAppNavigation, useAppRoute} from '../../navigation/types';
import {useFocusEffect} from '@react-navigation/native';
import {LinhaStatDupla, MomentoChart} from './EstatisticasPlacar';
import {
  DURACAO,
  avancarJogosAoVivo,
  criarJogosAoVivo,
  projetarTabela,
  type JogoAoVivo,
  type PlacarAoVivo,
} from './jogosAoVivo';
import {CabecalhoTabelaAoVivo, LinhaRodada, LinhaTabela} from './TabelaAoVivo';
import {LinhaEvento, type ItemTimeline, type LadoLance} from './Timeline';

const MINUTO_INTERVALO = 45;
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
  // Pontos que cada clube embolsaria AGORA nesta rodada (+3 vitória / +1 empate
  // / +0 derrota), pelos placares parciais — mostrados ao lado dos PTS na tabela.
  const [pontosRodada, setPontosRodada] = useState<Record<string, number>>({});
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
        // Flags estruturadas da engine V2 primeiro; regex só como fallback de
        // compatibilidade com eventos antigos (RF-17: nada de lógica por texto).
        detalhe = ev.penaltiData
          ? nomeFalta
            ? `Gol de pênalti · falta de ${nomeFalta}`
            : 'Gol de pênalti'
          : ev.falhaGoleiro === true || /falha do goleiro/i.test(ev.descricao)
          ? 'Gol · falha do goleiro'
          : ev.falhaDefesa === true || /falha grave da defesa/i.test(ev.descricao)
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
        detalhe =
          ev.segundoAmarelo === true || /segundo amarelo/i.test(ev.descricao)
            ? 'Expulso · 2º amarelo'
            : 'Cartão vermelho';
      } else if (ev.tipo === 'chance_perdida') {
        detalhe =
          ev.anuladoVAR === true || /anulado/i.test(ev.descricao)
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
        // Flags estruturadas da engine V2 primeiro; texto só como fallback de
        // compatibilidade (RF-17: nenhuma decisão depende de parsing).
        const varFlagrou = ev.varFlagra === true || ev.descricao.includes('VAR flagra');
        if (ev.tipo === 'gol_contra') {
          saborGolRef.current = 'contra';
        } else if (ev.tipo === 'gol') {
          saborGolRef.current =
            ev.falhaGoleiro === true || /falha do goleiro/i.test(ev.descricao)
              ? 'falhaGoleiro'
              : 'normal';
        }
        // VAR intervindo (pênalti flagrado): "atenção, o VAR está checando" antes
        // do desfecho. Chamada direta (gated) porque o gol converte o lote.
        if (comSomDeLance && varFlagrou) {
          tocarVarChecando();
        }
        if (ev.tipo === 'cartao_vermelho') {
          registrarSom(3, () => tocarExpulsao(doUsuario));
        } else if (ev.tipo === 'penalti') {
          // Pênalti do VAR já é anunciado pelo "VAR checando" acima — não dobra o apito.
          if (!varFlagrou) {
            registrarSom(2, () => tocarPenalti());
          }
        } else if (ev.tipo === 'lesao') {
          registrarSom(1, () => tocarContusao());
        } else if (ev.tipo === 'cartao_amarelo') {
          registrarSom(1, () => tocarCartaoAmarelo());
        } else if (ev.tipo === 'substituicao') {
          registrarSom(1, () => tocarSubstituicao());
        } else if (ev.tipo === 'chance_perdida') {
          // Gol anulado pelo VAR chega como 'chance_perdida' com flag estruturada.
          if (ev.anuladoVAR === true || ev.descricao.includes('anulado')) {
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

    // Pontos provisórios da rodada por clube (+3/+1/+0).
    const pontos: Record<string, number> = {};
    for (const r of resultadosParciais) {
      if (r.golsCasa > r.golsFora) {
        pontos[r.timeCasa] = 3;
        pontos[r.timeFora] = 0;
      } else if (r.golsFora > r.golsCasa) {
        pontos[r.timeCasa] = 0;
        pontos[r.timeFora] = 3;
      } else {
        pontos[r.timeCasa] = 1;
        pontos[r.timeFora] = 1;
      }
    }
    setPontosRodada(pontos);
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
    const e = estadoRef.current;
    // Empate em jogo de Copa → disputa de pênaltis: o apito final fica para a
    // tela de acompanhamento, junto do vencedor.
    const disputaCopa =
      modoCopaRef.current && e.placarCasa === e.placarFora
        ? useGameStore.getState().prepararDisputaPenaltisCopa()
        : null;
    if (!disputaCopa) {
      tocarFimDeJogo();
    }
    if (modoCopaRef.current) {
      // Usuário manda o jogo: gols dele = placar da casa. No empate, os pênaltis
      // são resolvidos pela ENGINE (modo manager) e COMMITADOS já aqui — a tela
      // DisputaPenaltis só APRESENTA a disputa, cobrança a cobrança.
      const golsUsuario = e.placarCasa;
      const golsAdversario = e.placarFora;
      useGameStore.getState().avancarFaseCopa({
        golsUsuario,
        golsAdversario,
        eventos: e.eventos,
        vencedorPenaltis: disputaCopa?.disputa.vencedor,
      });
      if (disputaCopa) {
        nav.navigate('DisputaPenaltis', {disputa: disputaCopa});
      } else {
        nav.navigate('Copa');
      }
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
          [...e.chutes].sort((a, b) => a.minuto - b.minuto),
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
    // Só quem está no BANCO (reservas escalados) pode entrar (regra real).
    if (!formacao.reservas.includes(entranteId)) {
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
  // Marcadores de GOL no gráfico de momento (separados da altura das barras —
  // a barra é pressão ofensiva; o gol é um marcador do minuto).
  const eventosAoVivo = estadoRef.current?.eventos ?? [];
  const minutosGolCasa = eventosAoVivo
    .filter(e => ehEventoGol(e.tipo) && e.timeId === clubeCasaId)
    .map(e => e.minuto);
  const minutosGolFora = eventosAoVivo
    .filter(e => ehEventoGol(e.tipo) && e.timeId === clubeForaId)
    .map(e => e.minuto);
  const finCasa = condicoes?.casa.finalizacoes ?? 0;
  const alvoCasa = condicoes?.casa.finalizacoesNoAlvo ?? 0;
  // Lado visitante (mesmo shape) — a faixa mostra os DOIS times, estilo Sofascore.
  const posseFora = 100 - posseCasa;
  const finFora = condicoes?.fora.finalizacoes ?? 0;
  const alvoFora = condicoes?.fora.finalizacoesNoAlvo ?? 0;
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

            <MomentoChart
              momentum={momentum}
              minutosGolCasa={minutosGolCasa}
              minutosGolFora={minutosGolFora}
            />

            <View style={styles.statsCol}>
              <LinhaStatDupla
                casa={`${posseCasa}%`}
                rotulo="Posse de bola"
                fora={`${posseFora}%`}
              />
              <LinhaStatDupla
                casa={String(finCasa)}
                rotulo="Finalizações"
                fora={String(finFora)}
              />
              <LinhaStatDupla
                casa={String(alvoCasa)}
                rotulo="No alvo"
                fora={String(alvoFora)}
              />
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
              <CabecalhoTabelaAoVivo />
              <Divider />
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
                    pontosRodada={pontosRodada[item.clubeId]}
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
  statsCol: {gap: espacamento[1]},

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
});

export default MatchSimulation;
