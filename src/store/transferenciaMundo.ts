/**
 * Adaptador entre a store e a operação atômica de transferência (applyTransfer).
 * Constrói o WorldState a partir dos arrays da liga, aplica cada negócio pela
 * ÚNICA porta atômica (finanças + elencos + formação + histórico) e devolve os
 * arrays atualizados. Preserva o escopo atual (liga ativa) e a "janela sempre
 * aberta" de hoje (ignorarJanela), enquanto centraliza a mutação — eliminando os
 * caminhos duplicados que deixavam id fantasma na formação (PI-08/PI-09).
 */
import type {Clube, Player} from '../types';
import type {TipoTransferencia, TransferRecord} from '../types/world';
import {criarWorld, worldParaArrays} from '../domain/world/worldTypes';
import {applyTransfer} from '../engine/transfers/applyTransfer';

/**
 * Teto do histórico mundial persistido (PI-20/RNF-02): guarda os mais recentes
 * para não inflar o save indefinidamente ao longo de muitas temporadas. As
 * notícias e o perfil de clube só precisam do passado recente.
 */
export const MAX_HISTORICO_TRANSFERENCIAS = 300;

export interface EntradaTransferencia {
  playerId: string;
  fromClubId: string | null;
  toClubId: string | null;
  type: TipoTransferencia;
  fee: number;
  salary?: number;
  source: 'user' | 'ai';
  reasonCodes?: string[];
}

export interface ResultadoTransferencias {
  clubes: Clube[];
  jogadores: Player[];
  transferHistory: TransferRecord[];
  /** Negócios efetivamente aplicados (os inválidos são pulados). */
  aplicadas: number;
  avisos: string[];
}

/**
 * Aplica uma sequência de transferências sobre a liga (clubes+jogadores),
 * acumulando no mundo. `date` é a data ISO usada na janela/histórico. Negócios
 * inválidos (origem incoerente, orçamento) são PULADOS (não quebram o lote), com
 * o motivo registrado em `avisos`.
 */
export function aplicarTransferenciasNaLiga(args: {
  clubes: Clube[];
  jogadores: Player[];
  transferHistory: TransferRecord[];
  entradas: EntradaTransferencia[];
  date: string;
  activeCompetitionId: string | null;
  userClubId: string | null;
  /** Preserva a "janela sempre aberta" do jogo atual até a Fase de janela global. */
  ignorarJanela?: boolean;
}): ResultadoTransferencias {
  let world = criarWorld({
    clubes: args.clubes,
    jogadores: args.jogadores,
    activeCompetitionId: args.activeCompetitionId,
    userClubId: args.userClubId,
    transferHistory: args.transferHistory,
  });
  const avisos: string[] = [];
  let aplicadas = 0;

  for (const entrada of args.entradas) {
    const resultado = applyTransfer({
      world,
      playerId: entrada.playerId,
      fromClubId: entrada.fromClubId,
      toClubId: entrada.toClubId,
      type: entrada.type,
      fee: entrada.fee,
      salary: entrada.salary,
      date: args.date,
      ignorarJanela: args.ignorarJanela ?? true,
      source: entrada.source,
      reasonCodes: entrada.reasonCodes,
    });
    if (resultado.ok) {
      world = resultado.world;
      aplicadas += 1;
      avisos.push(...resultado.warnings);
    } else {
      avisos.push(
        `transferência pulada (${entrada.playerId}): ${resultado.errors.join('; ')}`,
      );
    }
  }

  const arrays = worldParaArrays(world);
  // Mantém só os mais recentes (teto de save/perf).
  const transferHistory =
    arrays.transferHistory.length > MAX_HISTORICO_TRANSFERENCIAS
      ? arrays.transferHistory.slice(-MAX_HISTORICO_TRANSFERENCIAS)
      : arrays.transferHistory;
  return {
    clubes: arrays.clubes,
    jogadores: arrays.jogadores,
    transferHistory,
    aplicadas,
    avisos,
  };
}

// ── Mercado UNIVERSAL (todas as ligas) ───────────────────────────────────────

interface MundoStore {
  /** Liga ATIVA (fonte viva: evolui em partidas/finanças durante a temporada). */
  clubes: Clube[];
  jogadores: Player[];
  /** Mundo MESTRE (todas as ligas carregadas). */
  todosClubes: Clube[];
  todosJogadores: Player[];
}

/**
 * Une a liga ATIVA (viva) ao mundo MESTRE num só conjunto — a liga ativa vence
 * para os objetos compartilhados (o clube do usuário e seu elenco carregam a
 * evolução da temporada). É o que deixa o mercado enxergar TODAS as ligas sem
 * perder o estado vivo da lita jogada. Puro.
 */
export function combinarMundoStore(mundo: MundoStore): {
  clubes: Clube[];
  jogadores: Player[];
} {
  const clubMap = new Map(mundo.todosClubes.map(c => [c.id, c]));
  for (const c of mundo.clubes) {
    clubMap.set(c.id, c);
  }
  const jogMap = new Map(mundo.todosJogadores.map(j => [j.id, j]));
  for (const j of mundo.jogadores) {
    jogMap.set(j.id, j);
  }
  return {clubes: [...clubMap.values()], jogadores: [...jogMap.values()]};
}

export interface ResultadoNegocioGlobal {
  ok: boolean;
  erro?: string;
  clubes: Clube[];
  jogadores: Player[];
  todosClubes: Clube[];
  todosJogadores: Player[];
  transferHistory: TransferRecord[];
}

/**
 * Aplica UM negócio (compra/empréstimo do usuário) que pode CRUZAR ligas, pela
 * porta atômica (applyTransfer) sobre o mundo combinado, e reflete o resultado
 * de volta nos dois escopos da store:
 *  - liga ATIVA: atualiza só os clubes tocados e injeta/atualiza o jogador se ele
 *    passa a atuar na divisão jogada (para poder entrar em campo);
 *  - mundo MESTRE: atualiza cirurgicamente o jogador e os dois clubes envolvidos.
 * Retorna `ok:false` com o motivo se a transferência for inválida (sem mutar).
 */
export function aplicarNegocioGlobal(args: {
  mundo: MundoStore;
  transferHistory: TransferRecord[];
  activeCompetitionId: string | null;
  userClubId: string | null;
  entrada: EntradaTransferencia;
  date: string;
}): ResultadoNegocioGlobal {
  const {mundo} = args;
  const base: Omit<ResultadoNegocioGlobal, 'ok' | 'erro'> = {
    clubes: mundo.clubes,
    jogadores: mundo.jogadores,
    todosClubes: mundo.todosClubes,
    todosJogadores: mundo.todosJogadores,
    transferHistory: args.transferHistory,
  };

  const combinado = combinarMundoStore(mundo);
  const world = criarWorld({
    clubes: combinado.clubes,
    jogadores: combinado.jogadores,
    activeCompetitionId: args.activeCompetitionId,
    userClubId: args.userClubId,
    transferHistory: args.transferHistory,
  });
  const resultado = applyTransfer({
    world,
    playerId: args.entrada.playerId,
    fromClubId: args.entrada.fromClubId,
    toClubId: args.entrada.toClubId,
    type: args.entrada.type,
    fee: args.entrada.fee,
    salary: args.entrada.salary,
    date: args.date,
    ignorarJanela: true,
    source: args.entrada.source,
    reasonCodes: args.entrada.reasonCodes,
  });
  if (!resultado.ok) {
    return {ok: false, erro: resultado.errors.join('; '), ...base};
  }

  const w = resultado.world;
  const jid = args.entrada.playerId;
  const novoJogador = w.playersById[jid]!;
  const idsLigaAtiva = new Set(mundo.clubes.map(c => c.id));
  const tocados = new Set(
    [args.entrada.fromClubId, args.entrada.toClubId].filter(
      (id): id is string => id !== null,
    ),
  );

  // Liga ATIVA: só os clubes tocados que pertencem a ela mudam.
  const clubes = mundo.clubes.map(c =>
    tocados.has(c.id) ? w.clubsById[c.id] ?? c : c,
  );
  // Liga ATIVA: o jogador entra em campo se agora atua num clube da divisão.
  const atuaNaLiga =
    novoJogador.clubeId !== null && idsLigaAtiva.has(novoJogador.clubeId);
  const jaNaLiga = mundo.jogadores.some(j => j.id === jid);
  let jogadores: Player[];
  if (jaNaLiga) {
    jogadores = atuaNaLiga
      ? mundo.jogadores.map(j => (j.id === jid ? novoJogador : j))
      : mundo.jogadores.filter(j => j.id !== jid); // saiu para outra liga
  } else if (atuaNaLiga) {
    jogadores = [...mundo.jogadores, novoJogador]; // veio de outra liga
  } else {
    jogadores = mundo.jogadores;
  }

  // Mundo MESTRE: atualização cirúrgica (jogador + os dois clubes do negócio).
  const todosJogadores = mundo.todosJogadores.map(j =>
    j.id === jid ? novoJogador : j,
  );
  const todosClubes = mundo.todosClubes.map(c =>
    tocados.has(c.id) ? w.clubsById[c.id] ?? c : c,
  );

  const transferHistory =
    w.transferHistory.length > MAX_HISTORICO_TRANSFERENCIAS
      ? w.transferHistory.slice(-MAX_HISTORICO_TRANSFERENCIAS)
      : w.transferHistory;

  return {
    ok: true,
    clubes,
    jogadores,
    todosClubes,
    todosJogadores,
    transferHistory,
  };
}
