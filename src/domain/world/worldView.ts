/**
 * WORLDSTATEVIEW — a "árvore de estados do dono" como VISÃO DERIVADA read-only.
 *
 * Por que view derivada e NÃO árvore residente:
 * - O save é FLAT e versionado: a store persiste fatias planas (arrays de
 *   clubes/jogadores/partidas + fatias por domínio) com migrações próprias.
 *   Uma árvore residente duplicaria a posse (RN-01: `Player.clubeId` é a fonte
 *   única) e criaria uma segunda cópia a manter em sincronia a cada escrita.
 * - O motor é determinístico por seed e consome os draws do RNG em ordem fixa
 *   (streams separados por finalidade — ver `EstadoPartidaAoVivo`). Estado
 *   espelhado que "acompanhasse" a simulação arriscaria reordenar/duplicar
 *   consumo de RNG. Esta view NUNCA toca RNG: só referencia o que já existe.
 * - Decisão anti-DDD da auditoria SOLID (2026-07): sem agregados residentes,
 *   sem Repository genérico, sem DI container. Domínio = funções puras sobre o
 *   estado real da store (mesmo padrão de `worldTypes`/`worldSelectors`).
 * - Nada dessincroniza PORQUE é derivado: a árvore é remontada sob demanda a
 *   partir de REFERÊNCIAS aos objetos reais — não há segunda fonte a atualizar.
 *
 * Contrato: NUNCA persistir um `WorldStateView`; NUNCA usar a view como entrada
 * de escrita. Sub-objetos são a MESMA referência do estado real; primitivos
 * copiados são retrato do instante da montagem.
 *
 * Este arquivo é também o ÍNDICE VIVO dos domínios do mundo: cada nó diz se o
 * domínio EXISTE, é PARCIAL ou está AUSENTE no motor, e quem é o dono real.
 */
import type {
  AtributoChave,
  ClimaPartida,
  Clube,
  Estadio,
  EstadoFinanceiro,
  FinancasClube,
  Formacao,
  MotivoDemissao,
  Partida,
  Player,
  PlayerAttributes,
  PlayerSeasonStats,
  TabelaClassificacao,
  Tatica,
} from '../../types';
import type {EstadoFisicoJogador} from '../../types/desenvolvimento';
import type {DisponibilidadeJogador} from '../../types/disciplina';
import type {EstadoPatrocinio} from '../../types/patrocinio';
import type {TransferRecord} from '../../types/world';
import type {EstadoCopa} from '../../engine/season/copaEngine';
import type {EstadoPartidaAoVivo} from '../../engine/simulation/matchSimulator';
import type {PropostaTransferencia} from '../../engine/transfers/negociacaoEngine';
import type {EstadoSerieDCarreira} from '../../store/serieDCarreira';
import type {ResumoSerieD} from '../../store/serieDSeason';
import type {ConfigJogo, GameState} from '../../store/useGameStore';

// ---------------------------------------------------------------------------
// Nós da árvore
// ---------------------------------------------------------------------------

/** EXISTE — dono real: `GameState.partidas`/`ultimaPartidaUsuario` (src/types/match.ts). */
export interface MatchView {
  /** Todas as partidas persistidas da temporada (MESMA referência do array). */
  readonly partidas: readonly Partida[];
  readonly ultimaPartidaUsuario: Partida | null;
}

/**
 * AUSENTE no motor — dono real futuro: física de bola na engine causal. Hoje os
 * únicos fatos "de bola" são derivados: `ChutePartida.x/y/golX/golY`
 * (src/types/match.ts) e a posse (`EstadoPartidaAoVivo.posseAcumuladaCasa`).
 */
export interface BallView {
  /** Contrato futuro (nunca preenchido hoje): posição normalizada 0..1. */
  readonly x?: number;
  readonly y?: number;
}

/**
 * AUSENTE no motor — dono real futuro: entidade gramado/dimensões/condição.
 * Parcial hoje: só coordenadas normalizadas (`TitularFormacao.x/y` em
 * src/types/club.ts; src/engine/simulation/geometriaCampo.ts).
 */
export interface PitchView {
  /** Contrato futuro (nunca preenchido hoje): condição do gramado 0..100. */
  readonly condicaoGramado?: number;
}

/**
 * PARCIAL — clima existe POR PARTIDA, não como sistema mundial. Dono real:
 * `EstatisticasPartida.clima/temperatura` (src/types/match.ts), sorteio em
 * `criarEstatisticasAoVivo` (src/engine/simulation/matchStats.ts).
 */
export interface WeatherView {
  readonly clima: ClimaPartida;
  /** Temperatura em °C (sorteada com o clima). */
  readonly temperatura: number;
}

/** EXISTE — donos reais: tabela (src/engine/season/classification.ts), copa (src/engine/season/copaEngine.ts), Série D (src/store/serieDCarreira.ts, src/store/serieDSeason.ts). */
export interface CompetitionView {
  readonly tabela: readonly TabelaClassificacao[];
  /** Copa do Brasil da temporada (null fora dela). */
  readonly copa: EstadoCopa | null;
  /** Mata-mata da Série D quando o usuário disputa a D. */
  readonly serieDCarreira: EstadoSerieDCarreira | null;
  readonly historicoSerieD: readonly ResumoSerieD[];
}

/** EXISTE — dono real: `GameState.temporadaAtual/rodadaAtual/dataAtual` (calendário: src/engine/calendar/pipelineDiario.ts). */
export interface SeasonView {
  readonly temporadaAtual: string;
  readonly rodadaAtual: number;
  /** Data canônica do calendário (ISO YYYY-MM-DD). */
  readonly dataAtual: string;
}

/** EXISTE — donos reais: `Clube.financas` (src/types/club.ts, src/engine/finance/financeEngine.ts), carreira (src/engine/carreira/carreiraEngine.ts), patrocínio (src/types/patrocinio.ts). */
export interface FinanceView {
  /** Finanças do clube do usuário — MESMA referência de `Clube.financas`. */
  readonly financasClubeUsuario?: FinancasClube;
  readonly estadoFinanceiro: EstadoFinanceiro;
  readonly rodadasNoVermelho: number;
  readonly patrocinio: EstadoPatrocinio;
}

/** EXISTE — donos reais: histórico AD-09 (src/types/world.ts) e propostas (src/engine/transfers/negociacaoEngine.ts). */
export interface TransferView {
  /** Histórico mundial de transferências (MESMA referência do array). */
  readonly historico: readonly TransferRecord[];
  readonly propostasRecebidas: readonly PropostaTransferencia[];
}

/**
 * AUSENTE como entidade — não há Técnico/staff no motor; dono real futuro:
 * entidade Técnico. Parcial hoje SÓ para o usuário: `GameState.reputacaoTecnico/
 * demissao/derrotasConsecutivas` (src/engine/carreira/carreiraEngine.ts).
 */
export interface CoachView {
  readonly reputacao: number;
  readonly demissao: MotivoDemissao | null;
  readonly derrotasConsecutivas: number;
}

/** EXISTE — dono real: `Clube.formacaoAtual/taticaAtual` (src/types/club.ts; operações em src/engine/tactics/**). */
export interface TacticalView {
  /** MESMA referência de `Clube.formacaoAtual`. */
  readonly formacao: Formacao | null;
  /** MESMA referência de `Clube.taticaAtual`. */
  readonly tatica: Tatica | null;
}

/** EXISTE (dentro de `Player`) — donos reais: `Player.condicaoFisica/lesionado/diasLesao` e `Player.fisico` (src/types/desenvolvimento.ts; src/engine/physical/fisicoEngine.ts). */
export interface PlayerPhysicalView {
  readonly condicaoFisica: number;
  readonly lesionado: boolean;
  readonly diasLesao: number;
  /** Carga aguda/crônica do épico Overall Dinâmico — MESMA referência. */
  readonly fisico?: EstadoFisicoJogador;
}

/**
 * PARCIAL — não há estrutura mental própria; dono real: primitivos
 * `Player.moral/forma/focoTreino` (src/engine/progression/moralEngine.ts).
 */
export interface PlayerMentalView {
  readonly moral: number;
  readonly forma: number;
  readonly focoTreino?: AtributoChave;
}

/** EXISTE — dono real: `Player.disponibilidade` por competição (src/types/disciplina.ts; src/engine/disciplina). `suspenso/jogosSuspensao` são espelho global. */
export interface PlayerDisciplineView {
  /** MESMA referência de `Player.disponibilidade` (fonte da verdade). */
  readonly disponibilidade?: DisponibilidadeJogador;
  readonly suspenso: boolean;
  readonly jogosSuspensao: number;
}

/** Facetas de UM jogador. `player` é a fonte única (MESMA referência do array real). */
export interface PlayerView {
  /** EXISTE — dono real: `Player` (src/types/player.ts); posse = `Player.clubeId` (RN-01). */
  readonly player: Player;
  readonly physical: PlayerPhysicalView;
  readonly mental: PlayerMentalView;
  /** EXISTE — technical: MESMA referência de `Player.atributos` (src/types/player.ts). */
  readonly technical: PlayerAttributes;
  readonly discipline: PlayerDisciplineView;
  /** EXISTE — statistics: MESMA referência de `Player.estatisticasTemporada`. */
  readonly statistics: PlayerSeasonStats;
}

/** EXISTE — dono real: `Clube` (src/types/club.ts), indexado por id como no WorldState (AD-05, worldTypes.ts). */
export interface TeamView {
  /** MESMA referência do clube no array mestre. */
  readonly clube: Clube;
  /** Presente só no clube do usuário (ver CoachView — AUSENTE como entidade). */
  readonly coach?: CoachView;
  readonly tactical: TacticalView;
  /** Jogadores QUE ATUAM no clube (posse `Player.clubeId`, RN-01); agentes livres ficam fora da árvore de times. */
  readonly players: readonly PlayerView[];
}

/**
 * AUSENTE no motor — não há entidade árbitro; cartões/faltas saem do motor sem
 * árbitro (src/engine/simulation/matchSimulator.ts). Dono real futuro:
 * entidade Árbitro (perfil de rigor por partida).
 */
export interface RefereeView {
  /** Contrato futuro (nunca preenchido hoje). */
  readonly nome?: string;
  readonly rigor?: number;
}

/**
 * PARCIAL — o VAR existe só como FLAGS estruturadas nos fatos da partida:
 * `EventoPartida.anuladoVAR/varFlagra` e `ResultadoChute 'gol_anulado'`
 * (src/types/match.ts). Sem estado residente próprio — consulte os eventos.
 */
export interface VarView {
  /** Contrato futuro (nunca preenchido hoje): checagem em andamento. */
  readonly checagemEmAndamento?: boolean;
}

/**
 * PARCIAL — público existe POR PARTIDA (`EstatisticasPartida.publico`; fórmula
 * `calcularPublicoJogo` em src/engine/finance/financeEngine.ts). Não há
 * entidade torcida/humor. Dono real futuro: entidade Torcida.
 */
export interface CrowdView {
  readonly publicoUltimaPartida?: number;
}

/**
 * PARCIAL — a IA é um conjunto de PROCESSOS puros, não estado residente:
 * mercado (src/engine/transfers/mercadoIA.ts), negociação
 * (src/engine/transfers/negociacaoEngine.ts), substituições ao vivo
 * (src/engine/simulation/substituicoesIA.ts). Estado: `Clube.controladoPorIA`.
 */
export interface AiView {
  /** Clubes controlados pela IA (mesmas referências; filtro raso). */
  readonly clubesControlados: readonly Clube[];
}

/** EXISTE (transiente) — dono real: `EstadoPartidaAoVivo` (src/engine/simulation/matchSimulator.ts). Presente SÓ durante uma partida ao vivo; nunca persistido. */
export interface SimulationView {
  readonly aoVivo?: EstadoPartidaAoVivo;
}

/**
 * AUSENTE como domínio de jogo — renderização é runtime da UI (src/screens/**,
 * Reanimated) e nunca entra no save. Dono real futuro: preferências de
 * apresentação de partida, se algum dia virarem estado de domínio.
 */
export interface RenderView {
  /** Contrato futuro (nunca preenchido hoje). */
  readonly reducaoMovimento?: boolean;
}

/**
 * PARCIAL — as PREFERÊNCIAS vivem em `ConfigJogo` (som/volumes/música —
 * src/store/useGameStore.ts); o runtime de reprodução vive na UI
 * (src/audio/sons.ts, src/audio/musica.ts) e fica fora do domínio.
 */
export interface AudioView {
  /** MESMA referência de `GameState.config` (só os campos de som/música pertencem ao áudio). */
  readonly preferencias: ConfigJogo;
}

// ---------------------------------------------------------------------------
// A árvore
// ---------------------------------------------------------------------------

/** Árvore de estados do dono — visão DERIVADA read-only; nunca persistida. */
export interface WorldStateView {
  readonly match: MatchView;
  /** AUSENTE — sempre undefined hoje (ver BallView). */
  readonly ball?: BallView;
  /** EXISTE — estádio do clube do usuário (`Clube.estadio`); por clube: `teams[id].clube.estadio`. */
  readonly stadium?: Estadio;
  /** AUSENTE — sempre undefined hoje (ver PitchView). */
  readonly pitch?: PitchView;
  /** PARCIAL — derivado do jogo ao vivo ou da última partida do usuário. */
  readonly weather?: WeatherView;
  readonly competition: CompetitionView;
  readonly season: SeasonView;
  readonly finance: FinanceView;
  readonly transfer: TransferView;
  /** Times por id de clube (conjunto MESTRE — todas as divisões carregadas). */
  readonly teams: Readonly<Record<string, TeamView>>;
  /** AUSENTE — sempre undefined hoje (ver RefereeView). */
  readonly referee?: RefereeView;
  /** PARCIAL — sempre undefined hoje; fatos do VAR ficam nos eventos (ver VarView). */
  readonly var?: VarView;
  readonly crowd: CrowdView;
  readonly ai: AiView;
  readonly simulation: SimulationView;
  /** AUSENTE — sempre undefined hoje (ver RenderView). */
  readonly render?: RenderView;
  readonly audio: AudioView;
}

/**
 * Shape mínimo do estado da store que a view consome — `Pick` do `GameState`
 * real para o contrato quebrar em typecheck se a store renomear um campo.
 */
export type WorldViewSource = Pick<
  GameState,
  | 'clubes'
  | 'jogadores'
  | 'todosClubes'
  | 'todosJogadores'
  | 'partidas'
  | 'ultimaPartidaUsuario'
  | 'tabela'
  | 'copa'
  | 'serieDCarreira'
  | 'historicoSerieD'
  | 'clubeUsuarioId'
  | 'temporadaAtual'
  | 'rodadaAtual'
  | 'dataAtual'
  | 'estadoFinanceiro'
  | 'rodadasNoVermelho'
  | 'patrocinio'
  | 'transferHistory'
  | 'propostasRecebidas'
  | 'reputacaoTecnico'
  | 'demissao'
  | 'derrotasConsecutivas'
  | 'config'
>;

/** Facetas de um jogador — sub-objetos por referência, primitivos como retrato. */
function montarPlayerView(jogador: Player): PlayerView {
  return {
    player: jogador,
    physical: {
      condicaoFisica: jogador.condicaoFisica,
      lesionado: jogador.lesionado,
      diasLesao: jogador.diasLesao,
      fisico: jogador.fisico,
    },
    mental: {
      moral: jogador.moral,
      forma: jogador.forma,
      focoTreino: jogador.focoTreino,
    },
    technical: jogador.atributos,
    discipline: {
      disponibilidade: jogador.disponibilidade,
      suspenso: jogador.suspenso,
      jogosSuspensao: jogador.jogosSuspensao,
    },
    statistics: jogador.estatisticasTemporada,
  };
}

/**
 * Monta a árvore do dono a partir do estado real. PURA: sem RNG, sem side
 * effects, sem cópias profundas — arrays e sub-objetos passam POR REFERÊNCIA.
 * `aoVivo` (opcional) liga os nós transientes de partida ao vivo.
 */
export function montarWorldView(
  game: WorldViewSource,
  aoVivo?: EstadoPartidaAoVivo,
): WorldStateView {
  // Conjunto MESTRE (AD-05); estados mínimos/antigos podem só ter a liga ativa.
  const clubes = game.todosClubes.length > 0 ? game.todosClubes : game.clubes;
  const jogadores =
    game.todosJogadores.length > 0 ? game.todosJogadores : game.jogadores;

  // Um passe único de agrupamento por posse (RN-01).
  const playersPorClube = new Map<string, PlayerView[]>();
  for (const jogador of jogadores) {
    if (jogador.clubeId === null) {
      continue; // agente livre: fora da árvore de times (mercado usa selectors).
    }
    const vista = montarPlayerView(jogador);
    const lista = playersPorClube.get(jogador.clubeId);
    if (lista) {
      lista.push(vista);
    } else {
      playersPorClube.set(jogador.clubeId, [vista]);
    }
  }

  const teams: Record<string, TeamView> = {};
  let clubeUsuario: Clube | undefined;
  for (const clube of clubes) {
    const ehUsuario = clube.id === game.clubeUsuarioId;
    if (ehUsuario) {
      clubeUsuario = clube;
    }
    teams[clube.id] = {
      clube,
      coach: ehUsuario
        ? {
            reputacao: game.reputacaoTecnico,
            demissao: game.demissao,
            derrotasConsecutivas: game.derrotasConsecutivas,
          }
        : undefined,
      tactical: {formacao: clube.formacaoAtual, tatica: clube.taticaAtual},
      players: playersPorClube.get(clube.id) ?? [],
    };
  }

  // Clima: do jogo ao vivo quando houver; senão, da última partida do usuário.
  const fonteClima = aoVivo
    ? aoVivo.estatisticas
    : game.ultimaPartidaUsuario?.estatisticas;

  return {
    match: {
      partidas: game.partidas,
      ultimaPartidaUsuario: game.ultimaPartidaUsuario,
    },
    stadium: clubeUsuario?.estadio,
    weather: fonteClima
      ? {clima: fonteClima.clima, temperatura: fonteClima.temperatura}
      : undefined,
    competition: {
      tabela: game.tabela,
      copa: game.copa,
      serieDCarreira: game.serieDCarreira,
      historicoSerieD: game.historicoSerieD,
    },
    season: {
      temporadaAtual: game.temporadaAtual,
      rodadaAtual: game.rodadaAtual,
      dataAtual: game.dataAtual,
    },
    finance: {
      financasClubeUsuario: clubeUsuario?.financas,
      estadoFinanceiro: game.estadoFinanceiro,
      rodadasNoVermelho: game.rodadasNoVermelho,
      patrocinio: game.patrocinio,
    },
    transfer: {
      historico: game.transferHistory,
      propostasRecebidas: game.propostasRecebidas,
    },
    teams,
    crowd: {
      publicoUltimaPartida: game.ultimaPartidaUsuario?.estatisticas?.publico,
    },
    ai: {clubesControlados: clubes.filter(clube => clube.controladoPorIA)},
    simulation: {aoVivo},
    audio: {preferencias: game.config},
    // ball/pitch/referee/var/render: AUSENTES no motor — ficam undefined até
    // o domínio existir de verdade (índice honesto; ver os tipos acima).
  };
}
