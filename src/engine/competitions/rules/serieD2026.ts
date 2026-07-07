/**
 * Regulamento PARAMETRIZÁVEL da Série D. O formato não fica preso a 2026: troque
 * a config para mudar nº de clubes/grupos/acessos sem tocar na engine.
 *
 * Formato 2026 (CBF): 96 clubes · 16 grupos de 6 · turno e returno (10 jogos) ·
 * 4 classificados por grupo (64 no mata-mata) · eliminatórias em ida e volta ·
 * empate no agregado → pênaltis (sem gol fora) · 6 acessos à Série C
 * (4 semifinalistas diretos + 2 vencedores do playoff entre os eliminados nas
 * quartas de final).
 */

export interface RegulamentoSerieD {
  nome: string;
  totalClubes: number;
  numGrupos: number;
  clubesPorGrupo: number;
  /** Quantos avançam de cada grupo ao mata-mata. */
  classificadosPorGrupo: number;
  /** Fase de grupos em turno e returno (dobro dos jogos). */
  turnoEReturno: boolean;
  /** Acessos garantidos aos semifinalistas (sobem direto). */
  acessosSemifinalistas: number;
  /** Acessos extras via playoff entre os eliminados nas quartas. */
  acessosPlayoffQuartas: number;
}

export const SERIE_D_2026: RegulamentoSerieD = {
  nome: 'Série D 2026',
  totalClubes: 96,
  numGrupos: 16,
  clubesPorGrupo: 6,
  classificadosPorGrupo: 4,
  turnoEReturno: true,
  acessosSemifinalistas: 4,
  acessosPlayoffQuartas: 2,
};

/** Formato antigo (2025) — 64 clubes / 8 grupos de 8 / 4 acessos (só semifinalistas). */
export const SERIE_D_2025: RegulamentoSerieD = {
  nome: 'Série D 2025',
  totalClubes: 64,
  numGrupos: 8,
  clubesPorGrupo: 8,
  classificadosPorGrupo: 4,
  turnoEReturno: true,
  acessosSemifinalistas: 4,
  acessosPlayoffQuartas: 0,
};

/** Nº de clubes que entram no mata-mata (deve ser potência de 2). */
export function totalClassificados(regra: RegulamentoSerieD): number {
  return regra.numGrupos * regra.classificadosPorGrupo;
}

/** Total de acessos à Série C (semifinalistas + vencedores do playoff). */
export function totalAcessos(regra: RegulamentoSerieD): number {
  return regra.acessosSemifinalistas + regra.acessosPlayoffQuartas;
}

/** Valida a coerência da config (grupos batem, classificados = potência de 2). */
export function validarRegulamento(regra: RegulamentoSerieD): string[] {
  const erros: string[] = [];
  if (regra.numGrupos * regra.clubesPorGrupo !== regra.totalClubes) {
    erros.push(
      `numGrupos*clubesPorGrupo (${regra.numGrupos * regra.clubesPorGrupo}) != totalClubes (${regra.totalClubes})`,
    );
  }
  const classificados = totalClassificados(regra);
  if (classificados < 2 || !Number.isInteger(Math.log2(classificados))) {
    erros.push(`total de classificados (${classificados}) não é potência de 2`);
  }
  if (regra.classificadosPorGrupo > regra.clubesPorGrupo) {
    erros.push('classificadosPorGrupo maior que clubesPorGrupo');
  }
  return erros;
}
