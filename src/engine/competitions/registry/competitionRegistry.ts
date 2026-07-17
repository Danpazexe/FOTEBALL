/**
 * REGISTRY DE COMPETIÇÕES — fonte única de consulta do catálogo do mundo
 * (países, competições, calendários, janelas). Começa com o Brasil; novas ligas
 * entram registrando seus catálogos aqui, sem tocar na store.
 *
 * Substitui, de forma orientada a DADOS, as constantes brasileiras hardcoded
 * (PIRAMIDE_DIVISOES, N_ACESSO): a pirâmide e o nº de acessos passam a sair da
 * definição de cada competição. A store pode migrar para cá gradualmente.
 */
import type {
  CompetitionDefinition,
  CountryDefinition,
  SeasonCalendarDefinition,
  TransferWindowDefinition,
} from '../../../types/world';

import {
  CALENDARIO_BRASIL_2026,
  COMPETICOES_BRASIL,
  COPA_DO_BRASIL,
  JANELA_UNIVERSAL_2026,
  PAIS_BRASIL,
} from './catalogoBrasil';
import {
  CALENDARIO_ARGENTINA_2026,
  CALENDARIO_INGLATERRA_2026,
  COMPETICAO_ARGENTINA,
  COMPETICAO_INGLATERRA,
  COMPETICAO_INGLATERRA_2,
  JANELA_INTERNACIONAL_2026,
  PAIS_ARGENTINA,
  PAIS_INGLATERRA,
} from './catalogoInternacional';

/** Um "pacote" de mundo: país + competições + calendários + janelas. */
export interface PacoteMundo {
  pais: CountryDefinition;
  competicoes: CompetitionDefinition[];
  calendarios: SeasonCalendarDefinition[];
  janelas: TransferWindowDefinition[];
}

const PACOTE_BRASIL: PacoteMundo = {
  pais: PAIS_BRASIL,
  competicoes: [...COMPETICOES_BRASIL, COPA_DO_BRASIL],
  calendarios: [CALENDARIO_BRASIL_2026],
  janelas: [JANELA_UNIVERSAL_2026],
};

const PACOTE_ARGENTINA: PacoteMundo = {
  pais: PAIS_ARGENTINA,
  competicoes: [COMPETICAO_ARGENTINA],
  calendarios: [CALENDARIO_ARGENTINA_2026],
  janelas: [JANELA_INTERNACIONAL_2026],
};

const PACOTE_INGLATERRA: PacoteMundo = {
  pais: PAIS_INGLATERRA,
  competicoes: [COMPETICAO_INGLATERRA, COMPETICAO_INGLATERRA_2],
  calendarios: [CALENDARIO_INGLATERRA_2026],
  janelas: [JANELA_INTERNACIONAL_2026],
};

/** Todos os pacotes de mundo carregados (novas ligas são adicionadas aqui). */
export const PACOTES_MUNDO: PacoteMundo[] = [
  PACOTE_BRASIL,
  PACOTE_ARGENTINA,
  PACOTE_INGLATERRA,
];

// Índices construídos uma vez a partir dos pacotes.
const PAISES = new Map<string, CountryDefinition>();
const COMPETICOES = new Map<string, CompetitionDefinition>();
const CALENDARIOS = new Map<string, SeasonCalendarDefinition>();
const JANELAS = new Map<string, TransferWindowDefinition>();
const COMPETICAO_POR_DIVISAO_LEGADA = new Map<string, CompetitionDefinition>();

for (const pacote of PACOTES_MUNDO) {
  PAISES.set(pacote.pais.id, pacote.pais);
  for (const c of pacote.competicoes) {
    COMPETICOES.set(c.id, c);
    if (c.divisaoLegada) {
      COMPETICAO_POR_DIVISAO_LEGADA.set(c.divisaoLegada, c);
    }
  }
  for (const cal of pacote.calendarios) {
    CALENDARIOS.set(cal.id, cal);
  }
  for (const j of pacote.janelas) {
    JANELAS.set(j.id, j);
  }
}

export function listarPaises(): CountryDefinition[] {
  return [...PAISES.values()];
}

export function paisPorId(id: string): CountryDefinition | undefined {
  return PAISES.get(id);
}

export function listarCompeticoes(): CompetitionDefinition[] {
  return [...COMPETICOES.values()];
}

export function competicaoPorId(id: string): CompetitionDefinition | undefined {
  return COMPETICOES.get(id);
}

/** Compat: encontra a competição pela divisão textual legada (`Clube.divisao`). */
export function competicaoPorDivisaoLegada(
  divisao: string | undefined,
): CompetitionDefinition | undefined {
  return divisao ? COMPETICAO_POR_DIVISAO_LEGADA.get(divisao) : undefined;
}

/** Ligas (tipo 'liga') de um país, ordenadas do topo para a base (tier crescente). */
export function ligasDoPais(countryId: string): CompetitionDefinition[] {
  return [...COMPETICOES.values()]
    .filter(c => c.countryId === countryId && c.tipo === 'liga')
    .sort((a, b) => a.tier - b.tier);
}

/** Pirâmide (ligas + grupos) de um país, topo→base — substitui PIRAMIDE_DIVISOES. */
export function piramideDoPais(countryId: string): CompetitionDefinition[] {
  return [...COMPETICOES.values()]
    .filter(
      c =>
        c.countryId === countryId &&
        (c.tipo === 'liga' || c.tipo === 'copa_grupos'),
    )
    .sort((a, b) => a.tier - b.tier);
}

export function calendarioPorId(
  id: string,
): SeasonCalendarDefinition | undefined {
  return CALENDARIOS.get(id);
}

export function janelaPorId(id: string): TransferWindowDefinition | undefined {
  return JANELAS.get(id);
}
