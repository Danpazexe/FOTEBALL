/**
 * Federações estaduais e regiões — base para a regionalização das competições
 * nacionais (grupos da Série D por proximidade) e, adiante, para a distribuição
 * de vagas (Série D / Copa do Brasil) pelo Ranking Nacional das Federações (RNF).
 */

/** Macrorregião do IBGE — usada para agrupar clubes por proximidade. */
export type Regiao = 'NORTE' | 'NORDESTE' | 'CENTRO_OESTE' | 'SUDESTE' | 'SUL';

export interface Federacao {
  /** UF (ex.: 'SP', 'RJ') — chave canônica da federação. */
  uf: string;
  nome: string;
  regiao: Regiao;
  /** Posição no Ranking Nacional das Federações (1 = mais forte). */
  rankingNacional: number;
  /** Vagas do estado na Série D (via estaduais). */
  vagasSerieD: number;
  /** Vagas do estado na Copa do Brasil (via estaduais). */
  vagasCopaDoBrasil: number;
}
