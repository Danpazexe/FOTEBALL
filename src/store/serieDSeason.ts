/**
 * Resolução da Série D na virada de temporada (integração "em background": o
 * usuário não dirige um clube da D, mas a divisão roda de verdade pela engine de
 * competição — grupos + mata-mata — a cada temporada, alimentando o acesso à
 * Série C e o histórico de campeões).
 *
 * PURO e determinístico (seed derivada da temporada). Fica na store (e não no
 * engine) porque orquestra dados de domínio do save para o fluxo de temporada.
 */
import {
  filtrarClubesSerieD,
  SERIE_D_2026,
  simularSerieD,
  type RegulamentoSerieD,
} from '../engine/competitions';
import {hashString} from '../engine/simulation/rng';
import type {Clube, Player} from '../types';

/** Resumo persistível da Série D de uma temporada (palmarés/histórico). */
export interface ResumoSerieD {
  temporada: string;
  campeao: string;
  vice: string;
  /** Os 4 semifinalistas (acesso direto à Série C). */
  semifinalistas: string[];
  /** Acessos pela competição (6 no formato 2026: semifinalistas + playoff). */
  acessos: string[];
}

export interface ResolucaoSerieD {
  /**
   * Ordem dos clubes da Série D para o acesso da pirâmide (PROMOVIDOS PRIMEIRO):
   * o `finalizarTemporada` sobe os N primeiros para a Série C. Segue o resto por
   * campanha e, no fim, os não classificados.
   */
  ordem: string[];
  resumo: ResumoSerieD;
}

/**
 * Roda a Série D da temporada e devolve a ordem de acesso + o resumo. Retorna
 * `null` quando não há a Série D completa no mundo (ex.: save antigo, anterior
 * aos dados) — aí o chamador cai no comportamento sem Série D (a pirâmide apenas
 * ignora o par C↔D vazio).
 */
export function resolverSerieDNaVirada(
  todosClubes: Clube[],
  jogadores: Player[],
  temporada: string,
  regra: RegulamentoSerieD = SERIE_D_2026,
): ResolucaoSerieD | null {
  const clubesD = filtrarClubesSerieD(todosClubes);
  if (clubesD.length !== regra.totalClubes) {
    return null;
  }

  const resultado = simularSerieD({
    clubes: clubesD,
    jogadores,
    temporada,
    seed: hashString(`${temporada}_serie_d`),
    regra,
  });

  const acessos = resultado.promovidos;
  const jaOrdenados = new Set(acessos);
  // Depois dos promovidos: o restante dos classificados por campanha (seed), e
  // por fim os não classificados na ordem dos clubes (estável).
  const restoClassificados = resultado.classificados
    .map(classificado => classificado.clubeId)
    .filter(id => !jaOrdenados.has(id));
  restoClassificados.forEach(id => jaOrdenados.add(id));
  const naoClassificados = clubesD
    .map(clube => clube.id)
    .filter(id => !jaOrdenados.has(id));

  return {
    ordem: [...acessos, ...restoClassificados, ...naoClassificados],
    resumo: {
      temporada,
      campeao: resultado.campeao,
      vice: resultado.vice,
      semifinalistas: resultado.semifinalistas,
      acessos,
    },
  };
}
