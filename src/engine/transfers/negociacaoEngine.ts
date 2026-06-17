import type {Clube, Player} from '../../types';
import type {RandomGenerator} from '../simulation/rng';

/**
 * Negociação de transferências (Módulo 9). Modela propostas com status e a
 * resposta da IA (aceita, recusa ou faz contraproposta). Funções puras; a
 * variação da contraproposta é determinística via RNG semeado.
 */

export type StatusProposta =
  | 'pendente'
  | 'aceita'
  | 'recusada'
  | 'contra-proposta';

export interface PropostaTransferencia {
  id: string;
  jogadorId: string;
  clubeOfertante: string; // 'usuario' ou clubeId da IA
  valorProposto: number;
  status: StatusProposta;
  contraPropostaValor?: number;
  expiracaoRodada: number;
}

export type RespostaIA = 'aceita' | 'recusada' | PropostaTransferencia;

const LIMITE_ACEITA = 0.92;
const LIMITE_RECUSA = 0.7;

/**
 * Decisão da IA vendedora sobre uma proposta:
 * - aceita se valor >= 92% do valor de mercado;
 * - recusa se valor < 70%;
 * - entre os dois, devolve uma contraproposta (~105% do mercado, com leve
 *   variação determinística pelo RNG).
 *
 * `clubeVendedor` entra na assinatura para futuras regras (ex.: clube rico
 * segura craque); por ora a decisão é guiada pelo múltiplo de mercado.
 */
export function respostaIAProposta(
  proposta: PropostaTransferencia,
  jogador: Player,
  clubeVendedor: Clube,
  rng: RandomGenerator,
): RespostaIA {
  const valorMercado = Math.max(1, jogador.valorMercado);
  const multiplicador = proposta.valorProposto / valorMercado;

  // Clube em dificuldade financeira aceita um pouco mais fácil.
  const ajuste = clubeVendedor.financas.saldo < 0 ? -0.04 : 0;

  if (multiplicador >= LIMITE_ACEITA + ajuste) {
    return 'aceita';
  }
  if (multiplicador < LIMITE_RECUSA) {
    return 'recusada';
  }

  const fator = 1.05 + (rng() - 0.5) * 0.04; // ~1.03 a 1.07
  const contraPropostaValor = Math.round(valorMercado * fator);
  return {
    ...proposta,
    status: 'contra-proposta',
    contraPropostaValor,
  };
}
