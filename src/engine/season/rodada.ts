/**
 * Rodada — resolução dos JOGOS de uma rodada e o pós-partida dos jogadores.
 * Regra movida VERBATIM do store (M8 do refactor SOLID): tudo aqui é puro e
 * determinístico — seed dos jogos derivada de rodada/índice, RNG do pós-jogo
 * derivado do id da partida. O store só orquestra (relógio canônico, pendências,
 * patch de estado, conquistas) e injeta efeitos por parâmetro (`aoFalharJogo`).
 *
 * Um jogo pode chegar já DECIDIDO AO VIVO (`aoVivo`): ele é absorvido como
 * registro (placar/eventos/estatísticas da narração) em vez de simulado, e os
 * demais seguem pela engine com as MESMAS seeds do caminho simulado.
 */
import type {
  ChutePartida,
  Clube,
  EstatisticasPartida,
  EventoPartida,
  Partida,
  Player,
} from '../../types';

import {aplicarDisciplinaPartida} from '../disciplina';
import {aplicarCargaPosPartida} from '../physical/fisicoEngine';
import {aplicarCondicaoPosPartida} from '../progression/condicao';
import {atualizarFormaPorNota} from '../progression/formaEngine';
import {
  aplicarMoral,
  calcularDeltasMoralPartida,
  type ResultadoPartida,
} from '../progression/moralEngine';
import {
  calcularNotaPartida,
  contarAssistencias,
  mediaIncremental,
  type ResultadoJogador,
} from '../simulation/matchRating';
import {
  idsTitularesDisponiveis,
  simularPartida,
} from '../simulation/matchSimulator';
import {
  criarRNGComSeed,
  hashString,
  inteiroEntre,
  type RandomGenerator,
} from '../simulation/rng';

function jogadoresDoClube(jogadores: Player[], clubeId: string): Player[] {
  return jogadores.filter(jogador => jogador.clubeId === clubeId);
}

/**
 * Duração da lesão em DIAS REAIS de calendário (Onda 3: o pipeline diário
 * decrementa 1/dia e as rodadas distam 3-4 dias — antes a escala era "7 dias
 * = 1 rodada"). Faixas reescalonadas para preservar o impacto em JOGOS.
 */
export function sortearDuracaoLesao(rng: RandomGenerator): number {
  const r = rng();
  if (r < 0.5) {
    return inteiroEntre(rng, 4, 8); // leve: 1-2 jogos
  }
  if (r < 0.85) {
    return inteiroEntre(rng, 10, 18); // média: 3-5 jogos
  }
  return inteiroEntre(rng, 21, 35); // grave: 6-10 jogos
}

/**
 * Enxuga as estatísticas de partidas da IA para o save não inflar: mantém os
 * agregados por time (xG, finalizações, zonas...) e descarta os detalhes
 * pesados (mapas por jogador e momentum por minuto) — que a súmula degrada
 * para "—" sem quebrar. A partida do USUÁRIO mantém tudo.
 */
export function enxugarEstatisticasIA(partida: Partida): Partida {
  if (!partida.estatisticas) {
    return partida;
  }
  const enxugarTime = (time: EstatisticasPartida['casa']) => ({
    ...time,
    finalizacoesPorJogador: {},
    passesPorJogador: {},
  });
  return {
    ...partida,
    estatisticas: {
      ...partida.estatisticas,
      casa: enxugarTime(partida.estatisticas.casa),
      fora: enxugarTime(partida.estatisticas.fora),
      momentumPorMinuto: [],
    },
    // Ledger RESUMIDO (causal_summary): guarda os chutes que contam a história
    // — gols, defesas, traves, anulados e grandes chances. Chutes de rotina
    // (fora/bloqueado sem perigo) saem do save; os AGREGADOS já os registram.
    // O resumo nunca altera placar/estatísticas — só o que fica armazenado.
    chutes: partida.chutes?.filter(
      chute =>
        chute.resultado !== 'fora' && chute.resultado !== 'bloqueado'
          ? true
          : chute.grandeChance,
    ),
    qualidadeDados: partida.chutes ? 'causal_summary' : partida.qualidadeDados,
  };
}

/**
 * Aplica o resultado da partida aos jogadores dos dois times:
 * 1) decrementa suspensão/lesão pendentes (uma rodada se passou);
 * 2) aplica NOVAS punições dos eventos — vermelho = 1 jogo, 3 amarelos
 *    acumulados = 1 jogo (zera o acúmulo), lesão por gravidade;
 * 3) atualiza estatísticas/condição de quem entrou em campo.
 */
export function aplicarResultadoNosJogadores(
  jogadores: Player[],
  partida: Partida,
  clubeCasa: Clube,
  clubeFora: Clube,
): Player[] {
  const jogadorIdsEmCampo = new Set(
    partida.eventos.map(evento => evento.jogadorId),
  );

  // RNG determinístico derivado do id da partida — a mesma partida sempre
  // produz a mesma duração de lesão (sem Math.random na pós-partida).
  const rngPartida = criarRNGComSeed(hashString(partida.id));

  // "Jogou na partida" = titular (mesmo que substituído depois) OU reserva que
  // entrou via substituição. Garante que zagueiro sem lance também é avaliado.
  const jogou = new Set<string>();
  // Titulares que de fato começaram a partida (90' de desgaste, salvo
  // substituição). Distinto de quem entrou do banco (desgaste parcial).
  const titularesNoApito = new Set<string>();
  // Estado PRÉ-rodada dos jogadores (suspensão/lesão ainda não decrementadas):
  // é o retrato de quem estava disponível no apito inicial.
  const porIdNoApito = new Map(jogadores.map(j => [j.id, j] as const));
  for (const clube of [clubeCasa, clubeFora]) {
    for (const titular of clube.formacaoAtual?.titulares ?? []) {
      const jogadorTitular = porIdNoApito.get(titular.jogadorId);
      // Só conta como "jogou" quem estava DISPONÍVEL no apito inicial. O motor
      // (teamStrength + escolherJogadorPonderado) ignora lesionados/suspensos,
      // então creditar-lhes jogo/nota/desgaste seria presença fantasma — comum
      // em clubes da IA, que nunca trocam a escalação default ao longo do ano.
      if (
        jogadorTitular &&
        !jogadorTitular.lesionado &&
        !jogadorTitular.suspenso
      ) {
        jogou.add(titular.jogadorId);
        titularesNoApito.add(titular.jogadorId);
      }
    }
  }
  for (const evento of partida.eventos) {
    if (evento.tipo === 'substituicao' && evento.jogadorEntraId) {
      jogou.add(evento.jogadorEntraId);
    }
  }

  // Moral (Módulo 4): deltas por jogador dos dois clubes conforme o resultado
  // e o que cada um fez (gol/lesão/expulsão). "Em campo" = quem apareceu em lances.
  const placarCasa = partida.placarCasa ?? 0;
  const placarFora = partida.placarFora ?? 0;
  const vencedor: ResultadoPartida =
    placarCasa > placarFora
      ? 'casa'
      : placarFora > placarCasa
        ? 'fora'
        : 'empate';
  const idsEmCampo = [...jogadorIdsEmCampo];
  const mapaMoral = new Map(
    [
      ...calcularDeltasMoralPartida(
        partida,
        partida.timeCasa,
        jogadores.filter(j => j.clubeId === partida.timeCasa),
        idsEmCampo,
        vencedor,
      ),
      ...calcularDeltasMoralPartida(
        partida,
        partida.timeFora,
        jogadores.filter(j => j.clubeId === partida.timeFora),
        idsEmCampo,
        vencedor,
      ),
    ].map(delta => [delta.jogadorId, delta.delta] as const),
  );

  return jogadores.map(jogador => {
    if (jogador.clubeId !== partida.timeCasa && jogador.clubeId !== partida.timeFora) {
      return jogador;
    }

    // Disciplina (cartões/suspensão) é aplicada POR COMPETIÇÃO logo após este
    // passo, pela engine de disciplina (idempotente por partidaId). Aqui os
    // campos passam intactos — a engine é a única autoridade sobre suspensão.
    const suspenso = jogador.suspenso;
    const jogosSuspensao = jogador.jogosSuspensao;
    // Lesão anda em DIAS REAIS pelo pipeline diário do calendário (Onda 3) —
    // aqui só entram lesões NOVAS desta partida.
    let lesionado = jogador.lesionado;
    let diasLesao = jogador.diasLesao;

    // 2) Novas punições a partir dos eventos deste jogo.
    const eventosDoJogador = partida.eventos.filter(
      evento => evento.jogadorId === jogador.id,
    );
    const gols = eventosDoJogador.filter(e => e.tipo === 'gol').length;
    const amarelos = eventosDoJogador.filter(
      e => e.tipo === 'cartao_amarelo',
    ).length;
    const vermelhos = eventosDoJogador.filter(
      e => e.tipo === 'cartao_vermelho',
    ).length;
    const lesoes = eventosDoJogador.filter(e => e.tipo === 'lesao').length;

    const amarelosParaSuspensao = jogador.amarelosParaSuspensao ?? 0;
    if (lesoes > 0) {
      lesionado = true;
      diasLesao = Math.max(diasLesao, sortearDuracaoLesao(rngPartida));
    }

    // Preparo físico (BRASFOOT_MASTER §4/§11): titular joga 90' e cansa (-11),
    // reserva que entrou cansa leve (-2), quem ficou de fora recupera cheio
    // (+25). Com a folga + treino leve (+8/rodada), o titular que joga TUDO cai
    // ~3/rodada e precisa de rodízio; quem descansa volta. Regra em condicao.ts.
    const ehTitular = titularesNoApito.has(jogador.id);
    const participou =
      ehTitular || jogou.has(jogador.id) || jogadorIdsEmCampo.has(jogador.id);
    const condicaoFisica = aplicarCondicaoPosPartida(jogador.condicaoFisica, {
      ehTitular,
      participou,
    });

    const base: Player = {
      ...jogador,
      suspenso,
      jogosSuspensao,
      lesionado,
      diasLesao,
      amarelosParaSuspensao,
      condicaoFisica,
      // Carga aguda/crônica e ritmo (Onda 5): jogar cansa e dá ritmo; ficar de
      // fora perde ritmo de leve. Separado da condição.
      fisico: aplicarCargaPosPartida(jogador, {ehTitular, participou}),
      moral: aplicarMoral(jogador.moral, mapaMoral.get(jogador.id) ?? 0),
    };

    if (!participou) {
      return base;
    }

    // 3) Estatísticas + nota da partida (Módulo de progressão).
    const ehCasa = jogador.clubeId === partida.timeCasa;
    const cleanSheet = ehCasa ? placarFora === 0 : placarCasa === 0;
    const resultadoJogador: ResultadoJogador =
      vencedor === 'empate'
        ? 'empate'
        : (vencedor === 'casa') === ehCasa
          ? 'vitoria'
          : 'derrota';
    const assistencias = contarAssistencias(partida.eventos, jogador.id);
    const nota = calcularNotaPartida(
      jogador,
      eventosDoJogador,
      resultadoJogador,
      cleanSheet,
    );
    const stats = jogador.estatisticasTemporada;

    return {
      ...base,
      // Forma reage ao DESEMPENHO (Onda 6): a nota do jogo empurra a fase
      // técnica — antes a forma só mudava por treino (stub).
      forma: atualizarFormaPorNota(base.forma, nota),
      estatisticasTemporada: {
        ...stats,
        jogos: stats.jogos + 1,
        gols: stats.gols + gols,
        assistencias: stats.assistencias + assistencias,
        cartoesAmarelos: stats.cartoesAmarelos + amarelos,
        cartoesVermelhos: stats.cartoesVermelhos + vermelhos,
        notaMedia: mediaIncremental(stats.notaMedia, stats.jogos, nota),
      },
    };
  });
}

/** Partida do usuário decidida AO VIVO (narração) — dados que viram registro. */
export interface PartidaAoVivoInput {
  partidaId: string;
  placarCasa: number;
  placarFora: number;
  eventos: EventoPartida[];
  posse?: {casa: number; fora: number};
  estatisticas?: EstatisticasPartida;
  chutes?: ChutePartida[];
}

/**
 * Converte a partida decidida ao vivo em registro de `Partida`: eventos em
 * ordem de minuto, carimbos de engine/qualidade quando há ledger de chutes e
 * snapshot dos titulares DISPONÍVEIS no apito (súmula fiel a quem começou).
 */
export function montarPartidaAoVivo(
  partida: Partida,
  dados: PartidaAoVivoInput,
  clubeCasa: Clube,
  clubeFora: Clube,
  jogadores: Player[],
): Partida {
  return {
    ...partida,
    placarCasa: dados.placarCasa,
    placarFora: dados.placarFora,
    eventos: [...dados.eventos].sort((a, b) => a.minuto - b.minuto),
    jogada: true,
    modoJogado: 'interativo',
    posseCasa: dados.posse?.casa,
    posseFora: dados.posse?.fora,
    estatisticas: dados.estatisticas,
    chutes: dados.chutes,
    engineVersion: dados.chutes ? (2 as const) : partida.engineVersion,
    qualidadeDados: dados.chutes
      ? ('causal_full' as const)
      : partida.qualidadeDados,
    titularesCasa: idsTitularesDisponiveis(
      clubeCasa,
      jogadoresDoClube(jogadores, clubeCasa.id),
    ),
    titularesFora: idsTitularesDisponiveis(
      clubeFora,
      jogadoresDoClube(jogadores, clubeFora.id),
    ),
  };
}

export interface ResolverJogosRodadaParams {
  /** Calendário completo — jogos fora da rodada passam intactos. */
  partidas: Partida[];
  /** Jogos da rodada ainda não jogados (a ordem define a seed de cada um). */
  jogosRodada: Partida[];
  /** Base de clubes para escalação/força (no ao vivo: escalações NO APITO). */
  clubes: Clube[];
  jogadores: Player[];
  /** Ids de partidas já processadas pela disciplina (idempotência). */
  disciplinaProcessada: string[];
  rodadaAtual: number;
  clubeUsuarioId: string | null;
  /** Presente = caminho ao vivo: essa partida é absorvida, não simulada. */
  aoVivo?: PartidaAoVivoInput;
  /** Efeito injetado (ex.: console.warn no store) quando um jogo falha. */
  aoFalharJogo?: (partidaId: string, erro: unknown) => void;
}

export interface ResolverJogosRodadaResultado {
  partidas: Partida[];
  jogadores: Player[];
  disciplinaProcessada: string[];
}

/**
 * Resolve os jogos de uma rodada: simula cada jogo pendente (seed = rodada*1000
 * + índice, como sempre) — ou absorve o do usuário decidido ao vivo — e aplica
 * o pós-partida (jogadores + disciplina por competição) na MESMA ordem do
 * calendário. Jogo da IA guarda só os agregados (save enxuto); o do usuário,
 * tudo. Um jogo que falha NÃO aborta a rodada (perderia o avanço e o save):
 * encerra seguro em 0x0 e segue os demais.
 */
export function resolverJogosRodada(
  params: ResolverJogosRodadaParams,
): ResolverJogosRodadaResultado {
  const {
    partidas,
    jogosRodada,
    clubes,
    disciplinaProcessada: processadasIniciais,
    rodadaAtual,
    clubeUsuarioId,
    aoVivo,
    aoFalharJogo,
  } = params;

  let jogadoresAtualizados = params.jogadores;
  let disciplinaProcessada = processadasIniciais;

  const partidasResolvidas = partidas.map(partida => {
    const jogo = jogosRodada.find(item => item.id === partida.id);
    if (!jogo) {
      return partida;
    }
    const clubeCasa = clubes.find(clube => clube.id === jogo.timeCasa);
    const clubeFora = clubes.find(clube => clube.id === jogo.timeFora);
    if (!clubeCasa || !clubeFora) {
      return partida;
    }

    // Pós-partida compartilhado: jogadores, disciplina (idempotente por
    // partidaId) e o registro final preservando o id do calendário —
    // simularPartida gera um id próprio e o spread o sobrescreveria, quebrando
    // buscas por id (ex.: narração e "Última Partida").
    const registrar = (resultado: Partida): Partida => {
      jogadoresAtualizados = aplicarResultadoNosJogadores(
        jogadoresAtualizados,
        resultado,
        clubeCasa,
        clubeFora,
      );
      ({jogadores: jogadoresAtualizados, processadas: disciplinaProcessada} =
        aplicarDisciplinaPartida(
          jogadoresAtualizados,
          {
            id: partida.id,
            competicaoId: jogo.competicaoId,
            timeCasa: jogo.timeCasa,
            timeFora: jogo.timeFora,
            eventos: resultado.eventos,
          },
          disciplinaProcessada,
        ));
      return {...partida, ...resultado, id: partida.id};
    };

    if (aoVivo && partida.id === aoVivo.partidaId) {
      return registrar(
        montarPartidaAoVivo(
          partida,
          aoVivo,
          clubeCasa,
          clubeFora,
          jogadoresAtualizados,
        ),
      );
    }

    try {
      const simulada = simularPartida({
        timeCasa: clubeCasa,
        timeFora: clubeFora,
        jogadoresCasa: jogadoresDoClube(jogadoresAtualizados, clubeCasa.id),
        jogadoresFora: jogadoresDoClube(jogadoresAtualizados, clubeFora.id),
        seed: rodadaAtual * 1000 + jogosRodada.indexOf(jogo),
        competicaoId: jogo.competicaoId,
        rodada: jogo.rodada,
        data: jogo.data,
      });
      const ehDoUsuario =
        jogo.timeCasa === clubeUsuarioId || jogo.timeFora === clubeUsuarioId;
      // No caminho ao vivo TODO jogo simulado é da IA (o do usuário chegou
      // pronto); no avanço simulado, o jogo do usuário guarda tudo.
      const resultado =
        !aoVivo && ehDoUsuario ? simulada : enxugarEstatisticasIA(simulada);
      return registrar(resultado);
    } catch (erro) {
      aoFalharJogo?.(partida.id, erro);
      return {
        ...partida,
        jogada: true,
        placarCasa: 0,
        placarFora: 0,
        eventos: [],
      };
    }
  });

  return {
    partidas: partidasResolvidas,
    jogadores: jogadoresAtualizados,
    disciplinaProcessada,
  };
}
