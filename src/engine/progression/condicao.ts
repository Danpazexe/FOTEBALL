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
/**
 * Ficou de fora (banco sem entrar / não relacionado): salto pós-rodada.
 *
 * REBALANCEADO junto com a recuperação DIÁRIA (`RECUPERACAO_CONDICAO_DIA`):
 * antes toda a recuperação era um salto único de +25 no pós-jogo; agora ela é
 * distribuída pelos dias. A conta (rodadas distam 3-4 dias no
 * calendarGenerator): +2/dia × 3-4 dias = +6..+8 de drift, + salto de +12
 * = +18..+20 por rodada — soma semanal próxima da antiga (+25), mas sentida
 * dia a dia em vez de teleportada no apito final.
 */
export const DELTA_CONDICAO_FORA = 12;

/**
 * Recuperação DIÁRIA de condição (aplicada pelo pipeline diário do calendário
 * a TODO jogador NÃO lesionado, de todos os clubes — simétrico usuário/IA).
 * Determinística, sem RNG; ver a conta do rebalanceamento em
 * `DELTA_CONDICAO_FORA`.
 */
export const RECUPERACAO_CONDICAO_DIA = 2;

/**
 * Aplica a recuperação de UM dia de calendário, capada no teto. Quem decide
 * se o jogador recupera (não lesionado) é o chamador — o pipeline diário.
 */
export function recuperarCondicaoDia(condicaoAtual: number): number {
  return Math.min(CONDICAO_MAX, condicaoAtual + RECUPERACAO_CONDICAO_DIA);
}

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
