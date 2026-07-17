import {useMemo} from 'react';
import {create} from 'zustand';

import {verificarConquistas} from '../engine/conquistas/verificadorConquistas';
import {
  aplicarAcertoFinanceiroAnual,
  aplicarBilheteria,
  aplicarCotaTV,
  calcularPublicoJogo,
  cotaTV,
  PRECO_INGRESSO_FATOR_MAX,
  PRECO_INGRESSO_FATOR_MIN,
  registrarTransacao,
} from '../engine/finance/financeEngine';
import {
  aplicarMoral,
  calcularDeltasMoralPartida,
  converteComGrupo,
  type ResultadoPartida,
} from '../engine/progression/moralEngine';
import {
  faixaPotencial,
  gerarJovensTemporada,
  jovemParaPlayer,
  type JovemTalento,
} from '../engine/progression/academiaEngine';
import {evoluirJogador} from '../engine/progression/playerProgression';
import {
  calcularEfeitoTreino,
  aplicarEfeitoTreino,
} from '../engine/progression/treinoAtributos';
import {desenvolverFoco} from '../engine/progression/treinoIndividual';
import {
  buscarTreino,
  INTENSIDADES,
  type IntensidadeTreino,
} from '../engine/progression/treinoTipos';
import {
  recomendarPlano,
  sessaoDoCiclo,
  type ContextoAssistente,
  type RecomendacaoTreino,
} from '../engine/progression/planoTreinoEngine';
import {aplicarCondicaoPosPartida} from '../engine/progression/condicao';
import {
  atualizarDerrotasConsecutivas,
  atualizarReputacao,
  atualizarRodadasNoVermelho,
  calcularEstadoFinanceiro,
  MORAL_SALARIO_ATRASADO,
  REPUTACAO_INICIAL,
  reputacaoFimTemporada,
  salariosAtrasados,
  verificarDemissao,
} from '../engine/carreira/carreiraEngine';
import {
  definirObjetivoTemporada,
  deltaReputacaoMeta,
  metaCumprida,
} from '../engine/carreira/objetivo';
import type {Dificuldade} from '../engine/carreira/dificuldade';
import {calcularTabela} from '../engine/season/classification';
import {
  avancarCopa,
  confrontoDoClube,
  definirResultadoConfronto,
  faseAtualCopa,
  type ConfrontoCopa,
  type EstadoCopa,
} from '../engine/season/copaEngine';
import {
  disputarPenaltis,
  idsTitularesDisponiveis,
  simularPartida,
} from '../engine/simulation/matchSimulator';
import {
  calcularNotaPartida,
  contarAssistencias,
  mediaIncremental,
  type ResultadoJogador,
} from '../engine/simulation/matchRating';
import {
  criarRNGComSeed,
  hashString,
  inteiroEntre,
} from '../engine/simulation/rng';
import {calcularForcaTime, type ForcaTime} from '../engine/simulation/teamStrength';
import {mesmaTatica} from '../engine/tactics/estrategias';
import {validarFormacao} from '../engine/tactics/formationValidation';
import {removerJogadorDaFormacao} from '../engine/tactics/formacaoOps';
import {
  respostaIAProposta,
  type PropostaTransferencia,
} from '../engine/transfers/negociacaoEngine';
import {
  criarEmprestimo,
  custoEmprestimo,
  ehEmprestado,
  processarRetornosEmprestimo,
} from '../engine/transfers/emprestimoEngine';
import {gerarTransferenciasIA} from '../engine/transfers/mercadoIA';
import {processarDiasAte} from '../engine/calendar/pipelineDiario';
import {adicionarDias} from '../utils/datas';
import {useAchievementsStore} from './useAchievementsStore';
import {
  jogadoresDoClube,
  limiteDerrotasPorDivisao,
  mensagemDemissao,
  necessidadesPorPosicao,
  posicaoClube,
  ranquearDivisaoPorForca,
  resultadoDoUsuario,
  sortearDuracaoLesao,
  ultimaRodadaLiga,
} from './helpers';
import {
  calcularDatasFasesCopa,
  criarEstadoInicial,
  DIVISAO_PADRAO,
  ehDivisaoBrasileira,
  gerarCopaParaTemporada,
  gerarLiga,
  gerarLigaSerieDGrupo,
  N_ACESSO,
  PIRAMIDE_DIVISOES,
  piramidesDoMundo,
  PREMIACAO_COPA,
  TEMPORADA_INICIAL,
} from './setup';
import {
  avancarMataMataSerieDCarreira,
  classificadosSerieDCarreira,
  forcaSerieD,
  iniciarMataMataSerieDCarreira,
  type EstadoSerieDCarreira,
} from './serieDCarreira';
import {resolverSerieDNaVirada, type ResumoSerieD} from './serieDSeason';
import {
  criarEstadoPatrocinioVazio,
  type EstadoPatrocinio,
} from '../types/patrocinio';
import type {TransferRecord} from '../types/world';
import {
  aplicarNegocioGlobal,
  aplicarTransferenciasNaLiga,
  combinarMundoStore,
  espelharSaidaNoMestre,
} from './transferenciaMundo';
import {competicaoPorDivisaoLegada} from '../engine/competitions/registry/competitionRegistry';
import {
  aceitarPropostaPatrocinio,
  recusarPropostaPatrocinio,
} from '../engine/patrocinio/patrocinioEngine';
import {
  encerrarContratoTemporada,
  garantirPropostasIniciais,
  processarPatrocinioRodada,
  temContratoPatrocinioAtivo,
} from './patrocinioIntegracao';
import type {
  AtributoChave,
  ChutePartida,
  Clube,
  EstadoFinanceiro,
  EstatisticasPartida,
  EventoPartida,
  Formacao,
  MotivoDemissao,
  Partida,
  PendenciaCarreira,
  PlanoTreino,
  PlanoTreinoStatus,
  Player,
  SessaoPlanoTreino,
  TabelaClassificacao,
  Tatica,
} from '../types';

export interface MensagemJogo {
  id: string;
  texto: string;
}

export interface ResultadoTransacao {
  ok: boolean;
  mensagem: string;
}

export interface ResultadoProposta {
  status: 'aceita' | 'recusada' | 'contraproposta';
  contraValor?: number;
  mensagem: string;
}

/** Resultado de um confronto de copa jogado pelo usuário (ao vivo ou simulado). */
export interface ResultadoConfrontoUsuario {
  golsUsuario: number;
  golsAdversario: number;
  /** Id do clube vencedor nos pênaltis (quando o jogo terminou empatado). */
  vencedorPenaltis?: string;
}

/** Overall médio de um elenco (0-100). Alimenta a disputa de pênaltis simulada. */
function overallMedioElenco(jogadores: Player[]): number {
  if (jogadores.length === 0) {
    return 60;
  }
  return jogadores.reduce((soma, j) => soma + j.overall, 0) / jogadores.length;
}


/** Multiplicadores de mercado — fonte única usada pela ação e pela UI. */
export const MULTIPLICADOR_COMPRA = 1.22;
export const MULTIPLICADOR_VENDA = 1.05;

export function precoCompra(jogador: Player): number {
  return Math.round(jogador.valorMercado * MULTIPLICADOR_COMPRA);
}

export function precoVenda(jogador: Player): number {
  return Math.round(jogador.valorMercado * MULTIPLICADOR_VENDA);
}

// --- Melhorias de estádio ---
export type TipoMelhoriaEstadio = 'capacidade' | 'infraestrutura';
export const LUGARES_POR_AMPLIACAO = 5000;
export const CAPACIDADE_MAX_ESTADIO = 90000;
export const INFRA_MAX_ESTADIO = 5;

/** Custo de ampliar o estádio (+5.000 lugares) — sobe com o porte atual. */
export function custoAmpliacaoEstadio(capacidade: number): number {
  return Math.round(capacidade * 220);
}

/** Custo de subir um nível de infraestrutura (mais caro a cada nível). */
export function custoMelhoriaInfra(nivelAtual: number): number {
  return nivelAtual * 2_500_000;
}

export type VelocidadeNarracao = 'normal' | 'rapido';

export interface ConfigJogo {
  velocidadeNarracao: VelocidadeNarracao;
  confirmarAcoes: boolean;
  pausarNoIntervalo: boolean;
  som: boolean;
  /** Volume dos efeitos/narração (0-1). */
  volumeEfeitos: number;
  /** Música de fundo (lobby) ligada. */
  musicaHabilitada: boolean;
  /** Volume da música (0-1). */
  volumeMusica: number;
  /** Faixa de música selecionada (índice em FAIXAS_MUSICA). */
  musicaSelecionada: number;
  /** Nível de dificuldade (cobrança da diretoria). */
  dificuldade: Dificuldade;
}

/**
 * Escalação/tática do clube do usuário ANTES de uma partida ao vivo. As trocas e
 * ajustes feitos durante o jogo mexem na formação do clube (para a força ao vivo
 * refletir as decisões), mas isso é só para aquela partida — ao concluir (ou
 * abandonar), restauramos este retrato para não "vazar" subs na escalação oficial.
 */
interface FormacaoPreLive {
  clubeId: string;
  formacao: Formacao;
  tatica: Tatica;
}

export const CONFIG_PADRAO: ConfigJogo = {
  velocidadeNarracao: 'normal',
  confirmarAcoes: true,
  pausarNoIntervalo: true,
  som: true,
  volumeEfeitos: 1,
  musicaHabilitada: true,
  volumeMusica: 0.25,
  musicaSelecionada: 1,
  dificuldade: 'Normal',
};

export interface GameState {
  /** Clubes da LIGA ATIVA (uma divisão por vez — ver `todosClubes`). */
  clubes: Clube[];
  /** Jogadores da liga ativa (elencos de `clubes`). */
  jogadores: Player[];
  /** Todos os clubes do seed (todas as divisões) — base da seleção de clube. */
  todosClubes: Clube[];
  /** Todos os jogadores do seed (todas as divisões). */
  todosJogadores: Player[];
  partidas: Partida[];
  tabela: TabelaClassificacao[];
  clubeUsuarioId: string | null;
  temporadaAtual: string;
  rodadaAtual: number;
  ultimaPartidaUsuario: Partida | null;
  mensagens: MensagemJogo[];
  config: ConfigJogo;
  jovensDisponiveis: JovemTalento[];
  propostasRecebidas: PropostaTransferencia[];
  /** Retrato da escalação do usuário antes da partida ao vivo (transitório). */
  formacaoPreLive: FormacaoPreLive | null;
  /** Data atual do calendário (ISO YYYY-MM-DD). Avança até o próximo evento. */
  dataAtual: string;
  /** O usuário já treinou para o próximo jogo? Porta o "treino obrigatório". */
  treinouProximoJogo: boolean;
  /** O usuário já conversou com o grupo nesta semana? (libera 1x por ciclo). */
  conversouComGrupo: boolean;
  /** Copa do Brasil da temporada (mata-mata em paralelo à liga). */
  copa: EstadoCopa | null;
  /** Reputação do técnico (0-100), cresce com resultados (§12). */
  reputacaoTecnico: number;
  /** Derrotas seguidas do clube do usuário (zera em vitória/empate). */
  derrotasConsecutivas: number;
  /** Rodadas seguidas com saldo negativo (gatilho de crise/falência, §8.4). */
  rodadasNoVermelho: number;
  /** Estado financeiro derivado das rodadas no vermelho (§8.4). */
  estadoFinanceiro: EstadoFinanceiro;
  /** Motivo da demissão, se o técnico foi demitido (§12); null = empregado. */
  demissao: MotivoDemissao | null;
  /**
   * Histórico da Série D por temporada (mais recente primeiro): campeão, vice e
   * acessos. Alimentado na virada pela engine de competição (a Série D roda em
   * background); base do palmarés. Vazio em carreiras/saves anteriores.
   */
  historicoSerieD: ResumoSerieD[];
  /**
   * Mata-mata da Série D quando o USUÁRIO disputa a D. null fora de uma carreira
   * na D ou durante a fase de grupos (que roda como liga ativa de 6 clubes).
   */
  serieDCarreira: EstadoSerieDCarreira | null;
  /** Patrocínios do clube do usuário (propostas/contrato ativo/histórico). */
  patrocinio: EstadoPatrocinio;
  /** Histórico mundial de transferências (AD-09) — fonte de notícias/perfil. */
  transferHistory: TransferRecord[];
  /**
   * Plano de treino recorrente do clube do usuário (épico Overall Dinâmico).
   * null até a Onda 4 ligar o executor; o CONTRATO já persiste no save.
   */
  planoTreino: PlanoTreino | null;
  /** Situação da configuração de treino (nunca fingir escolha do usuário). */
  planoTreinoStatus: PlanoTreinoStatus;
  /** Central de Pendências do clube (o avanço consulta as bloqueantes). */
  pendencias: PendenciaCarreira[];
  /** (Re)gera as propostas de patrocínio do clube do usuário para a temporada. */
  gerarPropostasPatrocinioUsuario: () => void;
  /** Aceita uma proposta de patrocínio (cria contrato ativo). */
  aceitarPropostaPatrocinioUsuario: (propostaId: string) => void;
  /** Recusa uma proposta de patrocínio. */
  recusarPropostaPatrocinioUsuario: (propostaId: string) => void;
  iniciarNovaCarreira: (clubeId: string) => void;
  /** Assume um novo clube após demissão: mantém a reputação, recomeça a temporada. */
  assumirClube: (clubeId: string) => void;
  avancarRodada: () => void;
  /** Move a data atual para um dia (usado ao avançar para treino/jogo). */
  avancarParaData: (data: string) => void;
  concluirPartidaAoVivo: (
    partidaId: string,
    eventos: EventoPartida[],
    placarCasa: number,
    placarFora: number,
    /** Posse final acumulada pela engine durante a partida ao vivo (%). */
    posse?: {casa: number; fora: number},
    /** Estatísticas avançadas acumuladas pela engine durante a partida. */
    estatisticas?: EstatisticasPartida,
    /** Ledger causal de chutes da engine V2 (fonte do mapa factual). */
    chutes?: ChutePartida[],
  ) => void;
  atualizarTaticaUsuario: (tatica: Tatica) => void;
  /** Define a tática do adversário (IA) no jogo do usuário — preview honesto. */
  definirTaticaAdversario: (clubeId: string, tatica: Tatica) => void;
  atualizarFormacaoUsuario: (formacao: Formacao) => void;
  /** Conversa com o grupo: +5 de moral a todo o elenco (1x por semana). */
  conversarComGrupo: () => boolean;
  /**
   * Joga a fase atual da Copa: resolve o confronto do usuário (pelo resultado
   * informado ou simulando) e simula os demais, avança a chave e paga premiação.
   */
  avancarFaseCopa: (resultadoUsuario?: ResultadoConfrontoUsuario) => void;
  /** Fecha a fase de grupos da Série D (carreira na D) e monta o mata-mata do usuário. */
  iniciarMataMataDaCarreira: () => void;
  /** Avança uma fase do mata-mata da Série D (resultado do usuário ou simulado). */
  avancarMataMataDaCarreira: (vitoriaUsuario?: boolean) => void;
  /** Tira um retrato da escalação do usuário ao entrar numa partida ao vivo. */
  prepararPartidaAoVivo: () => void;
  /** Desfaz mudanças in-game se a partida foi abandonada sem concluir. */
  restaurarFormacaoPreLive: () => void;
  aplicarTreino: (treinoId: string, intensidade: IntensidadeTreino) => void;
  /** Define (ou limpa, com null) o atributo em foco no treino individual de um jogador. */
  definirFocoTreino: (jogadorId: string, foco: AtributoChave | null) => void;
  /** Recomendação do staff para o plano de treino (mockup) — não muta o estado. */
  recomendarPlanoTreino: () => RecomendacaoTreino | null;
  /** Ativa um plano de treino recorrente do usuário (resolve a pendência). */
  configurarPlanoTreino: (plano: PlanoTreino) => void;
  /** Aceita o plano recomendado pelo staff (resolve a pendência de treino). */
  aceitarPlanoRecomendado: () => void;
  /** Pausa/retoma o plano de treino ativo (cai no provisório enquanto pausado). */
  alternarPausaPlanoTreino: () => void;
  /** Define o capitão do time do usuário (id do jogador). */
  definirCapitao: (jogadorId: string) => void;
  renovarContrato: (jogadorId: string, anos: number, salario: number) => boolean;
  venderJogador: (jogadorId: string) => ResultadoTransacao;
  /** Empresta um jogador do usuário a outro clube até a próxima temporada (§9.3). */
  emprestarJogador: (jogadorId: string, clubeDestinoId: string) => void;
  /** Pega emprestado um jogador de outro clube (paga a taxa) até a próxima temporada. */
  pegarEmprestado: (jogadorId: string) => void;
  fazerPropostaCompra: (jogadorId: string, valor: number) => ResultadoProposta;
  responderPropostaVenda: (propostaId: string, aceitar: boolean) => void;
  processarPropostasIA: () => void;
  /** Transferências entre clubes da IA (mundo vivo, §9.4). */
  processarMercadoIA: () => void;
  finalizarTemporada: () => void;
  atualizarConfig: (parcial: Partial<ConfigJogo>) => void;
  promoverJovem: (jovemId: string) => void;
  liberarJovem: (jovemId: string) => void;
  /** Investe no estádio: amplia a capacidade ou sobe a infraestrutura. */
  melhorarEstadio: (tipo: TipoMelhoriaEstadio) => ResultadoTransacao;
  /** Ajusta o fator de preço do ingresso do clube do usuário (§8.2). */
  ajustarPrecoIngresso: (fator: number) => void;
  reiniciarCarreira: () => void;
}

function adicionarMensagem(
  mensagens: MensagemJogo[],
  texto: string,
): MensagemJogo[] {
  return [{id: `${Date.now()}_${mensagens.length}`, texto}, ...mensagens].slice(
    0,
    8,
  );
}

/** Teto da Central de Pendências (as mais novas primeiro; save enxuto). */
const MAX_PENDENCIAS = 12;

/** Acumula pendências novas sem duplicar (por id) e com teto. */
function acumularPendencias(
  atuais: PendenciaCarreira[],
  novas: PendenciaCarreira[],
): PendenciaCarreira[] {
  if (novas.length === 0) {
    return atuais;
  }
  const vistos = new Set(atuais.map(pendencia => pendencia.id));
  const ineditas = novas.filter(pendencia => !vistos.has(pendencia.id));
  if (ineditas.length === 0) {
    return atuais;
  }
  return [...ineditas, ...atuais].slice(0, MAX_PENDENCIAS);
}

/** Monta o contexto do assistente de treino a partir do estado (puro). */
function montarContextoAssistente(state: GameState): ContextoAssistente {
  const elenco = state.jogadores.filter(
    jogador => jogador.clubeId === state.clubeUsuarioId,
  );
  const desgastados = elenco.filter(
    jogador => jogador.lesionado || jogador.condicaoFisica < 65,
  ).length;
  const idadeMedia =
    elenco.length > 0
      ? elenco.reduce((soma, jogador) => soma + jogador.idade, 0) / elenco.length
      : 25;
  // Jogos do usuário nos próximos ~10 dias (congestionamento).
  const limite = adicionarDias(state.dataAtual, 10);
  const jogosProximos = state.partidas.filter(
    partida =>
      !partida.jogada &&
      partida.data > state.dataAtual &&
      partida.data <= limite &&
      (partida.timeCasa === state.clubeUsuarioId ||
        partida.timeFora === state.clubeUsuarioId),
  ).length;
  return {
    clubeId: state.clubeUsuarioId ?? '',
    criadoEm: state.dataAtual,
    fracaoDesgastada: elenco.length > 0 ? desgastados / elenco.length : 0,
    idadeMedia,
    jogosProximos,
    preTemporada: state.rodadaAtual <= 1,
  };
}

/** Pendência-padrão de carreira sem plano de treino configurado (mockup). */
function pendenciaPlanoTreino(data: string): PendenciaCarreira {
  return {
    id: 'pend_plano_treino',
    tipo: 'definir_plano_treino',
    prioridade: 'alta',
    titulo: 'Definir plano de treino',
    descricao: 'Seu elenco não possui plano de treino definido.',
    criadaEm: data,
    bloqueante: false,
  };
}

/** Propostas da IA que EXPIRAM na próxima rodada viram pendência (Central). */
function pendenciasDePropostas(
  propostas: PropostaTransferencia[],
  rodadaAtual: number,
  data: string,
): PendenciaCarreira[] {
  return propostas
    .filter(proposta => proposta.expiracaoRodada === rodadaAtual + 1)
    .map(proposta => ({
      id: `pend_proposta_${proposta.id}`,
      tipo: 'proposta_expirando' as const,
      prioridade: 'alta' as const,
      titulo: 'Responder proposta',
      descricao: 'Uma proposta por um jogador seu expira na próxima rodada.',
      entidadeId: proposta.jogadorId,
      criadaEm: data,
      bloqueante: false,
    }));
}

/**
 * Enxuga as estatísticas de partidas da IA para o save não inflar: mantém os
 * agregados por time (xG, finalizações, zonas...) e descarta os detalhes
 * pesados (mapas por jogador e momentum por minuto) — que a súmula degrada
 * para "—" sem quebrar. A partida do USUÁRIO mantém tudo.
 */
function enxugarEstatisticasIA(partida: Partida): Partida {
  if (!partida.estatisticas) {
    return partida;
  }
  const enxugarTime = (time: EstatisticasPartida['casa']) => ({
    ...time,
    finalizacoesPorJogador: {},
    passesPorJogador: {},
  });
  return {
    ...partida,
    estatisticas: {
      ...partida.estatisticas,
      casa: enxugarTime(partida.estatisticas.casa),
      fora: enxugarTime(partida.estatisticas.fora),
      momentumPorMinuto: [],
    },
    // Ledger RESUMIDO (causal_summary): guarda os chutes que contam a história
    // — gols, defesas, traves, anulados e grandes chances. Chutes de rotina
    // (fora/bloqueado sem perigo) saem do save; os AGREGADOS já os registram.
    // O resumo nunca altera placar/estatísticas — só o que fica armazenado.
    chutes: partida.chutes?.filter(
      chute =>
        chute.resultado !== 'fora' && chute.resultado !== 'bloqueado'
          ? true
          : chute.grandeChance,
    ),
    qualidadeDados: partida.chutes ? 'causal_summary' : partida.qualidadeDados,
  };
}

/** O clube do usuário venceu a partida dele nesta rodada? */
function usuarioVenceuNaRodada(
  partidas: Partida[],
  clubeUsuarioId: string | null,
  rodada: number,
): boolean {
  if (!clubeUsuarioId) {
    return false;
  }
  const jogo = partidas.find(
    p =>
      p.rodada === rodada &&
      p.jogada &&
      (p.timeCasa === clubeUsuarioId || p.timeFora === clubeUsuarioId),
  );
  if (!jogo || jogo.placarCasa === undefined || jogo.placarFora === undefined) {
    return false;
  }
  const ehCasa = jogo.timeCasa === clubeUsuarioId;
  const gols = ehCasa ? jogo.placarCasa : jogo.placarFora;
  const golsAdv = ehCasa ? jogo.placarFora : jogo.placarCasa;
  return gols > golsAdv;
}

/**
 * Processa o patrocínio de UMA rodada (bônus por vitória + progresso de metas),
 * creditando no clube do usuário. Devolve os clubes com o crédito aplicado e o
 * novo estado de patrocínio. Sem clube/contrato, é um no-op.
 */
function processarPatrocinioNaRodada(
  state: GameState,
  clubes: Clube[],
  tabela: TabelaClassificacao[],
  partidas: Partida[],
  partidaUsuario: Partida | null,
): {clubes: Clube[]; patrocinio: EstadoPatrocinio} {
  const clubeUsuario = clubes.find(c => c.id === state.clubeUsuarioId);
  if (!clubeUsuario) {
    return {clubes, patrocinio: state.patrocinio};
  }
  const venceu = usuarioVenceuNaRodada(
    partidas,
    state.clubeUsuarioId,
    state.rodadaAtual,
  );
  const data = partidaUsuario?.data ?? state.dataAtual ?? `${state.temporadaAtual}-01-01`;
  const res = processarPatrocinioRodada(
    state.patrocinio,
    {
      clube: clubeUsuario,
      tabela,
      partidas,
      temporada: Number(state.temporadaAtual),
    },
    venceu,
    data,
  );
  if (res.clube === clubeUsuario && res.patrocinio === state.patrocinio) {
    return {clubes, patrocinio: state.patrocinio};
  }
  return {
    clubes: clubes.map(c => (c.id === clubeUsuario.id ? res.clube : c)),
    patrocinio: res.patrocinio,
  };
}

/**
 * Estampa o público REAL (mesma conta da bilheteria) nas estatísticas das
 * partidas recém-jogadas da rodada. Feito no store porque depende da posição
 * do mandante na tabela — algo que a engine da partida não conhece.
 */
function estamparPublicoRodada(
  partidas: Partida[],
  jogosRodada: Partida[],
  clubes: Clube[],
  tabela: TabelaClassificacao[],
): Partida[] {
  return partidas.map(partida => {
    if (!partida.estatisticas || !jogosRodada.some(j => j.id === partida.id)) {
      return partida;
    }
    const mandante = clubes.find(clube => clube.id === partida.timeCasa);
    if (!mandante) {
      return partida;
    }
    return {
      ...partida,
      estatisticas: {
        ...partida.estatisticas,
        publico: calcularPublicoJogo(mandante, posicaoClube(tabela, mandante.id)),
      },
    };
  });
}

/** Treino leve de RECUPERAÇÃO usado pela IA e como sessão provisória segura. */
const INTENSIDADE_AUTO: IntensidadeTreino = 'leve';
/** Nível de infra assumido para clubes da IA no treino resumido. */
const INFRA_PADRAO_IA = 3;

/** Aplica UMA sessão de treino ao elenco de um clube (determinístico). */
function aplicarSessaoAoClube(
  jogadores: Player[],
  clubeId: string,
  nivelInfra: number,
  sessao: SessaoPlanoTreino,
  baseSeed: number,
): Player[] {
  const treino = buscarTreino(sessao.treinoId);
  if (!treino) {
    return jogadores;
  }
  return jogadores.map(jogador => {
    if (jogador.clubeId !== clubeId) {
      return jogador;
    }
    const rng = criarRNGComSeed(baseSeed + hashString(jogador.id));
    const efeito = calcularEfeitoTreino(
      jogador,
      treino,
      sessao.intensidade,
      {nivelInfra, jogosNaTemporada: jogador.estatisticasTemporada.jogos},
      rng,
    );
    return aplicarEfeitoTreino(jogador, efeito);
  });
}

/**
 * Treino automático do CICLO (Onda 4): entre as rodadas,
 *  - o clube do USUÁRIO treina a sessão do seu PLANO recorrente (ou a sessão
 *    provisória leve, se não configurou) — pulado quando treinou na mão;
 *  - os clubes da IA da LIGA ATIVA treinam leve (RF-15): recuperam condição e
 *    evoluem devagar, pelas MESMAS regras — fim da drenagem estrutural em que
 *    os titulares da IA caíam ao piso ao longo da temporada (auditoria H9).
 * Determinístico (seed por temporada/rodada/clube).
 */
function treinarCicloAutomatico(args: {
  jogadores: Player[];
  clubes: Clube[];
  clubeUsuarioId: string | null;
  plano: PlanoTreino | null;
  usuarioTreinouNaMao: boolean;
  temporada: string;
  rodada: number;
}): Player[] {
  let jogadores = args.jogadores;

  // Usuário: sessão do plano (ou provisória), salvo se já treinou na mão.
  if (args.clubeUsuarioId && !args.usuarioTreinouNaMao) {
    const clubeUsuario = args.clubes.find(c => c.id === args.clubeUsuarioId);
    const sessao = sessaoDoCiclo(args.plano, args.rodada);
    jogadores = aplicarSessaoAoClube(
      jogadores,
      args.clubeUsuarioId,
      clubeUsuario?.estadio.nivelInfraestrutura ?? INFRA_PADRAO_IA,
      sessao,
      hashString(`${args.temporada}_${args.rodada}_plano_${args.clubeUsuarioId}`),
    );
  }

  // IA da liga ativa: treino leve de recuperação (resumido, sem custo).
  for (const clube of args.clubes) {
    if (clube.id === args.clubeUsuarioId) {
      continue;
    }
    jogadores = aplicarSessaoAoClube(
      jogadores,
      clube.id,
      clube.estadio.nivelInfraestrutura,
      {treinoId: 'hab_fisico', intensidade: INTENSIDADE_AUTO},
      hashString(`${args.temporada}_${args.rodada}_ia_${clube.id}`),
    );
  }

  return jogadores;
}

/**
 * Aplica o resultado da partida aos jogadores dos dois times:
 * 1) decrementa suspensão/lesão pendentes (uma rodada se passou);
 * 2) aplica NOVAS punições dos eventos — vermelho = 1 jogo, 3 amarelos
 *    acumulados = 1 jogo (zera o acúmulo), lesão por gravidade;
 * 3) atualiza estatísticas/condição de quem entrou em campo.
 */
function aplicarResultadoNosJogadores(
  jogadores: Player[],
  partida: Partida,
  clubeCasa: Clube,
  clubeFora: Clube,
): Player[] {
  const jogadorIdsEmCampo = new Set(
    partida.eventos.map(evento => evento.jogadorId),
  );

  // RNG determinístico derivado do id da partida — a mesma partida sempre
  // produz a mesma duração de lesão (sem Math.random na pós-partida).
  const rngPartida = criarRNGComSeed(hashString(partida.id));

  // "Jogou na partida" = titular (mesmo que substituído depois) OU reserva que
  // entrou via substituição. Garante que zagueiro sem lance também é avaliado.
  const jogou = new Set<string>();
  // Titulares que de fato começaram a partida (90' de desgaste, salvo
  // substituição). Distinto de quem entrou do banco (desgaste parcial).
  const titularesNoApito = new Set<string>();
  // Estado PRÉ-rodada dos jogadores (suspensão/lesão ainda não decrementadas):
  // é o retrato de quem estava disponível no apito inicial.
  const porIdNoApito = new Map(jogadores.map(j => [j.id, j] as const));
  for (const clube of [clubeCasa, clubeFora]) {
    for (const titular of clube.formacaoAtual?.titulares ?? []) {
      const jogadorTitular = porIdNoApito.get(titular.jogadorId);
      // Só conta como "jogou" quem estava DISPONÍVEL no apito inicial. O motor
      // (teamStrength + escolherJogadorPonderado) ignora lesionados/suspensos,
      // então creditar-lhes jogo/nota/desgaste seria presença fantasma — comum
      // em clubes da IA, que nunca trocam a escalação default ao longo do ano.
      if (
        jogadorTitular &&
        !jogadorTitular.lesionado &&
        !jogadorTitular.suspenso
      ) {
        jogou.add(titular.jogadorId);
        titularesNoApito.add(titular.jogadorId);
      }
    }
  }
  for (const evento of partida.eventos) {
    if (evento.tipo === 'substituicao' && evento.jogadorEntraId) {
      jogou.add(evento.jogadorEntraId);
    }
  }

  // Moral (Módulo 4): deltas por jogador dos dois clubes conforme o resultado
  // e o que cada um fez (gol/lesão/expulsão). "Em campo" = quem apareceu em lances.
  const placarCasa = partida.placarCasa ?? 0;
  const placarFora = partida.placarFora ?? 0;
  const vencedor: ResultadoPartida =
    placarCasa > placarFora
      ? 'casa'
      : placarFora > placarCasa
        ? 'fora'
        : 'empate';
  const idsEmCampo = [...jogadorIdsEmCampo];
  const mapaMoral = new Map(
    [
      ...calcularDeltasMoralPartida(
        partida,
        partida.timeCasa,
        jogadores.filter(j => j.clubeId === partida.timeCasa),
        idsEmCampo,
        vencedor,
      ),
      ...calcularDeltasMoralPartida(
        partida,
        partida.timeFora,
        jogadores.filter(j => j.clubeId === partida.timeFora),
        idsEmCampo,
        vencedor,
      ),
    ].map(delta => [delta.jogadorId, delta.delta] as const),
  );

  return jogadores.map(jogador => {
    if (jogador.clubeId !== partida.timeCasa && jogador.clubeId !== partida.timeFora) {
      return jogador;
    }

    // 1) Decrementa punições pendentes desta rodada.
    let suspenso = jogador.suspenso;
    let jogosSuspensao = jogador.jogosSuspensao;
    if (suspenso && jogosSuspensao > 0) {
      jogosSuspensao -= 1;
      if (jogosSuspensao <= 0) {
        suspenso = false;
        jogosSuspensao = 0;
      }
    }
    // Lesão anda em DIAS REAIS pelo pipeline diário do calendário (Onda 3) —
    // aqui só entram punições/lesões NOVAS desta partida.
    let lesionado = jogador.lesionado;
    let diasLesao = jogador.diasLesao;

    // 2) Novas punições a partir dos eventos deste jogo.
    const eventosDoJogador = partida.eventos.filter(
      evento => evento.jogadorId === jogador.id,
    );
    const gols = eventosDoJogador.filter(e => e.tipo === 'gol').length;
    const amarelos = eventosDoJogador.filter(
      e => e.tipo === 'cartao_amarelo',
    ).length;
    const vermelhos = eventosDoJogador.filter(
      e => e.tipo === 'cartao_vermelho',
    ).length;
    const lesoes = eventosDoJogador.filter(e => e.tipo === 'lesao').length;

    if (vermelhos > 0) {
      suspenso = true;
      jogosSuspensao += vermelhos; // vermelho = 1 jogo cada
    }
    let amarelosParaSuspensao = jogador.amarelosParaSuspensao ?? 0;
    amarelosParaSuspensao += amarelos;
    while (amarelosParaSuspensao >= 3) {
      suspenso = true;
      jogosSuspensao += 1; // 3 amarelos = 1 jogo
      amarelosParaSuspensao -= 3;
    }
    if (lesoes > 0) {
      lesionado = true;
      diasLesao = Math.max(diasLesao, sortearDuracaoLesao(rngPartida));
    }

    // Preparo físico (BRASFOOT_MASTER §4/§11): titular joga 90' e cansa (-11),
    // reserva que entrou cansa leve (-2), quem ficou de fora recupera cheio
    // (+25). Com a folga + treino leve (+8/rodada), o titular que joga TUDO cai
    // ~3/rodada e precisa de rodízio; quem descansa volta. Regra em condicao.ts.
    const ehTitular = titularesNoApito.has(jogador.id);
    const participou =
      ehTitular || jogou.has(jogador.id) || jogadorIdsEmCampo.has(jogador.id);
    const condicaoFisica = aplicarCondicaoPosPartida(jogador.condicaoFisica, {
      ehTitular,
      participou,
    });

    const base: Player = {
      ...jogador,
      suspenso,
      jogosSuspensao,
      lesionado,
      diasLesao,
      amarelosParaSuspensao,
      condicaoFisica,
      moral: aplicarMoral(jogador.moral, mapaMoral.get(jogador.id) ?? 0),
    };

    if (!participou) {
      return base;
    }

    // 3) Estatísticas + nota da partida (Módulo de progressão).
    const ehCasa = jogador.clubeId === partida.timeCasa;
    const cleanSheet = ehCasa ? placarFora === 0 : placarCasa === 0;
    const resultadoJogador: ResultadoJogador =
      vencedor === 'empate'
        ? 'empate'
        : (vencedor === 'casa') === ehCasa
          ? 'vitoria'
          : 'derrota';
    const assistencias = contarAssistencias(partida.eventos, jogador.id);
    const nota = calcularNotaPartida(
      jogador,
      eventosDoJogador,
      resultadoJogador,
      cleanSheet,
    );
    const stats = jogador.estatisticasTemporada;

    return {
      ...base,
      estatisticasTemporada: {
        ...stats,
        jogos: stats.jogos + 1,
        gols: stats.gols + gols,
        assistencias: stats.assistencias + assistencias,
        cartoesAmarelos: stats.cartoesAmarelos + amarelos,
        cartoesVermelhos: stats.cartoesVermelhos + vermelhos,
        notaMedia: mediaIncremental(stats.notaMedia, stats.jogos, nota),
      },
    };
  });
}

function forcaClube(clube: Clube, jogadores: Player[]): ForcaTime | null {
  if (!clube.formacaoAtual || !clube.taticaAtual) {
    return null;
  }

  return calcularForcaTime(
    clube.formacaoAtual,
    jogadoresDoClube(jogadores, clube.id),
    clube.taticaAtual,
  );
}

/**
 * Verifica e desbloqueia conquistas (Módulo 15) com base no retrato atual.
 * Chamado após cada rodada; delega para o `useAchievementsStore`.
 */
function checarConquistas(args: {
  clubeUsuarioId: string | null;
  jogadores: Player[];
  partidas: Partida[];
  tabela: TabelaClassificacao[];
  clubes: Clube[];
  rodadaAtual: number;
}): void {
  if (!args.clubeUsuarioId) {
    return;
  }
  const ach = useAchievementsStore.getState();
  const desbloqueadas = new Set(
    ach.conquistas.filter(conquista => conquista.desbloqueada).map(c => c.id),
  );
  const saldoUsuario =
    args.clubes.find(clube => clube.id === args.clubeUsuarioId)?.financas
      .saldo ?? 0;
  const novas = verificarConquistas(
    {
      clubeUsuarioId: args.clubeUsuarioId,
      jogadores: args.jogadores,
      partidas: args.partidas,
      tabela: args.tabela,
      saldoUsuario,
      rodadaAtual: args.rodadaAtual,
    },
    desbloqueadas,
  );
  novas.forEach(id => ach.desbloquearConquista(id));
}

interface AtualizacaoCarreira {
  jogadores: Player[];
  reputacaoTecnico: number;
  derrotasConsecutivas: number;
  rodadasNoVermelho: number;
  estadoFinanceiro: EstadoFinanceiro;
  demissao: MotivoDemissao | null;
  mensagens: MensagemJogo[];
}

/**
 * Atualiza o eixo de carreira após uma rodada da liga (§12/§8.4): reputação,
 * sequência de derrotas, rodadas no vermelho/estado financeiro, salário atrasado
 * (→ moral do elenco) e gatilho de demissão. A lógica pura vive em
 * `carreiraEngine`; aqui só aplicamos aos jogadores/mensagens.
 */
function atualizarCarreiraPosRodada(
  estado: Pick<
    GameState,
    | 'clubeUsuarioId'
    | 'reputacaoTecnico'
    | 'derrotasConsecutivas'
    | 'rodadasNoVermelho'
    | 'demissao'
  >,
  clubes: Clube[],
  jogadores: Player[],
  partidaUsuario: Partida | null,
  mensagens: MensagemJogo[],
): AtualizacaoCarreira {
  const uid = estado.clubeUsuarioId;
  const clubeUsuario = uid ? clubes.find(clube => clube.id === uid) : undefined;
  if (!uid || !clubeUsuario) {
    return {
      jogadores,
      reputacaoTecnico: estado.reputacaoTecnico,
      derrotasConsecutivas: estado.derrotasConsecutivas,
      rodadasNoVermelho: estado.rodadasNoVermelho,
      estadoFinanceiro: calcularEstadoFinanceiro(estado.rodadasNoVermelho),
      demissao: estado.demissao,
      mensagens,
    };
  }

  const resultado = resultadoDoUsuario(partidaUsuario, uid);
  const rodadasNoVermelho = atualizarRodadasNoVermelho(
    estado.rodadasNoVermelho,
    clubeUsuario.financas.saldo,
  );
  const estadoFinanceiro = calcularEstadoFinanceiro(rodadasNoVermelho);
  const derrotasConsecutivas = resultado
    ? atualizarDerrotasConsecutivas(estado.derrotasConsecutivas, resultado)
    : estado.derrotasConsecutivas;
  const reputacaoTecnico = resultado
    ? atualizarReputacao(estado.reputacaoTecnico, resultado)
    : estado.reputacaoTecnico;

  let jogadoresFinais = jogadores;
  let msgs = mensagens;

  // Salário atrasado: derruba a moral de todo o elenco do usuário (§5/§8.4).
  if (salariosAtrasados(rodadasNoVermelho)) {
    jogadoresFinais = jogadores.map(jogador =>
      jogador.clubeId === uid
        ? {
            ...jogador,
            moral: aplicarMoral(jogador.moral, MORAL_SALARIO_ATRASADO),
          }
        : jogador,
    );
    msgs = adicionarMensagem(
      msgs,
      `Salários atrasados (${rodadasNoVermelho} rodadas no vermelho): a moral do elenco despencou.`,
    );
  }

  let demissao = estado.demissao;
  if (!demissao) {
    const motivo = verificarDemissao({
      derrotasConsecutivas,
      limiteDerrotas: limiteDerrotasPorDivisao(
        clubeUsuario.divisao ?? DIVISAO_PADRAO,
      ),
      rodadasNoVermelho,
    });
    if (motivo) {
      demissao = motivo;
      msgs = adicionarMensagem(msgs, mensagemDemissao(motivo));
    }
  }

  return {
    jogadores: jogadoresFinais,
    reputacaoTecnico,
    derrotasConsecutivas,
    rodadasNoVermelho,
    estadoFinanceiro,
    demissao,
    mensagens: msgs,
  };
}

const inicial = criarEstadoInicial();

export const useGameStore = create<GameState>((set, get) => ({
  clubes: inicial.clubes,
  jogadores: inicial.jogadores,
  todosClubes: inicial.todosClubes,
  todosJogadores: inicial.todosJogadores,
  partidas: inicial.partidas,
  tabela: inicial.tabela,
  clubeUsuarioId: null,
  temporadaAtual: TEMPORADA_INICIAL,
  rodadaAtual: 1,
  ultimaPartidaUsuario: null,
  mensagens: [],
  config: CONFIG_PADRAO,
  jovensDisponiveis: [],
  propostasRecebidas: [],
  formacaoPreLive: null,
  dataAtual: inicial.dataAtual,
  treinouProximoJogo: false,
  conversouComGrupo: false,
  copa: null,
  reputacaoTecnico: REPUTACAO_INICIAL,
  derrotasConsecutivas: 0,
  rodadasNoVermelho: 0,
  estadoFinanceiro: 'SAUDAVEL',
  demissao: null,
  historicoSerieD: [],
  serieDCarreira: null,
  patrocinio: criarEstadoPatrocinioVazio(),
  transferHistory: [],
  planoTreino: null,
  planoTreinoStatus: 'nao_configurado',
  pendencias: [],

  gerarPropostasPatrocinioUsuario: () => {
    const state = get();
    const clube = selecionarClubeUsuario(state);
    if (!clube) {
      return;
    }
    const patrocinio = garantirPropostasIniciais(state.patrocinio, {
      clube,
      tabela: state.tabela,
      partidas: state.partidas,
      temporada: Number(state.temporadaAtual),
    });
    set({patrocinio});
  },

  aceitarPropostaPatrocinioUsuario: propostaId => {
    set(state => ({
      patrocinio: aceitarPropostaPatrocinio(state.patrocinio, propostaId),
    }));
  },

  recusarPropostaPatrocinioUsuario: propostaId => {
    set(state => ({
      patrocinio: recusarPropostaPatrocinio(state.patrocinio, propostaId),
    }));
  },

  iniciarNovaCarreira: clubeId => {
    // SEMPRE parte do seed limpo (e da temporada inicial): uma "nova carreira"
    // não pode herdar elencos/finanças evoluídos nem a temporada de uma carreira
    // anterior ainda em memória (todosClubes/todosJogadores mudam ao virar a
    // temporada). Espelha reiniciarCarreira, mas já escolhendo o clube/divisão.
    const base = criarEstadoInicial();
    const escolhido = base.todosClubes.find(clube => clube.id === clubeId);
    const divisao = escolhido?.divisao ?? DIVISAO_PADRAO;
    // Série D: a liga ativa é o GRUPO de 6 do clube (não a divisão inteira de 96).
    const liga =
      divisao === 'Série D'
        ? gerarLigaSerieDGrupo(
            base.todosClubes,
            base.todosJogadores,
            clubeId,
            TEMPORADA_INICIAL,
          )
        : gerarLiga(
            base.todosClubes,
            base.todosJogadores,
            divisao,
            TEMPORADA_INICIAL,
          );
    set({
      todosClubes: base.todosClubes,
      todosJogadores: base.todosJogadores,
      clubeUsuarioId: clubeId,
      temporadaAtual: TEMPORADA_INICIAL,
      rodadaAtual: 1,
      ultimaPartidaUsuario: null,
      treinouProximoJogo: false,
      conversouComGrupo: false,
      reputacaoTecnico: REPUTACAO_INICIAL,
      derrotasConsecutivas: 0,
      rodadasNoVermelho: 0,
      estadoFinanceiro: 'SAUDAVEL',
      demissao: null,
      historicoSerieD: [],
      serieDCarreira: null,
      patrocinio: criarEstadoPatrocinioVazio(),
      transferHistory: [],
      // Carreira nova NUNCA finge treino escolhido: começa não configurado,
      // com a pendência correspondente já na Central (mockup Pendências).
      planoTreino: null,
      planoTreinoStatus: 'nao_configurado',
      pendencias: [pendenciaPlanoTreino(liga.dataAtual)],
      jogadores: liga.jogadores,
      partidas: liga.partidas,
      tabela: liga.tabela,
      dataAtual: liga.dataAtual,
      jovensDisponiveis: [],
      propostasRecebidas: [],
      formacaoPreLive: null,
      copa:
        // Sem Copa do Brasil na Série D (grupo curto) e fora do Brasil.
        divisao === 'Série D' || !ehDivisaoBrasileira(divisao)
          ? null
          : gerarCopaParaTemporada(
              base.todosClubes,
              base.todosJogadores,
              TEMPORADA_INICIAL,
              clubeId,
              calcularDatasFasesCopa(liga.partidas),
            ),
      clubes: liga.clubes.map(clube => ({
        ...clube,
        controladoPorIA: clube.id !== clubeId,
      })),
      mensagens: adicionarMensagem(
        [],
        `Carreira iniciada no ${escolhido?.nome ?? 'clube escolhido'} (${divisao}).`,
      ),
    });
    // Nova carreira = conquistas zeradas (são vinculadas à carreira).
    useAchievementsStore.getState().reiniciarConquistas();
    // Propostas de patrocínio da temporada inicial (já dá o que decidir no dia 1).
    get().gerarPropostasPatrocinioUsuario();
  },

  assumirClube: clubeId => {
    // Recontratação após demissão: a carreira CONTINUA. Usa o mundo evoluído
    // (todosClubes/todosJogadores) e a temporada atual, recomeçando a liga do
    // novo clube na rodada 1. Mantém reputação e conquistas; limpa a demissão.
    const state = get();
    const escolhido = state.todosClubes.find(clube => clube.id === clubeId);
    if (!escolhido) {
      return;
    }
    const divisao = escolhido.divisao ?? DIVISAO_PADRAO;
    const liga =
      divisao === 'Série D'
        ? gerarLigaSerieDGrupo(
            state.todosClubes,
            state.todosJogadores,
            clubeId,
            state.temporadaAtual,
          )
        : gerarLiga(
            state.todosClubes,
            state.todosJogadores,
            divisao,
            state.temporadaAtual,
          );
    set({
      clubeUsuarioId: clubeId,
      rodadaAtual: 1,
      serieDCarreira: null,
      // Novo clube = novo contrato de patrocínio (o anterior era do outro clube).
      patrocinio: criarEstadoPatrocinioVazio(),
      transferHistory: [],
      // O plano de treino era do clube anterior — recomeça não configurado.
      planoTreino: null,
      planoTreinoStatus: 'nao_configurado',
      pendencias: [pendenciaPlanoTreino(liga.dataAtual)],
      ultimaPartidaUsuario: null,
      treinouProximoJogo: false,
      conversouComGrupo: false,
      // reputacaoTecnico PERSISTE (carreira continua); zera o resto do eixo.
      derrotasConsecutivas: 0,
      rodadasNoVermelho: 0,
      estadoFinanceiro: 'SAUDAVEL',
      demissao: null,
      jogadores: liga.jogadores,
      partidas: liga.partidas,
      tabela: liga.tabela,
      dataAtual: liga.dataAtual,
      jovensDisponiveis: [],
      propostasRecebidas: [],
      formacaoPreLive: null,
      copa:
        divisao === 'Série D' || !ehDivisaoBrasileira(divisao)
          ? null
          : gerarCopaParaTemporada(
              state.todosClubes,
              state.todosJogadores,
              state.temporadaAtual,
              clubeId,
              calcularDatasFasesCopa(liga.partidas),
            ),
      clubes: liga.clubes.map(clube => ({
        ...clube,
        controladoPorIA: clube.id !== clubeId,
      })),
      mensagens: adicionarMensagem(
        state.mensagens,
        `Contratado pelo ${escolhido.nome} (${divisao}). Hora de provar seu valor.`,
      ),
    });
    get().gerarPropostasPatrocinioUsuario();
  },

  iniciarMataMataDaCarreira: () => {
    const state = get();
    if (!state.clubeUsuarioId) {
      return;
    }
    const {sementes, usuarioClassificado, grupoId} = classificadosSerieDCarreira(
      state.todosClubes,
      state.todosJogadores,
      state.temporadaAtual,
      state.clubeUsuarioId,
      state.partidas,
    );
    set({
      serieDCarreira: iniciarMataMataSerieDCarreira(
        sementes,
        state.clubeUsuarioId,
        state.temporadaAtual,
        grupoId,
      ),
      mensagens: adicionarMensagem(
        state.mensagens,
        usuarioClassificado
          ? 'Classificado! Começa o mata-mata da Série D.'
          : 'Eliminado na fase de grupos da Série D.',
      ),
    });
  },

  avancarMataMataDaCarreira: vitoriaUsuario => {
    const state = get();
    if (!state.serieDCarreira || !state.clubeUsuarioId) {
      return;
    }
    set({
      serieDCarreira: avancarMataMataSerieDCarreira(
        state.serieDCarreira,
        state.clubeUsuarioId,
        forcaSerieD(state.todosClubes, state.todosJogadores),
        vitoriaUsuario,
      ),
    });
  },

  avancarParaData: data => {
    // Relógio canônico (Onda 3): mover a data PROCESSA os dias no pipeline
    // (lesões andam por dia real; pendências nascem). Nunca anda para trás.
    const state = get();
    const periodo = processarDiasAte(
      state.jogadores,
      state.dataAtual,
      data,
      state.clubeUsuarioId,
    );
    if (periodo.diasProcessados === 0) {
      return;
    }
    set({
      jogadores: periodo.jogadores,
      dataAtual: periodo.dataFinal,
      pendencias: acumularPendencias(state.pendencias, periodo.novasPendencias),
    });
  },

  avancarRodada: () => {
    const state = get();
    const jogosRodada = state.partidas.filter(
      partida => partida.rodada === state.rodadaAtual && !partida.jogada,
    );

    if (jogosRodada.length === 0) {
      return;
    }

    // Relógio canônico (Onda 3): antes da bola rolar, os DIAS até a data da
    // rodada passam pelo pipeline diário (lesões em dias reais, pendências).
    // Também corrige o relógio nas rodadas de FOLGA do usuário (a data anda
    // mesmo sem jogo dele).
    const dataRodada = jogosRodada[0]?.data ?? state.dataAtual;
    const periodo = processarDiasAte(
      state.jogadores,
      state.dataAtual,
      dataRodada,
      state.clubeUsuarioId,
    );
    const pendenciasAposDias = acumularPendencias(
      state.pendencias,
      [
        ...periodo.novasPendencias,
        ...pendenciasDePropostas(state.propostasRecebidas, state.rodadaAtual, dataRodada),
      ],
    );

    let jogadoresAtualizados = periodo.jogadores;
    const partidasAtualizadas = state.partidas.map(partida => {
      const jogo = jogosRodada.find(item => item.id === partida.id);

      if (!jogo) {
        return partida;
      }

      const clubeCasa = state.clubes.find(clube => clube.id === jogo.timeCasa);
      const clubeFora = state.clubes.find(clube => clube.id === jogo.timeFora);

      if (!clubeCasa || !clubeFora) {
        return partida;
      }

      try {
        const simulada = simularPartida({
          timeCasa: clubeCasa,
          timeFora: clubeFora,
          jogadoresCasa: jogadoresDoClube(jogadoresAtualizados, clubeCasa.id),
          jogadoresFora: jogadoresDoClube(jogadoresAtualizados, clubeFora.id),
          seed: state.rodadaAtual * 1000 + jogosRodada.indexOf(jogo),
          competicaoId: jogo.competicaoId,
          rodada: jogo.rodada,
          data: jogo.data,
        });
        // Jogo da IA guarda só os agregados (save enxuto); o do usuário, tudo.
        const ehDoUsuario =
          jogo.timeCasa === state.clubeUsuarioId ||
          jogo.timeFora === state.clubeUsuarioId;
        const resultado = ehDoUsuario
          ? simulada
          : enxugarEstatisticasIA(simulada);

        jogadoresAtualizados = aplicarResultadoNosJogadores(
          jogadoresAtualizados,
          resultado,
          clubeCasa,
          clubeFora,
        );

        // Preserva o id do calendário: simularPartida gera um id próprio e o
        // spread o sobrescreveria, quebrando buscas por id (ex.: localizar a
        // partida do usuário recém-jogada para a narração e a "Última Partida").
        return {...partida, ...resultado, id: partida.id};
      } catch (erro) {
        // Defesa: um jogo que falha NÃO pode abortar a rodada inteira (perderia
        // o avanço e o save). Encerra seguro em 0x0 e segue os demais jogos.
        console.warn(`[avancarRodada] jogo ${partida.id} falhou (0x0):`, erro);
        return {
          ...partida,
          jogada: true,
          placarCasa: 0,
          placarFora: 0,
          eventos: [],
        };
      }
    });

    const tabela = calcularTabela(state.clubes, partidasAtualizadas);
    const partidasComPublico = estamparPublicoRodada(
      partidasAtualizadas,
      jogosRodada,
      state.clubes,
      tabela,
    );
    const ultimaPartidaUsuario =
      jogosRodada.find(
        partida =>
          partida.timeCasa === state.clubeUsuarioId ||
          partida.timeFora === state.clubeUsuarioId,
      ) ?? null;
    const partidaUsuarioCompleta = ultimaPartidaUsuario
      ? partidasComPublico.find(partida => partida.id === ultimaPartidaUsuario.id) ?? null
      : null;
    const clubesComBilheteria = state.clubes.map(clube => {
      const mandouJogo = jogosRodada.some(partida => partida.timeCasa === clube.id);

      if (!mandouJogo) {
        return clube;
      }

      return aplicarBilheteria(clube, posicaoClube(tabela, clube.id), `${state.temporadaAtual}-rodada-${state.rodadaAtual}`);
    });

    // Patrocínio da rodada: bônus por vitória do usuário + progresso das metas.
    // Aplicado ANTES da carreira para o saldo creditado refletir no eixo
    // financeiro (rodadasNoVermelho etc.).
    const {clubes: clubesComPatrocinio, patrocinio: patrocinioRodada} =
      processarPatrocinioNaRodada(
        state,
        clubesComBilheteria,
        tabela,
        partidasComPublico,
        partidaUsuarioCompleta,
      );

    const carreira = atualizarCarreiraPosRodada(
      state,
      clubesComPatrocinio,
      jogadoresAtualizados,
      partidaUsuarioCompleta,
      adicionarMensagem(state.mensagens, `Rodada ${state.rodadaAtual} simulada.`),
    );

    // Treino automático do ciclo (Onda 4): usuário treina a sessão do seu
    // PLANO (pulado se treinou na mão); a IA da liga treina leve.
    const jogadoresFinais = treinarCicloAutomatico({
      jogadores: carreira.jogadores,
      clubes: clubesComPatrocinio,
      clubeUsuarioId: state.clubeUsuarioId,
      plano: state.planoTreino,
      usuarioTreinouNaMao: state.treinouProximoJogo,
      temporada: state.temporadaAtual,
      rodada: state.rodadaAtual,
    });

    // Teto DINÂMICO: última rodada da liga ativa + 1 (38→39 no Brasileirão,
    // 46→47 na Championship). Um 39 fixo travava ligas com mais de 38 rodadas.
    const rodadaAposAvanco = Math.min(
      ultimaRodadaLiga(state.partidas) + 1,
      state.rodadaAtual + 1,
    );
    set({
      jogadores: jogadoresFinais,
      partidas: partidasComPublico,
      tabela,
      clubes: clubesComPatrocinio,
      patrocinio: patrocinioRodada,
      rodadaAtual: rodadaAposAvanco,
      ultimaPartidaUsuario: partidaUsuarioCompleta,
      // Relógio canônico: a data anda pelo pipeline até a data da RODADA
      // (inclusive nas rodadas de folga do usuário). O treino do ciclo já foi
      // aplicado automaticamente acima, então o próximo evento é o jogo.
      dataAtual: periodo.dataFinal,
      pendencias: pendenciasAposDias,
      treinouProximoJogo: false,
      conversouComGrupo: false,
      reputacaoTecnico: carreira.reputacaoTecnico,
      derrotasConsecutivas: carreira.derrotasConsecutivas,
      rodadasNoVermelho: carreira.rodadasNoVermelho,
      estadoFinanceiro: carreira.estadoFinanceiro,
      demissao: carreira.demissao,
      mensagens: carreira.mensagens,
    });

    checarConquistas({
      clubeUsuarioId: state.clubeUsuarioId,
      jogadores: jogadoresFinais,
      partidas: partidasComPublico,
      tabela,
      clubes: clubesComPatrocinio,
      rodadaAtual: rodadaAposAvanco,
    });
    get().processarPropostasIA();
    get().processarMercadoIA();
  },

  // Fecha a partida do usuário jogada AO VIVO (decidida durante a narração) e
  // simula os demais jogos da rodada (IA), atualizando tabela/finanças/rodada.
  concluirPartidaAoVivo: (
    partidaId,
    eventos,
    placarCasa,
    placarFora,
    posse,
    estatisticas,
    chutes,
  ) => {
    const state = get();
    const jogosRodada = state.partidas.filter(
      partida => partida.rodada === state.rodadaAtual && !partida.jogada,
    );
    if (jogosRodada.length === 0) {
      return;
    }

    // Escalações NO APITO INICIAL: durante o jogo ao vivo a formação do
    // usuário no store é a de FIM de jogo (trocas aplicadas). Desgaste,
    // minutagem e o snapshot da súmula devem partir de quem COMEÇOU —
    // restaura o retrato pré-live para todos esses cálculos.
    const preLive = state.formacaoPreLive;
    const clubesNoApito = preLive
      ? state.clubes.map(clube =>
          clube.id === preLive.clubeId
            ? {...clube, formacaoAtual: preLive.formacao, taticaAtual: preLive.tatica}
            : clube,
        )
      : state.clubes;

    // Relógio canônico (Onda 3): dias até a data da rodada passam pelo
    // pipeline. Normalmente é no-op aqui (o pré-jogo já avançou a data via
    // avancarParaData), mas garante o invariante em qualquer caminho.
    const dataRodada = jogosRodada[0]?.data ?? state.dataAtual;
    const periodo = processarDiasAte(
      state.jogadores,
      state.dataAtual,
      dataRodada,
      state.clubeUsuarioId,
    );
    const pendenciasAposDias = acumularPendencias(state.pendencias, [
      ...periodo.novasPendencias,
      ...pendenciasDePropostas(state.propostasRecebidas, state.rodadaAtual, dataRodada),
    ]);

    let jogadoresAtualizados = periodo.jogadores;
    const partidasAtualizadas = state.partidas.map(partida => {
      const jogo = jogosRodada.find(item => item.id === partida.id);
      if (!jogo) {
        return partida;
      }
      const clubeCasa = clubesNoApito.find(clube => clube.id === jogo.timeCasa);
      const clubeFora = clubesNoApito.find(clube => clube.id === jogo.timeFora);
      if (!clubeCasa || !clubeFora) {
        return partida;
      }

      const resultado: Partida =
        partida.id === partidaId
          ? {
              ...partida,
              placarCasa,
              placarFora,
              eventos: [...eventos].sort((a, b) => a.minuto - b.minuto),
              jogada: true,
              modoJogado: 'interativo',
              posseCasa: posse?.casa,
              posseFora: posse?.fora,
              estatisticas,
              chutes,
              engineVersion: chutes ? (2 as const) : partida.engineVersion,
              qualidadeDados: chutes ? ('causal_full' as const) : partida.qualidadeDados,
              titularesCasa: idsTitularesDisponiveis(
                clubeCasa,
                jogadoresDoClube(jogadoresAtualizados, clubeCasa.id),
              ),
              titularesFora: idsTitularesDisponiveis(
                clubeFora,
                jogadoresDoClube(jogadoresAtualizados, clubeFora.id),
              ),
            }
          : enxugarEstatisticasIA(
              simularPartida({
                timeCasa: clubeCasa,
                timeFora: clubeFora,
                jogadoresCasa: jogadoresDoClube(jogadoresAtualizados, clubeCasa.id),
                jogadoresFora: jogadoresDoClube(jogadoresAtualizados, clubeFora.id),
                seed: state.rodadaAtual * 1000 + jogosRodada.indexOf(jogo),
                competicaoId: jogo.competicaoId,
                rodada: jogo.rodada,
                data: jogo.data,
              }),
            );

      jogadoresAtualizados = aplicarResultadoNosJogadores(
        jogadoresAtualizados,
        resultado,
        clubeCasa,
        clubeFora,
      );
      return {...partida, ...resultado, id: partida.id};
    });

    const tabela = calcularTabela(state.clubes, partidasAtualizadas);
    const partidasComPublico = estamparPublicoRodada(
      partidasAtualizadas,
      jogosRodada,
      state.clubes,
      tabela,
    );
    const partidaUsuario =
      partidasComPublico.find(partida => partida.id === partidaId) ?? null;
    // clubesNoApito já carrega a escalação/tática OFICIAL do usuário (as
    // trocas do jogo ao vivo valeram só para ele) — daqui em diante ela é a
    // formação persistida.
    const clubesFinais = clubesNoApito.map(clube => {
      const mandouJogo = jogosRodada.some(partida => partida.timeCasa === clube.id);
      if (!mandouJogo) {
        return clube;
      }
      return aplicarBilheteria(
        clube,
        posicaoClube(tabela, clube.id),
        `${state.temporadaAtual}-rodada-${state.rodadaAtual}`,
      );
    });

    // Patrocínio da rodada (jogo do usuário ao vivo): bônus por vitória + metas.
    const {clubes: clubesComPatrocinio, patrocinio: patrocinioRodada} =
      processarPatrocinioNaRodada(
        state,
        clubesFinais,
        tabela,
        partidasComPublico,
        partidaUsuario,
      );

    const carreira = atualizarCarreiraPosRodada(
      state,
      clubesComPatrocinio,
      jogadoresAtualizados,
      partidaUsuario,
      adicionarMensagem(state.mensagens, `Rodada ${state.rodadaAtual} disputada.`),
    );

    // Treino automático do ciclo (Onda 4): usuário treina a sessão do seu
    // PLANO (pulado se treinou na mão); a IA da liga treina leve.
    const jogadoresFinais = treinarCicloAutomatico({
      jogadores: carreira.jogadores,
      clubes: clubesComPatrocinio,
      clubeUsuarioId: state.clubeUsuarioId,
      plano: state.planoTreino,
      usuarioTreinouNaMao: state.treinouProximoJogo,
      temporada: state.temporadaAtual,
      rodada: state.rodadaAtual,
    });

    // Mesmo teto dinâmico do avancarRodada (liga pode ter mais de 38 rodadas).
    const rodadaAposLive = Math.min(
      ultimaRodadaLiga(state.partidas) + 1,
      state.rodadaAtual + 1,
    );
    set({
      jogadores: jogadoresFinais,
      partidas: partidasComPublico,
      tabela,
      clubes: clubesComPatrocinio,
      patrocinio: patrocinioRodada,
      formacaoPreLive: null,
      rodadaAtual: rodadaAposLive,
      ultimaPartidaUsuario: partidaUsuario,
      dataAtual: periodo.dataFinal,
      pendencias: pendenciasAposDias,
      treinouProximoJogo: false,
      conversouComGrupo: false,
      reputacaoTecnico: carreira.reputacaoTecnico,
      derrotasConsecutivas: carreira.derrotasConsecutivas,
      rodadasNoVermelho: carreira.rodadasNoVermelho,
      estadoFinanceiro: carreira.estadoFinanceiro,
      demissao: carreira.demissao,
      mensagens: carreira.mensagens,
    });

    checarConquistas({
      clubeUsuarioId: state.clubeUsuarioId,
      jogadores: jogadoresFinais,
      partidas: partidasComPublico,
      tabela,
      clubes: clubesComPatrocinio,
      rodadaAtual: rodadaAposLive,
    });
    get().processarPropostasIA();
    get().processarMercadoIA();
  },

  atualizarTaticaUsuario: tatica => {
    const {clubeUsuarioId} = get();

    if (!clubeUsuarioId) {
      return;
    }

    set(state => ({
      clubes: state.clubes.map(clube =>
        clube.id === clubeUsuarioId ? {...clube, taticaAtual: tatica} : clube,
      ),
      mensagens: adicionarMensagem(state.mensagens, 'Tática atualizada.'),
    }));
  },

  definirTaticaAdversario: (clubeId, tatica) => {
    const alvo = get().clubes.find(clube => clube.id === clubeId);
    // Só grava se realmente mudou (evita re-render/save à toa e loop no efeito).
    if (!alvo || (alvo.taticaAtual && mesmaTatica(alvo.taticaAtual, tatica))) {
      return;
    }
    set(state => ({
      clubes: state.clubes.map(clube =>
        clube.id === clubeId ? {...clube, taticaAtual: tatica} : clube,
      ),
    }));
  },

  atualizarFormacaoUsuario: formacao => {
    const {clubeUsuarioId, jogadores} = get();

    if (!clubeUsuarioId) {
      return;
    }

    // Portão central (regra vive na engine, não na UI): só ERROS ESTRUTURAIS e de
    // propriedade bloqueiam (11 titulares, 1 goleiro, mínimos por setor, sem
    // repetido, jogador do próprio clube). São sempre satisfazíveis por qualquer
    // elenco com 11+ jogadores, então o bloqueio nunca prende o usuário. Jogador
    // lesionado/suspenso NÃO bloqueia — é AVISO (validarFormacao.warnings): o motor
    // já ignora indisponíveis na simulação e um elenco curto pode não ter 11 aptos.
    const validacao = validarFormacao({
      formacao,
      jogadores,
      clubeId: clubeUsuarioId,
    });
    if (!validacao.valid) {
      set(state => ({
        mensagens: adicionarMensagem(
          state.mensagens,
          `Escalação inválida: ${validacao.errors[0]}`,
        ),
      }));
      return;
    }

    set(state => ({
      clubes: state.clubes.map(clube =>
        clube.id === clubeUsuarioId ? {...clube, formacaoAtual: formacao} : clube,
      ),
      mensagens: adicionarMensagem(state.mensagens, 'Escalação atualizada.'),
    }));
  },

  prepararPartidaAoVivo: () => {
    const state = get();
    const clube = state.clubes.find(c => c.id === state.clubeUsuarioId);
    if (!clube?.formacaoAtual || !clube.taticaAtual) {
      return;
    }
    set({
      formacaoPreLive: {
        clubeId: clube.id,
        formacao: clube.formacaoAtual,
        tatica: clube.taticaAtual,
      },
    });
  },

  restaurarFormacaoPreLive: () => {
    const state = get();
    const snap = state.formacaoPreLive;
    if (!snap) {
      return; // já restaurado (ex.: partida concluída) — idempotente.
    }
    set({
      clubes: state.clubes.map(clube =>
        clube.id === snap.clubeId
          ? {...clube, formacaoAtual: snap.formacao, taticaAtual: snap.tatica}
          : clube,
      ),
      formacaoPreLive: null,
    });
  },

  aplicarTreino: (treinoId, intensidade) => {
    const state0 = get();
    const {clubeUsuarioId} = state0;
    if (!clubeUsuarioId) {
      return;
    }
    // Uma sessão manual por ciclo (Onda 4): sem isto, treinar de novo variando
    // foco/intensidade gerava seeds diferentes e acumulava ganhos (exploit).
    if (state0.treinouProximoJogo) {
      set(stateAtual => ({
        mensagens: adicionarMensagem(
          stateAtual.mensagens,
          'O elenco já treinou neste ciclo. Avance para o próximo jogo.',
        ),
      }));
      return;
    }
    set(state => {
      const clube = state.clubes.find(item => item.id === clubeUsuarioId);
      const treino = buscarTreino(treinoId);
      if (!clube || !treino) {
        return {};
      }

      // Seed determinístico por temporada/rodada/treino: o mesmo treino na mesma
      // semana produz sempre o mesmo resultado (lesões inclusive).
      const baseSeed = hashString(
        `${state.temporadaAtual}_${state.rodadaAtual}_${treinoId}_${intensidade}`,
      );
      const contextoBase = {nivelInfra: clube.estadio.nivelInfraestrutura};

      let subiramOverall = 0;
      let lesoes = 0;
      const jogadores = state.jogadores.map(jogador => {
        if (jogador.clubeId !== clubeUsuarioId) {
          return jogador;
        }
        const rng = criarRNGComSeed(baseSeed + hashString(jogador.id));
        const efeito = calcularEfeitoTreino(
          jogador,
          treino,
          intensidade,
          {
            ...contextoBase,
            // "Minutos jogados": usamos os jogos da temporada como proxy de ritmo.
            jogosNaTemporada: jogador.estatisticasTemporada.jogos,
          },
          rng,
        );
        if (efeito.novoOverall > jogador.overall) {
          subiramOverall += 1;
        }
        if (efeito.lesionou) {
          lesoes += 1;
        }
        const treinado = aplicarEfeitoTreino(jogador, efeito);
        // Treino individual: quem tem foco tende a desenvolver o atributo focado.
        return desenvolverFoco(
          treinado,
          criarRNGComSeed(baseSeed + hashString(`${jogador.id}_foco`)),
        );
      });

      const custoTreino = INTENSIDADES[intensidade].custo;

      const partes = [
        `Treino de ${treino.nome} (${INTENSIDADES[intensidade].rotulo}) realizado.`,
      ];
      if (subiramOverall > 0) {
        partes.push(`${subiramOverall} jogador(es) evoluíram.`);
      }
      if (lesoes > 0) {
        partes.push(`${lesoes} lesão(ões) no treino.`);
      }
      partes.push(`Custo: R$ ${custoTreino.toLocaleString('pt-BR')}.`);

      return {
        jogadores,
        // Custo da sessão debitado do clube (BRASFOOT_MASTER §10).
        clubes: state.clubes.map(clubeItem =>
          clubeItem.id === clubeUsuarioId
            ? registrarTransacao(clubeItem, {
                data: state.dataAtual,
                tipo: 'despesa',
                categoria: 'treino',
                valor: custoTreino,
                descricao: `Treino de ${treino.nome} (${INTENSIDADES[intensidade].rotulo})`,
              })
            : clubeItem,
        ),
        // Treino concluído libera o jogo (porta o "treino obrigatório").
        treinouProximoJogo: true,
        mensagens: adicionarMensagem(state.mensagens, partes.join(' ')),
      };
    });
  },

  definirFocoTreino: (jogadorId, foco) => {
    set(state => ({
      jogadores: state.jogadores.map(jogador =>
        jogador.id === jogadorId
          ? {...jogador, focoTreino: foco ?? undefined}
          : jogador,
      ),
    }));
  },

  recomendarPlanoTreino: () => {
    const state = get();
    if (!state.clubeUsuarioId) {
      return null;
    }
    return recomendarPlano(montarContextoAssistente(state));
  },

  configurarPlanoTreino: plano => {
    const {clubeUsuarioId} = get();
    if (!clubeUsuarioId) {
      return;
    }
    set(state => ({
      planoTreino: {...plano, clubeId: clubeUsuarioId, status: 'ativo'},
      planoTreinoStatus: 'configurado_usuario',
      // Configurar resolve a pendência da Central (mockup).
      pendencias: state.pendencias.filter(
        p => p.tipo !== 'definir_plano_treino',
      ),
      mensagens: adicionarMensagem(
        state.mensagens,
        `Plano de treino "${plano.nome}" ativado.`,
      ),
    }));
  },

  aceitarPlanoRecomendado: () => {
    const state = get();
    if (!state.clubeUsuarioId) {
      return;
    }
    const recomendacao = recomendarPlano(montarContextoAssistente(state));
    set(stateAtual => ({
      planoTreino: recomendacao.plano,
      // Aceitar a sugestão É uma escolha do usuário.
      planoTreinoStatus: 'configurado_usuario',
      pendencias: stateAtual.pendencias.filter(
        p => p.tipo !== 'definir_plano_treino',
      ),
      mensagens: adicionarMensagem(
        stateAtual.mensagens,
        `Plano recomendado pelo staff ativado: "${recomendacao.plano.nome}".`,
      ),
    }));
  },

  alternarPausaPlanoTreino: () => {
    set(state =>
      state.planoTreino
        ? {
            planoTreino: {
              ...state.planoTreino,
              status: state.planoTreino.status === 'ativo' ? 'pausado' : 'ativo',
            },
          }
        : {},
    );
  },

  definirCapitao: jogadorId => {
    const {clubeUsuarioId} = get();
    if (!clubeUsuarioId) {
      return;
    }
    set(state => ({
      clubes: state.clubes.map(clube =>
        clube.id === clubeUsuarioId
          ? {...clube, capitaoId: jogadorId}
          : clube,
      ),
    }));
  },

  conversarComGrupo: () => {
    const state = get();
    const {clubeUsuarioId} = state;
    if (!clubeUsuarioId || state.conversouComGrupo) {
      return false; // sem carreira ou já usado nesta semana.
    }
    const elenco = jogadoresDoClube(state.jogadores, clubeUsuarioId);
    const deltaPorJogador = new Map(
      converteComGrupo(elenco).map(delta => [delta.jogadorId, delta.delta]),
    );
    set({
      jogadores: state.jogadores.map(jogador =>
        deltaPorJogador.has(jogador.id)
          ? {
              ...jogador,
              moral: aplicarMoral(jogador.moral, deltaPorJogador.get(jogador.id) ?? 0),
            }
          : jogador,
      ),
      conversouComGrupo: true,
      mensagens: adicionarMensagem(
        state.mensagens,
        'Você conversou com o grupo. A moral do elenco subiu.',
      ),
    });
    return true;
  },

  avancarFaseCopa: resultadoUsuario => {
    const state = get();
    const copa = state.copa;
    if (!copa || copa.campeao) {
      return;
    }
    const userId = state.clubeUsuarioId;
    const fase = faseAtualCopa(copa);

    // Lookup de clube/jogadores: prefere o estado ATIVO (escalação/fadiga atuais)
    // e cai para o conjunto-mestre (clubes de outras divisões).
    const clubeAtivo = new Map(state.clubes.map(c => [c.id, c]));
    const clubeMaster = new Map(state.todosClubes.map(c => [c.id, c]));
    const clubeDe = (id: string): Clube | undefined =>
      clubeAtivo.get(id) ?? clubeMaster.get(id);
    const jogadoresDe = (id: string): Player[] => {
      const ativos = jogadoresDoClube(state.jogadores, id);
      return ativos.length > 0
        ? ativos
        : jogadoresDoClube(state.todosJogadores, id);
    };

    const confrontosResolvidos = fase.confrontos.map(confronto => {
      if (confronto.vencedor) {
        return confronto;
      }
      const ehDoUsuario =
        !!userId && (confronto.timeA === userId || confronto.timeB === userId);
      if (ehDoUsuario && resultadoUsuario) {
        const usuarioEhA = confronto.timeA === userId;
        const golsA = usuarioEhA
          ? resultadoUsuario.golsUsuario
          : resultadoUsuario.golsAdversario;
        const golsB = usuarioEhA
          ? resultadoUsuario.golsAdversario
          : resultadoUsuario.golsUsuario;
        // Empate → pênaltis resolvidos pela ENGINE (modo manager), como nos
        // confrontos de CPU. Determinístico: seed a partir do id do confronto.
        let vencedorPenaltis = resultadoUsuario.vencedorPenaltis;
        if (golsA === golsB && !vencedorPenaltis) {
          vencedorPenaltis = disputarPenaltis(
            criarRNGComSeed(hashString(`${confronto.id}_pen`)),
            overallMedioElenco(jogadoresDe(confronto.timeA)),
            overallMedioElenco(jogadoresDe(confronto.timeB)),
            confronto.timeA,
            confronto.timeB,
          );
        }
        return definirResultadoConfronto(confronto, golsA, golsB, vencedorPenaltis);
      }
      const clubeA = clubeDe(confronto.timeA);
      const clubeB = clubeDe(confronto.timeB);
      if (!clubeA || !clubeB) {
        return confronto;
      }
      const partida = simularPartida({
        timeCasa: clubeA,
        timeFora: clubeB,
        jogadoresCasa: jogadoresDe(confronto.timeA),
        jogadoresFora: jogadoresDe(confronto.timeB),
        seed: hashString(confronto.id),
        competicaoId: 'copa_brasil',
        desempate: true,
      });
      return definirResultadoConfronto(
        confronto,
        partida.placarCasa ?? 0,
        partida.placarFora ?? 0,
        partida.vencedorPenaltis,
      );
    });

    const copaResolvida: EstadoCopa = {
      ...copa,
      fases: copa.fases.map((f, i) =>
        i === copa.faseAtual ? {...f, confrontos: confrontosResolvidos} : f,
      ),
    };
    const copaAvancada = avancarCopa(copaResolvida);

    // Premiação + mensagem conforme o destino do clube do usuário nesta fase.
    let clubes = state.clubes;
    let mensagens = state.mensagens;
    const meu = userId
      ? confrontosResolvidos.find(
          c => c.timeA === userId || c.timeB === userId,
        )
      : undefined;
    if (userId && meu) {
      if (meu.vencedor === userId) {
        const premio = PREMIACAO_COPA[fase.nome] ?? 0;
        if (premio > 0) {
          clubes = clubes.map(clube =>
            clube.id === userId
              ? registrarTransacao(clube, {
                  data: `${copa.temporada}-copa`,
                  tipo: 'receita',
                  categoria: 'premiacao',
                  valor: premio,
                  descricao: `Premiação Copa do Brasil — ${fase.nome}`,
                })
              : clube,
          );
        }
        mensagens = adicionarMensagem(
          mensagens,
          copaAvancada.campeao === userId
            ? 'CAMPEÃO DA COPA DO BRASIL! 🏆'
            : `Classificado na Copa (${fase.nome}).`,
        );
      } else {
        mensagens = adicionarMensagem(
          mensagens,
          `Eliminado da Copa do Brasil na ${fase.nome}.`,
        );
      }
    }

    // DESGASTE DA COPA (Onda 3): titulares dos confrontos resolvidos AGORA
    // que pertencem à liga ATIVA cansam e contam o jogo — antes, a copa não
    // tocava os jogadores (auditoria). Lesões/cartões de copa entram com a
    // partida completa na integração da Onda 6.
    const titularesCopa = new Set<string>();
    fase.confrontos.forEach((original, indice) => {
      const resolvido = confrontosResolvidos[indice];
      if (original.vencedor || !resolvido?.vencedor) {
        return; // já estava resolvido antes (não desgasta duas vezes).
      }
      for (const clubeId of [resolvido.timeA, resolvido.timeB]) {
        const clube = clubeAtivo.get(clubeId);
        if (!clube) {
          continue; // clube de outra divisão: sem estado vivo na liga ativa.
        }
        for (const id of idsTitularesDisponiveis(
          clube,
          jogadoresDoClube(state.jogadores, clubeId),
        )) {
          titularesCopa.add(id);
        }
      }
    });
    const jogadores =
      titularesCopa.size === 0
        ? state.jogadores
        : state.jogadores.map(jogador =>
            titularesCopa.has(jogador.id)
              ? {
                  ...jogador,
                  condicaoFisica: aplicarCondicaoPosPartida(
                    jogador.condicaoFisica,
                    {ehTitular: true, participou: true},
                  ),
                  estatisticasTemporada: {
                    ...jogador.estatisticasTemporada,
                    jogos: jogador.estatisticasTemporada.jogos + 1,
                  },
                }
              : jogador,
          );

    set({copa: copaAvancada, clubes, mensagens, jogadores});
  },

  renovarContrato: (jogadorId, anos, salario) => {
    const state = get();
    const jogador = state.jogadores.find(item => item.id === jogadorId);
    if (!jogador || jogador.clubeId !== state.clubeUsuarioId) {
      return false;
    }
    // Aceita se o salário proposto cobre ao menos 90% do atual, ou se a moral é alta.
    const aceita = salario >= jogador.salario * 0.9 || jogador.moral > 70;
    if (!aceita) {
      set(stateAtual => ({
        mensagens: adicionarMensagem(
          stateAtual.mensagens,
          `${jogador.nome} recusou a proposta de renovação.`,
        ),
      }));
      return false;
    }
    const novoContratoAte = String(Number(state.temporadaAtual) + anos);
    set(stateAtual => ({
      jogadores: stateAtual.jogadores.map(item =>
        item.id === jogadorId
          ? {...item, salario, contratoAte: novoContratoAte, moral: aplicarMoral(item.moral, 4)}
          : item,
      ),
      mensagens: adicionarMensagem(
        stateAtual.mensagens,
        `${jogador.nome} renovou até ${novoContratoAte}.`,
      ),
    }));
    return true;
  },

  venderJogador: jogadorId => {
    const state = get();
    const clubeUsuarioId = state.clubeUsuarioId;

    if (!clubeUsuarioId) {
      return {ok: false, mensagem: 'Nenhuma carreira ativa.'};
    }

    const jogador = state.jogadores.find(item => item.id === jogadorId);

    if (
      !jogador ||
      jogador.clubeId !== clubeUsuarioId ||
      ehEmprestado(jogador)
    ) {
      return {ok: false, mensagem: 'Jogador indisponível.'};
    }

    const valor = precoVenda(jogador);

    const jogadores = state.jogadores.map(item =>
      item.id === jogadorId ? {...item, clubeId: null} : item,
    );
    const clubes = state.clubes.map(clube => {
      if (clube.id !== clubeUsuarioId) {
        return clube;
      }
      const elencoRestante = clube.elenco.filter(id => id !== jogadorId);
      return registrarTransacao(
        {
          ...clube,
          elenco: elencoRestante,
          // Tira o vendido da escalação (senão vira id fantasma → XI vazio).
          formacaoAtual: clube.formacaoAtual
            ? removerJogadorDaFormacao(
                clube.formacaoAtual,
                jogadorId,
                elencoRestante,
              )
            : clube.formacaoAtual,
        },
        {
          data: `${state.temporadaAtual}-mercado`,
          tipo: 'receita',
          categoria: 'vendaJogadores',
          valor,
          descricao: `Venda de ${jogador.nome}`,
        },
      );
    });
    // Espelha no mundo MESTRE (senão o vendido "ressuscita" se a liga for
    // reconstruída do mestre — ex.: assumirClube após demissão).
    const mestre = espelharSaidaNoMestre({
      todosClubes: state.todosClubes,
      todosJogadores: state.todosJogadores,
      clubesLiga: clubes,
      jogadoresLiga: jogadores,
      clubeIds: [clubeUsuarioId],
      jogadorIds: [jogadorId],
    });

    set({
      jogadores,
      clubes,
      todosClubes: mestre.todosClubes,
      todosJogadores: mestre.todosJogadores,
      mensagens: adicionarMensagem(
        state.mensagens,
        `${jogador.nome} vendido por R$ ${valor.toLocaleString('pt-BR')}.`,
      ),
    });

    return {
      ok: true,
      mensagem: `${jogador.nome} vendido por R$ ${valor.toLocaleString('pt-BR')}.`,
    };
  },

  emprestarJogador: (jogadorId, clubeDestinoId) => {
    const state = get();
    const {clubeUsuarioId, temporadaAtual} = state;
    if (!clubeUsuarioId) {
      return;
    }
    const jogador = state.jogadores.find(item => item.id === jogadorId);
    const destino = state.clubes.find(clube => clube.id === clubeDestinoId);
    if (
      !jogador ||
      jogador.clubeId !== clubeUsuarioId ||
      ehEmprestado(jogador) ||
      !destino ||
      clubeDestinoId === clubeUsuarioId
    ) {
      return;
    }
    const retorna = String(Number(temporadaAtual) + 1);
    const jogadores = state.jogadores.map(item =>
      item.id === jogadorId
        ? criarEmprestimo(item, clubeDestinoId, retorna)
        : item,
    );
    const clubes = state.clubes.map(clube => {
      if (clube.id === clubeUsuarioId) {
        const elencoRestante = clube.elenco.filter(id => id !== jogadorId);
        return {
          ...clube,
          elenco: elencoRestante,
          // Tira o emprestado da escalação (senão vira id fantasma → XI vazio).
          formacaoAtual: clube.formacaoAtual
            ? removerJogadorDaFormacao(
                clube.formacaoAtual,
                jogadorId,
                elencoRestante,
              )
            : clube.formacaoAtual,
        };
      }
      if (clube.id === clubeDestinoId) {
        return {...clube, elenco: [...clube.elenco, jogadorId]};
      }
      return clube;
    });
    const mestre = espelharSaidaNoMestre({
      todosClubes: state.todosClubes,
      todosJogadores: state.todosJogadores,
      clubesLiga: clubes,
      jogadoresLiga: jogadores,
      clubeIds: [clubeUsuarioId, clubeDestinoId],
      jogadorIds: [jogadorId],
    });
    set({
      jogadores,
      clubes,
      todosClubes: mestre.todosClubes,
      todosJogadores: mestre.todosJogadores,
      mensagens: adicionarMensagem(
        state.mensagens,
        `${jogador.nome} emprestado ao ${destino.nome} até ${retorna}.`,
      ),
    });
  },

  pegarEmprestado: jogadorId => {
    const state = get();
    const {clubeUsuarioId, temporadaAtual} = state;
    if (!clubeUsuarioId) {
      return;
    }
    // Mercado UNIVERSAL: o alvo pode estar em QUALQUER liga (mundo combinado).
    const {clubes: clubesMundo, jogadores: jogadoresMundo} =
      combinarMundoStore(state);
    const jogador = jogadoresMundo.find(item => item.id === jogadorId);
    if (
      !jogador ||
      !jogador.clubeId ||
      jogador.clubeId === clubeUsuarioId ||
      ehEmprestado(jogador)
    ) {
      return;
    }
    const custo = custoEmprestimo(jogador);
    const usuario = clubesMundo.find(clube => clube.id === clubeUsuarioId);
    if (!usuario || usuario.financas.saldo < custo) {
      return;
    }
    const retorna = String(Number(temporadaAtual) + 1);
    const resultado = aplicarNegocioGlobal({
      mundo: state,
      transferHistory: state.transferHistory,
      activeCompetitionId:
        competicaoPorDivisaoLegada(state.clubes[0]?.divisao)?.id ?? null,
      userClubId: clubeUsuarioId,
      entrada: {
        playerId: jogadorId,
        fromClubId: jogador.clubeId,
        toClubId: clubeUsuarioId,
        type: 'loan',
        fee: custo,
        source: 'user',
      },
      date: `${temporadaAtual}-06-01`,
    });
    if (!resultado.ok) {
      return;
    }
    set({
      clubes: resultado.clubes,
      jogadores: resultado.jogadores,
      todosClubes: resultado.todosClubes,
      todosJogadores: resultado.todosJogadores,
      transferHistory: resultado.transferHistory,
      mensagens: adicionarMensagem(
        state.mensagens,
        `${jogador.nome} contratado por empréstimo até ${retorna} (taxa R$ ${custo.toLocaleString('pt-BR')}).`,
      ),
    });
  },

  // Proposta do usuário para comprar um jogador da IA: resposta imediata
  // (aceita/recusa/contraproposta) via negociacaoEngine, com RNG semeado.
  fazerPropostaCompra: (jogadorId, valor) => {
    const state = get();
    const usuarioId = state.clubeUsuarioId;
    if (!usuarioId) {
      return {status: 'recusada', mensagem: 'Nenhuma carreira ativa.'};
    }
    // Mercado UNIVERSAL: o alvo e o clube vendedor podem estar em QUALQUER liga
    // carregada (não só a divisão jogada) — olha o mundo combinado.
    const {clubes: clubesMundo, jogadores: jogadoresMundo} =
      combinarMundoStore(state);
    const jogador = jogadoresMundo.find(j => j.id === jogadorId);
    const vendedor = clubesMundo.find(c => c.id === jogador?.clubeId);
    const usuario = clubesMundo.find(c => c.id === usuarioId);
    if (!jogador || !vendedor || !usuario || jogador.clubeId === usuarioId) {
      return {status: 'recusada', mensagem: 'Jogador indisponível.'};
    }
    if (usuario.financas.saldo < valor) {
      return {status: 'recusada', mensagem: 'Saldo insuficiente.'};
    }
    const hash = [...jogadorId].reduce((s, c) => s + c.charCodeAt(0), 0);
    const rng = criarRNGComSeed(state.rodadaAtual * 1000 + hash + (valor % 1000));
    const proposta: PropostaTransferencia = {
      id: `compra_${jogadorId}`,
      jogadorId,
      clubeOfertante: 'usuario',
      valorProposto: valor,
      status: 'pendente',
      expiracaoRodada: state.rodadaAtual + 3,
    };
    const resposta = respostaIAProposta(proposta, jogador, vendedor, rng);

    if (resposta === 'recusada') {
      return {status: 'recusada', mensagem: `${vendedor.nome} recusou a proposta.`};
    }
    if (resposta === 'aceita') {
      const resultado = aplicarNegocioGlobal({
        mundo: state,
        transferHistory: state.transferHistory,
        activeCompetitionId:
          competicaoPorDivisaoLegada(state.clubes[0]?.divisao)?.id ?? null,
        userClubId: usuarioId,
        entrada: {
          playerId: jogadorId,
          fromClubId: vendedor.id,
          toClubId: usuarioId,
          type: 'permanent',
          fee: valor,
          source: 'user',
        },
        date: `${state.temporadaAtual}-06-01`,
      });
      if (!resultado.ok) {
        return {status: 'recusada', mensagem: 'Transferência inválida.'};
      }
      set(stateAtual => ({
        clubes: resultado.clubes,
        jogadores: resultado.jogadores,
        todosClubes: resultado.todosClubes,
        todosJogadores: resultado.todosJogadores,
        transferHistory: resultado.transferHistory,
        mensagens: adicionarMensagem(
          stateAtual.mensagens,
          `${jogador.nome} contratado por R$ ${valor.toLocaleString('pt-BR')}.`,
        ),
      }));
      return {status: 'aceita', mensagem: `${jogador.nome} contratado!`};
    }

    return {
      status: 'contraproposta',
      contraValor: resposta.contraPropostaValor,
      mensagem: `${vendedor.nome} pede R$ ${(resposta.contraPropostaValor ?? valor).toLocaleString('pt-BR')}.`,
    };
  },

  responderPropostaVenda: (propostaId, aceitar) => {
    const state = get();
    const proposta = state.propostasRecebidas.find(p => p.id === propostaId);
    if (!proposta) {
      return;
    }
    const jogador = state.jogadores.find(j => j.id === proposta.jogadorId);
    const comprador = state.clubes.find(c => c.id === proposta.clubeOfertante);
    if (!aceitar || !jogador || !comprador) {
      set(stateAtual => ({
        propostasRecebidas: stateAtual.propostasRecebidas.filter(
          p => p.id !== propostaId,
        ),
        mensagens: adicionarMensagem(stateAtual.mensagens, 'Proposta recusada.'),
      }));
      return;
    }
    const jogadores = state.jogadores.map(item =>
      item.id === proposta.jogadorId
        ? {...item, clubeId: comprador.id}
        : item,
    );
    const clubes = state.clubes.map(clube => {
      if (clube.id === state.clubeUsuarioId) {
        return registrarTransacao(
          {...clube, elenco: clube.elenco.filter(id => id !== proposta.jogadorId)},
          {
            data: `${state.temporadaAtual}-mercado`,
            tipo: 'receita',
            categoria: 'vendaJogadores',
            valor: proposta.valorProposto,
            descricao: `Venda de ${jogador.nome}`,
          },
        );
      }
      if (clube.id === comprador.id) {
        // Conservação de dinheiro: o clube comprador da IA paga o que o
        // usuário recebe (mesma simetria de comprarJogador/fazerPropostaCompra).
        return registrarTransacao(
          {...clube, elenco: [...clube.elenco, proposta.jogadorId]},
          {
            data: `${state.temporadaAtual}-mercado`,
            tipo: 'despesa',
            categoria: 'contratacoes',
            valor: proposta.valorProposto,
            descricao: `Compra de ${jogador.nome}`,
          },
        );
      }
      return clube;
    });
    const mestre = espelharSaidaNoMestre({
      todosClubes: state.todosClubes,
      todosJogadores: state.todosJogadores,
      clubesLiga: clubes,
      jogadoresLiga: jogadores,
      clubeIds: [state.clubeUsuarioId, comprador.id].filter(
        (id): id is string => id !== null,
      ),
      jogadorIds: [proposta.jogadorId],
    });
    set(stateAtual => ({
      jogadores,
      clubes,
      todosClubes: mestre.todosClubes,
      todosJogadores: mestre.todosJogadores,
      propostasRecebidas: stateAtual.propostasRecebidas.filter(
        p => p.id !== propostaId,
      ),
      mensagens: adicionarMensagem(
        stateAtual.mensagens,
        `${jogador.nome} vendido para ${comprador.nome} por R$ ${proposta.valorProposto.toLocaleString('pt-BR')}.`,
      ),
    }));
  },

  // Gera as propostas da IA pelos jogadores do usuário (inbox da rodada).
  // Determinístico por rodada (RNG semeado): a QUANTIDADE varia de 0 a 3 (com
  // viés para poucas) e os alvos são os mais cobiçados (overall + variação).
  // As ofertas têm prazo (`expiracaoRodada`): as ainda válidas permanecem no
  // inbox entre rodadas — o usuário tem algumas rodadas para responder — em vez
  // de o inbox ser zerado e regenerado do zero a cada rodada.
  processarPropostasIA: () => {
    const state = get();
    const usuarioId = state.clubeUsuarioId;
    if (!usuarioId) {
      return;
    }
    // Mantém ofertas ainda VÁLIDAS: dentro do prazo e cujo alvo segue no elenco
    // do usuário (se ele vendeu/transferiu o jogador, a oferta deixa de valer).
    const pendentesValidas = state.propostasRecebidas.filter(
      proposta =>
        proposta.expiracaoRodada >= state.rodadaAtual &&
        state.jogadores.find(j => j.id === proposta.jogadorId)?.clubeId ===
          usuarioId,
    );
    const jaTemProposta = new Set(pendentesValidas.map(p => p.jogadorId));

    const iaClubes = state.clubes.filter(c => c.id !== usuarioId);
    // Só jogadores cobiçados (overall alto), do usuário, sem oferta aberta e que
    // NÃO estejam emprestados (esses pertencem a outro clube) entram.
    const candidatos = state.jogadores.filter(
      j =>
        j.clubeId === usuarioId &&
        j.overall >= 70 &&
        !jaTemProposta.has(j.id) &&
        !ehEmprestado(j),
    );
    if (candidatos.length === 0 || iaClubes.length === 0) {
      set({propostasRecebidas: pendentesValidas});
      return;
    }

    const rng = criarRNGComSeed(state.rodadaAtual * 7919 + 13);
    const sorteio = rng();
    const quantidade =
      sorteio < 0.35 ? 0 : sorteio < 0.7 ? 1 : sorteio < 0.9 ? 2 : 3;
    if (quantidade === 0) {
      set({propostasRecebidas: pendentesValidas});
      return;
    }

    const alvos = candidatos
      .map(jogador => ({jogador, peso: jogador.overall + rng() * 20}))
      .sort((a, b) => b.peso - a.peso)
      .slice(0, quantidade);

    const novas: PropostaTransferencia[] = alvos.map(({jogador}) => {
      const comprador = iaClubes[inteiroEntre(rng, 0, iaClubes.length - 1)];
      const fator = 0.8 + rng() * 0.55; // 0.80x a 1.35x do valor de mercado
      return {
        id: `ia_${state.rodadaAtual}_${jogador.id}`,
        jogadorId: jogador.id,
        clubeOfertante: comprador.id,
        valorProposto: Math.round(jogador.valorMercado * fator),
        status: 'pendente',
        expiracaoRodada: state.rodadaAtual + 2,
      };
    });
    // Inbox = ofertas ainda válidas + novas desta rodada (teto defensivo).
    set({propostasRecebidas: [...pendentesValidas, ...novas].slice(0, 6)});
  },

  processarMercadoIA: () => {
    const state = get();
    const {clubeUsuarioId} = state;
    if (!clubeUsuarioId) {
      return;
    }
    // Roda a cada 4 rodadas para não inundar as notícias.
    if (state.rodadaAtual % 4 !== 0) {
      return;
    }
    const iaClubes = state.clubes.filter(clube => clube.id !== clubeUsuarioId);
    const seed =
      Number(state.temporadaAtual) * 10000 + state.rodadaAtual * 100 + 7;
    const transferencias = gerarTransferenciasIA({
      clubes: iaClubes,
      jogadores: state.jogadores,
      seed,
      maxTransferencias: 2,
    });
    if (transferencias.length === 0) {
      return;
    }

    const nomeJogador = (id: string): string =>
      state.jogadores.find(jogador => jogador.id === id)?.nome ?? 'Jogador';
    const nomeClubeDe = (id: string): string =>
      state.clubes.find(clube => clube.id === id)?.nome ?? id;

    // Operação ATÔMICA única (applyTransfer): finanças + elencos + REPARO de
    // formação do vendedor (corrige o id fantasma do PI-09) + histórico.
    const activeCompetitionId =
      competicaoPorDivisaoLegada(state.clubes[0]?.divisao)?.id ?? null;
    const resultado = aplicarTransferenciasNaLiga({
      clubes: state.clubes,
      jogadores: state.jogadores,
      transferHistory: state.transferHistory,
      entradas: transferencias.map(t => ({
        playerId: t.jogadorId,
        fromClubId: t.deClubeId,
        toClubId: t.paraClubeId,
        type: 'permanent' as const,
        fee: t.valor,
        source: 'ai' as const,
        reasonCodes: ['ia_mercado'],
      })),
      date: state.dataAtual ?? `${state.temporadaAtual}-06-01`,
      activeCompetitionId,
      userClubId: state.clubeUsuarioId,
      ignorarJanela: true,
    });

    let mensagens = state.mensagens;
    for (const t of transferencias) {
      mensagens = adicionarMensagem(
        mensagens,
        `Mercado: ${nomeClubeDe(t.paraClubeId)} contratou ${nomeJogador(
          t.jogadorId,
        )} (${nomeClubeDe(t.deClubeId)}).`,
      );
    }

    set({
      jogadores: resultado.jogadores,
      clubes: resultado.clubes,
      transferHistory: resultado.transferHistory,
      mensagens,
    });
  },

  finalizarTemporada: () => {
    const state = get();

    // Numa carreira na Série D a temporada termina pelo MATA-MATA (não pela
    // última rodada da liga): exige a chave do usuário resolvida (campeão/
    // eliminado). Nas demais, o total de rodadas é o da liga ATIVA (38 no
    // Brasileirão, 34 na Premier, 42 na Championship…).
    const carreiraSerieD = state.serieDCarreira;
    const totalRodadasLiga = state.partidas.reduce(
      (maior, partida) => Math.max(maior, partida.rodada),
      0,
    );
    if (carreiraSerieD) {
      if (
        carreiraSerieD.fase !== 'campeao' &&
        carreiraSerieD.fase !== 'eliminado'
      ) {
        return;
      }
    } else if (state.rodadaAtual <= totalRodadasLiga) {
      return;
    }

    const proximaTemporada = String(Number(state.temporadaAtual) + 1);
    const divisaoAtiva = state.clubes[0]?.divisao ?? DIVISAO_PADRAO;

    // Conjunto-mestre (todas as divisões): sobrepõe a divisão ATIVA (com as
    // mudanças desta temporada — transferências, finanças, base) sobre o resto do
    // seed, que não muda enquanto o usuário disputa só uma divisão.
    const clubesAtivos = new Map(state.clubes.map(clube => [clube.id, clube]));
    const jogadoresAtivos = new Map(
      state.jogadores.map(jogador => [jogador.id, jogador]),
    );
    const clubesMaster = state.todosClubes.map(
      clube => clubesAtivos.get(clube.id) ?? clube,
    );
    const idsSeed = new Set(state.todosJogadores.map(jogador => jogador.id));
    const jogadoresMaster = [
      ...state.todosJogadores.map(
        jogador => jogadoresAtivos.get(jogador.id) ?? jogador,
      ),
      // Jogadores criados na temporada (jovens promovidos) ainda não no seed.
      ...state.jogadores.filter(jogador => !idsSeed.has(jogador.id)),
    ];

    // Evolui TODOS os jogadores (cada um pelo seu clube), +1 ano, zera
    // cartões/lesões da pré-temporada. Agentes livres só envelhecem/arquivam.
    const clubePorId = new Map(clubesMaster.map(clube => [clube.id, clube]));
    const evoluidos = jogadoresMaster.map(jogador => {
      const clube = jogador.clubeId
        ? clubePorId.get(jogador.clubeId)
        : undefined;
      const evoluido = clube
        ? evoluirJogador(jogador, clube)
        : {
            ...jogador,
            idade: jogador.idade + 1,
            historicoTemporadas: [
              jogador.estatisticasTemporada,
              ...jogador.historicoTemporadas,
            ],
            estatisticasTemporada: {
              temporada: String(
                Number(jogador.estatisticasTemporada.temporada) + 1,
              ),
              jogos: 0,
              gols: 0,
              assistencias: 0,
              cartoesAmarelos: 0,
              cartoesVermelhos: 0,
              notaMedia: 0,
            },
          };
      return {
        ...evoluido,
        suspenso: false,
        jogosSuspensao: 0,
        amarelosParaSuspensao: 0,
        lesionado: false,
        diasLesao: 0,
      };
    });

    // Empréstimos (§9.3): jogadores cedidos voltam aos donos na virada (com
    // leve desenvolvimento se jovens).
    const jogadoresEvoluidos = processarRetornosEmprestimo(
      evoluidos,
      proximaTemporada,
    );

    // Acerto financeiro de fim de temporada (patrocínio, salários, manutenção
    // e juros sobre dívida) em todos os clubes. O clube do usuário COM contrato
    // de patrocínio pula o patrocínio-por-reputação (a renda vem do contrato).
    const usuarioTemContrato = temContratoPatrocinioAtivo(state.patrocinio);
    let clubesComFolha = clubesMaster.map(clube =>
      aplicarAcertoFinanceiroAnual(
        clube,
        jogadoresDoClube(jogadoresEvoluidos, clube.id),
        `${state.temporadaAtual}-fim`,
        usuarioTemContrato && clube.id === state.clubeUsuarioId,
      ),
    );

    // Encerramento do contrato de patrocínio: metas finais + parcela da temporada
    // + fecha contrato expirado. Usa as classificações da temporada que acabou.
    let patrocinioEncerrado = state.patrocinio;
    const clubeUsuarioFolha = clubesComFolha.find(
      c => c.id === state.clubeUsuarioId,
    );
    if (clubeUsuarioFolha) {
      const res = encerrarContratoTemporada(
        state.patrocinio,
        {
          clube: clubeUsuarioFolha,
          tabela: state.tabela,
          partidas: state.partidas,
          temporada: Number(state.temporadaAtual),
        },
        Number(proximaTemporada),
        `${state.temporadaAtual}-fim`,
      );
      patrocinioEncerrado = res.patrocinio;
      clubesComFolha = clubesComFolha.map(c =>
        c.id === clubeUsuarioFolha.id ? res.clube : c,
      );
    }

    // A Série D roda DE VERDADE na virada (grupos + mata-mata reais via engine),
    // uma única vez, definindo a ordem de acesso à Série C. `null` = mundo sem os
    // 96 clubes da Série D (save antigo) → a pirâmide só ignora o par C↔D.
    const resolucaoSerieD = resolverSerieDNaVirada(
      clubesComFolha,
      jogadoresEvoluidos,
      state.temporadaAtual,
    );

    // Ordem da Série D para o acesso (promovidos primeiro). Numa carreira na D, o
    // destino REAL do clube do usuário manda: sobe (entra no top-N) se conquistou
    // o acesso; senão fica fora do top-N (a D é a última divisão, não rebaixa).
    let ordemSerieDFinal: string[] | null = resolucaoSerieD
      ? resolucaoSerieD.ordem
      : null;
    if (resolucaoSerieD && carreiraSerieD && state.clubeUsuarioId) {
      const uid = state.clubeUsuarioId;
      const resto = resolucaoSerieD.ordem.filter(id => id !== uid);
      ordemSerieDFinal = carreiraSerieD.acessoConquistado
        ? [uid, ...resto]
        : [...resto.slice(0, N_ACESSO), uid, ...resto.slice(N_ACESSO)];
    }

    // Acesso/rebaixamento (4 sobem / 4 descem). A Série D usa o resultado da
    // competição; a divisão JOGADA (não-D), a tabela real; as demais, a força.
    const ordemDivisao = (divisao: string): string[] => {
      if (divisao === 'Série D' && ordemSerieDFinal) {
        return ordemSerieDFinal;
      }
      const clubesDiv = clubesComFolha.filter(
        clube => (clube.divisao ?? DIVISAO_PADRAO) === divisao,
      );
      if (divisao === divisaoAtiva) {
        const ranque = new Map(
          state.tabela.map((linha, indice) => [linha.clubeId, indice]),
        );
        return clubesDiv
          .map(clube => clube.id)
          .sort((a, b) => (ranque.get(a) ?? 99) - (ranque.get(b) ?? 99));
      }
      return ranquearDivisaoPorForca(
        clubesDiv,
        jogadoresEvoluidos,
        state.temporadaAtual,
      );
    };

    // Pirâmides do MUNDO (Brasil + países internacionais, via registry): cada
    // país fecha sua temporada — posição final, cota e acesso/rebaixamento.
    const piramides = piramidesDoMundo();
    const piramideAtiva = piramides.find(piramide =>
      piramide.divisoes.includes(divisaoAtiva),
    );

    // Cota de TV (§8.3): premia a posição FINAL na liga. Distribuída a todos os
    // clubes conforme divisão e colocação, no acerto de fim de temporada.
    const posicaoFinalPorClube = new Map<string, number>();
    for (const piramide of piramides) {
      for (const div of piramide.divisoes) {
        ordemDivisao(div).forEach((id, indice) => {
          posicaoFinalPorClube.set(id, indice + 1);
        });
      }
    }
    const clubesComCotaTV = clubesComFolha.map(clube => {
      const posicao = posicaoFinalPorClube.get(clube.id);
      if (!posicao) {
        return clube;
      }
      return aplicarCotaTV(
        clube,
        clube.divisao ?? DIVISAO_PADRAO,
        posicao,
        `${state.temporadaAtual}-fim`,
      );
    });

    // Troca entre divisões ADJACENTES de CADA pirâmide (A↔B… no Brasil com 4;
    // Premier↔Championship com 3): os N últimos de cima descem e os N
    // primeiros de baixo sobem. País de divisão única não movimenta.
    const novaDivisaoPorClube = new Map<string, string>();
    for (const piramide of piramides) {
      if (piramide.nAcesso <= 0) {
        continue;
      }
      for (let i = 0; i < piramide.divisoes.length - 1; i += 1) {
        const acima = piramide.divisoes[i];
        const abaixo = piramide.divisoes[i + 1];
        const ordemAcima = ordemDivisao(acima);
        const ordemAbaixo = ordemDivisao(abaixo);
        if (ordemAcima.length === 0 || ordemAbaixo.length === 0) {
          continue; // divisão ainda não cadastrada (ex.: Série C vazia)
        }
        const n = Math.min(
          piramide.nAcesso,
          ordemAcima.length,
          ordemAbaixo.length,
        );
        ordemAcima.slice(-n).forEach(id => novaDivisaoPorClube.set(id, abaixo));
        ordemAbaixo.slice(0, n).forEach(id => novaDivisaoPorClube.set(id, acima));
      }
    }

    const todosClubesNovos = clubesComCotaTV.map(clube => {
      const nova = novaDivisaoPorClube.get(clube.id);
      return nova ? {...clube, divisao: nova} : clube;
    });

    // O usuário segue seu clube para a (possível) nova divisão.
    const clubeUsuario = state.clubeUsuarioId
      ? todosClubesNovos.find(clube => clube.id === state.clubeUsuarioId)
      : undefined;
    const divisaoUsuario = clubeUsuario?.divisao ?? divisaoAtiva;
    // Indo para a Série D (ficou na D, ou caiu da C): a liga ativa é o GRUPO de 6
    // do clube — não a divisão inteira de 96.
    const liga =
      divisaoUsuario === 'Série D' && state.clubeUsuarioId
        ? gerarLigaSerieDGrupo(
            todosClubesNovos,
            jogadoresEvoluidos,
            state.clubeUsuarioId,
            proximaTemporada,
          )
        : gerarLiga(
            todosClubesNovos,
            jogadoresEvoluidos,
            divisaoUsuario,
            proximaTemporada,
          );

    // Academia (Módulo 14): novas peneiras determinísticas para a temporada.
    const necessidades = state.clubeUsuarioId
      ? necessidadesPorPosicao(
          jogadoresDoClube(jogadoresEvoluidos, state.clubeUsuarioId),
        )
      : {};
    const jovensDisponiveis = gerarJovensTemporada(
      Number(proximaTemporada),
      necessidades,
      criarRNGComSeed(Number(proximaTemporada)),
    );

    // Mensagens: destino do clube do usuário + rebaixados da divisão jogada —
    // sempre relativos à pirâmide do PAÍS ativo (Brasil ou internacional).
    const nomeClube = (id: string): string =>
      todosClubesNovos.find(clube => clube.id === id)?.nome ?? id;
    const divisoesAtivas = piramideAtiva?.divisoes ?? PIRAMIDE_DIVISOES;
    const idxAntiga = divisoesAtivas.indexOf(divisaoAtiva);
    const idxNova = divisoesAtivas.indexOf(divisaoUsuario);
    let mensagens = state.mensagens;
    if (state.clubeUsuarioId && idxNova > idxAntiga) {
      mensagens = adicionarMensagem(
        mensagens,
        `Rebaixado para a ${divisaoUsuario}. Hora de reconstruir e buscar o acesso.`,
      );
    } else if (state.clubeUsuarioId && idxNova >= 0 && idxNova < idxAntiga) {
      mensagens = adicionarMensagem(
        mensagens,
        `Acesso à ${divisaoUsuario}! O clube subiu de divisão.`,
      );
    }
    const nAcessoAtivo = piramideAtiva?.nAcesso ?? 0;
    const ehUltimaDivisao =
      idxAntiga < 0 || idxAntiga === divisoesAtivas.length - 1;
    const rebaixadosMinha =
      ehUltimaDivisao || nAcessoAtivo <= 0
        ? []
        : ordemDivisao(divisaoAtiva).slice(-nAcessoAtivo);
    if (rebaixadosMinha.length > 0) {
      mensagens = adicionarMensagem(
        mensagens,
        `Rebaixados da ${divisaoAtiva}: ${rebaixadosMinha.map(nomeClube).join(', ')}.`,
      );
    }
    if (state.clubeUsuarioId) {
      const posicaoUsuario = posicaoFinalPorClube.get(state.clubeUsuarioId);
      if (posicaoUsuario) {
        const valorCota = cotaTV(divisaoAtiva, posicaoUsuario);
        mensagens = adicionarMensagem(
          mensagens,
          `Cota de TV (${divisaoAtiva}, ${posicaoUsuario}º): R$ ${(
            valorCota / 1_000_000
          ).toLocaleString('pt-BR')} mi creditada.`,
        );
      }
    }
    mensagens = adicionarMensagem(
      mensagens,
      `Temporada ${proximaTemporada} (${divisaoUsuario}) iniciada. ${jovensDisponiveis.length} jovens nas peneiras.`,
    );
    // Campeão da Série D: o clube do usuário se ele venceu a final; senão o da
    // competição de fundo.
    const campeaoSerieD =
      carreiraSerieD?.fase === 'campeao' && state.clubeUsuarioId
        ? state.clubeUsuarioId
        : resolucaoSerieD?.resumo.campeao;
    if (resolucaoSerieD && campeaoSerieD) {
      const nomeSerieD = (id: string): string =>
        todosClubesNovos.find(clube => clube.id === id)?.nome ?? id;
      mensagens = adicionarMensagem(
        mensagens,
        `Série D: ${nomeSerieD(campeaoSerieD)} é campeão e garante o acesso à Série C.`,
      );
    }

    // Eixo carreira: reputação de fim de temporada + demissão por rebaixamento.
    // Na carreira na D o título é vencer o mata-mata (não liderar a tabela do grupo).
    const campeao = carreiraSerieD
      ? carreiraSerieD.fase === 'campeao'
      : ordemDivisao(divisaoAtiva)[0] === state.clubeUsuarioId;
    const eventoTemporada: 'titulo' | 'acesso' | 'rebaixamento' | 'meio' =
      campeao
        ? 'titulo'
        : idxNova > idxAntiga
          ? 'rebaixamento'
          : idxNova >= 0 && idxNova < idxAntiga
            ? 'acesso'
            : 'meio';
    const reputacaoBase = reputacaoFimTemporada(
      state.reputacaoTecnico,
      eventoTemporada,
    );
    // Meta da diretoria: cumpriu a meta contratada? ajusta reputação + manchete.
    let reputacaoTecnico = reputacaoBase;
    const clubeUsuarioFim = state.clubes.find(
      clube => clube.id === state.clubeUsuarioId,
    );
    // A meta da diretoria é por posição na liga; na carreira na D (grupo+chave)
    // o resultado já está no `eventoTemporada`, então pula-se o ajuste de meta.
    if (clubeUsuarioFim && state.clubeUsuarioId && !carreiraSerieD) {
      // divisaoAtiva = divisão em que a temporada foi disputada (state.tabela),
      // NÃO a nova divisão pós acesso/rebaixamento (divisaoUsuario).
      const dificuldade = state.config.dificuldade;
      const objetivo = definirObjetivoTemporada(
        clubeUsuarioFim.reputacao,
        divisaoAtiva,
        dificuldade,
      );
      const posFinal = posicaoClube(state.tabela, state.clubeUsuarioId);
      reputacaoTecnico = Math.max(
        0,
        Math.min(
          100,
          reputacaoBase + deltaReputacaoMeta(objetivo, posFinal, dificuldade),
        ),
      );
      mensagens = adicionarMensagem(
        mensagens,
        metaCumprida(objetivo, posFinal)
          ? `Objetivo cumprido: ${objetivo.descricao}! A diretoria está satisfeita.`
          : `Objetivo não alcançado (${objetivo.descricao}). A diretoria cobra melhora.`,
      );
    }
    let demissao = state.demissao;
    if (!demissao && eventoTemporada === 'rebaixamento' && state.clubeUsuarioId) {
      demissao = 'REBAIXAMENTO';
      mensagens = adicionarMensagem(mensagens, mensagemDemissao('REBAIXAMENTO'));
    }

    set({
      temporadaAtual: proximaTemporada,
      rodadaAtual: 1,
      todosClubes: todosClubesNovos,
      todosJogadores: jogadoresEvoluidos,
      jogadores: liga.jogadores,
      clubes: liga.clubes.map(clube => ({
        ...clube,
        controladoPorIA: clube.id !== state.clubeUsuarioId,
      })),
      partidas: liga.partidas,
      tabela: liga.tabela,
      ultimaPartidaUsuario: null,
      dataAtual: liga.dataAtual,
      treinouProximoJogo: false,
      conversouComGrupo: false,
      reputacaoTecnico,
      derrotasConsecutivas: 0,
      demissao,
      historicoSerieD:
        resolucaoSerieD && campeaoSerieD
          ? [
              {...resolucaoSerieD.resumo, campeao: campeaoSerieD},
              ...state.historicoSerieD,
            ]
          : state.historicoSerieD,
      // A carreira na D recomeça na fase de grupos (mata-mata montado só ao fim).
      serieDCarreira: null,
      patrocinio: patrocinioEncerrado,
      jovensDisponiveis,
      propostasRecebidas: [],
      copa:
        // Série D (grupo de 10 rodadas não comporta as fases) e carreiras fora
        // do Brasil ficam sem Copa do Brasil.
        divisaoUsuario === 'Série D' || !ehDivisaoBrasileira(divisaoUsuario)
          ? null
          : gerarCopaParaTemporada(
              todosClubesNovos,
              jogadoresEvoluidos,
              proximaTemporada,
              state.clubeUsuarioId,
              calcularDatasFasesCopa(liga.partidas),
            ),
      mensagens,
    });
    // Propostas da nova temporada — já com a divisão/tabela novas (pós-acesso/
    // rebaixamento). `garantirPropostasIniciais` regenera porque a temporada de
    // propostas mudou.
    get().gerarPropostasPatrocinioUsuario();
  },

  promoverJovem: jovemId => {
    const state = get();
    const {clubeUsuarioId} = state;
    const jovem = state.jovensDisponiveis.find(item => item.id === jovemId);
    if (!clubeUsuarioId || !jovem) {
      return;
    }
    const novoJogador = jovemParaPlayer(
      jovem,
      clubeUsuarioId,
      state.temporadaAtual,
    );

    set({
      jogadores: [...state.jogadores, novoJogador],
      clubes: state.clubes.map(clube =>
        clube.id === clubeUsuarioId
          ? {...clube, elenco: [...clube.elenco, novoJogador.id]}
          : clube,
      ),
      jovensDisponiveis: state.jovensDisponiveis.filter(
        item => item.id !== jovemId,
      ),
      mensagens: adicionarMensagem(
        state.mensagens,
        `${jovem.nome} promovido ao elenco principal.`,
      ),
    });

    // Conquista "Olheiro nato": promoveu um jovem com potencial S.
    if (faixaPotencial(jovem.potencial) === 'S') {
      useAchievementsStore.getState().desbloquearConquista('revelacao');
    }
  },

  liberarJovem: jovemId => {
    set(state => ({
      jovensDisponiveis: state.jovensDisponiveis.filter(
        item => item.id !== jovemId,
      ),
    }));
  },

  melhorarEstadio: tipo => {
    const state = get();
    const {clubeUsuarioId} = state;
    const clube = state.clubes.find(c => c.id === clubeUsuarioId);
    if (!clubeUsuarioId || !clube) {
      return {ok: false, mensagem: 'Sem clube ativo.'};
    }
    const estadio = clube.estadio;

    let custo: number;
    let novoEstadio: typeof estadio;
    let descricao: string;
    if (tipo === 'capacidade') {
      if (estadio.capacidade >= CAPACIDADE_MAX_ESTADIO) {
        return {ok: false, mensagem: 'O estádio já está na capacidade máxima.'};
      }
      custo = custoAmpliacaoEstadio(estadio.capacidade);
      novoEstadio = {
        ...estadio,
        capacidade: Math.min(
          CAPACIDADE_MAX_ESTADIO,
          estadio.capacidade + LUGARES_POR_AMPLIACAO,
        ),
      };
      descricao = `Ampliação do estádio (+${LUGARES_POR_AMPLIACAO} lugares)`;
    } else {
      if (estadio.nivelInfraestrutura >= INFRA_MAX_ESTADIO) {
        return {ok: false, mensagem: 'A infraestrutura já está no nível máximo.'};
      }
      custo = custoMelhoriaInfra(estadio.nivelInfraestrutura);
      novoEstadio = {
        ...estadio,
        nivelInfraestrutura: estadio.nivelInfraestrutura + 1,
      };
      descricao = `Melhoria de infraestrutura (nível ${estadio.nivelInfraestrutura + 1})`;
    }

    if (clube.financas.saldo < custo) {
      return {ok: false, mensagem: 'Saldo insuficiente para a obra.'};
    }

    set({
      clubes: state.clubes.map(c =>
        c.id === clubeUsuarioId
          ? {
              ...registrarTransacao(c, {
                data: state.dataAtual,
                tipo: 'despesa',
                categoria: 'obras',
                valor: custo,
                descricao,
              }),
              estadio: novoEstadio,
            }
          : c,
      ),
      mensagens: adicionarMensagem(state.mensagens, `${descricao} concluída.`),
    });
    return {ok: true, mensagem: `${descricao} concluída.`};
  },

  ajustarPrecoIngresso: fator => {
    const {clubeUsuarioId} = get();
    if (!clubeUsuarioId) {
      return;
    }
    const limitado = Math.min(
      PRECO_INGRESSO_FATOR_MAX,
      Math.max(PRECO_INGRESSO_FATOR_MIN, fator),
    );
    set(state => ({
      clubes: state.clubes.map(clube =>
        clube.id === clubeUsuarioId
          ? {...clube, estadio: {...clube.estadio, precoIngressoFator: limitado}}
          : clube,
      ),
    }));
  },

  atualizarConfig: parcial => {
    set(state => ({config: {...state.config, ...parcial}}));
  },

  reiniciarCarreira: () => {
    const novo = criarEstadoInicial();
    set({
      clubes: novo.clubes,
      jogadores: novo.jogadores,
      todosClubes: novo.todosClubes,
      todosJogadores: novo.todosJogadores,
      partidas: novo.partidas,
      tabela: novo.tabela,
      clubeUsuarioId: null,
      temporadaAtual: TEMPORADA_INICIAL,
      rodadaAtual: 1,
      ultimaPartidaUsuario: null,
      dataAtual: novo.dataAtual,
      treinouProximoJogo: false,
      conversouComGrupo: false,
      jovensDisponiveis: [],
      propostasRecebidas: [],
      formacaoPreLive: null,
      copa: null,
      reputacaoTecnico: REPUTACAO_INICIAL,
      derrotasConsecutivas: 0,
      rodadasNoVermelho: 0,
      estadoFinanceiro: 'SAUDAVEL',
      demissao: null,
      historicoSerieD: [],
      serieDCarreira: null,
      patrocinio: criarEstadoPatrocinioVazio(),
      transferHistory: [],
      planoTreino: null,
      planoTreinoStatus: 'nao_configurado',
      pendencias: [],
      mensagens: [],
    });
    useAchievementsStore.getState().reiniciarConquistas();
  },
}));

export function selecionarClubeUsuario(state: GameState): Clube | null {
  return state.clubes.find(clube => clube.id === state.clubeUsuarioId) ?? null;
}

export type ProximoEvento =
  | {tipo: 'jogo'; data: string; partida: Partida}
  | {tipo: 'fim'};

/**
 * Próximo evento do calendário. O treino é automático entre as rodadas (estilo
 * Brasfoot), então o evento é sempre o JOGO. Sem próxima partida (fim das 38
 * rodadas) => fim de temporada. Não é seletor direto do zustand (cria objeto
 * novo); derive com useMemo a partir de fatias estáveis.
 */
export function calcularProximoEvento(
  proximaPartida: Partida | null,
): ProximoEvento {
  if (!proximaPartida) {
    return {tipo: 'fim'};
  }
  return {tipo: 'jogo', data: proximaPartida.data, partida: proximaPartida};
}

/**
 * Próximo jogo do usuário: o confronto da RODADA ATUAL (a que `avancarRodada`
 * vai simular a seguir). Antes buscávamos a primeira partida não jogada na ordem
 * do array, que podia ser de outra rodada — fazendo o "Próximo Jogo" divergir do
 * jogo realmente disputado. `find` devolve a referência existente (ou null), logo
 * é estável entre renders e serve como seletor direto do zustand.
 */
export function selecionarProximoJogo(state: GameState): Partida | null {
  if (!state.clubeUsuarioId) {
    return null;
  }

  const ehDoUsuario = (partida: Partida): boolean =>
    !partida.jogada &&
    (partida.timeCasa === state.clubeUsuarioId ||
      partida.timeFora === state.clubeUsuarioId);

  return (
    state.partidas.find(
      partida => partida.rodada === state.rodadaAtual && ehDoUsuario(partida),
    ) ??
    state.partidas.find(ehDoUsuario) ??
    null
  );
}

/** O confronto da Copa do usuário em aberto na fase atual (ou null). */
export function selecionarConfrontoCopaUsuario(
  state: GameState,
): ConfrontoCopa | null {
  const copa = state.copa;
  if (!copa || copa.campeao) {
    return null;
  }
  const confronto = confrontoDoClube(copa, state.clubeUsuarioId);
  return confronto && !confronto.vencedor ? confronto : null;
}

export type Compromisso =
  | {tipo: 'liga'; partida: Partida; data: string}
  | {tipo: 'copa'; confronto: ConfrontoCopa; faseNome: string; data: string};

/**
 * Próximo compromisso do usuário: o de DATA mais cedo entre o próximo jogo da
 * liga e o confronto da Copa em aberto (jogos de meio de semana se intercalam).
 */
export function selecionarProximoCompromisso(
  state: GameState,
): Compromisso | null {
  const partidaLiga = selecionarProximoJogo(state);
  const liga: Compromisso | null = partidaLiga
    ? {tipo: 'liga', partida: partidaLiga, data: partidaLiga.data}
    : null;

  const confrontoCopa = selecionarConfrontoCopaUsuario(state);
  const faseCopa = state.copa?.fases[state.copa.faseAtual];
  const copa: Compromisso | null =
    confrontoCopa && faseCopa?.data
      ? {
          tipo: 'copa',
          confronto: confrontoCopa,
          faseNome: faseCopa.nome,
          data: faseCopa.data,
        }
      : null;

  if (!liga) {
    return copa;
  }
  if (!copa) {
    return liga;
  }
  // Datas ISO comparam lexicograficamente; a Copa entra quando sua data chega.
  return copa.data <= liga.data ? copa : liga;
}

/**
 * A Copa é o compromisso "da vez"? (seu confronto chegou a hora de ser jogado).
 * Boolean estável — seguro como seletor direto do zustand.
 */
export function selecionarCopaNaVez(state: GameState): boolean {
  return selecionarProximoCompromisso(state)?.tipo === 'copa';
}

/**
 * Hooks memoizados para dados derivados. NÃO usar como seletores diretos do
 * zustand: eles criam novas referências (arrays/objetos) a cada chamada, o que
 * dispara "Maximum update depth exceeded" com o useSyncExternalStore interno.
 * Por isso selecionamos fatias estáveis e derivamos com useMemo.
 */
export function useJogadoresUsuario(): Player[] {
  const jogadores = useGameStore(state => state.jogadores);
  const clubeUsuarioId = useGameStore(state => state.clubeUsuarioId);

  return useMemo(() => {
    if (!clubeUsuarioId) {
      return [];
    }

    return jogadoresDoClube(jogadores, clubeUsuarioId).sort(
      (a, b) => b.overall - a.overall,
    );
  }, [jogadores, clubeUsuarioId]);
}

export function useForcaUsuario(): ForcaTime | null {
  const clubes = useGameStore(state => state.clubes);
  const clubeUsuarioId = useGameStore(state => state.clubeUsuarioId);
  const jogadores = useGameStore(state => state.jogadores);

  return useMemo(() => {
    const clube = clubes.find(item => item.id === clubeUsuarioId);
    return clube ? forcaClube(clube, jogadores) : null;
  }, [clubes, clubeUsuarioId, jogadores]);
}
