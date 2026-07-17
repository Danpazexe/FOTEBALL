/**
 * FORMA RECENTE reagindo ao DESEMPENHO (épico Overall Dinâmico, Onda 6).
 *
 * Corrige o stub apontado na auditoria (H8b): a forma só mudava por intensidade
 * de treino e nunca reagia às partidas. Agora a NOTA de cada jogo empurra a
 * forma (fase técnica: −3..+5), com retorno gradual ao neutro quando o
 * desempenho é mediano — um jogador não fica "em fogo" nem "apagado" para
 * sempre. Puro e determinístico; consumido no pós-partida.
 */
import {FORMA_MAX, FORMA_MIN} from './treinoTipos';

/** Nota a partir da qual a forma sobe; abaixo do piso, cai. */
const NOTA_OTIMA = 7.5;
const NOTA_RUIM = 5.5;

/**
 * Nova forma após uma partida, conforme a nota (0–10):
 *  - jogo brilhante (≥7.5): +1 (até +5);
 *  - jogo fraco (≤5.5): −1 (até −3);
 *  - jogo mediano: regride 1 passo rumo ao neutro (0) — a "fase" não é eterna.
 */
export function atualizarFormaPorNota(forma: number, nota: number): number {
  let nova = forma;
  if (nota >= NOTA_OTIMA) {
    nova = forma + 1;
  } else if (nota <= NOTA_RUIM) {
    nova = forma - 1;
  } else if (forma > 0) {
    nova = forma - 1;
  } else if (forma < 0) {
    nova = forma + 1;
  }
  return Math.max(FORMA_MIN, Math.min(FORMA_MAX, nova));
}
