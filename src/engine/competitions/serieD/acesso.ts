/**
 * Acesso da Série D para a Série C. Formato 2026: 6 vagas — os 4 SEMIFINALISTAS
 * sobem direto e os 4 eliminados nas QUARTAS disputam um playoff (2 confrontos
 * ida e volta) por 2 vagas. Parametrizável: com `acessosPlayoffQuartas = 0`
 * (formato 2025) sobem só os 4 semifinalistas, sem playoff.
 */
import {
  criarRNGComSeed,
  hashString,
} from '../../simulation/rng';
import type {RegulamentoSerieD} from '../rules/serieD2026';
import type {ConfrontoMataMata, FaseMataMata} from '../tipos';
import {criarConfronto, resolverConfronto} from '../knockout/confronto';

export interface ResultadoAcesso {
  /** Clubes promovidos à Série C (semifinalistas + vencedores do playoff). */
  promovidos: string[];
  /** A fase de playoff (null quando o regulamento não a prevê). */
  playoffAcesso: FaseMataMata | null;
}

export function resolverAcesso(args: {
  /** Semifinalistas (vencedores das quartas) — sobem direto. */
  semifinalistas: string[];
  /** Eliminados nas quartas — disputam o playoff. */
  perdedoresQuartas: string[];
  seedPorClube: Map<string, number>;
  forcaPorClube: Map<string, number>;
  temporada: string;
  seedBase: string;
  regra: RegulamentoSerieD;
}): ResultadoAcesso {
  const {
    semifinalistas,
    perdedoresQuartas,
    seedPorClube,
    forcaPorClube,
    temporada,
    seedBase,
    regra,
  } = args;

  const diretos = semifinalistas.slice(0, regra.acessosSemifinalistas);

  if (regra.acessosPlayoffQuartas <= 0 || perdedoresQuartas.length < 2) {
    return {promovidos: [...diretos], playoffAcesso: null};
  }

  // Ordena os eliminados por seed (melhor campanha manda a volta em casa).
  const ordenados = [...perdedoresQuartas].sort(
    (a, b) => (seedPorClube.get(a) ?? 999) - (seedPorClube.get(b) ?? 999),
  );
  const confrontos: ConfrontoMataMata[] = [];
  const n = ordenados.length;
  for (let i = 0; i < n / 2; i += 1) {
    const forte = ordenados[i];
    const fraco = ordenados[n - 1 - i];
    confrontos.push(
      criarConfronto(
        `serie_d_${temporada}_playoff_${i}`,
        'Playoff de acesso',
        fraco,
        forte,
      ),
    );
  }

  const resolvidos = confrontos.map(confronto =>
    resolverConfronto(
      confronto,
      forcaPorClube.get(confronto.clubeA) ?? 50,
      forcaPorClube.get(confronto.clubeB) ?? 50,
      criarRNGComSeed(hashString(`${seedBase}_${confronto.id}`)),
    ),
  );

  const vencedoresPlayoff = resolvidos
    .map(confronto => confronto.vencedor)
    .filter((vencedor): vencedor is string => Boolean(vencedor));

  return {
    promovidos: [...diretos, ...vencedoresPlayoff],
    playoffAcesso: {nome: 'Playoff de acesso', confrontos: resolvidos},
  };
}
