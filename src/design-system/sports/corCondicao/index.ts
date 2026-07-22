/**
 * corCondicao — FONTE ÚNICA da cor de condição física (verde→âmbar→vermelho).
 *
 * Substitui o `corCondicao` do tema antigo (`src/theme`) e as cópias inline que
 * existiam nas telas migradas (Squad, Departamento Médico, Performance,
 * PainelTroca). Nenhuma tela deve reimplementar estes limiares: consuma esta
 * função (cor hex) ou os limiares exportados (para variantes que precisam de
 * token/ícone/rótulo, ex. emote de humor).
 *
 * Limiares do tema antigo, preservados: ≥75 alta · ≥45 média · senão baixa.
 * A cor vem SEMPRE do token `esporte.fitness` do tema ativo — nunca hex fixo.
 * Função pura: sem React, sem hooks, sem estado.
 */
import type {CoresEsporte} from '../../tokens/colors';

/** Condição ≥ este valor é considerada ALTA (verde). */
export const LIMIAR_CONDICAO_ALTA = 75;
/** Condição ≥ este valor (e < alta) é considerada MÉDIA (âmbar). */
export const LIMIAR_CONDICAO_MEDIA = 45;

/** Cor (hex do tema ativo) para um valor de condição física 0–100. */
export function corCondicao(valor: number, esporte: CoresEsporte): string {
  if (valor >= LIMIAR_CONDICAO_ALTA) {
    return esporte.fitness.high;
  }
  if (valor >= LIMIAR_CONDICAO_MEDIA) {
    return esporte.fitness.medium;
  }
  return esporte.fitness.low;
}
