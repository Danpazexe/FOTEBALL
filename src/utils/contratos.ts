/**
 * Regras compartilhadas de contrato — usadas pela tela Contratos e pelas
 * pendências da Home. `contratoAte` é data ISO (AAAA-MM-DD); a temporada do
 * jogo é o ano (ex.: "2026"). Extraído da tela Contratos SEM mudar o critério.
 */

/** Ano (AAAA) em que o contrato expira. */
export function anoContrato(contratoAte: string): number {
  return Number(contratoAte.slice(0, 4));
}

/**
 * Critério canônico de urgência (o mesmo que a tela Contratos marca como
 * "expira já!"): o contrato vence NA temporada atual — ano do contrato menor
 * ou igual ao ano da temporada corrente.
 */
export function contratoVenceNaTemporada(
  contratoAte: string,
  anoAtual: number,
): boolean {
  return anoContrato(contratoAte) <= anoAtual;
}
