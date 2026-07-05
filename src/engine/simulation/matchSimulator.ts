import type {
  Clube,
  EstatisticasPartida,
  EventoPartida,
  Formacao,
  Partida,
  Player,
  Position,
  Tatica,
} from '../../types';

import {
  fatorPesoAssistencia,
  fatorPesoGol,
  temHabilidade,
} from '../progression/habilidades';
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
} from './matchStats';
import {
  criarRNGComSeed,
  inteiroEntre,
  limitar,
  type RandomGenerator,
} from './rng';
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
 */
export function disputarPenaltis(
  rng: RandomGenerator,
  habilidadeCasa: number,
  habilidadeFora: number,
  casaId: string,
  foraId: string,
): string {
  const probDe = (hab: number) => limitar(0.55 + hab / 300, 0.6, 0.85);
  const probCasa = probDe(habilidadeCasa);
  const probFora = probDe(habilidadeFora);
  let golsCasa = 0;
  let golsFora = 0;
  for (let i = 0; i < 5; i += 1) {
    if (rng() < probCasa) {
      golsCasa += 1;
    }
    if (rng() < probFora) {
      golsFora += 1;
    }
  }
  // Morte súbita: rodadas extras até alguém abrir vantagem na mesma rodada.
  while (golsCasa === golsFora) {
    const fezCasa = rng() < probCasa;
    const fezFora = rng() < probFora;
    if (fezCasa) {
      golsCasa += 1;
    }
    if (fezFora) {
      golsFora += 1;
    }
    if (fezCasa !== fezFora) {
      break;
    }
  }
  return golsCasa > golsFora ? casaId : foraId;
}

function pesoGol(posicao: Position): number {
  if (posicao === 'CA') {
    return 6;
  }

  if (['PD', 'PE', 'SA'].includes(posicao)) {
    return 4;
  }

  if (['MEI', 'MC'].includes(posicao)) {
    return 2;
  }

  return 0.5;
}

/** Peso de quem dá assistência: criadores/pontas pesam mais. */
function pesoAssistencia(jogador: Player): number {
  const criacao = (jogador.atributos.passe + jogador.atributos.cruzamento) / 2;
  const bonusPosicao = ['MEI', 'MC', 'PD', 'PE', 'SA'].includes(
    jogador.posicaoPrincipal,
  )
    ? 1.4
    : ['LD', 'LE', 'CA'].includes(jogador.posicaoPrincipal)
      ? 1.1
      : 0.7;
  return Math.max(0.2, (criacao / 70) * bonusPosicao);
}

function escolherJogadorPonderado(
  jogadores: Player[],
  rng: RandomGenerator,
  peso: (jogador: Player) => number,
): Player {
  const disponiveis = jogadores.filter(
    jogador => !jogador.lesionado && !jogador.suspenso,
  );
  const total = disponiveis.reduce(
    (soma, jogador) => soma + Math.max(0.1, peso(jogador)),
    0,
  );
  let cursor = rng() * total;

  for (const jogador of disponiveis) {
    cursor -= Math.max(0.1, peso(jogador));

    if (cursor <= 0) {
      return jogador;
    }
  }

  const fallback = disponiveis[0] ?? jogadores[0];

  if (!fallback) {
    throw new Error('Não há jogadores disponíveis para a simulação');
  }

  return fallback;
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

function simularEventoGol(
  minuto: number,
  clube: Clube,
  jogadores: Player[],
  rng: RandomGenerator,
): EventoPartida {
  // Autor ponderado por aptidão de FINALIZAÇÃO (não só overall): atacante
  // matador marca mais que um pé-de-obra na mesma posição.
  const autor = escolherJogadorPonderado(
    jogadores,
    rng,
    jogador =>
      pesoGol(jogador.posicaoPrincipal) *
      (jogador.atributos.finalizacao / 70) *
      fatorPesoGol(jogador),
  );

  const evento = criarEvento(
    minuto,
    'gol',
    clube.id,
    autor,
    `${autor.nome} marcou.`,
  );

  // Assistência (jogo aberto): ~70% dos gols têm um garçom diferente do autor.
  const candidatosAssist = jogadores.filter(
    jogador =>
      jogador.id !== autor.id && !jogador.lesionado && !jogador.suspenso,
  );
  if (candidatosAssist.length > 0 && rng() < 0.7) {
    const assistente = escolherJogadorPonderado(
      candidatosAssist,
      rng,
      jogador => pesoAssistencia(jogador) * fatorPesoAssistencia(jogador),
    );
    evento.jogadorAssistenciaId = assistente.id;
    evento.descricao = `${autor.nome} marcou, com assistência de ${assistente.nome}.`;
  }

  return evento;
}

function simularCartao(
  minuto: number,
  clube: Clube,
  jogadores: Player[],
  rng: RandomGenerator,
  amarelosPartida: Map<string, number>,
  fatorVermelho: number,
): EventoPartida {
  // Defensores e quem desarma muito tendem a levar mais cartão. Quem JÁ tem
  // amarelo joga com cautela (pisa no freio) → bem menos propenso a um 2º → mantém
  // os vermelhos raros mesmo com muitos amarelos (2º amarelo era ~toda expulsão).
  const jogador = escolherJogadorPonderado(jogadores, rng, atleta => {
    const base = ['ZAG', 'LD', 'LE', 'VOL'].includes(atleta.posicaoPrincipal)
      ? 2
      : 1;
    const cautela = (amarelosPartida.get(atleta.id) ?? 0) >= 1 ? 0.3 : 1;
    return base * (0.6 + atleta.atributos.desarme / 100) * cautela;
  });

  const jaTinhaAmarelo = (amarelosPartida.get(jogador.id) ?? 0) >= 1;
  // Vermelho DIRETO raro: com o volume de amarelos calibrado (~3.4/jogo) o 2º
  // amarelo já gera boa parte das expulsões — manter os vermelhos em ~0.20/jogo.
  const vermelhoDireto = rng() < limitar(0.018 * fatorVermelho, 0.012, 0.06);

  // Segundo amarelo no mesmo jogo => expulsão.
  if (vermelhoDireto || jaTinhaAmarelo) {
    return criarEvento(
      minuto,
      'cartao_vermelho',
      clube.id,
      jogador,
      jaTinhaAmarelo && !vermelhoDireto
        ? `${jogador.nome} recebeu o segundo amarelo e foi expulso.`
        : `${jogador.nome} recebeu cartão vermelho.`,
    );
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
): {evento: EventoPartida; gol: boolean} {
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

  return {evento, gol: convertido};
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
  const ofensor = escolherJogadorPonderado(jogadoresInfratores, rng, atleta => {
    const base = ['ZAG', 'LD', 'LE', 'VOL'].includes(atleta.posicaoPrincipal)
      ? 2
      : 1;
    return base * (0.6 + atleta.atributos.desarme / 100);
  });

  const sorteio = rng();
  if (sorteio >= 0.45) {
    return {ofensor};
  }
  const jaTinhaAmarelo = (amarelosPartida.get(ofensor.id) ?? 0) >= 1;
  const vermelhoDireto = sorteio < 0.06;
  if (vermelhoDireto || jaTinhaAmarelo) {
    return {
      ofensor,
      eventoCartao: criarEvento(
        minuto,
        'cartao_vermelho',
        clubeInfrator.id,
        ofensor,
        jaTinhaAmarelo && !vermelhoDireto
          ? `${ofensor.nome} cometeu o pênalti, recebeu o segundo amarelo e foi expulso.`
          : `${ofensor.nome} cometeu o pênalti e recebeu cartão vermelho.`,
      ),
    };
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
  const jogador = escolherJogadorPonderado(
    jogadores,
    rng,
    atleta => 110 - atleta.condicaoFisica,
  );

  return criarEvento(
    minuto,
    'lesao',
    clube.id,
    jogador,
    `${jogador.nome} sentiu uma lesão.`,
  );
}

function simularChance(
  minuto: number,
  clube: Clube,
  jogadores: Player[],
  rng: RandomGenerator,
): EventoPartida {
  const jogador = escolherJogadorPonderado(jogadores, rng, atleta =>
    pesoGol(atleta.posicaoPrincipal),
  );

  return criarEvento(
    minuto,
    'chance_perdida',
    clube.id,
    jogador,
    `${jogador.nome} desperdiçou uma boa chance.`,
  );
}

/**
 * Cobrança de falta perigosa (bola parada). O batedor é o ESPECIALISTA da equipe
 * (finalização + passe) — protagonismo. Gol de falta é RARO (~1 a cada 40 jogos):
 * base baixa, escalada pela qualidade do cobrador contra o goleiro adversário.
 */
function simularFaltaCobranca(
  minuto: number,
  clube: Clube,
  jogadores: Player[],
  goleiroAdversario: Player | undefined,
  rng: RandomGenerator,
): {evento: EventoPartida; gol: boolean} {
  const cobrador = escolherJogadorPonderado(
    jogadores,
    rng,
    atleta =>
      ((atleta.atributos.finalizacao * 0.6 + atleta.atributos.passe * 0.4) / 60) *
      pesoGol(atleta.posicaoPrincipal),
  );
  const qualidade = cobrador.atributos.finalizacao / 100;
  const defesaGoleiro = goleiroAdversario
    ? (goleiroAdversario.atributos.reflexos +
        goleiroAdversario.atributos.posicionamento) /
      200
    : 0.6;
  const gol = rng() < limitar(0.03 * qualidade * (1.2 - defesaGoleiro), 0.006, 0.06);
  const evento = criarEvento(
    minuto,
    gol ? 'gol' : 'falta_cobranca',
    clube.id,
    cobrador,
    gol
      ? `Golaço de falta de ${cobrador.nome}!`
      : `${cobrador.nome} cobra uma falta perigosa.`,
  );
  return {evento, gol};
}

/** Estado mutável de uma partida simulada minuto a minuto (ao vivo). */
export interface EstadoPartidaAoVivo {
  rng: RandomGenerator;
  /**
   * RNG exclusivo da disputa de posse (1 consumo por minuto). Separado do RNG
   * de eventos para que a posse não altere o sorteio de gols/cartões — o mesmo
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
   * RNG exclusivo das estatísticas avançadas (volume de chutes, faltas...).
   * Como o de posse, não toca a sequência de eventos da partida.
   */
  rngEstatisticas: RandomGenerator;
  /** Estatísticas avançadas acumuladas minuto a minuto (ver matchStats). */
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
}

export function iniciarPartidaAoVivo(seed: number): EstadoPartidaAoVivo {
  // Streams independentes: offsets grandes produzem sequências sem relação
  // com a dos eventos, mantendo o determinismo por seed.
  const rngEstatisticas = criarRNGComSeed(seed + 202_777);
  return {
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
 * Reação ao placar: quem perde se lança (cresce com o tempo e o tamanho do
 * prejuízo); quem vence administra na reta final. Empate = neutro (1.0).
 */
function fatorMomentum(diffGols: number, minuto: number): number {
  if (diffGols < 0) {
    const intensidadeTempo = 0.5 + minuto / 180; // 0.5 no início → ~1.0 no fim
    return 1 + Math.min(3, -diffGols) * 0.05 * intensidadeTempo;
  }
  if (diffGols > 0 && minuto >= 70) {
    return 0.93;
  }
  return 1;
}

/**
 * Quanto a tática MANDA ter a bola: posse de bola retém, contra-ataque e bola
 * longa abrem mão dela por escolha; pressão alta a recupera no campo do rival;
 * ritmo lento cadencia. Devolve um ajuste aditivo à fração de posse do time.
 */
function intencaoPosse(tatica: Tatica | null | undefined): number {
  if (!tatica) {
    return 0;
  }
  let intencao = 0;
  if (tatica.estiloOfensivo === 'Posse de bola') {
    intencao += 0.05;
  } else if (tatica.estiloOfensivo === 'Contra-ataque') {
    intencao -= 0.05;
  } else if (tatica.estiloOfensivo === 'Ataque direto') {
    intencao -= 0.03;
  }
  if (tatica.marcacao === 'Pressão alta') {
    intencao += 0.02;
  }
  if (tatica.ritmo === 'Lento') {
    intencao += 0.02;
  }
  return intencao;
}

/**
 * Disputa a posse do minuto e acumula a fração da CASA no estado. Nada aqui é
 * cosmético — tudo deriva do jogo REAL neste minuto:
 *  - domínio de meio-campo ATUAL (a força é recalculada minuto a minuto, então
 *    fadiga, expulsões e substituições movem a posse imediatamente);
 *  - intenção tática das duas comissões (ver `intencaoPosse`);
 *  - placar × relógio (quem perde vai atrás da bola, quem vence administra);
 *  - lances do minuto (o time que criou/marcou estava com a bola);
 *  - disputa lance-a-lance via `rngPosse` (determinística por seed, exatamente
 *    1 consumo por minuto, sem tocar no RNG de eventos).
 */
function disputarPosseMinuto(
  estado: EstadoPartidaAoVivo,
  ctx: ContextoMinuto,
  eventosDoMinuto: EventoPartida[],
): number {
  // Diferenças de força de meio são sutis (ex.: 72×66); em posse elas aparecem
  // grandes. O fator 3.2 traduz: meio 75×60 ≈ 68% de bola, times iguais = 50%.
  const meioCasa = Math.max(1, ctx.forcaCasa.meio);
  const meioFora = Math.max(1, ctx.forcaFora.meio);
  let fracaoCasa = 0.5 + (meioCasa / (meioCasa + meioFora) - 0.5) * 3.2;

  fracaoCasa +=
    intencaoPosse(ctx.timeCasa.taticaAtual) -
    intencaoPosse(ctx.timeFora.taticaAtual);

  // Placar × relógio: quem está atrás toma a iniciativa (e mais forte perto do
  // fim); o efeito espelha no adversário, que cede a bola para administrar.
  const diff = estado.placarCasa - estado.placarFora;
  if (diff !== 0) {
    const pressao =
      Math.min(3, Math.abs(diff)) * 0.02 * (0.5 + estado.minuto / 90);
    fracaoCasa += diff < 0 ? pressao : -pressao;
  }

  // Lances do minuto: gol/pênalti/chance só nascem com a bola no pé.
  for (const evento of eventosDoMinuto) {
    const pesoLance =
      evento.tipo === 'gol'
        ? 0.12
        : evento.tipo === 'penalti' || evento.tipo === 'chance_perdida'
          ? 0.08
          : 0;
    if (pesoLance > 0) {
      fracaoCasa += evento.timeId === ctx.timeCasa.id ? pesoLance : -pesoLance;
    }
  }

  // Disputa do minuto (±9%): bola dividida, erro de passe, bola parada.
  fracaoCasa += (estado.rngPosse() - 0.5) * 0.18;

  const fracaoFinal = limitar(fracaoCasa, 0.15, 0.85);
  estado.posseAcumuladaCasa += fracaoFinal;
  return fracaoFinal;
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

/** Simula UM minuto, anexa ao estado e devolve os eventos novos. */
/**
 * VAR (calibrado no laboratório de balanceamento — ver matchBalance.test.ts).
 * Dois lados, mantendo os gols na faixa-alvo (2.4–3.1):
 *  • anula uma fração dos gols de jogo aberto (impedimento);
 *  • flagra pênalti numa fração dos lances de perigo (chance narrada).
 * Os valores foram medidos antes/depois para o net ficar ~neutro (regra do
 * CLAUDE.md §14: nunca ajustar o balanceamento no escuro).
 */
const PROB_VAR_ANULA_GOL = 0.06;
const PROB_VAR_PENALTI = 0.06;
// Cobrança de falta perigosa por minuto/time → ~2.5 faltas perigosas/jogo (alvo
// 1.8–3.2). A grande maioria é lance de perigo; gol de falta é raro (~1/40 jogos).
const PROB_FALTA_POR_MINUTO = 0.014;

/** Converte um gol em evento de gol ANULADO pelo VAR (não conta no placar). */
function golAnuladoVAR(golEvento: EventoPartida): EventoPartida {
  return {
    minuto: golEvento.minuto,
    tipo: 'chance_perdida',
    timeId: golEvento.timeId,
    jogadorId: golEvento.jogadorId,
    descricao: 'VAR em ação: gol anulado por impedimento.',
  };
}

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
  const momentumCasa = fatorMomentum(diff, minuto);
  const momentumFora = fatorMomentum(-diff, minuto);

  if (emCampoCasa.length > 0 && rng() < p.probGolCasaPorMinuto * fTempo * momentumCasa) {
    const golEvento = simularEventoGol(minuto, ctx.timeCasa, emCampoCasa, rng);
    if (rng() < PROB_VAR_ANULA_GOL) {
      adicionar(golAnuladoVAR(golEvento));
    } else {
      estado.placarCasa += 1;
      adicionar(golEvento);
    }
  }
  if (emCampoFora.length > 0 && rng() < p.probGolForaPorMinuto * fTempo * momentumFora) {
    const golEvento = simularEventoGol(minuto, ctx.timeFora, emCampoFora, rng);
    if (rng() < PROB_VAR_ANULA_GOL) {
      adicionar(golAnuladoVAR(golEvento));
    } else {
      estado.placarFora += 1;
      adicionar(golEvento);
    }
  }

  const fTempoCartao = 1 + Math.max(0, minuto - 60) / 120;
  if (emCampoCasa.length > 0 && rng() < p.probCartaoCasaPorMinuto * fTempoCartao) {
    const ev = simularCartao(
      minuto,
      ctx.timeCasa,
      emCampoCasa,
      rng,
      estado.amarelosPartida,
      ctx.fatorVermelhoCasa,
    );
    if (ev.tipo === 'cartao_vermelho') {
      estado.indisponiveis.add(ev.jogadorId);
      estado.expulsos.add(ev.jogadorId);
    }
    adicionar(ev);
  }
  if (emCampoFora.length > 0 && rng() < p.probCartaoForaPorMinuto * fTempoCartao) {
    const ev = simularCartao(
      minuto,
      ctx.timeFora,
      emCampoFora,
      rng,
      estado.amarelosPartida,
      ctx.fatorVermelhoFora,
    );
    if (ev.tipo === 'cartao_vermelho') {
      estado.indisponiveis.add(ev.jogadorId);
      estado.expulsos.add(ev.jogadorId);
    }
    adicionar(ev);
  }

  if (
    emCampoCasa.length > 0 &&
    emCampoFora.length > 0 &&
    rng() < p.probPenaltiCasaPorMinuto
  ) {
    // A falta vem ANTES da cobrança: infrator do time de fora, com cartão
    // quando o lance merece (vermelho tira o jogador do resto do jogo).
    const falta = simularFaltaDoPenalti(
      minuto,
      ctx.timeFora,
      emCampoFora,
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
    const penalti = simularPenalti(minuto, ctx.timeCasa, emCampoCasa, ctx.goleiroFora, rng);
    penalti.evento.jogadorFaltaId = falta.ofensor.id;
    if (penalti.gol) {
      estado.placarCasa += 1;
    }
    adicionar(penalti.evento);
  }
  if (
    emCampoCasa.length > 0 &&
    emCampoFora.length > 0 &&
    rng() < p.probPenaltiForaPorMinuto
  ) {
    const falta = simularFaltaDoPenalti(
      minuto,
      ctx.timeCasa,
      emCampoCasa,
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
    const penalti = simularPenalti(minuto, ctx.timeFora, emCampoFora, ctx.goleiroCasa, rng);
    penalti.evento.jogadorFaltaId = falta.ofensor.id;
    if (penalti.gol) {
      estado.placarFora += 1;
    }
    adicionar(penalti.evento);
  }

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

  if (rng() < p.probChanceNarrativaPorMinuto) {
    const totalGol = p.probGolCasaPorMinuto + p.probGolForaPorMinuto;
    const pesoCasa = totalGol > 0 ? p.probGolCasaPorMinuto / totalGol : 0.5;
    const ehCasa = rng() < pesoCasa;
    const emCampoChance = ehCasa ? emCampoCasa : emCampoFora;
    // Lado sem ninguém em campo não cria a chance (evita sortear de um XI vazio).
    if (emCampoChance.length > 0) {
      adicionar(
        simularChance(
          minuto,
          ehCasa ? ctx.timeCasa : ctx.timeFora,
          emCampoChance,
          rng,
        ),
      );
      // VAR pode flagrar um pênalti no lance de perigo (a favor de quem atacou).
      if (rng() < PROB_VAR_PENALTI) {
        const emCampoDefesa = ehCasa ? emCampoFora : emCampoCasa;
        const penalti = simularPenalti(
          minuto,
          ehCasa ? ctx.timeCasa : ctx.timeFora,
          emCampoChance,
          ehCasa ? ctx.goleiroFora : ctx.goleiroCasa,
          rng,
        );
        // Infrator do time que defende (toque de mão flagrado — sem cartão).
        const ofensor =
          emCampoDefesa[Math.floor(rng() * emCampoDefesa.length)] ??
          emCampoDefesa[0];
        if (ofensor) {
          penalti.evento.jogadorFaltaId = ofensor.id;
        }
        penalti.evento.descricao = `VAR flagra pênalti! ${penalti.evento.descricao}`;
        if (penalti.gol) {
          if (ehCasa) {
            estado.placarCasa += 1;
          } else {
            estado.placarFora += 1;
          }
        }
        adicionar(penalti.evento);
      }
    }
  }

  // Cobrança de falta perigosa (bola parada): protagonismo do especialista; o
  // gol de falta é raro. Fica por ÚLTIMO nos lances para não desalinhar o consumo
  // de RNG dos blocos já calibrados (gol/cartão/pênalti/lesão/chance).
  if (emCampoCasa.length > 0 && rng() < PROB_FALTA_POR_MINUTO) {
    const falta = simularFaltaCobranca(
      minuto,
      ctx.timeCasa,
      emCampoCasa,
      ctx.goleiroFora,
      rng,
    );
    if (falta.gol) {
      estado.placarCasa += 1;
    }
    adicionar(falta.evento);
  }
  if (emCampoFora.length > 0 && rng() < PROB_FALTA_POR_MINUTO) {
    const falta = simularFaltaCobranca(
      minuto,
      ctx.timeFora,
      emCampoFora,
      ctx.goleiroCasa,
      rng,
    );
    if (falta.gol) {
      estado.placarFora += 1;
    }
    adicionar(falta.evento);
  }

  // Posse do minuto: usa a força/eventos REAIS deste minuto (nada cosmético).
  const fracaoPosseCasa = disputarPosseMinuto(estado, ctx, novos);

  // Estatísticas avançadas do minuto (xG, chutes, passes, zonas, momentum).
  acumularEstatisticasMinuto(estado.estatisticas, {
    timeCasaId: ctx.timeCasa.id,
    emCampoCasa,
    emCampoFora,
    taticaCasa: ctx.timeCasa.taticaAtual,
    taticaFora: ctx.timeFora.taticaAtual,
    probabilidades: p,
    eventosDoMinuto: novos,
    fracaoPosseCasa,
    fatorTempo: fTempo,
    momentumCasa,
    momentumFora,
    rng: estado.rngEstatisticas,
  });

  // Fadiga do minuto (sem RNG): aplica ao fim, para que o próximo ctx a reflita.
  aplicarFadiga(estado, emCampoCasa, ctx.timeCasa.taticaAtual?.ritmo ?? 'Normal');
  aplicarFadiga(estado, emCampoFora, ctx.timeFora.taticaAtual?.ritmo ?? 'Normal');

  return novos;
}

export function simularPartida(input: SimularPartidaInput): Partida {
  const estado = iniciarPartidaAoVivo(input.seed);

  for (let minuto = 1; minuto <= 90; minuto += 1) {
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
  };
}
