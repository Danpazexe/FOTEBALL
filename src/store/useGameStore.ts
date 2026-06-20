import {useMemo} from 'react';
import {create} from 'zustand';

import {verificarConquistas} from '../engine/conquistas/verificadorConquistas';
import {
  aplicarAcertoFinanceiroAnual,
  aplicarBilheteria,
  aplicarCotaTV,
  cotaTV,
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
import {
  buscarTreino,
  CONDICAO_MAX,
  CONDICAO_MIN,
  INTENSIDADES,
  type IntensidadeTreino,
} from '../engine/progression/treinoTipos';
import {
  atualizarDerrotasConsecutivas,
  atualizarReputacao,
  atualizarRodadasNoVermelho,
  calcularEstadoFinanceiro,
  LIMITE_DERROTAS_DEMISSAO,
  MORAL_SALARIO_ATRASADO,
  REPUTACAO_INICIAL,
  reputacaoFimTemporada,
  salariosAtrasados,
  verificarDemissao,
} from '../engine/carreira/carreiraEngine';
import {calcularTabela} from '../engine/season/classification';
import {gerarCalendarioLiga} from '../engine/season/calendarGenerator';
import {
  avancarCopa,
  confrontoDoClube,
  definirResultadoConfronto,
  faseAtualCopa,
  gerarCopaDoBrasil,
  type ConfrontoCopa,
  type EstadoCopa,
} from '../engine/season/copaEngine';
import {simularPartida} from '../engine/simulation/matchSimulator';
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
  type RandomGenerator,
} from '../engine/simulation/rng';
import {calcularForcaTime, type ForcaTime} from '../engine/simulation/teamStrength';
import {
  respostaIAProposta,
  type PropostaTransferencia,
} from '../engine/transfers/negociacaoEngine';
import {avaliarPropostaTransferencia} from '../engine/transfers/transferAI';
import {loadSeedData} from '../api/database/seed/loadSeed';
import {adicionarDias} from '../utils/datas';
import {useAchievementsStore} from './useAchievementsStore';
import type {
  Clube,
  EstadoFinanceiro,
  EventoPartida,
  Formacao,
  MotivoDemissao,
  Partida,
  Player,
  ResultadoCarreira,
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
  /** O usuário já concedeu a coletiva desta rodada? (libera 1x por jogo). */
  coletivaConcedida: boolean;
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
  ) => void;
  atualizarTaticaUsuario: (tatica: Tatica) => void;
  atualizarFormacaoUsuario: (formacao: Formacao) => void;
  /** Conversa com o grupo: +5 de moral a todo o elenco (1x por semana). */
  conversarComGrupo: () => boolean;
  /** Concede a coletiva: aplica o efeito de moral acumulado (1x por rodada). */
  concederColetiva: (deltaTotal: number) => boolean;
  /**
   * Joga a fase atual da Copa: resolve o confronto do usuário (pelo resultado
   * informado ou simulando) e simula os demais, avança a chave e paga premiação.
   */
  avancarFaseCopa: (resultadoUsuario?: ResultadoConfrontoUsuario) => void;
  /** Tira um retrato da escalação do usuário ao entrar numa partida ao vivo. */
  prepararPartidaAoVivo: () => void;
  /** Desfaz mudanças in-game se a partida foi abandonada sem concluir. */
  restaurarFormacaoPreLive: () => void;
  aplicarTreino: (treinoId: string, intensidade: IntensidadeTreino) => void;
  aplicarMoralElenco: (delta: number) => void;
  renovarContrato: (jogadorId: string, anos: number, salario: number) => boolean;
  comprarJogador: (jogadorId: string) => ResultadoTransacao;
  venderJogador: (jogadorId: string) => ResultadoTransacao;
  fazerPropostaCompra: (jogadorId: string, valor: number) => ResultadoProposta;
  responderPropostaVenda: (propostaId: string, aceitar: boolean) => void;
  processarPropostasIA: () => void;
  finalizarTemporada: () => void;
  atualizarConfig: (parcial: Partial<ConfigJogo>) => void;
  promoverJovem: (jovemId: string) => void;
  liberarJovem: (jovemId: string) => void;
  /** Investe no estádio: amplia a capacidade ou sobe a infraestrutura. */
  melhorarEstadio: (tipo: TipoMelhoriaEstadio) => ResultadoTransacao;
  reiniciarCarreira: () => void;
}

/** Quantos jogadores faltam por posição no elenco do usuário (alvo: 2 por posição). */
function necessidadesPorPosicao(
  jogadores: Player[],
): Partial<Record<Player['posicaoPrincipal'], number>> {
  const contagem = new Map<Player['posicaoPrincipal'], number>();
  for (const jogador of jogadores) {
    contagem.set(
      jogador.posicaoPrincipal,
      (contagem.get(jogador.posicaoPrincipal) ?? 0) + 1,
    );
  }
  const necessidades: Partial<Record<Player['posicaoPrincipal'], number>> = {};
  const posicoes: Player['posicaoPrincipal'][] = [
    'GOL', 'ZAG', 'LD', 'LE', 'VOL', 'MC', 'MEI', 'PD', 'PE', 'SA', 'CA',
  ];
  for (const posicao of posicoes) {
    necessidades[posicao] = Math.max(0, 2 - (contagem.get(posicao) ?? 0));
  }
  return necessidades;
}

/**
 * Data inicial de uma temporada: 2 dias antes da 1ª rodada, para que o primeiro
 * evento do calendário seja o treino (na véspera do jogo).
 */
function dataInicialDeTemporada(partidas: Partida[], temporada: string): string {
  const rodada1 = partidas.find(partida => partida.rodada === 1);
  return rodada1 ? adicionarDias(rodada1.data, -2) : `${temporada}-04-04`;
}

const DIVISAO_PADRAO = 'Série A';
/** Ano em que toda carreira começa (fonte única — usada em criar/reiniciar). */
const TEMPORADA_INICIAL = '2026';

/**
 * Monta a liga ATIVA de UMA divisão: filtra clubes/jogadores da divisão, gera o
 * calendário round-robin (turno+returno) e a tabela. O jogo roda uma divisão por
 * vez; ao iniciar carreira num clube de outra divisão, a liga é regenerada (ver
 * `iniciarNovaCarreira`).
 */
function gerarLiga(
  todosClubes: Clube[],
  todosJogadores: Player[],
  divisao: string,
  temporada: string,
) {
  const clubes = todosClubes.filter(
    clube => (clube.divisao ?? DIVISAO_PADRAO) === divisao,
  );
  const idsLiga = new Set(clubes.map(clube => clube.id));
  const jogadores = todosJogadores.filter(
    // Inclui agentes livres (clubeId null) — pertencem ao jogo, não à divisão.
    jogador => jogador.clubeId == null || idsLiga.has(jogador.clubeId),
  );
  const partidas = gerarCalendarioLiga(
    clubes.map(clube => clube.id),
    temporada,
  );
  return {
    clubes,
    jogadores,
    partidas,
    tabela: calcularTabela(clubes, partidas),
    dataAtual: dataInicialDeTemporada(partidas, temporada),
  };
}

/**
 * Premiação da Copa creditada ao usuário por fase VENCIDA (avançou).
 * Valores conforme BRASFOOT_MASTER §11.2 (escala da Copa do Brasil): vencer a
 * fase paga o prêmio da fase, e o campeão (vence a Final) leva a cota máxima.
 */
const PREMIACAO_COPA: Record<string, number> = {
  'Oitavas de final': 1_575_000,
  'Quartas de final': 3_150_000,
  Semifinal: 5_250_000,
  Final: 73_500_000,
};

/** Rodadas da liga em torno das quais cada fase da Copa é disputada (meio de semana). */
const RODADAS_GATILHO_COPA = [8, 16, 24, 32];

/** Datas das fases da Copa: ~3 dias após a rodada-gatilho da liga (meio de semana). */
function calcularDatasFasesCopa(partidas: Partida[]): string[] {
  return RODADAS_GATILHO_COPA.map(rodada => {
    const jogo = partidas.find(partida => partida.rodada === rodada);
    return jogo ? adicionarDias(jogo.data, 3) : '';
  });
}

/** Gera a Copa do Brasil da temporada a partir do conjunto-mestre (todas as divisões). */
function gerarCopaParaTemporada(
  todosClubes: Clube[],
  todosJogadores: Player[],
  temporada: string,
  clubeUsuarioId: string | null,
  datasFases: string[],
): EstadoCopa {
  return gerarCopaDoBrasil(
    todosClubes,
    todosJogadores,
    temporada,
    clubeUsuarioId,
    criarRNGComSeed(hashString(`${temporada}_copa`)),
    datasFases,
  );
}

function criarEstadoInicial() {
  const seed = loadSeedData();
  return {
    todosClubes: seed.clubes,
    todosJogadores: seed.jogadores,
    ...gerarLiga(seed.clubes, seed.jogadores, DIVISAO_PADRAO, TEMPORADA_INICIAL),
  };
}

/** Quantos clubes sobem/descem entre divisões adjacentes na virada (padrão BR). */
const N_ACESSO = 4;

/**
 * Pirâmide de divisões (topo → base). O acesso/rebaixamento acontece entre
 * divisões ADJACENTES que existam — então adicionar a Série C liga o B↔C
 * automaticamente, sem mexer na lógica.
 */
const PIRAMIDE_DIVISOES = ['Série A', 'Série B', 'Série C'];

/**
 * Classifica uma divisão por FORÇA de elenco (média dos 11 melhores overalls) com
 * um ruído determinístico por temporada. Usado SÓ para a divisão que não foi
 * jogada (ex.: a Série B enquanto o usuário disputa a Série A), para decidir quem
 * sobe/desce sem precisar simular um campeonato inteiro. Retorna os ids do melhor
 * para o pior.
 */
function ranquearDivisaoPorForca(
  clubes: Clube[],
  jogadores: Player[],
  temporada: string,
): string[] {
  const score = (clube: Clube): number => {
    const top11 = jogadores
      .filter(jogador => jogador.clubeId === clube.id)
      .sort((a, b) => b.overall - a.overall)
      .slice(0, 11);
    const media =
      top11.length > 0
        ? top11.reduce((soma, jogador) => soma + jogador.overall, 0) /
          top11.length
        : 0;
    // ±3 de variação determinística por ano, para a classificação não congelar.
    const ruido = (hashString(`${temporada}_${clube.id}`) % 1000) / 1000;
    return media + ruido * 6 - 3;
  };
  return [...clubes].sort((a, b) => score(b) - score(a)).map(clube => clube.id);
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

function jogadoresDoClube(jogadores: Player[], clubeId: string): Player[] {
  return jogadores.filter(jogador => jogador.clubeId === clubeId);
}

function posicaoClube(tabela: TabelaClassificacao[], clubeId: string): number {
  const index = tabela.findIndex(linha => linha.clubeId === clubeId);
  return index === -1 ? tabela.length : index + 1;
}

/**
 * Dias de afastamento por gravidade da lesão (7 dias ≈ 1 jogo/rodada).
 * Determinístico: usa o RNG derivado da partida (mesma partida => mesma lesão).
 */
function sortearDuracaoLesao(rng: RandomGenerator): number {
  const r = rng();
  if (r < 0.5) {
    return inteiroEntre(rng, 7, 14); // leve: 1-2 jogos
  }
  if (r < 0.85) {
    return inteiroEntre(rng, 21, 35); // média: 3-5 jogos
  }
  return inteiroEntre(rng, 42, 70); // grave: 6-10 jogos
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
    let lesionado = jogador.lesionado;
    let diasLesao = jogador.diasLesao;
    if (lesionado && diasLesao > 0) {
      diasLesao = Math.max(0, diasLesao - 7);
      if (diasLesao === 0) {
        lesionado = false;
      }
    }

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

    // Preparo físico (BRASFOOT_MASTER §4): titular gasta ~90' (-20), reserva que
    // entrou gasta parcial (-10), e quem ficou de fora DESCANSA e recupera (+25).
    // É o que obriga a rodar o elenco ao longo das 38 rodadas.
    const ehTitular = titularesNoApito.has(jogador.id);
    const participou =
      ehTitular || jogou.has(jogador.id) || jogadorIdsEmCampo.has(jogador.id);
    const deltaCondicao = ehTitular ? -20 : participou ? -10 : 25;
    const condicaoFisica = Math.min(
      CONDICAO_MAX,
      Math.max(CONDICAO_MIN, jogador.condicaoFisica + deltaCondicao),
    );

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

function limiteDerrotasPorDivisao(divisao: string): number {
  if (divisao === 'Série B') {
    return LIMITE_DERROTAS_DEMISSAO.B;
  }
  if (divisao === 'Série C') {
    return LIMITE_DERROTAS_DEMISSAO.C;
  }
  return LIMITE_DERROTAS_DEMISSAO.A;
}

function mensagemDemissao(motivo: MotivoDemissao): string {
  if (motivo === 'FALENCIA') {
    return 'A diretoria te demitiu: o clube quebrou financeiramente.';
  }
  if (motivo === 'REBAIXAMENTO') {
    return 'A diretoria te demitiu após o rebaixamento.';
  }
  return 'A diretoria te demitiu após a sequência de derrotas.';
}

/** Resultado da rodada para o clube do usuário (null se não jogou). */
function resultadoDoUsuario(
  partidaUsuario: Partida | null,
  clubeUsuarioId: string,
): ResultadoCarreira | null {
  if (!partidaUsuario || !partidaUsuario.jogada) {
    return null;
  }
  const ehCasa = partidaUsuario.timeCasa === clubeUsuarioId;
  const golsCasa = partidaUsuario.placarCasa ?? 0;
  const golsFora = partidaUsuario.placarFora ?? 0;
  if (golsCasa === golsFora) {
    return 'empate';
  }
  return (golsCasa > golsFora) === ehCasa ? 'vitoria' : 'derrota';
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
  coletivaConcedida: false,
  copa: null,
  reputacaoTecnico: REPUTACAO_INICIAL,
  derrotasConsecutivas: 0,
  rodadasNoVermelho: 0,
  estadoFinanceiro: 'SAUDAVEL',
  demissao: null,

  iniciarNovaCarreira: clubeId => {
    // SEMPRE parte do seed limpo (e da temporada inicial): uma "nova carreira"
    // não pode herdar elencos/finanças evoluídos nem a temporada de uma carreira
    // anterior ainda em memória (todosClubes/todosJogadores mudam ao virar a
    // temporada). Espelha reiniciarCarreira, mas já escolhendo o clube/divisão.
    const base = criarEstadoInicial();
    const escolhido = base.todosClubes.find(clube => clube.id === clubeId);
    const divisao = escolhido?.divisao ?? DIVISAO_PADRAO;
    const liga = gerarLiga(
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
      coletivaConcedida: false,
      reputacaoTecnico: REPUTACAO_INICIAL,
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
      copa: gerarCopaParaTemporada(
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
    const liga = gerarLiga(
      state.todosClubes,
      state.todosJogadores,
      divisao,
      state.temporadaAtual,
    );
    set({
      clubeUsuarioId: clubeId,
      rodadaAtual: 1,
      ultimaPartidaUsuario: null,
      treinouProximoJogo: false,
      conversouComGrupo: false,
      coletivaConcedida: false,
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
      copa: gerarCopaParaTemporada(
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
  },

  avancarParaData: data => {
    set({dataAtual: data});
  },

  avancarRodada: () => {
    const state = get();
    const jogosRodada = state.partidas.filter(
      partida => partida.rodada === state.rodadaAtual && !partida.jogada,
    );

    if (jogosRodada.length === 0) {
      return;
    }

    let jogadoresAtualizados = state.jogadores;
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

      const resultado = simularPartida({
        timeCasa: clubeCasa,
        timeFora: clubeFora,
        jogadoresCasa: jogadoresDoClube(jogadoresAtualizados, clubeCasa.id),
        jogadoresFora: jogadoresDoClube(jogadoresAtualizados, clubeFora.id),
        seed: state.rodadaAtual * 1000 + jogosRodada.indexOf(jogo),
        competicaoId: jogo.competicaoId,
        rodada: jogo.rodada,
        data: jogo.data,
      });

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
    });

    const tabela = calcularTabela(state.clubes, partidasAtualizadas);
    const ultimaPartidaUsuario =
      jogosRodada.find(
        partida =>
          partida.timeCasa === state.clubeUsuarioId ||
          partida.timeFora === state.clubeUsuarioId,
      ) ?? null;
    const partidaUsuarioCompleta = ultimaPartidaUsuario
      ? partidasAtualizadas.find(partida => partida.id === ultimaPartidaUsuario.id) ?? null
      : null;
    const clubesComBilheteria = state.clubes.map(clube => {
      const mandouJogo = jogosRodada.some(partida => partida.timeCasa === clube.id);

      if (!mandouJogo) {
        return clube;
      }

      return aplicarBilheteria(clube, posicaoClube(tabela, clube.id), `${state.temporadaAtual}-rodada-${state.rodadaAtual}`);
    });

    const carreira = atualizarCarreiraPosRodada(
      state,
      clubesComBilheteria,
      jogadoresAtualizados,
      partidaUsuarioCompleta,
      adicionarMensagem(state.mensagens, `Rodada ${state.rodadaAtual} simulada.`),
    );

    set({
      jogadores: carreira.jogadores,
      partidas: partidasAtualizadas,
      tabela,
      clubes: clubesComBilheteria,
      rodadaAtual: Math.min(39, state.rodadaAtual + 1),
      ultimaPartidaUsuario: partidaUsuarioCompleta,
      // Calendário: data passa a ser a do jogo disputado; zera o treino para
      // o próximo ciclo (volta a exigir treino antes do próximo jogo).
      dataAtual: partidaUsuarioCompleta?.data ?? state.dataAtual,
      treinouProximoJogo: false,
      conversouComGrupo: false,
      coletivaConcedida: false,
      reputacaoTecnico: carreira.reputacaoTecnico,
      derrotasConsecutivas: carreira.derrotasConsecutivas,
      rodadasNoVermelho: carreira.rodadasNoVermelho,
      estadoFinanceiro: carreira.estadoFinanceiro,
      demissao: carreira.demissao,
      mensagens: carreira.mensagens,
    });

    checarConquistas({
      clubeUsuarioId: state.clubeUsuarioId,
      jogadores: carreira.jogadores,
      partidas: partidasAtualizadas,
      tabela,
      clubes: clubesComBilheteria,
      rodadaAtual: Math.min(39, state.rodadaAtual + 1),
    });
    get().processarPropostasIA();
  },

  // Fecha a partida do usuário jogada AO VIVO (decidida durante a narração) e
  // simula os demais jogos da rodada (IA), atualizando tabela/finanças/rodada.
  concluirPartidaAoVivo: (partidaId, eventos, placarCasa, placarFora) => {
    const state = get();
    const jogosRodada = state.partidas.filter(
      partida => partida.rodada === state.rodadaAtual && !partida.jogada,
    );
    if (jogosRodada.length === 0) {
      return;
    }

    let jogadoresAtualizados = state.jogadores;
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

      const resultado: Partida =
        partida.id === partidaId
          ? {
              ...partida,
              placarCasa,
              placarFora,
              eventos: [...eventos].sort((a, b) => a.minuto - b.minuto),
              jogada: true,
              modoJogado: 'interativo',
            }
          : simularPartida({
              timeCasa: clubeCasa,
              timeFora: clubeFora,
              jogadoresCasa: jogadoresDoClube(jogadoresAtualizados, clubeCasa.id),
              jogadoresFora: jogadoresDoClube(jogadoresAtualizados, clubeFora.id),
              seed: state.rodadaAtual * 1000 + jogosRodada.indexOf(jogo),
              competicaoId: jogo.competicaoId,
              rodada: jogo.rodada,
              data: jogo.data,
            });

      jogadoresAtualizados = aplicarResultadoNosJogadores(
        jogadoresAtualizados,
        resultado,
        clubeCasa,
        clubeFora,
      );
      return {...partida, ...resultado, id: partida.id};
    });

    const tabela = calcularTabela(state.clubes, partidasAtualizadas);
    const partidaUsuario =
      partidasAtualizadas.find(partida => partida.id === partidaId) ?? null;
    const clubesComBilheteria = state.clubes.map(clube => {
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

    // Restaura a escalação/tática oficial do usuário: as trocas feitas durante a
    // partida ao vivo valeram só para este jogo, não viram a escalação padrão.
    const preLive = state.formacaoPreLive;
    const clubesFinais = preLive
      ? clubesComBilheteria.map(clube =>
          clube.id === preLive.clubeId
            ? {...clube, formacaoAtual: preLive.formacao, taticaAtual: preLive.tatica}
            : clube,
        )
      : clubesComBilheteria;

    const carreira = atualizarCarreiraPosRodada(
      state,
      clubesFinais,
      jogadoresAtualizados,
      partidaUsuario,
      adicionarMensagem(state.mensagens, `Rodada ${state.rodadaAtual} disputada.`),
    );

    set({
      jogadores: carreira.jogadores,
      partidas: partidasAtualizadas,
      tabela,
      clubes: clubesFinais,
      formacaoPreLive: null,
      rodadaAtual: Math.min(39, state.rodadaAtual + 1),
      ultimaPartidaUsuario: partidaUsuario,
      dataAtual: partidaUsuario?.data ?? state.dataAtual,
      treinouProximoJogo: false,
      conversouComGrupo: false,
      coletivaConcedida: false,
      reputacaoTecnico: carreira.reputacaoTecnico,
      derrotasConsecutivas: carreira.derrotasConsecutivas,
      rodadasNoVermelho: carreira.rodadasNoVermelho,
      estadoFinanceiro: carreira.estadoFinanceiro,
      demissao: carreira.demissao,
      mensagens: carreira.mensagens,
    });

    checarConquistas({
      clubeUsuarioId: state.clubeUsuarioId,
      jogadores: carreira.jogadores,
      partidas: partidasAtualizadas,
      tabela,
      clubes: clubesFinais,
      rodadaAtual: Math.min(39, state.rodadaAtual + 1),
    });
    get().processarPropostasIA();
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

  atualizarFormacaoUsuario: formacao => {
    const {clubeUsuarioId} = get();

    if (!clubeUsuarioId) {
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
    const {clubeUsuarioId} = get();
    if (!clubeUsuarioId) {
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
        return aplicarEfeitoTreino(jogador, efeito);
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

  aplicarMoralElenco: delta => {
    const {clubeUsuarioId} = get();
    if (!clubeUsuarioId || delta === 0) {
      return;
    }
    set(state => ({
      jogadores: state.jogadores.map(jogador =>
        jogador.clubeId === clubeUsuarioId
          ? {...jogador, moral: aplicarMoral(jogador.moral, delta)}
          : jogador,
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

  concederColetiva: deltaTotal => {
    const state = get();
    const {clubeUsuarioId} = state;
    if (!clubeUsuarioId || state.coletivaConcedida) {
      return false; // sem carreira ou coletiva já concedida nesta rodada.
    }
    set({
      jogadores:
        deltaTotal === 0
          ? state.jogadores
          : state.jogadores.map(jogador =>
              jogador.clubeId === clubeUsuarioId
                ? {...jogador, moral: aplicarMoral(jogador.moral, deltaTotal)}
                : jogador,
            ),
      coletivaConcedida: true,
      mensagens: adicionarMensagem(
        state.mensagens,
        'Você concedeu a coletiva de imprensa.',
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
        return definirResultadoConfronto(
          confronto,
          golsA,
          golsB,
          resultadoUsuario.vencedorPenaltis,
        );
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

    set({copa: copaAvancada, clubes, mensagens});
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

  comprarJogador: jogadorId => {
    const state = get();
    const clubeUsuarioId = state.clubeUsuarioId;

    if (!clubeUsuarioId) {
      return {ok: false, mensagem: 'Nenhuma carreira ativa.'};
    }

    const jogador = state.jogadores.find(item => item.id === jogadorId);
    const clubeUsuario = state.clubes.find(clube => clube.id === clubeUsuarioId);
    const clubeVendedor = state.clubes.find(clube => clube.id === jogador?.clubeId);

    if (!jogador || !clubeUsuario || !clubeVendedor || jogador.clubeId === clubeUsuarioId) {
      return {ok: false, mensagem: 'Jogador indisponível.'};
    }

    const oferta = precoCompra(jogador);

    if (clubeUsuario.financas.saldo < oferta) {
      return {
        ok: false,
        mensagem: `Saldo insuficiente para contratar ${jogador.nome}.`,
      };
    }

    const decisao = avaliarPropostaTransferencia(jogador, clubeVendedor, oferta);

    if (decisao === 'rejeitada') {
      set(stateAtual => ({
        mensagens: adicionarMensagem(
          stateAtual.mensagens,
          `Proposta por ${jogador.nome} recusada.`,
        ),
      }));
      return {
        ok: false,
        mensagem: `${clubeVendedor.nome} recusou a proposta por ${jogador.nome}.`,
      };
    }

    set(stateAtual => ({
      jogadores: stateAtual.jogadores.map(item =>
        item.id === jogadorId ? {...item, clubeId: clubeUsuarioId} : item,
      ),
      clubes: stateAtual.clubes.map(clube => {
        if (clube.id === clubeUsuarioId) {
          return registrarTransacao(
            {...clube, elenco: [...clube.elenco, jogadorId]},
            {
              data: `${stateAtual.temporadaAtual}-mercado`,
              tipo: 'despesa',
              categoria: 'contratacoes',
              valor: oferta,
              descricao: `Compra de ${jogador.nome}`,
            },
          );
        }

        if (clube.id === clubeVendedor.id) {
          return registrarTransacao(
            {
              ...clube,
              elenco: clube.elenco.filter(id => id !== jogadorId),
            },
            {
              data: `${stateAtual.temporadaAtual}-mercado`,
              tipo: 'receita',
              categoria: 'vendaJogadores',
              valor: oferta,
              descricao: `Venda de ${jogador.nome}`,
            },
          );
        }

        return clube;
      }),
      mensagens: adicionarMensagem(
        stateAtual.mensagens,
        `${jogador.nome} contratado por R$ ${oferta.toLocaleString('pt-BR')}.`,
      ),
    }));

    return {
      ok: true,
      mensagem: `${jogador.nome} contratado por R$ ${oferta.toLocaleString('pt-BR')}.`,
    };
  },

  venderJogador: jogadorId => {
    const state = get();
    const clubeUsuarioId = state.clubeUsuarioId;

    if (!clubeUsuarioId) {
      return {ok: false, mensagem: 'Nenhuma carreira ativa.'};
    }

    const jogador = state.jogadores.find(item => item.id === jogadorId);

    if (!jogador || jogador.clubeId !== clubeUsuarioId) {
      return {ok: false, mensagem: 'Jogador indisponível.'};
    }

    const valor = precoVenda(jogador);

    set(stateAtual => ({
      jogadores: stateAtual.jogadores.map(item =>
        item.id === jogadorId ? {...item, clubeId: null} : item,
      ),
      clubes: stateAtual.clubes.map(clube =>
        clube.id === clubeUsuarioId
          ? registrarTransacao(
              {
                ...clube,
                elenco: clube.elenco.filter(id => id !== jogadorId),
              },
              {
                data: `${stateAtual.temporadaAtual}-mercado`,
                tipo: 'receita',
                categoria: 'vendaJogadores',
                valor,
                descricao: `Venda de ${jogador.nome}`,
              },
            )
          : clube,
      ),
      mensagens: adicionarMensagem(
        stateAtual.mensagens,
        `${jogador.nome} vendido por R$ ${valor.toLocaleString('pt-BR')}.`,
      ),
    }));

    return {
      ok: true,
      mensagem: `${jogador.nome} vendido por R$ ${valor.toLocaleString('pt-BR')}.`,
    };
  },

  // Proposta do usuário para comprar um jogador da IA: resposta imediata
  // (aceita/recusa/contraproposta) via negociacaoEngine, com RNG semeado.
  fazerPropostaCompra: (jogadorId, valor) => {
    const state = get();
    const usuarioId = state.clubeUsuarioId;
    if (!usuarioId) {
      return {status: 'recusada', mensagem: 'Nenhuma carreira ativa.'};
    }
    const jogador = state.jogadores.find(j => j.id === jogadorId);
    const vendedor = state.clubes.find(c => c.id === jogador?.clubeId);
    const usuario = state.clubes.find(c => c.id === usuarioId);
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
      set(stateAtual => ({
        jogadores: stateAtual.jogadores.map(item =>
          item.id === jogadorId ? {...item, clubeId: usuarioId} : item,
        ),
        clubes: stateAtual.clubes.map(clube => {
          if (clube.id === usuarioId) {
            return registrarTransacao(
              {...clube, elenco: [...clube.elenco, jogadorId]},
              {
                data: `${stateAtual.temporadaAtual}-mercado`,
                tipo: 'despesa',
                categoria: 'contratacoes',
                valor,
                descricao: `Compra de ${jogador.nome}`,
              },
            );
          }
          if (clube.id === vendedor.id) {
            return registrarTransacao(
              {...clube, elenco: clube.elenco.filter(id => id !== jogadorId)},
              {
                data: `${stateAtual.temporadaAtual}-mercado`,
                tipo: 'receita',
                categoria: 'vendaJogadores',
                valor,
                descricao: `Venda de ${jogador.nome}`,
              },
            );
          }
          return clube;
        }),
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
    set(stateAtual => ({
      jogadores: stateAtual.jogadores.map(item =>
        item.id === proposta.jogadorId
          ? {...item, clubeId: comprador.id}
          : item,
      ),
      clubes: stateAtual.clubes.map(clube => {
        if (clube.id === stateAtual.clubeUsuarioId) {
          return registrarTransacao(
            {...clube, elenco: clube.elenco.filter(id => id !== proposta.jogadorId)},
            {
              data: `${stateAtual.temporadaAtual}-mercado`,
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
              data: `${stateAtual.temporadaAtual}-mercado`,
              tipo: 'despesa',
              categoria: 'contratacoes',
              valor: proposta.valorProposto,
              descricao: `Compra de ${jogador.nome}`,
            },
          );
        }
        return clube;
      }),
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
    // Só jogadores cobiçados (overall alto) e ainda sem oferta aberta entram.
    const candidatos = state.jogadores.filter(
      j =>
        j.clubeId === usuarioId &&
        j.overall >= 70 &&
        !jaTemProposta.has(j.id),
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

  finalizarTemporada: () => {
    const state = get();

    if (state.rodadaAtual <= 38) {
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
    const jogadoresEvoluidos = jogadoresMaster.map(jogador => {
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

    // Acerto financeiro de fim de temporada (patrocínio, salários, manutenção
    // e juros sobre dívida) em todos os clubes.
    const clubesComFolha = clubesMaster.map(clube =>
      aplicarAcertoFinanceiroAnual(
        clube,
        jogadoresDoClube(jogadoresEvoluidos, clube.id),
        `${state.temporadaAtual}-fim`,
      ),
    );

    // Acesso/rebaixamento (4 sobem / 4 descem). A divisão JOGADA usa a tabela
    // real; a outra é ranqueada por força de elenco (não foi simulada).
    const ordemDivisao = (divisao: string): string[] => {
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

    // Cota de TV (§8.3): premia a posição FINAL na liga. Distribuída a todos os
    // clubes conforme divisão e colocação, no acerto de fim de temporada.
    const posicaoFinalPorClube = new Map<string, number>();
    for (const div of PIRAMIDE_DIVISOES) {
      ordemDivisao(div).forEach((id, indice) => {
        posicaoFinalPorClube.set(id, indice + 1);
      });
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

    // Troca entre divisões ADJACENTES da pirâmide que existam (A↔B, B↔C…): os
    // N últimos de cima descem e os N primeiros de baixo sobem.
    const novaDivisaoPorClube = new Map<string, string>();
    for (let i = 0; i < PIRAMIDE_DIVISOES.length - 1; i += 1) {
      const acima = PIRAMIDE_DIVISOES[i];
      const abaixo = PIRAMIDE_DIVISOES[i + 1];
      const ordemAcima = ordemDivisao(acima);
      const ordemAbaixo = ordemDivisao(abaixo);
      if (ordemAcima.length === 0 || ordemAbaixo.length === 0) {
        continue; // divisão ainda não cadastrada (ex.: Série C vazia)
      }
      const n = Math.min(N_ACESSO, ordemAcima.length, ordemAbaixo.length);
      ordemAcima.slice(-n).forEach(id => novaDivisaoPorClube.set(id, abaixo));
      ordemAbaixo.slice(0, n).forEach(id => novaDivisaoPorClube.set(id, acima));
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
    const liga = gerarLiga(
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

    // Mensagens: destino do clube do usuário + rebaixados da divisão jogada.
    const nomeClube = (id: string): string =>
      todosClubesNovos.find(clube => clube.id === id)?.nome ?? id;
    const idxAntiga = PIRAMIDE_DIVISOES.indexOf(divisaoAtiva);
    const idxNova = PIRAMIDE_DIVISOES.indexOf(divisaoUsuario);
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
    const rebaixadosMinha = ordemDivisao(divisaoAtiva).slice(-N_ACESSO);
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

    // Eixo carreira: reputação de fim de temporada + demissão por rebaixamento.
    const campeao = ordemDivisao(divisaoAtiva)[0] === state.clubeUsuarioId;
    const eventoTemporada: 'titulo' | 'acesso' | 'rebaixamento' | 'meio' =
      campeao
        ? 'titulo'
        : idxNova > idxAntiga
          ? 'rebaixamento'
          : idxNova >= 0 && idxNova < idxAntiga
            ? 'acesso'
            : 'meio';
    const reputacaoTecnico = reputacaoFimTemporada(
      state.reputacaoTecnico,
      eventoTemporada,
    );
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
      coletivaConcedida: false,
      reputacaoTecnico,
      derrotasConsecutivas: 0,
      demissao,
      jovensDisponiveis,
      propostasRecebidas: [],
      copa: gerarCopaParaTemporada(
        todosClubesNovos,
        jogadoresEvoluidos,
        proximaTemporada,
        state.clubeUsuarioId,
        calcularDatasFasesCopa(liga.partidas),
      ),
      mensagens,
    });
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
      coletivaConcedida: false,
      jovensDisponiveis: [],
      propostasRecebidas: [],
      formacaoPreLive: null,
      copa: null,
      reputacaoTecnico: REPUTACAO_INICIAL,
      derrotasConsecutivas: 0,
      rodadasNoVermelho: 0,
      estadoFinanceiro: 'SAUDAVEL',
      demissao: null,
      mensagens: [],
    });
    useAchievementsStore.getState().reiniciarConquistas();
  },
}));

export function selecionarClubeUsuario(state: GameState): Clube | null {
  return state.clubes.find(clube => clube.id === state.clubeUsuarioId) ?? null;
}

export type ProximoEvento =
  | {tipo: 'treino'; data: string; partida: Partida}
  | {tipo: 'jogo'; data: string; partida: Partida}
  | {tipo: 'fim'};

/**
 * Próximo evento do calendário (estilo FIFA). Enquanto não treinar, o evento é
 * o TREINO na véspera do jogo; depois de treinar, é o JOGO. Sem próxima partida
 * (fim das 38 rodadas) => fim de temporada. Não é seletor direto do zustand
 * (cria objeto novo); derive com useMemo a partir de fatias estáveis.
 */
export function calcularProximoEvento(
  proximaPartida: Partida | null,
  treinouProximoJogo: boolean,
): ProximoEvento {
  if (!proximaPartida) {
    return {tipo: 'fim'};
  }
  if (!treinouProximoJogo) {
    return {
      tipo: 'treino',
      data: adicionarDias(proximaPartida.data, -1),
      partida: proximaPartida,
    };
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

export function useEventosUltimaPartida(): EventoPartida[] {
  const ultima = useGameStore(state => state.ultimaPartidaUsuario);

  return useMemo(() => ultima?.eventos ?? [], [ultima]);
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
