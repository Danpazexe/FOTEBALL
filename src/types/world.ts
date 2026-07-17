/**
 * FUNDAÇÃO MULTI-LIGA — catálogo de países, competições, calendário e janelas
 * de transferência (briefing "Expansão de Ligas", AD-01…AD-04, AD-09).
 *
 * Estes são DADOS DE CONFIGURAÇÃO estáveis (definições de competição), não o
 * estado mutável da carreira. O Brasil atual é descrito por estes tipos de forma
 * equivalente ao comportamento de hoje (Série A/B/C/D, N_ACESSO=4, 38 rodadas
 * por turno+returno), abrindo espaço para novas ligas SEM reescrever a store.
 *
 * Nomes de campo seguem o contrato do briefing (interoperáveis); comentários em
 * pt-BR. Os ids (`countryId`, `competitionId`, `seasonCalendarId`,
 * `transferWindowPolicyId`) são as chaves estáveis do mundo.
 */

export type Continente = 'SA' | 'EU' | 'NA' | 'AF' | 'AS' | 'OC';

/** AD-01 — País do mundo do jogo. Sem câmbio online; moeda é rótulo de exibição. */
export interface CountryDefinition {
  id: string;
  nome: string;
  /** ISO 3166-1 alpha-3 (ex.: 'BRA', 'ARG', 'ENG'). */
  codigoISO: string;
  continente: Continente;
  /** Rótulo de moeda para exibição (ex.: 'R$'). Não converte valores. */
  moeda: string;
  /** Locale para formatação (ex.: 'pt-BR'). */
  locale: string;
}

export type TipoCompeticao = 'liga' | 'copa_mata_mata' | 'copa_grupos';

/**
 * AD-02 — Definição estável de uma competição. NÃO assume 20 clubes / 38 rodadas
 * / 4 acessos: cada liga declara os seus. `acesso`/`rebaixamento` são a
 * quantidade de clubes que sobem/descem para as competições vizinhas na pirâmide.
 */
export interface CompetitionDefinition {
  id: string;
  countryId: string;
  nome: string;
  nomeCurto: string;
  /** Nível na pirâmide (1 = topo). */
  tier: number;
  tipo: TipoCompeticao;
  numeroClubes: number;
  /** Turnos do round-robin (2 = turno+returno). */
  turnos: number;
  pontosVitoria: number;
  pontosEmpate: number;
  /** Nº de clubes que SOBEM para a competição de cima (0 no topo). */
  acesso: number;
  /** Nº de clubes que DESCEM para a de baixo (0 na base). */
  rebaixamento: number;
  /** Competição imediatamente acima na pirâmide (undefined no topo). */
  competitionAboveId?: string;
  /** Competição imediatamente abaixo (undefined na base). */
  competitionBelowId?: string;
  seasonCalendarId: string;
  transferWindowPolicyId: string;
  /** Divisão textual legada equivalente (compat com `Clube.divisao`). */
  divisaoLegada?: string;
  active: boolean;
}

/** AD-04 — Janela de transferências (orientada a DATAS, não a rodadas). */
export interface TransferWindowDefinition {
  id: string;
  /** Escopo de aplicação; para a 1ª versão, uma janela 'global' basta. */
  scope: 'global' | 'country' | 'competition';
  countryIds?: string[];
  competitionIds?: string[];
  /** ISO date (YYYY-MM-DD) — início inclusivo. */
  startsAt: string;
  /** ISO date — fim inclusivo. */
  endsAt: string;
  allowPermanent: boolean;
  allowLoans: boolean;
  allowFreeAgents: boolean;
}

/** AD-03 — Calendário da temporada; o relógio do mercado usa `dataAtual`. */
export interface SeasonCalendarDefinition {
  id: string;
  seasonLabel: string;
  /** ISO date do primeiro jogo. */
  startDate: string;
  /** ISO date do último jogo. */
  endDate: string;
  matchIntervalDays: number;
  windows: TransferWindowDefinition[];
}

export type TipoTransferencia =
  | 'permanent'
  | 'loan'
  | 'loan_return'
  | 'free_agent';

/**
 * AD-09 — Registro de UM negócio no histórico mundial. É a fonte para notícias e
 * para a aba de transferências do perfil de clube. `fee`/`salary` em reais
 * inteiros (mesma unidade das finanças).
 */
export interface TransferRecord {
  id: string;
  playerId: string;
  fromClubId: string | null;
  toClubId: string | null;
  type: TipoTransferencia;
  fee: number;
  salary?: number;
  /** ISO date do negócio. */
  date: string;
  /** Temporada (ex.: '2026'). */
  season: string;
  source: 'user' | 'ai';
  /** Códigos de motivo (planejamento de elenco, venda por excesso, etc.). */
  reasonCodes: string[];
}
