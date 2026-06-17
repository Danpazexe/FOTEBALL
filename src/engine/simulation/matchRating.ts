import type {EventoPartida, Player} from '../../types';

import {limitar} from './rng';

export type ResultadoJogador = 'vitoria' | 'empate' | 'derrota';

/**
 * Nota de um jogador na partida (3.0–10.0), creditando participação real:
 * gols, assistências, cartões, resultado do time e, para o goleiro, o
 * jogo sem sofrer gols. Determinística (sem RNG). Base 6.0 = atuação mediana.
 */
export function calcularNotaPartida(
  jogador: Player,
  eventosDoJogador: EventoPartida[],
  resultado: ResultadoJogador,
  cleanSheet: boolean,
): number {
  const gols = eventosDoJogador.filter(e => e.tipo === 'gol').length;
  const amarelos = eventosDoJogador.filter(e => e.tipo === 'cartao_amarelo').length;
  const vermelhos = eventosDoJogador.filter(e => e.tipo === 'cartao_vermelho').length;

  const bonusResultado =
    resultado === 'vitoria' ? 0.5 : resultado === 'derrota' ? -0.3 : 0;
  const bonusGoleiro =
    jogador.posicaoPrincipal === 'GOL' && cleanSheet ? 0.6 : 0;
  const bonusZagaCleanSheet =
    ['ZAG', 'LD', 'LE'].includes(jogador.posicaoPrincipal) && cleanSheet
      ? 0.3
      : 0;

  const nota =
    6.0 +
    gols * 0.8 +
    amarelos * -0.3 +
    vermelhos * -1.5 +
    bonusResultado +
    bonusGoleiro +
    bonusZagaCleanSheet;

  return Math.round(limitar(nota, 3, 10) * 10) / 10;
}

/** Conta uma assistência atribuída a `jogadorId` nos eventos. */
export function contarAssistencias(
  eventos: EventoPartida[],
  jogadorId: string,
): number {
  return eventos.filter(e => e.jogadorAssistenciaId === jogadorId).length;
}

/** Média incremental de nota (preserva o histórico acumulado da temporada). */
export function mediaIncremental(
  notaAnterior: number,
  jogosAnteriores: number,
  novaNota: number,
): number {
  if (jogosAnteriores <= 0) {
    return novaNota;
  }
  return (
    Math.round(
      ((notaAnterior * jogosAnteriores + novaNota) / (jogosAnteriores + 1)) * 10,
    ) / 10
  );
}
