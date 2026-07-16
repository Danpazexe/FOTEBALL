/**
 * Seleção ponderada de protagonistas de um lance — compartilhada entre o
 * simulador (cartões, lesões, pênaltis) e a engine causal de chances.
 * PURA: recebe RNG por parâmetro, nunca cria fatos sozinha.
 */
import {fatorPesoAssistencia, fatorPesoGol} from '../../progression/habilidades';
import type {RandomGenerator} from '../rng';

import type {Player, Position} from '../../../types';

export function pesoGolPosicao(posicao: Position): number {
  if (posicao === 'CA') {
    return 6;
  }
  if (['PD', 'PE', 'SA'].includes(posicao)) {
    return 4;
  }
  if (['MEI', 'MC'].includes(posicao)) {
    return 2;
  }
  return 0.5;
}

/** Peso de quem dá assistência: criadores/pontas pesam mais. */
export function pesoAssistencia(jogador: Player): number {
  const criacao = (jogador.atributos.passe + jogador.atributos.cruzamento) / 2;
  const bonusPosicao = ['MEI', 'MC', 'PD', 'PE', 'SA'].includes(
    jogador.posicaoPrincipal,
  )
    ? 1.4
    : ['LD', 'LE', 'CA'].includes(jogador.posicaoPrincipal)
      ? 1.1
      : 0.7;
  return Math.max(0.2, (criacao / 70) * bonusPosicao);
}

/** Peso de quem FINALIZA: posição de área × aptidão × habilidades especiais. */
export function pesoFinalizador(jogador: Player): number {
  return (
    pesoGolPosicao(jogador.posicaoPrincipal) *
    (Math.max(20, jogador.atributos.finalizacao) / 70) *
    fatorPesoGol(jogador)
  );
}

/** Peso de assistência incluindo habilidades especiais (garçom etc.). */
export function pesoAssistenciaCompleto(jogador: Player): number {
  return pesoAssistencia(jogador) * fatorPesoAssistencia(jogador);
}

export function escolherJogadorPonderado(
  jogadores: Player[],
  rng: RandomGenerator,
  peso: (jogador: Player) => number,
): Player {
  const disponiveis = jogadores.filter(
    jogador => !jogador.lesionado && !jogador.suspenso,
  );
  const total = disponiveis.reduce(
    (soma, jogador) => soma + Math.max(0.1, peso(jogador)),
    0,
  );
  let cursor = rng() * total;

  for (const jogador of disponiveis) {
    cursor -= Math.max(0.1, peso(jogador));
    if (cursor <= 0) {
      return jogador;
    }
  }

  const fallback = disponiveis[0] ?? jogadores[0];
  if (!fallback) {
    throw new Error('Não há jogadores disponíveis para a simulação');
  }
  return fallback;
}
