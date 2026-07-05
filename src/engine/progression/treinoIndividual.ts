/**
 * Treino individual — foco de desenvolvimento por jogador. Puro e determinístico:
 * um jogador pode ter um atributo em FOCO; ao treinar, esse atributo tende a subir
 * 1 ponto (com RNG estável), respeitando o teto do atributo e a margem de potencial
 * (o foco NUNCA leva o overall além do potencial). É ADITIVO ao treino de elenco
 * existente (não altera calcularEfeitoTreino/treinarElenco) — sem risco ao
 * balanceamento de progressão.
 */

import type {AtributoChave, Player} from '../../types';
import {calcularOverall} from './overall';

export type AtributoFoco = AtributoChave;

/** Atributos treináveis + rótulo pt-BR para a UI. */
export const ATRIBUTOS_FOCO: ReadonlyArray<{chave: AtributoFoco; rotulo: string}> =
  [
    {chave: 'finalizacao', rotulo: 'Finalização'},
    {chave: 'passe', rotulo: 'Passe'},
    {chave: 'marcacao', rotulo: 'Marcação'},
    {chave: 'desarme', rotulo: 'Desarme'},
    {chave: 'velocidade', rotulo: 'Velocidade'},
    {chave: 'resistencia', rotulo: 'Resistência'},
    {chave: 'forca', rotulo: 'Força'},
    {chave: 'reflexos', rotulo: 'Reflexos'},
    {chave: 'posicionamento', rotulo: 'Posicionamento'},
    {chave: 'drible', rotulo: 'Drible'},
    {chave: 'cabeceio', rotulo: 'Cabeceio'},
    {chave: 'cruzamento', rotulo: 'Cruzamento'},
  ];

const ATRIBUTO_MAX = 99;
/** Chance de o foco render 1 ponto num treino (quando há margem de potencial). */
const CHANCE_EVOLUIR_FOCO = 0.6;

/**
 * Aplica um passo de treino individual. Sem foco, ou sem margem de potencial, o
 * jogador volta inalterado. Determinístico via `rng`.
 */
export function desenvolverFoco(jogador: Player, rng: () => number): Player {
  const foco = jogador.focoTreino;
  if (!foco) {
    return jogador;
  }
  const atual = jogador.atributos[foco];
  // Já no potencial (overall) ou atributo no teto → o foco não rende.
  if (jogador.overall >= jogador.potencial || atual >= ATRIBUTO_MAX) {
    return jogador;
  }
  if (rng() >= CHANCE_EVOLUIR_FOCO) {
    return jogador;
  }
  const atributos = {...jogador.atributos, [foco]: atual + 1};
  const overallCalculado = calcularOverall(atributos, jogador.posicaoPrincipal);
  // O foco nunca leva o overall além do potencial.
  if (overallCalculado > jogador.potencial) {
    return jogador;
  }
  // Subir um atributo nunca REDUZ o overall (protege overall declarado stale).
  return {
    ...jogador,
    atributos,
    overall: Math.max(jogador.overall, overallCalculado),
  };
}
