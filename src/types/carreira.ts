/**
 * Tipos do eixo Meta/Carreira do técnico (BRASFOOT_MASTER §12 e §8.4).
 */

/**
 * Estado financeiro do clube conforme a persistência de saldo negativo (§8.4):
 * - SAUDAVEL: saldo no azul
 * - ATENCAO:  1-2 rodadas no vermelho
 * - CRITICO:  3+ rodadas (salários atrasam → moral despenca)
 * - FALENCIA: 8+ rodadas (gatilho de demissão)
 */
export type EstadoFinanceiro = 'SAUDAVEL' | 'ATENCAO' | 'CRITICO' | 'FALENCIA';

/** Motivo pelo qual o técnico foi demitido (§12). */
export type MotivoDemissao =
  | 'DERROTAS_CONSECUTIVAS'
  | 'FALENCIA'
  | 'REBAIXAMENTO';

/** Resultado de uma partida do ponto de vista do clube do usuário. */
export type ResultadoCarreira = 'vitoria' | 'empate' | 'derrota';
