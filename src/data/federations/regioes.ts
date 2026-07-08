/**
 * Mapa UF → macrorregião (IBGE). Fonte única para regionalizar competições
 * (ex.: montar os grupos da Série D por proximidade). Determinístico e puro.
 */
import type {Regiao} from '../../types/federacao';

export const REGIAO_POR_UF: Record<string, Regiao> = {
  // Norte
  AC: 'NORTE',
  AM: 'NORTE',
  AP: 'NORTE',
  PA: 'NORTE',
  RO: 'NORTE',
  RR: 'NORTE',
  TO: 'NORTE',
  // Nordeste
  AL: 'NORDESTE',
  BA: 'NORDESTE',
  CE: 'NORDESTE',
  MA: 'NORDESTE',
  PB: 'NORDESTE',
  PE: 'NORDESTE',
  PI: 'NORDESTE',
  RN: 'NORDESTE',
  SE: 'NORDESTE',
  // Centro-Oeste
  DF: 'CENTRO_OESTE',
  GO: 'CENTRO_OESTE',
  MS: 'CENTRO_OESTE',
  MT: 'CENTRO_OESTE',
  // Sudeste
  ES: 'SUDESTE',
  MG: 'SUDESTE',
  RJ: 'SUDESTE',
  SP: 'SUDESTE',
  // Sul
  PR: 'SUL',
  RS: 'SUL',
  SC: 'SUL',
};

/** Ordem geográfica das regiões (Norte→Sul) — usada para ordenar clubes antes de agrupar. */
export const ORDEM_REGIOES: Regiao[] = [
  'NORTE',
  'NORDESTE',
  'CENTRO_OESTE',
  'SUDESTE',
  'SUL',
];

/** Região da UF; cai em SUDESTE (centro do país) se a UF for desconhecida. */
export function regiaoDaUF(uf: string): Regiao {
  return REGIAO_POR_UF[uf] ?? 'SUDESTE';
}
