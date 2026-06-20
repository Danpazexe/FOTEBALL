import type {Player, TipoJogador} from '../../types';

/**
 * Classificação de jogador no mercado (BRASFOOT_MASTER §3.4). Pura e
 * determinística — derivada de idade/potencial. Dá textura ao mercado: novatos
 * são aposta (mais baratos, força a confirmar), veteranos valem agora mas
 * declinam. O wiring no load garante o campo a todos os jogadores.
 */

/** Idade a partir da qual o jogador é VETERANO (fim de carreira). */
export const IDADE_VETERANO = 33;
/** Idade até a qual um jovem com margem de potencial é NOVATO (aposta). */
export const IDADE_MAX_NOVATO = 20;
/** Margem mínima (potencial − overall) para um jovem contar como NOVATO. */
export const MARGEM_NOVATO = 6;

/** Multiplicador de valor de mercado por tipo (§3.4): novato é risco, veterano declina. */
export const MULTIPLICADOR_VALOR_TIPO: Record<TipoJogador, number> = {
  NORMAL: 1.0,
  NOVATO: 0.6,
  VETERANO: 0.8,
};

export function derivarTipoJogador(jogador: Player): TipoJogador {
  if (jogador.idade >= IDADE_VETERANO) {
    return 'VETERANO';
  }
  if (
    jogador.idade <= IDADE_MAX_NOVATO &&
    jogador.potencial - jogador.overall >= MARGEM_NOVATO
  ) {
    return 'NOVATO';
  }
  return 'NORMAL';
}

/** Garante o campo `tipo`: respeita o explícito do seed ou deriva. */
export function comTipo(jogador: Player): Player {
  return jogador.tipo ? jogador : {...jogador, tipo: derivarTipoJogador(jogador)};
}
