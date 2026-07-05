/**
 * Condição física após uma rodada (BRASFOOT_MASTER §4/§11).
 *
 * A folga de 2-3 dias entre rodadas + o treino automático leve (+8) recuperam
 * condição — por isso jogar não afunda o titular de imediato. Ainda assim o
 * TITULAR que joga 90' cansa o bastante para, atuando TODA rodada, cair aos
 * poucos (líquido ~-3 já contando o treino leve) e precisar de rodízio; o
 * RESERVA que entrou cansa de leve; quem ficou de FORA recupera cheio.
 *
 * Função pura e determinística — mesma entrada, mesma saída (sem RNG/data).
 */
import {CONDICAO_MAX, CONDICAO_MIN} from './treinoTipos';

/** Titular (jogou os 90'): queda relevante. */
export const DELTA_CONDICAO_TITULAR = -11;
/** Reserva que entrou em campo: queda leve. */
export const DELTA_CONDICAO_RESERVA = -2;
/** Ficou de fora (banco sem entrar / não relacionado): recupera. */
export const DELTA_CONDICAO_FORA = 25;

export interface ParticipacaoPartida {
  /** Começou jogando (estava em campo no apito inicial). */
  ehTitular: boolean;
  /** Entrou em campo em algum momento (titular OU substituição). */
  participou: boolean;
}

/** Variação de condição da rodada, conforme a participação do jogador. */
export function deltaCondicaoPosPartida(part: ParticipacaoPartida): number {
  if (part.ehTitular) {
    return DELTA_CONDICAO_TITULAR;
  }
  return part.participou ? DELTA_CONDICAO_RESERVA : DELTA_CONDICAO_FORA;
}

/** Aplica a variação da rodada e mantém a condição dentro de [MIN, MAX]. */
export function aplicarCondicaoPosPartida(
  condicaoAtual: number,
  part: ParticipacaoPartida,
): number {
  return Math.min(
    CONDICAO_MAX,
    Math.max(CONDICAO_MIN, condicaoAtual + deltaCondicaoPosPartida(part)),
  );
}
