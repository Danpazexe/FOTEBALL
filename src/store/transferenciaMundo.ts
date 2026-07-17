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
