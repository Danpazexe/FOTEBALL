import type {
  ArbitroPartida,
  ChutePartida,
  Clube,
  EstatisticasPartida,
  EventoPartida,
  Formacao,
  Partida,
  Player,
} from '../../types';

import {pesoLesaoPartida} from '../physical/fisicoEngine';
import {
  fatorRigorArbitro,
  sortearArbitro,
  varDisponivelPartida,
} from './arbitro';
import {temHabilidade} from '../progression/habilidades';
import {
  criarChuteFaltaDireta,
  criarChutePenalti,
  gerarChancesMinutoLado,
  type ChancesMinutoLado,
} from './causal/chanceEngine';
import {INCIDENTES_CAUSAL, POSSE_CAUSAL} from './causal/matchModelConfig';
import {
  amostrarMomentoMinuto,
  criarEstadoMomento,
  type AcoesMinutoLado,
  type EstadoMomento,
} from './causal/momentumEngine';
import {disputarPosseMinutoCausal} from './causal/posseEngine';
import {escolherJogadorPonderado, pesoGolPosicao} from './causal/selecaoJogadores';
import {balizaDoPenalti} from './geometriaCampo';
import {
  calcularMando,
  calcularProbabilidades,
  type ProbabilidadesPartida,
} from './probabilityCalc';
import {
  acumularEstatisticasMinuto,
  criarEstatisticasAoVivo,
  finalizarEstatisticas,
  type EstatisticasAoVivo,
  type FatosMinutoLado,
} from './matchStats';
import {
  criarRNGComSeed,
  hashString,
  inteiroEntre,
  limitar,
  type RandomGenerator,
} from './rng';
import {simularDisputaPenaltis} from './penaltis';
import {processarSubstituicoesIA} from './substituicoesIA';
import {calcularForcaTime, type ForcaTime} from './teamStrength';

export interface SimularPartidaInput {
  timeCasa: Clube;
  timeFora: Clube;
  jogadoresCasa: Player[];
  jogadoresFora: Player[];
  seed: number;
  competicaoId?: string;
  rodada?: number;
  data?: string;
  /**
   * Mata-mata: se o jogo terminar empatado em 90', joga prorrogação e, persistindo
   * o empate, decide nos pênaltis (preenche `Partida.vencedorPenaltis`). Em liga
   * (padrão) fica falso e o empate é mantido.
   */
  desempate?: boolean;
}

function mediaOverall(jogadores: Player[]): number {
  if (jogadores.length === 0) {
    return 60;
  }
  return jogadores.reduce((soma, j) => soma + j.overall, 0) / jogadores.length;
}

/**
 * Disputa de pênaltis determinística (usa o RNG semeado da partida). Cinco
 * cobranças para cada lado e, persistindo o empate, morte súbita. A habilidade
 * dá uma leve vantagem na conversão. Retorna o id do clube vencedor.
 * Delegada a `simularDisputaPenaltis` (fonte única da regra — mesma sequência
 * de RNG), que também devolve a disputa cobrança a cobrança quando necessário.
 */
export function disputarPenaltis(
  rng: RandomGenerator,
  habilidadeCasa: number,
  habilidadeFora: number,
  casaId: string,
  foraId: string,
): string {
  return simularDisputaPenaltis(
    rng,
    habilidadeCasa,
    habilidadeFora,
    casaId,
    foraId,
  ).vencedor;
}

function criarEvento(
  minuto: number,
  tipo: EventoPartida['tipo'],
  timeId: string,
  jogador: Player,
  descricao: string,
): EventoPartida {
  return {
    minuto,
    tipo,
    timeId,
    jogadorId: jogador.id,
    descricao,
  };
}

/**
 * Peso do FALTOSO: defensores (zaga/laterais/volante) que desarmam muito tendem
 * a cometer a falta/levar o cartão. Fonte única — usada no cartão de jogo e na
 * falta que origina o pênalti.
 */
function pesoFaltosoDefensivo(atleta: Player): number {
  const base = ['ZAG', 'LD', 'LE', 'VOL'].includes(atleta.posicaoPrincipal)
    ? 2
    : 1;
  return base * (0.6 + atleta.atributos.desarme / 100);
}

function simularCartao(
  minuto: number,
  clube: Clube,
  jogadores: Player[],
  rng: RandomGenerator,
  amarelosPartida: Map<string, number>,
  fatorVermelho: number,
  fatorRigor: number,
): EventoPartida {
  // Defensores e quem desarma muito tendem a levar mais cartão. Quem JÁ tem
  // amarelo joga com cautela (pisa no freio) → bem menos propenso a um 2º → mantém
  // os vermelhos raros mesmo com muitos amarelos (2º amarelo era ~toda expulsão).
  const jogador = escolherJogadorPonderado(jogadores, rng, atleta => {
    const cautela = (amarelosPartida.get(atleta.id) ?? 0) >= 1 ? 0.3 : 1;
    return pesoFaltosoDefensivo(atleta) * cautela;
  });

  const jaTinhaAmarelo = (amarelosPartida.get(jogador.id) ?? 0) >= 1;
  // Vermelho DIRETO raro: com o volume de amarelos calibrado (~3.4/jogo) o 2º
  // amarelo já gera boa parte das expulsões — manter os vermelhos em ~0.20/jogo.
  // O rigor do árbitro entra como fator no LIMIAR (mesmo draw; ordem intacta).
  const vermelhoDireto =
    rng() < limitar(0.018 * fatorVermelho * fatorRigor, 0.012, 0.06);

  // Segundo amarelo no mesmo jogo => expulsão.
  if (vermelhoDireto || jaTinhaAmarelo) {
    const evento = criarEvento(
      minuto,
      'cartao_vermelho',
      clube.id,
      jogador,
      jaTinhaAmarelo && !vermelhoDireto
        ? `${jogador.nome} recebeu o segundo amarelo e foi expulso.`
        : `${jogador.nome} recebeu cartão vermelho.`,
    );
    if (jaTinhaAmarelo && !vermelhoDireto) {
      evento.segundoAmarelo = true;
    }
    return evento;
  }

  amarelosPartida.set(jogador.id, (amarelosPartida.get(jogador.id) ?? 0) + 1);
  return criarEvento(
    minuto,
    'cartao_amarelo',
    clube.id,
    jogador,
    `${jogador.nome} recebeu cartão amarelo.`,
  );
}

/** Goleiro disponível do time (para a cobrança de pênalti). */
function encontrarGoleiro(jogadores: Player[]): Player | undefined {
  return jogadores
    .filter(jogador => !jogador.lesionado && !jogador.suspenso)
    .find(jogador => jogador.posicaoPrincipal === 'GOL');
}

/**
 * Cobrança de pênalti (automática, para jogos da IA). A conversão depende da
 * finalização do batedor contra a qualidade do goleiro (reflexos + posiciona-
 * mento). Todo evento de pênalti carrega `penaltiData` coerente com o desfecho.
 */
function simularPenalti(
  minuto: number,
  clube: Clube,
  jogadores: Player[],
  goleiroAdversario: Player | undefined,
  rng: RandomGenerator,
): {evento: EventoPartida; gol: boolean; batedor: Player} {
  const batedor = escolherJogadorPonderado(
    jogadores,
    rng,
    atleta => atleta.atributos.finalizacao,
  );
  // Goleiro "pega-pênalti" defende mais: soma à sua qualidade efetiva,
  // derrubando a conversão e subindo a chance de defesa (BRASFOOT_MASTER §3.2).
  const bonusPegaPenalti =
    goleiroAdversario && temHabilidade(goleiroAdversario, 'GOLEIRO_PENALTI')
      ? 30
      : 0;
  const qualidadeGoleiro = goleiroAdversario
    ? goleiroAdversario.atributos.reflexos * 0.7 +
      goleiroAdversario.atributos.posicionamento * 0.3 +
      bonusPegaPenalti
    : 60;
  const probConversao = limitar(
    0.78 + (batedor.atributos.finalizacao - qualidadeGoleiro) / 320,
    0.55,
    0.93,
  );
  const convertido = rng() < probConversao;
  const defendeu =
    !convertido && rng() < limitar(0.35 + (qualidadeGoleiro - 60) / 200, 0.3, 0.8);

  const direcoes: Array<'E' | 'C' | 'D'> = ['E', 'C', 'D'];
  const direcaoChute = direcoes[inteiroEntre(rng, 0, 2)] ?? 'C';
  const alturaChute: 'A' | 'B' = rng() < 0.5 ? 'A' : 'B';
  // Goleiro acerta o canto quando defende; erra quando o pênalti entra.
  const direcaoGoleiro = defendeu
    ? direcaoChute
    : direcoes[inteiroEntre(rng, 0, 2)] ?? 'C';
  const potencia = inteiroEntre(rng, 60, 95);

  const evento = criarEvento(
    minuto,
    convertido ? 'gol' : 'penalti',
    clube.id,
    batedor,
    convertido
      ? `${batedor.nome} cobrou o pênalti e marcou!`
      : defendeu
        ? `${batedor.nome} cobrou o pênalti, mas o goleiro defendeu!`
        : `${batedor.nome} desperdiçou o pênalti, mandou para fora!`,
  );
  evento.penaltiData = {
    direcaoChute,
    alturaChute,
    direcaoGoleiro,
    convertido,
    potencia,
  };

  return {evento, gol: convertido, batedor};
}

/**
 * A falta que origina o pênalti: um defensor do time INFRATOR é apontado
 * (mesmo perfil de quem leva cartão — zaga/laterais/volante que desarmam
 * muito) e pode ser punido: amarelo na maioria das punições, vermelho direto
 * no lance desesperado e segundo amarelo expulsando. ~55% das faltas de
 * pênalti passam sem cartão (o pênalti já é a punição).
 */
function simularFaltaDoPenalti(
  minuto: number,
  clubeInfrator: Clube,
  jogadoresInfratores: Player[],
  rng: RandomGenerator,
  amarelosPartida: Map<string, number>,
): {ofensor: Player; eventoCartao?: EventoPartida} {
  const ofensor = escolherJogadorPonderado(
    jogadoresInfratores,
    rng,
    pesoFaltosoDefensivo,
  );

  const sorteio = rng();
  if (sorteio >= 0.45) {
    return {ofensor};
  }
  const jaTinhaAmarelo = (amarelosPartida.get(ofensor.id) ?? 0) >= 1;
  const vermelhoDireto = sorteio < 0.06;
  if (vermelhoDireto || jaTinhaAmarelo) {
    const eventoCartao = criarEvento(
      minuto,
      'cartao_vermelho',
      clubeInfrator.id,
      ofensor,
      jaTinhaAmarelo && !vermelhoDireto
        ? `${ofensor.nome} cometeu o pênalti, recebeu o segundo amarelo e foi expulso.`
        : `${ofensor.nome} cometeu o pênalti e recebeu cartão vermelho.`,
    );
    if (jaTinhaAmarelo && !vermelhoDireto) {
      eventoCartao.segundoAmarelo = true;
    }
    return {ofensor, eventoCartao};
  }
  amarelosPartida.set(ofensor.id, (amarelosPartida.get(ofensor.id) ?? 0) + 1);
  return {
    ofensor,
    eventoCartao: criarEvento(
      minuto,
      'cartao_amarelo',
      clubeInfrator.id,
      ofensor,
      `${ofensor.nome} cometeu o pênalti e recebeu cartão amarelo.`,
    ),
  };
}

function simularLesao(
  minuto: number,
  clube: Clube,
  jogadores: Player[],
  rng: RandomGenerator,
): EventoPartida {
  // Quem se lesiona é ponderado pelo RISCO físico real (fadiga+carga+condição+
  // idade+retorno recente) da engine física — não só pela condição (Onda 5).
  const jogador = escolherJogadorPonderado(jogadores, rng, pesoLesaoPartida);

  return criarEvento(
    minuto,
    'lesao',
    clube.id,
    jogador,
    `${jogador.nome} sentiu uma lesão.`,
  );
}

/**
 * Cobrança de falta perigosa (bola parada). O batedor é o ESPECIALISTA da equipe
 * (finalização + passe) — protagonismo. Gol de falta é RARO (~1 a cada 9 jogos,
 * taxa do futebol real): conversão média ~4.5%, alinhada ao xG da falta direta
 * (CA-17 — a probabilidade prevista tem que bater com a conversão realizada).
 */
function simularFaltaCobranca(
  minuto: number,
  clube: Clube,
  jogadores: Player[],
  goleiroAdversario: Player | undefined,
  rng: RandomGenerator,
): {evento: EventoPartida; gol: boolean; cobrador: Player} {
  const cobrador = escolherJogadorPonderado(
    jogadores,
    rng,
    atleta =>
      ((atleta.atributos.finalizacao * 0.6 + atleta.atributos.passe * 0.4) / 60) *
      pesoGolPosicao(atleta.posicaoPrincipal),
  );
  const qualidade = cobrador.atributos.finalizacao / 100;
  const defesaGoleiro = goleiroAdversario
    ? (goleiroAdversario.atributos.reflexos +
        goleiroAdversario.atributos.posicionamento) /
      200
    : 0.6;
  const gol = rng() < limitar(0.135 * qualidade * (1.2 - defesaGoleiro), 0.02, 0.1);
  const evento = criarEvento(
    minuto,
    gol ? 'gol' : 'falta_cobranca',
    clube.id,
    cobrador,
    gol
      ? `Golaço de falta de ${cobrador.nome}!`
      : `${cobrador.nome} cobra uma falta perigosa.`,
  );
  return {evento, gol, cobrador};
}

/** Estado mutável de uma partida simulada minuto a minuto (ao vivo). */
export interface EstadoPartidaAoVivo {
  rng: RandomGenerator;
  /**
   * RNG exclusivo da disputa de posse (1 consumo por minuto). Separado do RNG
   * de eventos para que a posse não altere o sorteio de lances — o mesmo
   * seed continua produzindo exatamente a mesma partida.
   */
  rngPosse: RandomGenerator;
  placarCasa: number;
  placarFora: number;
  eventos: EventoPartida[];
  amarelosPartida: Map<string, number>;
  /** Jogadores fora de combate (expulsos/lesionados) — não contam mais em campo. */
  indisponiveis: Set<string>;
  /** Condição física ATUAL por jogador (fadiga dinâmica). Vazio = usa a pré-jogo. */
  condicaoAtual: Map<string, number>;
  /** Soma das frações de posse da CASA por minuto simulado (0..1 cada). */
  posseAcumuladaCasa: number;
  /**
   * RNG de APRESENTAÇÃO (clima/temperatura). Proibido de criar fatos
   * esportivos — lances, chutes e placar saem do `rng` de eventos.
   */
  rngEstatisticas: RandomGenerator;
  /** Estatísticas acumuladas minuto a minuto (reducers do ledger). */
  estatisticas: EstatisticasAoVivo;
  /** RNG das decisões de substituição da IA (ver substituicoesIA). */
  rngSubs: RandomGenerator;
  /** Formações AO VIVO dos clubes da IA (trocas aplicadas pela engine). */
  formacoesAoVivo: Map<string, Formacao>;
  /** Expulsos na partida — NUNCA têm reposição (regra do futebol). */
  expulsos: Set<string>;
  /** Lesões aguardando a reposição da IA. */
  lesionadosPendentes: Array<{clubeId: string; jogadorId: string}>;
  /** Substituições já feitas por clube (teto de 5). */
  subsIA: Map<string, number>;
  /** Quem já saiu não volta (inclui trocas da IA). */
  sairamNaPartida: Set<string>;
  /** Clubes que já fizeram a troca ofensiva de fim de jogo. */
  cartadaOfensiva: Set<string>;
  minuto: number;
  /** LEDGER causal: todos os chutes FACTUAIS da partida (fonte do placar). */
  chutes: ChutePartida[];
  /** Sequencial de chutes (ids estáveis). */
  contadorChutes: number;
  /** Pressão ofensiva recente (Momentum de ataque). */
  momento: EstadoMomento;
  /** Árbitro da partida — derivado da SEED via hash (nenhum draw consumido). */
  arbitro: ArbitroPartida;
  /**
   * Fator do rigor do árbitro (~0.8 "deixa jogar" → ~1.25 rigoroso) aplicado
   * como multiplicador nas probs de cartão/falta ANTES dos draws existentes.
   */
  fatorRigor: number;
}

/** Contexto de um minuto: times, jogadores e probabilidades ATUAIS. */
export interface ContextoMinuto {
  timeCasa: Clube;
  timeFora: Clube;
  jogadoresCasa: Player[];
  jogadoresFora: Player[];
  /** Elencos COMPLETOS (banco incluso) — usados pelas trocas da IA. */
  elencoCasa: Player[];
  elencoFora: Player[];
  /** Força ATUAL das equipes (já com fadiga, expulsões e substituições). */
  forcaCasa: ForcaTime;
  forcaFora: ForcaTime;
  probabilidades: ProbabilidadesPartida;
  goleiroCasa: Player | undefined;
  goleiroFora: Player | undefined;
  fatorVermelhoCasa: number;
  fatorVermelhoFora: number;
  /**
   * VAR disponível NESTA partida (infraestrutura por divisão: Séries A/B sim;
   * C/D não — ver `varDisponivelPartida`). Sem VAR, as probs de anulação/
   * pênalti de VAR viram 0, mas os draws continuam consumidos (ordem intacta).
   */
  varDisponivel: boolean;
}

export function iniciarPartidaAoVivo(seed: number): EstadoPartidaAoVivo {
  // Streams independentes: offsets grandes produzem sequências sem relação
  // com a dos eventos, mantendo o determinismo por seed.
  const rngEstatisticas = criarRNGComSeed(seed + 202_777);
  // Árbitro derivado da seed via hash — NÃO consome draw de nenhum stream, e
  // por vir da mesma seed é idêntico no ao vivo e no simularPartida (paridade).
  const arbitro = sortearArbitro(seed);
  return {
    arbitro,
    fatorRigor: fatorRigorArbitro(arbitro.rigor),
    rng: criarRNGComSeed(seed),
    rngPosse: criarRNGComSeed(seed + 101_159),
    placarCasa: 0,
    placarFora: 0,
    eventos: [],
    amarelosPartida: new Map<string, number>(),
    indisponiveis: new Set<string>(),
    condicaoAtual: new Map<string, number>(),
    posseAcumuladaCasa: 0,
    rngEstatisticas,
    estatisticas: criarEstatisticasAoVivo(rngEstatisticas),
    rngSubs: criarRNGComSeed(seed + 303_949),
    formacoesAoVivo: new Map<string, Formacao>(),
    expulsos: new Set<string>(),
    lesionadosPendentes: [],
    subsIA: new Map<string, number>(),
    sairamNaPartida: new Set<string>(),
    cartadaOfensiva: new Set<string>(),
    minuto: 0,
    chutes: [],
    contadorChutes: 0,
    momento: criarEstadoMomento(),
  };
}

/** Times que jogam mais agressivo provocam mais expulsões diretas. */
function fatorVermelhoTatica(clube: Clube): number {
  const tatica = clube.taticaAtual;
  let fator = 1;
  if (tatica?.marcacao === 'Pressão alta') {
    fator += 0.6;
  } else if (tatica?.marcacao === 'Individual') {
    fator += 0.3;
  }
  if (tatica?.ritmo === 'Intenso') {
    fator += 0.2;
  }
  return fator;
}

/**
 * Recalcula força + probabilidades a partir do estado ATUAL dos times. Chamado
 * a cada minuto na simulação ao vivo, então substituições/táticas do usuário,
 * expulsões, lesões e fadiga influenciam o resto do jogo. Passe `estado` para
 * que indisponíveis e condição física atual sejam considerados.
 */
export function calcularContextoMinuto(
  timeCasa: Clube,
  timeFora: Clube,
  jogadoresCasa: Player[],
  jogadoresFora: Player[],
  estado?: EstadoPartidaAoVivo,
): ContextoMinuto {
  if (
    !timeCasa.formacaoAtual ||
    !timeCasa.taticaAtual ||
    !timeFora.formacaoAtual ||
    !timeFora.taticaAtual
  ) {
    throw new Error('Clube sem formação ou tática para a simulação');
  }
  const opcoesBase = estado
    ? {indisponiveis: estado.indisponiveis, condicaoAtual: estado.condicaoAtual}
    : {};
  // Formações AO VIVO: as trocas da IA vivem no estado (a formação persistida
  // do clube não muda); o time do usuário troca via store (formacaoAtual).
  const formacaoCasa =
    estado?.formacoesAoVivo.get(timeCasa.id) ?? timeCasa.formacaoAtual;
  const formacaoFora =
    estado?.formacoesAoVivo.get(timeFora.id) ?? timeFora.formacaoAtual;
  // Capitão é POR TIME — cada lado ganha o bônus de liderança do seu capitão.
  const forcaCasa = calcularForcaTime(formacaoCasa, jogadoresCasa, timeCasa.taticaAtual, {
    ...opcoesBase,
    capitaoId: timeCasa.capitaoId,
  });
  const forcaFora = calcularForcaTime(formacaoFora, jogadoresFora, timeFora.taticaAtual, {
    ...opcoesBase,
    capitaoId: timeFora.capitaoId,
  });

  // Autores de lances (gols/cartões/lesões/pênaltis) só podem ser os que estão
  // EM CAMPO agora — não o elenco inteiro. Quem foi substituído, expulso ou
  // lesionado não marca/leva cartão, e a súmula credita só quem jogou.
  const indisponiveis = estado?.indisponiveis;
  const titularesEmCampo = (formacao: Formacao, todos: Player[]): Player[] => {
    const porId = new Map(todos.map(jogador => [jogador.id, jogador]));
    // Exclui também lesionados/suspensos PRÉ-jogo (não só os que saíram durante
    // a partida): um suspenso escalado não pode ganhar passes/finalizações nas
    // estatísticas de quem jogou.
    return formacao.titulares
      .map(titular => porId.get(titular.jogadorId))
      .filter(
        (jogador): jogador is Player =>
          jogador !== undefined &&
          !jogador.lesionado &&
          !jogador.suspenso &&
          !indisponiveis?.has(jogador.id),
      );
  };
  const emCampoCasa = titularesEmCampo(formacaoCasa, jogadoresCasa);
  const emCampoFora = titularesEmCampo(formacaoFora, jogadoresFora);

  return {
    timeCasa,
    timeFora,
    jogadoresCasa: emCampoCasa,
    jogadoresFora: emCampoFora,
    elencoCasa: jogadoresCasa,
    elencoFora: jogadoresFora,
    forcaCasa,
    forcaFora,
    probabilidades: calcularProbabilidades(
      forcaCasa,
      forcaFora,
      timeCasa.taticaAtual,
      timeFora.taticaAtual,
      calcularMando(timeCasa.estadio.capacidade, timeCasa.reputacao),
    ),
    goleiroCasa: encontrarGoleiro(emCampoCasa),
    goleiroFora: encontrarGoleiro(emCampoFora),
    fatorVermelhoCasa: fatorVermelhoTatica(timeCasa),
    fatorVermelhoFora: fatorVermelhoTatica(timeFora),
    // Divisão dos DOIS clubes decide a cabine de VAR — mesma derivação nos
    // dois caminhos de simulação (ao vivo e headless), paridade garantida.
    varDisponivel: varDisponivelPartida(timeCasa.divisao, timeFora.divisao),
  };
}

/** Ids dos titulares DISPONÍVEIS no apito — vira o snapshot da súmula. */
export function idsTitularesDisponiveis(
  clube: Clube,
  jogadores: Player[],
): string[] {
  const porId = new Map(jogadores.map(jogador => [jogador.id, jogador]));
  return (clube.formacaoAtual?.titulares ?? [])
    .map(titular => porId.get(titular.jogadorId))
    .filter(
      (jogador): jogador is Player =>
        jogador !== undefined && !jogador.lesionado && !jogador.suspenso,
    )
    .map(jogador => jogador.id);
}

/** Reta final do jogo é mais aberta: mais gols nos últimos 20 minutos. */
function fatorTempo(minuto: number): number {
  // Começo cauteloso: os times se estudam nos primeiros ~20' (menos gol cedo, pra
  // o jogo não se decidir no começo). Depois normaliza; a partir dos 70' abre
  // (cansaço/pressão) e sobe até ~1.2 no fim. Calibrado p/ "gol no 1ºT ~62%,
  // <15' ~22%, >75' ~36%" (ver medição de linha do tempo).
  const inicioCauteloso = minuto <= 25 ? 0.45 + (minuto / 25) * 0.55 : 1;
  // Fim de jogo mais aberto (cansaço/desespero) — redistribui gols do começo para
  // o fim, sem derrubar o total. Pico ~+0.33 aos 90'.
  return inicioCauteloso + Math.max(0, minuto - 65) / 75;
}

/**
 * URGÊNCIA PELO PLACAR (era `fatorMomentum` — renomeado: isto NÃO é o Momentum
 * visual, e sim a reação tática ao placar): quem perde se lança e cria mais
 * (cresce com o tempo e o tamanho do prejuízo); quem vence administra na reta
 * final. Empate = neutro (1.0). Multiplica a CRIAÇÃO de chances, nunca a
 * conversão de um chute já criado.
 */
export function fatorUrgenciaPlacar(diffGols: number, minuto: number): number {
  if (diffGols < 0) {
    const intensidadeTempo = 0.5 + minuto / 180; // 0.5 no início → ~1.0 no fim
    return 1 + Math.min(3, -diffGols) * 0.05 * intensidadeTempo;
  }
  if (diffGols > 0 && minuto >= 70) {
    return 0.93;
  }
  return 1;
}

/** Fecha as estatísticas avançadas do estado para persistir na Partida. */
export function calcularEstatisticasFinais(
  estado: EstadoPartidaAoVivo,
): EstatisticasPartida {
  return finalizarEstatisticas(estado.estatisticas);
}

/**
 * Posse acumulada (%) até o minuto atual — o número que uma transmissão
 * mostraria agora. 50/50 antes de a bola rolar; sempre soma 100.
 */
export function calcularPossePartida(estado: EstadoPartidaAoVivo): {
  casa: number;
  fora: number;
} {
  if (estado.minuto <= 0) {
    return {casa: 50, fora: 50};
  }
  const casa = Math.round((estado.posseAcumuladaCasa / estado.minuto) * 100);
  const casaLimitada = limitar(casa, 15, 85);
  return {casa: casaLimitada, fora: 100 - casaLimitada};
}

/** Desgaste físico por minuto; resistência alta poupa, ritmo intenso cobra. */
function decairCondicao(
  condicao: number,
  resistencia: number,
  ritmo: string,
): number {
  const base = 0.16 + (100 - resistencia) * 0.0022;
  const fatorRitmo = ritmo === 'Intenso' ? 1.3 : ritmo === 'Lento' ? 0.85 : 1;
  return Math.max(40, condicao - base * fatorRitmo);
}

/** Aplica a fadiga do minuto aos jogadores em campo de um lado. */
function aplicarFadiga(
  estado: EstadoPartidaAoVivo,
  jogadores: Player[],
  ritmo: string,
): void {
  for (const jogador of jogadores) {
    const atual = estado.condicaoAtual.get(jogador.id) ?? jogador.condicaoFisica;
    estado.condicaoAtual.set(
      jogador.id,
      decairCondicao(atual, jogador.atributos.resistencia, ritmo),
    );
  }
}

/**
 * Converte os CHUTES do minuto em eventos de timeline/narração. O evento é a
 * APRESENTAÇÃO do fato (o fato é o chute no ledger): gol, gol contra, gol
 * anulado, bola na trave e grande chance desperdiçada. Chutes "comuns" que não
 * renderiam narração continuam apenas nas estatísticas.
 */
function eventosDosChutes(
  chutes: ChutePartida[],
  clube: Clube,
  emCampo: Player[],
  emCampoAdversario: Player[],
  goleiroAdversario: Player | undefined,
): EventoPartida[] {
  const porId = new Map(
    [...emCampo, ...emCampoAdversario].map(jogador => [jogador.id, jogador]),
  );
  const eventos: EventoPartida[] = [];

  for (const chute of chutes) {
    const autor = porId.get(chute.jogadorId);
    if (!autor) {
      continue;
    }

    if (chute.resultado === 'gol') {
      if (chute.golContra === true) {
        const evento = criarEvento(
          chute.minuto,
          'gol_contra',
          clube.id,
          autor,
          `Gol contra de ${autor.nome}!`,
        );
        evento.chuteId = chute.id;
        eventos.push(evento);
        continue;
      }
      const assistente =
        chute.assistenciaId !== undefined
          ? porId.get(chute.assistenciaId)
          : undefined;
      const descricao =
        chute.falhaGoleiro === true
          ? goleiroAdversario
            ? `${autor.nome} marcou após falha do goleiro ${goleiroAdversario.nome}!`
            : `${autor.nome} marcou após falha do goleiro!`
          : assistente
            ? `${autor.nome} marcou, com assistência de ${assistente.nome}.`
            : `${autor.nome} marcou.`;
      const evento = criarEvento(chute.minuto, 'gol', clube.id, autor, descricao);
      evento.chuteId = chute.id;
      if (chute.falhaGoleiro === true) {
        evento.falhaGoleiro = true;
      } else if (assistente) {
        evento.jogadorAssistenciaId = assistente.id;
      }
      eventos.push(evento);
    } else if (chute.resultado === 'gol_anulado') {
      const evento = criarEvento(
        chute.minuto,
        'chance_perdida',
        clube.id,
        autor,
        'VAR em ação: gol anulado por impedimento.',
      );
      evento.chuteId = chute.id;
      evento.anuladoVAR = true;
      eventos.push(evento);
    } else if (chute.resultado === 'trave') {
      const evento = criarEvento(
        chute.minuto,
        'bola_trave',
        clube.id,
        autor,
        `${autor.nome} acertou a trave!`,
      );
      evento.chuteId = chute.id;
      eventos.push(evento);
    } else if (chute.grandeChance) {
      const evento = criarEvento(
        chute.minuto,
        'chance_perdida',
        clube.id,
        autor,
        `${autor.nome} desperdiçou uma boa chance.`,
      );
      evento.chuteId = chute.id;
      eventos.push(evento);
    }
  }

  return eventos;
}

/** Baliza do pênalti a partir da direção/altura REAIS da cobrança. */
export function simularMinuto(
  estado: EstadoPartidaAoVivo,
  ctx: ContextoMinuto,
): EventoPartida[] {
  estado.minuto += 1;
  const minuto = estado.minuto;
  const rng = estado.rng;
  const p = ctx.probabilidades;
  const novos: EventoPartida[] = [];
  const adicionar = (evento: EventoPartida) => {
    estado.eventos.push(evento);
    novos.push(evento);
  };

  // Apenas quem está realmente em campo (exclui indisponíveis recém-saídos).
  const emCampoCasa = ctx.jogadoresCasa.filter(j => !estado.indisponiveis.has(j.id));
  const emCampoFora = ctx.jogadoresFora.filter(j => !estado.indisponiveis.has(j.id));

  const fTempo = fatorTempo(minuto);
  const diff = estado.placarCasa - estado.placarFora;
  const urgenciaCasa = fatorUrgenciaPlacar(diff, minuto);
  const urgenciaFora = fatorUrgenciaPlacar(-diff, minuto);

  // ETAPA 1 — POSSE DE CONTROLE (antes de qualquer lance; causa, não
  // consequência): é ela que alimenta a criação de chances do minuto.
  const fracaoControleCasa = disputarPosseMinutoCausal({
    forcaCasa: ctx.forcaCasa,
    forcaFora: ctx.forcaFora,
    taticaCasa: ctx.timeCasa.taticaAtual,
    taticaFora: ctx.timeFora.taticaAtual,
    diferencaPlacar: diff,
    minuto,
    rngPosse: estado.rngPosse,
  });

  // Contadores factuais do minuto (alimentam reducers e Momentum). Pênaltis e
  // cobranças de falta NÃO têm contador próprio: são ChutePartida e entram no
  // Momentum pela ameaça do próprio chute (via fatos*.chutes) — sem dupla
  // contagem (CA-07).
  const fatosCasa: FatosMinutoLado = {chutes: [], escanteios: 0, impedimentos: 0, faltas: 0};
  const fatosFora: FatosMinutoLado = {chutes: [], escanteios: 0, impedimentos: 0, faltas: 0};

  const registrarChute = (chute: ChutePartida, ehCasa: boolean) => {
    estado.chutes.push(chute);
    (ehCasa ? fatosCasa : fatosFora).chutes.push(chute);
  };

  const proximoSequencial = () => {
    estado.contadorChutes += 1;
    return estado.contadorChutes;
  };

  // Converte a cobrança RESOLVIDA num chute do ledger + crédito de gol + evento
  // (dedup entre o pênalti de VAR e o de lance). NÃO consome RNG — a extração
  // não altera a ordem dos sorteios.
  const registrarCobrancaPenalti = (
    penalti: {evento: EventoPartida; gol: boolean; batedor: Player},
    ehCasa: boolean,
    timeId: string,
    goleiroId: string | undefined,
  ) => {
    const dados = penalti.evento.penaltiData;
    const defendido =
      dados !== undefined &&
      !dados.convertido &&
      dados.direcaoGoleiro === dados.direcaoChute;
    const baliza = dados ? balizaDoPenalti(dados) : {golX: 0.5, golY: 0.4};
    const chute = criarChutePenalti({
      minuto,
      timeId,
      batedor: penalti.batedor,
      goleiroId,
      convertido: penalti.gol,
      defendido,
      sequencial: proximoSequencial(),
      golX: baliza.golX,
      golY: baliza.golY,
    });
    registrarChute(chute, ehCasa);
    penalti.evento.chuteId = chute.id;
    if (penalti.gol) {
      if (ehCasa) {
        estado.placarCasa += 1;
      } else {
        estado.placarFora += 1;
      }
    }
    adicionar(penalti.evento);
  };

  // ETAPA 2 — CHANCES → CHUTES → RESOLUÇÃO (o gol SÓ nasce aqui).
  const processarLado = (ehCasa: boolean): ChancesMinutoLado => {
    const emCampo = ehCasa ? emCampoCasa : emCampoFora;
    const emCampoAdv = ehCasa ? emCampoFora : emCampoCasa;
    const chances = gerarChancesMinutoLado({
      minuto,
      timeId: ehCasa ? ctx.timeCasa.id : ctx.timeFora.id,
      emCampo,
      emCampoAdversario: emCampoAdv,
      goleiroAdversario: ehCasa ? ctx.goleiroFora : ctx.goleiroCasa,
      tatica: ehCasa ? ctx.timeCasa.taticaAtual : ctx.timeFora.taticaAtual,
      taticaAdversario: ehCasa
        ? ctx.timeFora.taticaAtual
        : ctx.timeCasa.taticaAtual,
      forca: ehCasa ? ctx.forcaCasa : ctx.forcaFora,
      forcaAdversario: ehCasa ? ctx.forcaFora : ctx.forcaCasa,
      xgAlvoMinuto:
        (ehCasa ? p.xgBaseCasaPorMinuto : p.xgBaseForaPorMinuto) *
        fTempo *
        (ehCasa ? urgenciaCasa : urgenciaFora),
      fracaoPosse: ehCasa ? fracaoControleCasa : 1 - fracaoControleCasa,
      rng,
      proximoSequencial,
      // Arbitragem: rigor modula a prob de falta comum; sem VAR a prob de
      // anulação vira 0 (o draw continua consumido — ordem intacta).
      fatorRigor: estado.fatorRigor,
      varDisponivel: ctx.varDisponivel,
    });

    const lado = ehCasa ? fatosCasa : fatosFora;
    lado.escanteios += chances.escanteios;
    lado.impedimentos += chances.impedimentos;
    lado.faltas += chances.faltasComuns;
    for (const chute of chances.chutes) {
      registrarChute(chute, ehCasa);
    }
    if (ehCasa) {
      estado.placarCasa += chances.gols;
    } else {
      estado.placarFora += chances.gols;
    }
    for (const evento of eventosDosChutes(
      chances.chutes,
      ehCasa ? ctx.timeCasa : ctx.timeFora,
      emCampo,
      emCampoAdv,
      ehCasa ? ctx.goleiroFora : ctx.goleiroCasa,
    )) {
      adicionar(evento);
    }
    return chances;
  };

  const chancesCasa = processarLado(true);
  const chancesFora = processarLado(false);

  // ETAPA 2b — VAR flagra pênalti na revisão de uma grande chance (toque de
  // mão na jogada). Opera sobre lance EXISTENTE do ledger (RF-17).
  const processarVarPenalti = (chances: ChancesMinutoLado, ehCasa: boolean) => {
    const emCampoAtaque = ehCasa ? emCampoCasa : emCampoFora;
    const emCampoDefesa = ehCasa ? emCampoFora : emCampoCasa;
    if (emCampoAtaque.length === 0 || emCampoDefesa.length === 0) {
      return;
    }
    const chanceRevisavel = chances.chutes.find(
      chute =>
        chute.grandeChance &&
        chute.resultado !== 'gol' &&
        chute.resultado !== 'gol_anulado',
    );
    // Sem VAR na divisão: prob ×0, mas o draw é consumido do MESMO jeito que
    // hoje (só ocorre quando há chance revisável) — ordem dos sorteios intacta.
    const probVarPenalti =
      INCIDENTES_CAUSAL.probVarPenalti * (ctx.varDisponivel ? 1 : 0);
    if (!chanceRevisavel || rng() >= probVarPenalti) {
      return;
    }
    const clube = ehCasa ? ctx.timeCasa : ctx.timeFora;
    const goleiroAdv = ehCasa ? ctx.goleiroFora : ctx.goleiroCasa;
    const penalti = simularPenalti(minuto, clube, emCampoAtaque, goleiroAdv, rng);
    const ofensor =
      emCampoDefesa[Math.floor(rng() * emCampoDefesa.length)] ?? emCampoDefesa[0];
    if (ofensor) {
      penalti.evento.jogadorFaltaId = ofensor.id;
    }
    penalti.evento.descricao = `VAR flagra pênalti! ${penalti.evento.descricao}`;
    penalti.evento.varFlagra = true;
    registrarCobrancaPenalti(penalti, ehCasa, clube.id, goleiroAdv?.id);
  };
  processarVarPenalti(chancesCasa, true);
  processarVarPenalti(chancesFora, false);

  // ETAPA 3 — CARTÕES (incidentes disciplinares). O rigor do árbitro entra
  // como fator no LIMIAR dos draws já existentes (mesmos draws, ordem intacta).
  const fTempoCartao = 1 + Math.max(0, minuto - 60) / 120;
  if (
    emCampoCasa.length > 0 &&
    rng() < p.probCartaoCasaPorMinuto * fTempoCartao * estado.fatorRigor
  ) {
    const ev = simularCartao(
      minuto,
      ctx.timeCasa,
      emCampoCasa,
      rng,
      estado.amarelosPartida,
      ctx.fatorVermelhoCasa,
      estado.fatorRigor,
    );
    if (ev.tipo === 'cartao_vermelho') {
      estado.indisponiveis.add(ev.jogadorId);
      estado.expulsos.add(ev.jogadorId);
    }
    adicionar(ev);
  }
  if (
    emCampoFora.length > 0 &&
    rng() < p.probCartaoForaPorMinuto * fTempoCartao * estado.fatorRigor
  ) {
    const ev = simularCartao(
      minuto,
      ctx.timeFora,
      emCampoFora,
      rng,
      estado.amarelosPartida,
      ctx.fatorVermelhoFora,
      estado.fatorRigor,
    );
    if (ev.tipo === 'cartao_vermelho') {
      estado.indisponiveis.add(ev.jogadorId);
      estado.expulsos.add(ev.jogadorId);
    }
    adicionar(ev);
  }

  // ETAPA 4 — PÊNALTIS de jogo (falta na área): a falta vem antes da cobrança,
  // o infrator pode ser punido, e a cobrança vira um CHUTE do ledger.
  const processarPenaltiLance = (ehCasa: boolean) => {
    const emCampoAtaque = ehCasa ? emCampoCasa : emCampoFora;
    const emCampoDefesa = ehCasa ? emCampoFora : emCampoCasa;
    if (emCampoAtaque.length === 0 || emCampoDefesa.length === 0) {
      return;
    }
    const probLance = ehCasa ? p.probPenaltiCasaPorMinuto : p.probPenaltiForaPorMinuto;
    if (rng() >= probLance) {
      return;
    }
    const clubeAtaque = ehCasa ? ctx.timeCasa : ctx.timeFora;
    const clubeDefesa = ehCasa ? ctx.timeFora : ctx.timeCasa;
    const falta = simularFaltaDoPenalti(
      minuto,
      clubeDefesa,
      emCampoDefesa,
      rng,
      estado.amarelosPartida,
    );
    if (falta.eventoCartao) {
      if (falta.eventoCartao.tipo === 'cartao_vermelho') {
        estado.indisponiveis.add(falta.eventoCartao.jogadorId);
        estado.expulsos.add(falta.eventoCartao.jogadorId);
      }
      adicionar(falta.eventoCartao);
    }
    const goleiroAdv = ehCasa ? ctx.goleiroFora : ctx.goleiroCasa;
    const penalti = simularPenalti(minuto, clubeAtaque, emCampoAtaque, goleiroAdv, rng);
    penalti.evento.jogadorFaltaId = falta.ofensor.id;
    registrarCobrancaPenalti(penalti, ehCasa, clubeAtaque.id, goleiroAdv?.id);
  };
  processarPenaltiLance(true);
  processarPenaltiLance(false);

  // ETAPA 5 — LESÕES.
  if (emCampoCasa.length > 0 && rng() < p.probLesaoCasaPorMinuto) {
    const ev = simularLesao(minuto, ctx.timeCasa, emCampoCasa, rng);
    estado.indisponiveis.add(ev.jogadorId);
    estado.lesionadosPendentes.push({
      clubeId: ctx.timeCasa.id,
      jogadorId: ev.jogadorId,
    });
    adicionar(ev);
  }
  if (emCampoFora.length > 0 && rng() < p.probLesaoForaPorMinuto) {
    const ev = simularLesao(minuto, ctx.timeFora, emCampoFora, rng);
    estado.indisponiveis.add(ev.jogadorId);
    estado.lesionadosPendentes.push({
      clubeId: ctx.timeFora.id,
      jogadorId: ev.jogadorId,
    });
    adicionar(ev);
  }

  // Substituições da IA (lesão/fadiga/placar): o técnico adversário trabalha.
  // A troca entra na súmula e vale a partir do próximo contexto de minuto.
  for (const troca of processarSubstituicoesIA(estado, ctx)) {
    adicionar(troca);
  }

  // ETAPA 6 — COBRANÇA DE FALTA PERIGOSA (bola parada; chute real do ledger).
  const processarFaltaCobranca = (ehCasa: boolean) => {
    const emCampo = ehCasa ? emCampoCasa : emCampoFora;
    if (emCampo.length === 0 || rng() >= INCIDENTES_CAUSAL.probFaltaPerigosaPorMinuto) {
      return;
    }
    const clube = ehCasa ? ctx.timeCasa : ctx.timeFora;
    const goleiroAdv = ehCasa ? ctx.goleiroFora : ctx.goleiroCasa;
    const falta = simularFaltaCobranca(minuto, clube, emCampo, goleiroAdv, rng);
    const chute = criarChuteFaltaDireta({
      minuto,
      timeId: clube.id,
      cobrador: falta.cobrador,
      goleiroId: goleiroAdv?.id,
      gol: falta.gol,
      sequencial: proximoSequencial(),
      rng,
    });
    registrarChute(chute, ehCasa);
    falta.evento.chuteId = chute.id;
    // A falta sofrida foi do adversário (a cobrança existe porque houve falta).
    (ehCasa ? fatosFora : fatosCasa).faltas += 1;
    if (ehCasa) {
      if (falta.gol) {
        estado.placarCasa += 1;
      }
    } else if (falta.gol) {
      estado.placarFora += 1;
    }
    adicionar(falta.evento);
  };
  processarFaltaCobranca(true);
  processarFaltaCobranca(false);

  // POSSE MEDIDA do minuto: controle + tempo das sequências ofensivas que
  // terminaram em chute. O crédito é função da CHANCE (igual com gol ou sem
  // gol) — contabilidade da sequência real, nunca retroação do placar.
  const fracaoPosseCasa = limitar(
    fracaoControleCasa +
      fatosCasa.chutes.length * POSSE_CAUSAL.creditoSequenciaChute -
      fatosFora.chutes.length * POSSE_CAUSAL.creditoSequenciaChute,
    0.15,
    0.85,
  );
  estado.posseAcumuladaCasa += fracaoPosseCasa;

  // ETAPA 7 — REDUCERS: estatísticas derivadas dos fatos do minuto.
  acumularEstatisticasMinuto(estado.estatisticas, {
    timeCasaId: ctx.timeCasa.id,
    emCampoCasa,
    emCampoFora,
    taticaCasa: ctx.timeCasa.taticaAtual,
    taticaFora: ctx.timeFora.taticaAtual,
    eventosDoMinuto: novos,
    fatosCasa,
    fatosFora,
    fracaoPosseCasa,
    urgenciaCasa,
    urgenciaFora,
  });

  // ETAPA 8 — MOMENTUM: pressão ofensiva recente derivada das ações reais.
  // Pênaltis/faltas cobradas já estão em fatos*.chutes (a ameaça vem do xG do
  // chute) — nada de bônus separado, senão a barra contaria o lance duas vezes.
  const acoesCasa: AcoesMinutoLado = {
    chutes: fatosCasa.chutes,
    escanteios: fatosCasa.escanteios,
    fracaoPosse: fracaoPosseCasa,
  };
  const acoesFora: AcoesMinutoLado = {
    chutes: fatosFora.chutes,
    escanteios: fatosFora.escanteios,
    fracaoPosse: 1 - fracaoPosseCasa,
  };
  estado.estatisticas.momentumPorMinuto.push(
    amostrarMomentoMinuto(estado.momento, acoesCasa, acoesFora),
  );

  // Fadiga do minuto (sem RNG): aplica ao fim, para que o próximo ctx a reflita.
  aplicarFadiga(estado, emCampoCasa, ctx.timeCasa.taticaAtual?.ritmo ?? 'Normal');
  aplicarFadiga(estado, emCampoFora, ctx.timeFora.taticaAtual?.ritmo ?? 'Normal');

  return novos;
}

/**
 * Minutos de acréscimo do 2º tempo (2–5), DETERMINÍSTICOS pela seed da partida.
 * Fonte única usada por TODOS os caminhos de simulação (headless, ao vivo, preview
 * dos outros jogos) — garante que a mesma partida tenha sempre a mesma duração e o
 * mesmo placar, mantendo o invariante "ao vivo == simularPartida".
 */
export function acrescimosDaSeed(seed: number): number {
  return 2 + (hashString(`${seed}_acrescimos`) % 4);
}

export function simularPartida(input: SimularPartidaInput): Partida {
  const estado = iniciarPartidaAoVivo(input.seed);
  const totalMinutos = 90 + acrescimosDaSeed(input.seed);

  for (let minuto = 1; minuto <= totalMinutos; minuto += 1) {
    // Recalcula o contexto a cada minuto: expulsões, lesões e fadiga passam a
    // valer no resto do jogo (paridade com o modo ao vivo).
    const ctx = calcularContextoMinuto(
      input.timeCasa,
      input.timeFora,
      input.jogadoresCasa,
      input.jogadoresFora,
      estado,
    );
    simularMinuto(estado, ctx);
  }

  // Mata-mata empatado: prorrogação (91'–120') e, persistindo, pênaltis.
  let vencedorPenaltis: string | undefined;
  if (input.desempate && estado.placarCasa === estado.placarFora) {
    for (let minuto = 91; minuto <= 120; minuto += 1) {
      const ctx = calcularContextoMinuto(
        input.timeCasa,
        input.timeFora,
        input.jogadoresCasa,
        input.jogadoresFora,
        estado,
      );
      simularMinuto(estado, ctx);
    }
    if (estado.placarCasa === estado.placarFora) {
      vencedorPenaltis = disputarPenaltis(
        estado.rng,
        mediaOverall(input.jogadoresCasa),
        mediaOverall(input.jogadoresFora),
        input.timeCasa.id,
        input.timeFora.id,
      );
    }
  }

  const posse = calcularPossePartida(estado);

  return {
    id: `match_${input.timeCasa.id}_${input.timeFora.id}_${input.seed}_${inteiroEntre(
      estado.rng,
      1000,
      9999,
    )}`,
    competicaoId: input.competicaoId ?? 'amistoso',
    rodada: input.rodada ?? 1,
    data: input.data ?? '2026-01-01',
    timeCasa: input.timeCasa.id,
    timeFora: input.timeFora.id,
    placarCasa: estado.placarCasa,
    placarFora: estado.placarFora,
    eventos: estado.eventos.sort((a, b) => a.minuto - b.minuto),
    jogada: true,
    modoJogado: 'simulado',
    posseCasa: posse.casa,
    posseFora: posse.fora,
    estatisticas: calcularEstatisticasFinais(estado),
    titularesCasa: idsTitularesDisponiveis(input.timeCasa, input.jogadoresCasa),
    titularesFora: idsTitularesDisponiveis(input.timeFora, input.jogadoresFora),
    vencedorPenaltis,
    engineVersion: 2,
    qualidadeDados: 'causal_full',
    chutes: [...estado.chutes].sort((a, b) => a.minuto - b.minuto),
    // Derivado da MESMA seed em iniciarPartidaAoVivo — paridade automática
    // entre este caminho headless e o modo ao vivo.
    arbitro: estado.arbitro,
  };
}
