/**
 * CATÁLOGO DO BRASIL — descreve as competições atuais (Série A/B/C/D + Copa do
 * Brasil) nos tipos genéricos do mundo, de forma EQUIVALENTE ao comportamento de
 * hoje: pirâmide A→B→C→D, 4 acessos/rebaixamentos entre adjacentes (N_ACESSO),
 * pontos 3/1, turno+returno. É o "Brasil como dado", ponto de partida para o
 * mundo multi-liga sem mudar nada do jogo atual.
 */
import type {
  CompetitionDefinition,
  CountryDefinition,
  SeasonCalendarDefinition,
  TransferWindowDefinition,
} from '../../../types/world';

export const PAIS_BRASIL: CountryDefinition = {
  id: 'brasil',
  nome: 'Brasil',
  codigoISO: 'BRA',
  continente: 'SA',
  moeda: 'R$',
  locale: 'pt-BR',
};

/**
 * Janela ÚNICA universal (1ª versão): permite negócios ao longo da temporada.
 * O relógio é a DATA — a política de janela decide se está aberta, não a rodada.
 * Datas amplas cobrindo a temporada brasileira (abr→dez); afinar depois.
 */
export const JANELA_UNIVERSAL_2026: TransferWindowDefinition = {
  id: 'janela-universal-2026',
  scope: 'global',
  startsAt: '2026-04-01',
  endsAt: '2026-12-20',
  allowPermanent: true,
  allowLoans: true,
  allowFreeAgents: true,
};

export const CALENDARIO_BRASIL_2026: SeasonCalendarDefinition = {
  id: 'calendario-brasil-2026',
  seasonLabel: '2026',
  startDate: '2026-04-04',
  endDate: '2026-12-08',
  matchIntervalDays: 3,
  windows: [JANELA_UNIVERSAL_2026],
};

const CALENDARIO_ID = CALENDARIO_BRASIL_2026.id;
const JANELA_ID = JANELA_UNIVERSAL_2026.id;

/**
 * As 4 divisões nacionais como competições do tipo liga. `numeroClubes` reflete
 * a realidade da base (A/B/C = 20; D roda em grupos, tratada à parte pela engine
 * de Série D). `acesso`/`rebaixamento` = N_ACESSO atual (4) entre adjacentes.
 */
export const COMPETICOES_BRASIL: CompetitionDefinition[] = [
  {
    id: 'br-serie-a',
    countryId: 'brasil',
    nome: 'Brasileirão Série A',
    nomeCurto: 'Série A',
    tier: 1,
    tipo: 'liga',
    numeroClubes: 20,
    turnos: 2,
    pontosVitoria: 3,
    pontosEmpate: 1,
    acesso: 0, // topo: ninguém sobe
    rebaixamento: 4,
    competitionBelowId: 'br-serie-b',
    seasonCalendarId: CALENDARIO_ID,
    transferWindowPolicyId: JANELA_ID,
    divisaoLegada: 'Série A',
    active: true,
  },
  {
    id: 'br-serie-b',
    countryId: 'brasil',
    nome: 'Brasileirão Série B',
    nomeCurto: 'Série B',
    tier: 2,
    tipo: 'liga',
    numeroClubes: 20,
    turnos: 2,
    pontosVitoria: 3,
    pontosEmpate: 1,
    acesso: 4,
    rebaixamento: 4,
    competitionAboveId: 'br-serie-a',
    competitionBelowId: 'br-serie-c',
    seasonCalendarId: CALENDARIO_ID,
    transferWindowPolicyId: JANELA_ID,
    divisaoLegada: 'Série B',
    active: true,
  },
  {
    id: 'br-serie-c',
    countryId: 'brasil',
    nome: 'Brasileirão Série C',
    nomeCurto: 'Série C',
    tier: 3,
    tipo: 'liga',
    numeroClubes: 20,
    turnos: 2,
    pontosVitoria: 3,
    pontosEmpate: 1,
    acesso: 4,
    rebaixamento: 4,
    competitionAboveId: 'br-serie-b',
    competitionBelowId: 'br-serie-d',
    seasonCalendarId: CALENDARIO_ID,
    transferWindowPolicyId: JANELA_ID,
    divisaoLegada: 'Série C',
    active: true,
  },
  {
    id: 'br-serie-d',
    countryId: 'brasil',
    nome: 'Brasileirão Série D',
    nomeCurto: 'Série D',
    tier: 4,
    tipo: 'copa_grupos', // grupos + mata-mata (engine própria de Série D)
    numeroClubes: 64,
    turnos: 1,
    pontosVitoria: 3,
    pontosEmpate: 1,
    acesso: 4,
    rebaixamento: 0, // base da pirâmide: ninguém desce
    competitionAboveId: 'br-serie-c',
    seasonCalendarId: CALENDARIO_ID,
    transferWindowPolicyId: JANELA_ID,
    divisaoLegada: 'Série D',
    active: true,
  },
];

/** Copa do Brasil como competição de mata-mata (coexiste com a liga da temporada). */
export const COPA_DO_BRASIL: CompetitionDefinition = {
  id: 'br-copa-brasil',
  countryId: 'brasil',
  nome: 'Copa do Brasil',
  nomeCurto: 'Copa do Brasil',
  tier: 0,
  tipo: 'copa_mata_mata',
  numeroClubes: 0, // variável por temporada (montada pela copaEngine)
  turnos: 1,
  pontosVitoria: 3,
  pontosEmpate: 1,
  acesso: 0,
  rebaixamento: 0,
  seasonCalendarId: CALENDARIO_ID,
  transferWindowPolicyId: JANELA_ID,
  divisaoLegada: undefined,
  active: true,
};
