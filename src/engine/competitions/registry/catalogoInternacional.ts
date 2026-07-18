/**
 * CATÁLOGO INTERNACIONAL (prova multi-liga) — Argentina e Inglaterra descritas
 * nos mesmos tipos genéricos do Brasil, para PROVAR o mundo multi-país (briefing
 * decisão #14: funcionamento entre ≥2 novos países). Elencos reais do PESDB
 * (eFootball 2026) vivem no seed; aqui ficam só as definições de competição.
 *
 * São ligas de PROVA (poucos clubes por enquanto): tier 1, turno+returno, pontos
 * 3/1, sem acesso/rebaixamento (divisão única). Expandir depois com mais clubes.
 * `divisaoLegada` casa com `Clube.divisao` do seed ("Primera División"/"Premier
 * League"), ligando cada clube à sua competição/país via o registry.
 */
import type {
  CompetitionDefinition,
  CountryDefinition,
  SeasonCalendarDefinition,
  TransferWindowDefinition,
} from '../../../types/world';

// ── Argentina ────────────────────────────────────────────────────────────────
export const PAIS_ARGENTINA: CountryDefinition = {
  id: 'argentina',
  nome: 'Argentina',
  codigoISO: 'ARG',
  continente: 'SA',
  moeda: 'AR$',
  locale: 'es-AR',
};

export const JANELA_INTERNACIONAL_2026: TransferWindowDefinition = {
  id: 'janela-internacional-2026',
  scope: 'global',
  startsAt: '2026-01-01',
  endsAt: '2026-12-31',
  allowPermanent: true,
  allowLoans: true,
  allowFreeAgents: true,
};

export const CALENDARIO_ARGENTINA_2026: SeasonCalendarDefinition = {
  id: 'calendario-argentina-2026',
  seasonLabel: '2026',
  startDate: '2026-02-01',
  endDate: '2026-11-30',
  matchIntervalDays: 4,
  windows: [JANELA_INTERNACIONAL_2026],
};

export const COMPETICAO_ARGENTINA: CompetitionDefinition = {
  id: 'ar-primera',
  countryId: 'argentina',
  nome: 'Primera División',
  nomeCurto: 'Primera',
  tier: 1,
  tipo: 'liga',
  numeroClubes: 20, // Primera División expandida para liga jogável completa
  turnos: 2,
  pontosVitoria: 3,
  pontosEmpate: 1,
  acesso: 0,
  rebaixamento: 0,
  seasonCalendarId: CALENDARIO_ARGENTINA_2026.id,
  transferWindowPolicyId: JANELA_INTERNACIONAL_2026.id,
  divisaoLegada: 'Primera División',
  active: true,
};

// ── Inglaterra ───────────────────────────────────────────────────────────────
export const PAIS_INGLATERRA: CountryDefinition = {
  id: 'inglaterra',
  nome: 'Inglaterra',
  codigoISO: 'ENG',
  continente: 'EU',
  moeda: '£',
  locale: 'en-GB',
};

export const CALENDARIO_INGLATERRA_2026: SeasonCalendarDefinition = {
  id: 'calendario-inglaterra-2026',
  seasonLabel: '2026',
  startDate: '2026-08-15',
  endDate: '2027-05-20',
  matchIntervalDays: 5,
  windows: [JANELA_INTERNACIONAL_2026],
};

export const COMPETICAO_INGLATERRA: CompetitionDefinition = {
  id: 'en-premier',
  countryId: 'inglaterra',
  nome: 'Premier League',
  nomeCurto: 'Premier',
  tier: 1,
  tipo: 'liga',
  numeroClubes: 20, // elencos reais (PESDB/eFootball + EA FC 26)
  turnos: 2,
  pontosVitoria: 3,
  pontosEmpate: 1,
  acesso: 0, // topo
  rebaixamento: 3,
  competitionBelowId: 'en-championship',
  seasonCalendarId: CALENDARIO_INGLATERRA_2026.id,
  transferWindowPolicyId: JANELA_INTERNACIONAL_2026.id,
  divisaoLegada: 'Premier League',
  active: true,
};

/** Championship (2ª divisão inglesa) — liga B completa (24 clubes). */
export const COMPETICAO_INGLATERRA_2: CompetitionDefinition = {
  id: 'en-championship',
  countryId: 'inglaterra',
  nome: 'Championship',
  nomeCurto: 'Championship',
  tier: 2,
  tipo: 'liga',
  numeroClubes: 24,
  turnos: 2,
  pontosVitoria: 3,
  pontosEmpate: 1,
  acesso: 3,
  rebaixamento: 0, // base carregada (sem 3ª divisão ainda)
  competitionAboveId: 'en-premier',
  seasonCalendarId: CALENDARIO_INGLATERRA_2026.id,
  transferWindowPolicyId: JANELA_INTERNACIONAL_2026.id,
  divisaoLegada: 'Championship',
  active: true,
};
