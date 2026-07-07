/**
 * As 27 federações estaduais, ordenadas pelo Ranking Nacional das Federações
 * (RNF). As vagas por estado são DERIVADAS da faixa de ranking, replicando as
 * regras da CBF (editável — troque a ordem/faixas para outra temporada):
 *
 *   Copa do Brasil 2026 (102 vagas via estaduais):
 *     rank 1–2 → 6 | 3–5 → 5 | 6–14 → 4 | 15–27 → 3
 *   Série D (distribuição 2025):
 *     rank 1 → 4 | 2–9 → 3 | 10–19 → 2 | 20–27 → 1
 *
 * O topo do RNF 2026 (SP, RJ, MG, RS, PR) vem de fonte oficial da CBF; a ordem
 * do meio/base é uma aproximação editável.
 */
import type {Federacao, Regiao} from '../../types/federacao';

import {regiaoDaUF} from './regioes';

/** UF + nome, na ordem do RNF (índice 0 = 1º do ranking). */
const RNF: Array<{uf: string; nome: string}> = [
  {uf: 'SP', nome: 'São Paulo'},
  {uf: 'RJ', nome: 'Rio de Janeiro'},
  {uf: 'MG', nome: 'Minas Gerais'},
  {uf: 'RS', nome: 'Rio Grande do Sul'},
  {uf: 'PR', nome: 'Paraná'},
  {uf: 'BA', nome: 'Bahia'},
  {uf: 'SC', nome: 'Santa Catarina'},
  {uf: 'GO', nome: 'Goiás'},
  {uf: 'PE', nome: 'Pernambuco'},
  {uf: 'CE', nome: 'Ceará'},
  {uf: 'PA', nome: 'Pará'},
  {uf: 'MT', nome: 'Mato Grosso'},
  {uf: 'DF', nome: 'Distrito Federal'},
  {uf: 'ES', nome: 'Espírito Santo'},
  {uf: 'AL', nome: 'Alagoas'},
  {uf: 'PB', nome: 'Paraíba'},
  {uf: 'RN', nome: 'Rio Grande do Norte'},
  {uf: 'AM', nome: 'Amazonas'},
  {uf: 'MS', nome: 'Mato Grosso do Sul'},
  {uf: 'SE', nome: 'Sergipe'},
  {uf: 'MA', nome: 'Maranhão'},
  {uf: 'PI', nome: 'Piauí'},
  {uf: 'TO', nome: 'Tocantins'},
  {uf: 'RO', nome: 'Rondônia'},
  {uf: 'AC', nome: 'Acre'},
  {uf: 'AP', nome: 'Amapá'},
  {uf: 'RR', nome: 'Roraima'},
];

/** Vagas da Copa do Brasil por posição no RNF (1-indexado). */
export function vagasCopaPorRanking(ranking: number): number {
  if (ranking <= 2) {
    return 6;
  }
  if (ranking <= 5) {
    return 5;
  }
  if (ranking <= 14) {
    return 4;
  }
  return 3;
}

/** Vagas da Série D por posição no RNF (1-indexado). */
export function vagasSerieDPorRanking(ranking: number): number {
  if (ranking <= 1) {
    return 4;
  }
  if (ranking <= 9) {
    return 3;
  }
  if (ranking <= 19) {
    return 2;
  }
  return 1;
}

export const FEDERACOES: Federacao[] = RNF.map((item, indice) => {
  const rankingNacional = indice + 1;
  return {
    uf: item.uf,
    nome: item.nome,
    regiao: regiaoDaUF(item.uf) as Regiao,
    rankingNacional,
    vagasSerieD: vagasSerieDPorRanking(rankingNacional),
    vagasCopaDoBrasil: vagasCopaPorRanking(rankingNacional),
  };
});

const FEDERACAO_POR_UF = new Map(FEDERACOES.map(fed => [fed.uf, fed]));

/** Federação da UF (undefined se desconhecida). */
export function federacaoDaUF(uf: string): Federacao | undefined {
  return FEDERACAO_POR_UF.get(uf);
}

/** Ranking RNF da UF; 99 (pior) se desconhecida — usado como critério de sorteio/seed. */
export function rankingDaUF(uf: string): number {
  return FEDERACAO_POR_UF.get(uf)?.rankingNacional ?? 99;
}
