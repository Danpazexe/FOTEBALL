/**
 * Montagem dos grupos da Série D por PROXIMIDADE REGIONAL (evita deslocamentos
 * absurdos na 1ª fase). Determinístico: recebe o RNG semeado da temporada.
 *
 * Algoritmo: ordena os clubes por região (Norte→Sul) e UF; embaralha DENTRO de
 * cada região (varia os confrontos temporada a temporada sem perder a
 * regionalidade); e fatia em `numGrupos` grupos de `clubesPorGrupo`. Grupos na
 * fronteira entre duas regiões podem misturar estados vizinhos — como na CBF.
 * Aceita override manual (mapa grupoId → clubeIds) via `opcoes.override`.
 */
import {ORDEM_REGIOES, regiaoDaUF} from '../../../data/federations/regioes';
import type {Clube} from '../../../types';
import type {RandomGenerator} from '../../simulation/rng';
import type {RegulamentoSerieD} from '../rules/serieD2026';
import type {GrupoCompeticao} from '../tipos';
import {embaralhar, letraGrupo} from '../util';

export interface OpcoesAgrupamento {
  /** Override manual: mapa grupoId → clubeIds. Se coerente, é usado como está. */
  override?: Record<string, string[]>;
}

function validarOverride(
  override: Record<string, string[]>,
  clubes: Clube[],
  regra: RegulamentoSerieD,
): GrupoCompeticao[] {
  const idsValidos = new Set(clubes.map(clube => clube.id));
  const grupos = Object.entries(override).map(([id, clubeIds]) => ({
    id,
    clubeIds,
  }));
  const vistos = new Set<string>();
  for (const grupo of grupos) {
    if (grupo.clubeIds.length !== regra.clubesPorGrupo) {
      throw new Error(
        `Override do grupo ${grupo.id} tem ${grupo.clubeIds.length} clubes (esperado ${regra.clubesPorGrupo}).`,
      );
    }
    for (const clubeId of grupo.clubeIds) {
      if (!idsValidos.has(clubeId)) {
        throw new Error(`Override: clube ${clubeId} não pertence à Série D.`);
      }
      if (vistos.has(clubeId)) {
        throw new Error(`Override: clube ${clubeId} aparece em mais de um grupo.`);
      }
      vistos.add(clubeId);
    }
  }
  if (grupos.length !== regra.numGrupos) {
    throw new Error(
      `Override tem ${grupos.length} grupos (esperado ${regra.numGrupos}).`,
    );
  }
  return grupos;
}

export function montarGruposRegionais(
  clubes: Clube[],
  regra: RegulamentoSerieD,
  rng: RandomGenerator,
  opcoes: OpcoesAgrupamento = {},
): GrupoCompeticao[] {
  if (opcoes.override) {
    return validarOverride(opcoes.override, clubes, regra);
  }

  const esperado = regra.numGrupos * regra.clubesPorGrupo;
  if (clubes.length !== esperado) {
    throw new Error(
      `Agrupamento: ${clubes.length} clubes, esperado ${esperado} (${regra.numGrupos}×${regra.clubesPorGrupo}).`,
    );
  }

  // Embaralha cada região isoladamente e concatena na ordem geográfica Norte→Sul.
  const ordenados: Clube[] = [];
  for (const regiao of ORDEM_REGIOES) {
    const daRegiao = clubes
      .filter(clube => regiaoDaUF(clube.estado) === regiao)
      .sort((a, b) => a.estado.localeCompare(b.estado) || a.id.localeCompare(b.id));
    ordenados.push(...embaralhar(daRegiao, rng));
  }

  // Fatia em grupos consecutivos de `clubesPorGrupo`.
  const grupos: GrupoCompeticao[] = [];
  for (let g = 0; g < regra.numGrupos; g += 1) {
    const inicio = g * regra.clubesPorGrupo;
    const clubeIds = ordenados
      .slice(inicio, inicio + regra.clubesPorGrupo)
      .map(clube => clube.id);
    grupos.push({id: letraGrupo(g), clubeIds});
  }
  return grupos;
}
