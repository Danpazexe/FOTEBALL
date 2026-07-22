/**
 * reconstruirLanceMinuto — o jogo VIVO do radar, minuto a minuto.
 *
 * Mesmo padrão do replay de gol ("reconstrução DERIVADA, nunca persistida"):
 * funções PURAS e DETERMINÍSTICAS que leem o que a engine JÁ produziu e
 * derivam (1) a posição dos 22 jogadores no campo e (2) a sequência de TOQUES
 * do minuto entre jogadores reais — a bola sempre "pega" em alguém visível.
 *
 * O que é FATO (vem da engine, nunca inventado):
 *  • quem está em campo (titulares vigentes, com substituições/expulsões);
 *  • a ÂNCORA de formação de cada jogador (slot real da escalação —
 *    `coordenadaDoTitular`, a mesma fonte da tela de tática);
 *  • o momento do minuto (amostra real de `momentumPorMinuto`) — decide quem
 *    fica com a bola e desliza o BLOCO dos times (linha alta/baixa);
 *  • o evento âncora do minuto: chute nas coordenadas REAIS do ledger causal,
 *    cartão/lesão sobre o jogador real, autor/assistente reais.
 *
 * JOGADA NUNCA NASCE DO NADA (âncoras de reinício, derivadas do fato que
 * encerrou o minuto anterior via `fimDoLance`):
 *  • gol ⇒ pontapé de saída do CENTRO pelo time que SOFREU;
 *  • chute defendido/pra fora ⇒ tiro de meta/reposição do GOLEIRO adversário,
 *    com saída DE TRÁS (defesa toca antes do meio);
 *  • escanteio ⇒ cobrado do canto real;
 *  • posse roubada ⇒ desarme/interceptação VISÍVEL no ponto da bola (na faixa
 *    da linha lateral vira cobrança de lateral dali);
 *  • início de tempo ⇒ kickoff do centro (1ºT casa, 2ºT visitante);
 *  • mesma posse ⇒ o portador segue de onde parou.
 *
 * DENSIDADE: o minuto rende uma sequência CONTÍNUA de ~5–10 toques (passes,
 * conduções, dribles, recuo ao goleiro, inversão de lado por lançamento). A
 * cadência em tempo REAL é da UI, que estica/encolhe as durações para
 * preencher o minuto do relógio da partida.
 *
 * COORDENADAS DE SAÍDA: campo INTEIRO HORIZONTAL compartilhado — a casa
 * defende a ESQUERDA e ataca para a DIREITA; x 0 = linha do gol da casa …
 * 1 = linha do gol do visitante; y 0 = topo … 1 = base.
 *
 * Sem React, sem Math.random(), sem Date.now(), sem Zustand/SQLite/rede.
 */

import type {ChutePartida, EventoPartida, Position} from '../../types';

import type {TipoPassoLance} from './lances';
import {
  criarRNGComSeed,
  hashString,
  limitar,
  type RandomGenerator,
} from './rng';

/** O terço de ataque do ledger cobre 33% do campo (mesma régua do PassoLance). */
const TERCO_ATAQUE = 0.33;
/** Largura da boca do gol no eixo lateral (fração do campo), centrada. */
const BOCA_GOL = 0.3;
/** Quanto o BLOCO do time desliza com momento ±1 (linha alta/baixa). */
const DESLIZE_BLOCO = 0.09;
/** Amplitude do micro-drift por jogador (goleiro drifta menos). */
const DRIFT_JOGADOR = 0.035;
const DRIFT_GOLEIRO = 0.012;
/** Distância da linha lateral (y) que faz a posse roubada virar LATERAL. */
const FAIXA_LATERAL = 0.06;

/** Ponto normalizado 0..1 × 0..1. */
export interface PontoCampo {
  x: number;
  y: number;
}

/**
 * Jogador em campo NO MINUTO. `ancora` é o slot REAL da formação vigente na
 * convenção da tática (`coordenadaDoTitular`: x 0=lateral esquerda…1=direita;
 * y 0=própria defesa…1=ataque). Sem âncora (save antigo sem coordenadas), cai
 * na posição-base da função.
 */
export interface JogadorEmCampoLance {
  id: string;
  posicao: Position;
  ancora?: PontoCampo;
}

/** Como o minuto seguinte RECOMEÇA (derivado do fato que encerrou o lance). */
export type ReinicioLance = 'nenhum' | 'saida_centro' | 'tiro_de_meta';

/**
 * Onde/como o lance ANTERIOR terminou — o elo de continuidade entre minutos.
 * Em reinício (`saida_centro`/`tiro_de_meta`), `timeId` é o time que REPÕE a
 * bola em jogo (quem sofreu o gol / o dono do tiro de meta).
 */
export interface FimLanceMinuto {
  timeId: string;
  jogadorId: string;
  tipoUltimoToque: TipoPassoLance;
  x: number;
  y: number;
  reinicio: ReinicioLance;
}

export interface EntradaLanceMinuto {
  /** Seed REAL da partida (a mesma de `iniciarPartidaAoVivo`). */
  seedPartida: number;
  minuto: number;
  /** Amostra REAL do momento deste minuto (ótica da casa, −1..1). */
  momentoMinuto: number;
  timeCasaId: string;
  timeForaId: string;
  emCampoCasa: JogadorEmCampoLance[];
  emCampoFora: JogadorEmCampoLance[];
  /** Eventos REAIS emitidos neste minuto. */
  eventosDoMinuto: EventoPartida[];
  /** Chutes REAIS do ledger causal neste minuto. */
  chutesDoMinuto: ChutePartida[];
  /**
   * Fim do lance do minuto ANTERIOR (continuidade/reinício). Null apenas no
   * primeiríssimo quadro do tempo — que então vira kickoff do centro.
   */
  lanceAnterior?: FimLanceMinuto | null;
}

/** Um toque do lance: a bola SEMPRE está com um jogador real. */
export interface ToqueLance {
  tipo: TipoPassoLance;
  jogadorId: string;
  /** Time do jogador que dá o toque (no gol contra, o defensor adversário). */
  timeId: string;
  x: number;
  y: number;
}

export interface LanceMinuto {
  minuto: number;
  /** Time com a posse principal do lance. */
  timeId: string;
  toques: ToqueLance[];
}

/** Ponto de UM jogador no radar (frame horizontal), com flag de goleiro. */
export interface PontoJogadorRadar {
  id: string;
  x: number;
  y: number;
  goleiro: boolean;
}

/** Os dois elencos posicionados no minuto (frame horizontal). */
export interface ElencosPosicionados {
  casa: PontoJogadorRadar[];
  fora: PontoJogadorRadar[];
}

/**
 * Posição-base de cada função no frame "ataque para cima" (x 0=esq…1=dir,
 * y 0=gol adversário…1=próprio gol). Fallback quando a formação não traz o
 * slot real (save antigo sem coordenadas).
 */
const BASE_POSICAO: Record<Position, PontoCampo> = {
  GOL: {x: 0.5, y: 0.94},
  ZAG: {x: 0.5, y: 0.8},
  LD: {x: 0.84, y: 0.7},
  LE: {x: 0.16, y: 0.7},
  VOL: {x: 0.5, y: 0.6},
  MC: {x: 0.5, y: 0.48},
  MEI: {x: 0.5, y: 0.35},
  PD: {x: 0.84, y: 0.24},
  PE: {x: 0.16, y: 0.24},
  SA: {x: 0.5, y: 0.2},
  CA: {x: 0.5, y: 0.12},
};

/** Posição-base (frame ataque-para-cima) de uma função. */
export function coordenadaBasePosicao(posicao: Position): PontoCampo {
  return {...BASE_POSICAO[posicao]};
}

/**
 * Converte um ponto do frame "ataque para cima" de um time para o campo
 * HORIZONTAL compartilhado (casa ataca para a direita; visitante, esquerda).
 */
export function paraCampoHorizontal(
  ponto: PontoCampo,
  ehCasa: boolean,
): PontoCampo {
  const x = limitar(ponto.x, 0, 1);
  const y = limitar(ponto.y, 0, 1);
  return ehCasa ? {x: 1 - y, y: x} : {x: y, y: 1 - x};
}

/** Âncora do jogador no frame ataque-para-cima (slot real ou base da função). */
function ancoraAtaqueAcima(jogador: JogadorEmCampoLance): PontoCampo {
  if (jogador.ancora) {
    // Convenção da tática (y 0=defesa…1=ataque) → ataque-para-cima.
    return {
      x: limitar(jogador.ancora.x, 0, 1),
      y: 1 - limitar(jogador.ancora.y, 0, 1),
    };
  }
  return BASE_POSICAO[jogador.posicao];
}

/**
 * Posição de UM jogador no minuto, no frame HORIZONTAL: âncora real da
 * formação + deslize do BLOCO pelo momento (linha alta/baixa) + micro-drift
 * determinístico por (seed, minuto, jogador). É a MESMA função usada pelos 22
 * pontos do radar e pelos toques do lance — a bola viaja até o ponto visível.
 */
export function posicaoJogadorNoMinuto(
  seedPartida: number,
  minuto: number,
  momentoMinuto: number,
  jogador: JogadorEmCampoLance,
  ehCasa: boolean,
): PontoCampo {
  const base = ancoraAtaqueAcima(jogador);
  const goleiro = jogador.posicao === 'GOL';
  // Momento do PRÓPRIO time: positivo empurra o bloco para o ataque (y menor
  // no frame ataque-para-cima); o time pressionado recua. Goleiro acompanha
  // pouco (sai da linha só um passo).
  const momentoDoTime = ehCasa ? momentoMinuto : -momentoMinuto;
  const deslize =
    (goleiro ? DESLIZE_BLOCO * 0.3 : DESLIZE_BLOCO) * momentoDoTime;
  // Drift por JOGADOR (seed própria por id): idêntico aqui e nos toques do
  // lance, em qualquer ordem de chamada — determinístico, sem Math.random.
  const rngDrift = criarRNGComSeed(
    hashString(`${seedPartida}:${minuto}:${jogador.id}:drift`),
  );
  const amplitude = goleiro ? DRIFT_GOLEIRO : DRIFT_JOGADOR;
  const x = limitar(base.x + (rngDrift() - 0.5) * amplitude, 0.02, 0.98);
  const y = limitar(
    base.y - deslize + (rngDrift() - 0.5) * amplitude,
    0.02,
    0.98,
  );
  return paraCampoHorizontal({x, y}, ehCasa);
}

/** Posiciona os DOIS elencos do minuto — os 22 pontos vivos do radar. */
export function posicionarElencosMinuto(
  entrada: Pick<
    EntradaLanceMinuto,
    'seedPartida' | 'minuto' | 'momentoMinuto' | 'emCampoCasa' | 'emCampoFora'
  >,
): ElencosPosicionados {
  const {seedPartida, minuto, momentoMinuto, emCampoCasa, emCampoFora} =
    entrada;
  const posicionar = (
    jogadores: JogadorEmCampoLance[],
    ehCasa: boolean,
  ): PontoJogadorRadar[] =>
    jogadores.map(jogador => ({
      id: jogador.id,
      goleiro: jogador.posicao === 'GOL',
      ...posicaoJogadorNoMinuto(
        seedPartida,
        minuto,
        momentoMinuto,
        jogador,
        ehCasa,
      ),
    }));
  return {
    casa: posicionar(emCampoCasa, true),
    fora: posicionar(emCampoFora, false),
  };
}

/** Pools de preferência para escolhas por função. */
const POOL_MEIO: readonly Position[] = ['VOL', 'MC', 'MEI'];
const POOL_FRENTE: readonly Position[] = ['MEI', 'PD', 'PE', 'SA', 'CA'];
const POOL_DEFESA: readonly Position[] = ['ZAG', 'LD', 'LE', 'VOL'];
const POOL_ALAS: readonly Position[] = ['PE', 'PD', 'LE', 'LD', 'MEI'];

/** Sorteio ponderado (pool preferida pesa 4×) que REMOVE o escolhido. */
function retirarPonderado(
  rng: RandomGenerator,
  candidatos: JogadorEmCampoLance[],
  pool: readonly Position[],
): JogadorEmCampoLance | undefined {
  if (candidatos.length === 0) {
    return undefined;
  }
  const pesos = candidatos.map(c => (pool.includes(c.posicao) ? 4 : 1));
  const total = pesos.reduce((soma, peso) => soma + peso, 0);
  let sorteio = rng() * total;
  for (let i = 0; i < candidatos.length; i += 1) {
    sorteio -= pesos[i];
    if (sorteio < 0) {
      return candidatos.splice(i, 1)[0];
    }
  }
  return candidatos.pop();
}

/** Escolhe o chute âncora do minuto: gol primeiro; senão, o último chute. */
function chuteAncora(chutes: ChutePartida[]): ChutePartida | undefined {
  return chutes.find(c => c.resultado === 'gol') ?? chutes[chutes.length - 1];
}

/**
 * Fim de um lance → como o PRÓXIMO minuto recomeça:
 *  • gol/gol contra ⇒ saída do CENTRO pelo time que SOFREU;
 *  • finalização sem gol ⇒ tiro de meta/reposição do goleiro ADVERSÁRIO;
 *  • resto ⇒ continuidade normal (portador segue / desarme se a posse virar).
 */
export function fimDoLance(
  lance: LanceMinuto,
  timeCasaId: string,
  timeForaId: string,
): FimLanceMinuto | null {
  const ultimo = lance.toques[lance.toques.length - 1];
  if (!ultimo) {
    return null;
  }
  const adversario = lance.timeId === timeCasaId ? timeForaId : timeCasaId;
  if (ultimo.tipo === 'gol' || ultimo.tipo === 'gol_contra') {
    return {
      timeId: adversario,
      jogadorId: '',
      tipoUltimoToque: ultimo.tipo,
      x: 0.5,
      y: 0.5,
      reinicio: 'saida_centro',
    };
  }
  if (ultimo.tipo === 'finalizacao') {
    return {
      timeId: adversario,
      jogadorId: '',
      tipoUltimoToque: ultimo.tipo,
      x: ultimo.x,
      y: ultimo.y,
      reinicio: 'tiro_de_meta',
    };
  }
  return {
    timeId: ultimo.timeId,
    jogadorId: ultimo.jogadorId,
    tipoUltimoToque: ultimo.tipo,
    x: ultimo.x,
    y: ultimo.y,
    reinicio: 'nenhum',
  };
}

/**
 * Reconstrói o lance de um minuto simulado. Cada toque de CONSTRUÇÃO acontece
 * SOBRE o ponto visível do jogador (`posicaoJogadorNoMinuto` — o mesmo dos 22
 * pontos); só reinícios (centro/tiro de meta/lateral/canto) e desfechos reais
 * (chute/gol/falta) ancoram no ponto do FATO. Devolve null quando não há
 * jogadores em campo para o lado com a posse.
 *
 * Determinístico: a MESMA entrada produz SEMPRE o mesmo lance.
 */
export function reconstruirLanceMinuto(
  entrada: EntradaLanceMinuto,
): LanceMinuto | null {
  const {
    seedPartida,
    minuto,
    momentoMinuto,
    timeCasaId,
    timeForaId,
    emCampoCasa,
    emCampoFora,
    eventosDoMinuto,
    chutesDoMinuto,
    lanceAnterior,
  } = entrada;
  const rng = criarRNGComSeed(
    hashString(`${seedPartida}:${minuto}:lance-minuto`),
  );

  const ladoDe = (timeId: string): JogadorEmCampoLance[] =>
    timeId === timeCasaId ? emCampoCasa : emCampoFora;
  const ehCasaDe = (timeId: string): boolean => timeId === timeCasaId;
  const adversarioDe = (timeId: string): string =>
    timeId === timeCasaId ? timeForaId : timeCasaId;

  /** Ponto VISÍVEL do jogador neste minuto (mesmo dos 22 pontos do radar). */
  const pontoDe = (jogador: JogadorEmCampoLance, ehCasa: boolean): PontoCampo =>
    posicaoJogadorNoMinuto(seedPartida, minuto, momentoMinuto, jogador, ehCasa);

  /** Jogador do lado cujo ponto visível está mais perto de um ponto do campo. */
  const maisProximoDe = (
    emCampo: JogadorEmCampoLance[],
    ponto: PontoCampo,
    ehCasa: boolean,
  ): JogadorEmCampoLance => {
    let melhor = emCampo[0];
    let melhorDist = Number.POSITIVE_INFINITY;
    for (const jogador of emCampo) {
      const p = pontoDe(jogador, ehCasa);
      const dist = (p.x - ponto.x) ** 2 + (p.y - ponto.y) ** 2;
      if (dist < melhorDist) {
        melhorDist = dist;
        melhor = jogador;
      }
    }
    return melhor;
  };

  const goleiroDe = (timeId: string): JogadorEmCampoLance | undefined =>
    ladoDe(timeId).find(j => j.posicao === 'GOL');

  /**
   * REINÍCIO do minuto (a jogada nunca nasce do nada): saída do centro (gol
   * sofrido/kickoff de início de tempo) ou tiro de meta (goleiro repõe atrás
   * e a saída passa pela defesa). Devolve os toques iniciais e quem fica com
   * a bola ao fim deles.
   */
  const toquesReinicio = (): {toques: ToqueLance[]; timeId: string} | null => {
    let reinicio: ReinicioLance = 'nenhum';
    let timeReinicio = '';
    if (lanceAnterior) {
      reinicio = lanceAnterior.reinicio;
      timeReinicio = lanceAnterior.timeId;
    } else if (minuto <= 1 || minuto === 46) {
      // Kickoff real: casa sai no 1º tempo; visitante, no 2º.
      reinicio = 'saida_centro';
      timeReinicio = minuto === 46 ? timeForaId : timeCasaId;
    }
    if (reinicio === 'nenhum' || timeReinicio === '') {
      return null;
    }
    const emCampo = ladoDe(timeReinicio);
    if (emCampo.length === 0) {
      return null;
    }
    const ehCasa = ehCasaDe(timeReinicio);
    if (reinicio === 'saida_centro') {
      const candidatos = [...emCampo];
      const meia = retirarPonderado(rng, candidatos, POOL_MEIO) ?? emCampo[0];
      const toques: ToqueLance[] = [
        {tipo: 'passe', jogadorId: meia.id, timeId: timeReinicio, x: 0.5, y: 0.5},
      ];
      // Saída clássica: recua para a defesa organizar antes de progredir.
      const recuo = retirarPonderado(rng, candidatos, POOL_DEFESA);
      if (recuo) {
        toques.push({
          tipo: 'passe',
          jogadorId: recuo.id,
          timeId: timeReinicio,
          ...pontoDe(recuo, ehCasa),
        });
      }
      return {toques, timeId: timeReinicio};
    }
    // Tiro de meta/reposição: o GOLEIRO inicia atrás e a bola sai DE TRÁS.
    const goleiro = goleiroDe(timeReinicio) ?? emCampo[0];
    const candidatos = emCampo.filter(j => j.id !== goleiro.id);
    const toques: ToqueLance[] = [
      {
        tipo: 'passe',
        jogadorId: goleiro.id,
        timeId: timeReinicio,
        ...pontoDe(goleiro, ehCasa),
      },
    ];
    const zagueiro = retirarPonderado(rng, candidatos, POOL_DEFESA);
    if (zagueiro) {
      toques.push({
        tipo: 'recepcao',
        jogadorId: zagueiro.id,
        timeId: timeReinicio,
        ...pontoDe(zagueiro, ehCasa),
      });
    }
    return {toques, timeId: timeReinicio};
  };

  /**
   * INÍCIO do lance até a bola estar com a posse do desfecho: reinício (se
   * houver) e, quando quem está com a bola não é o dono do desfecho, a
   * ROUBADA visível — desarme/interceptação no ponto da bola (recuperação
   * após chute; na faixa da linha lateral, cobrança de lateral dali). A bola
   * nunca "aparece" com o outro time.
   */
  const toquesAtePosse = (
    posseId: string,
    posseEhCasa: boolean,
  ): ToqueLance[] => {
    const prefixo = toquesReinicio();
    const toques: ToqueLance[] = prefixo ? [...prefixo.toques] : [];
    const bolaCom: {
      timeId: string;
      jogadorId: string;
      ponto: PontoCampo;
    } | null = prefixo
      ? {
          timeId: prefixo.timeId,
          jogadorId: prefixo.toques[prefixo.toques.length - 1].jogadorId,
          ponto: {
            x: prefixo.toques[prefixo.toques.length - 1].x,
            y: prefixo.toques[prefixo.toques.length - 1].y,
          },
        }
      : lanceAnterior && lanceAnterior.reinicio === 'nenhum'
        ? {
            timeId: lanceAnterior.timeId,
            jogadorId: lanceAnterior.jogadorId,
            ponto: {x: lanceAnterior.x, y: lanceAnterior.y},
          }
        : null;
    if (bolaCom === null) {
      return toques;
    }
    if (bolaCom.timeId === posseId) {
      if (prefixo === null && bolaCom.jogadorId !== '') {
        // Continuidade pura: o portador anterior abre o lance de onde parou.
        toques.push({
          tipo: 'passe',
          jogadorId: bolaCom.jogadorId,
          timeId: posseId,
          x: bolaCom.ponto.x,
          y: bolaCom.ponto.y,
        });
      }
      return toques;
    }
    // Posse vira: roubada VISÍVEL. Na faixa da linha, vira LATERAL (a bola
    // morreu ali e o novo time repõe da linha).
    const naLinha =
      bolaCom.ponto.y <= FAIXA_LATERAL || bolaCom.ponto.y >= 1 - FAIXA_LATERAL;
    const tomador = maisProximoDe(ladoDe(posseId), bolaCom.ponto, posseEhCasa);
    const tipo: TipoPassoLance = naLinha
      ? 'recuperacao'
      : lanceAnterior?.tipoUltimoToque === 'finalizacao'
        ? 'recuperacao'
        : rng() < 0.6
          ? 'desarme'
          : 'interceptacao';
    toques.push({
      tipo,
      jogadorId: tomador.id,
      timeId: posseId,
      x: bolaCom.ponto.x,
      y: naLinha
        ? bolaCom.ponto.y <= FAIXA_LATERAL
          ? 0.02
          : 0.98
        : bolaCom.ponto.y,
    });
    return toques;
  };

  /**
   * Construção DENSA: até `quantos` toques de jogadores reais SOBRE seus
   * pontos, com o vocabulário do fluxo normal — drible (avança sem passe),
   * RECUO ao goleiro e INVERSÃO de lado por lançamento (arco na UI).
   */
  const toquesConstrucao = (
    emCampo: JogadorEmCampoLance[],
    excluirIds: Array<string | undefined>,
    quantos: number,
    timeId: string,
    ehCasa: boolean,
  ): ToqueLance[] => {
    const candidatos = emCampo.filter(
      j => !excluirIds.includes(j.id) && j.posicao !== 'GOL',
    );
    const goleiro = emCampo.find(j => j.posicao === 'GOL');
    const toques: ToqueLance[] = [];
    let recuou = false;
    for (let i = 0; toques.length < quantos; i += 1) {
      if (candidatos.length === 0) {
        break;
      }
      // RECUO ao goleiro (no máx. 1× por lance): alivia atrás e recomeça.
      if (!recuou && goleiro !== undefined && i === 1 && rng() < 0.22) {
        recuou = true;
        toques.push({
          tipo: 'passe',
          jogadorId: goleiro.id,
          timeId,
          ...pontoDe(goleiro, ehCasa),
        });
        continue;
      }
      const escolhido = retirarPonderado(
        rng,
        candidatos,
        i === 0 ? POOL_MEIO : POOL_FRENTE,
      );
      if (!escolhido) {
        break;
      }
      const ponto = pontoDe(escolhido, ehCasa);
      const anterior = toques[toques.length - 1];
      // INVERSÃO de lado: bola cruza de uma lateral à outra = lançamento
      // longo (traço em arco na UI).
      const inversao =
        anterior !== undefined && Math.abs(anterior.y - ponto.y) > 0.45;
      toques.push({
        tipo: inversao ? 'lancamento' : rng() < 0.7 ? 'passe' : 'conducao',
        jogadorId: escolhido.id,
        timeId,
        ...ponto,
      });
      if (toques.length < quantos && rng() < 0.22) {
        // DRIBLE: o mesmo jogador avança rumo ao ataque antes do próximo passe.
        const direcao = ehCasa ? 1 : -1;
        toques.push({
          tipo: 'drible',
          jogadorId: escolhido.id,
          timeId,
          x: limitar(ponto.x + direcao * 0.08, 0.02, 0.98),
          y: limitar(ponto.y + (0.5 - ponto.y) * 0.25, 0.02, 0.98),
        });
      }
    }
    return toques;
  };

  // ── ÂNCORA 1: chute REAL do minuto (coordenada do ledger causal) ───────────
  const chute = chuteAncora(chutesDoMinuto);
  if (chute) {
    const posseId = chute.timeId;
    const posseEhCasa = ehCasaDe(posseId);
    const emCampo = ladoDe(posseId);
    if (emCampo.length === 0) {
      return null;
    }
    // Ponto REAL do chute (terço de ataque → campo inteiro → horizontal).
    const ancora = paraCampoHorizontal(
      {x: chute.x, y: chute.y * TERCO_ATAQUE},
      posseEhCasa,
    );
    const golContra = chute.golContra === true;
    const autorId = chute.jogadorId;
    const assistenteId = golContra ? undefined : chute.assistenciaId;
    const ehEscanteio = chute.situacao === 'escanteio';
    const ehBolaParada =
      ehEscanteio || chute.situacao === 'penalti' || chute.situacao === 'falta';

    let toques: ToqueLance[];
    if (ehEscanteio) {
      // ESCANTEIO REAL (situacao do ledger): cobrado do canto do lado do
      // chute, cruzando em arco até o ponto real da finalização. Bola parada —
      // o recomeço no canto é legítimo (sem desarme de transição).
      const canto = paraCampoHorizontal(
        {x: chute.x < 0.5 ? 0.02 : 0.98, y: 0.02},
        posseEhCasa,
      );
      const candidatos = emCampo.filter(
        j => j.id !== autorId && j.posicao !== 'GOL',
      );
      // Cobrador: o garçom REAL do lance; sem ele, um ala/armador (fallback
      // extremo em elenco degenerado: o próprio autor).
      const cobrador =
        (assistenteId !== undefined
          ? emCampo.find(j => j.id === assistenteId)
          : undefined) ?? retirarPonderado(rng, candidatos, POOL_ALAS);
      toques = [
        {
          tipo: 'escanteio',
          jogadorId: cobrador?.id ?? autorId,
          timeId: posseId,
          x: canto.x,
          y: canto.y,
        },
      ];
    } else {
      toques = toquesAtePosse(posseId, posseEhCasa);
      toques.push(
        ...toquesConstrucao(
          emCampo,
          [autorId, assistenteId, ...toques.map(t => t.jogadorId)],
          3 + (rng() < 0.5 ? 1 : 0),
          posseId,
          posseEhCasa,
        ),
      );
      if (assistenteId !== undefined) {
        const assistente = emCampo.find(j => j.id === assistenteId);
        if (chute.corpo === 'cabeca' && !ehBolaParada) {
          // Chute de CABEÇA em jogo corrido = a bola chegou por CRUZAMENTO:
          // o garçom real cruza da faixa lateral ofensiva (arco no radar).
          const origem = assistente ? pontoDe(assistente, posseEhCasa) : ancora;
          toques.push({
            tipo: 'cruzamento',
            jogadorId: assistenteId,
            timeId: posseId,
            x: posseEhCasa
              ? Math.max(0.62, ancora.x - 0.06)
              : Math.min(0.38, ancora.x + 0.06),
            y: origem.y < 0.5 ? 0.08 : 0.92,
          });
        } else {
          toques.push({
            tipo: 'assistencia',
            jogadorId: assistenteId,
            timeId: posseId,
            // Garçom real toca do SEU ponto visível; sem slot (raro), perto do chute.
            ...(assistente
              ? pontoDe(assistente, posseEhCasa)
              : {
                  x: limitar(ancora.x + (rng() - 0.5) * 0.2, 0.02, 0.98),
                  y: limitar(ancora.y + (rng() - 0.5) * 0.2, 0.02, 0.98),
                }),
          });
        }
      }
    }
    if (golContra) {
      // O toque final é do DEFENSOR adversário no ponto real do desvio (mesma
      // convenção do replay de gol contra).
      toques.push({
        tipo: 'gol_contra',
        jogadorId: autorId,
        timeId: adversarioDe(posseId),
        x: ancora.x,
        y: ancora.y,
      });
    } else {
      toques.push({
        tipo: 'finalizacao',
        jogadorId: autorId,
        timeId: posseId,
        x: ancora.x,
        y: ancora.y,
      });
    }
    if (chute.resultado === 'gol') {
      // Bola na rede: lateral REAL da baliza (golX do ledger, quando houver).
      const rede = paraCampoHorizontal(
        {x: 0.5 - BOCA_GOL / 2 + (chute.golX ?? 0.5) * BOCA_GOL, y: 0},
        posseEhCasa,
      );
      toques.push({
        tipo: golContra ? 'gol_contra' : 'gol',
        jogadorId: autorId,
        timeId: golContra ? adversarioDe(posseId) : posseId,
        x: rede.x,
        y: rede.y,
      });
    }
    return {minuto, timeId: posseId, toques};
  }

  // ── ÂNCORA 2: cartão/lesão — jogada em cima do jogador REAL punido ─────────
  const disciplinar = eventosDoMinuto.find(
    e =>
      e.tipo === 'cartao_amarelo' ||
      e.tipo === 'cartao_vermelho' ||
      e.tipo === 'lesao',
  );
  if (disciplinar) {
    const punidoEhCasa = disciplinar.timeId === timeCasaId;
    const posseId = adversarioDe(disciplinar.timeId);
    const posseEhCasa = !punidoEhCasa;
    const emCampo = ladoDe(posseId);
    if (emCampo.length === 0) {
      return null;
    }
    // O lance para ONDE o punido/lesionado está no radar neste minuto.
    const punido: JogadorEmCampoLance = ladoDe(disciplinar.timeId).find(
      j => j.id === disciplinar.jogadorId,
    ) ?? {id: disciplinar.jogadorId, posicao: 'MC'};
    const ancora = pontoDe(punido, punidoEhCasa);

    const inicio = toquesAtePosse(posseId, posseEhCasa);
    const construcao = toquesConstrucao(
      emCampo,
      inicio.map(t => t.jogadorId),
      3,
      posseId,
      posseEhCasa,
    );
    const corpo = [...inicio, ...construcao];
    const sofredorId =
      corpo.length > 0 ? corpo[corpo.length - 1].jogadorId : emCampo[0].id;
    const toques: ToqueLance[] = [
      ...corpo.slice(0, -1),
      {
        tipo: 'falta_sofrida',
        jogadorId: sofredorId,
        timeId: posseId,
        x: ancora.x,
        y: ancora.y,
      },
    ];
    return {minuto, timeId: posseId, toques};
  }

  // ── SEM EVENTO: circulação DENSA de posse guiada pelo momento REAL ─────────
  // Momento equilibrado: quem TINHA a bola segue com ela (continuidade); sem
  // lance anterior, sorteio determinístico.
  const posseEhCasa =
    momentoMinuto > 0.08
      ? true
      : momentoMinuto < -0.08
        ? false
        : lanceAnterior
          ? lanceAnterior.timeId === timeCasaId
          : rng() < 0.5;
  const posseId = posseEhCasa ? timeCasaId : timeForaId;
  const emCampo = ladoDe(posseId);
  if (emCampo.length === 0) {
    return null;
  }
  const inicio = toquesAtePosse(posseId, posseEhCasa);
  const construcao = toquesConstrucao(
    emCampo,
    inicio.map(t => t.jogadorId),
    6 + Math.floor(rng() * 3),
    posseId,
    posseEhCasa,
  );
  if (inicio.length === 0 && construcao.length === 0) {
    return null;
  }
  const corpo = [...inicio, ...construcao];
  const ultimo = corpo[corpo.length - 1];
  const toques: ToqueLance[] = [
    ...corpo.slice(0, -1),
    {...ultimo, tipo: ultimo.tipo === 'drible' ? 'drible' : 'recepcao'},
  ];
  return {minuto, timeId: posseId, toques};
}
