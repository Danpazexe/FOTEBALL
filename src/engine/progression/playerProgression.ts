import type {Clube, Player, Position} from '../../types';

import {derivarTipoJogador} from './tipoJogador';

/**
 * Multiplicador de valor por posição (BRASFOOT_MASTER §9.2): atacantes valem
 * mais, goleiros menos.
 */
const MULT_VALOR_POSICAO: Record<Position, number> = {
  GOL: 0.8,
  ZAG: 1.0,
  LD: 0.9,
  LE: 0.9,
  VOL: 1.0,
  MC: 1.0,
  MEI: 1.1,
  PD: 1.15,
  PE: 1.15,
  SA: 1.2,
  CA: 1.3,
};

/** Fator de idade no VALOR (§9.2): prêmio de juventude, pico 25-29, declínio. */
function fatorIdadeValor(idade: number): number {
  if (idade <= 18) {
    return 1.3;
  }
  if (idade <= 21) {
    return 1.25;
  }
  if (idade <= 24) {
    return 1.1;
  }
  if (idade <= 29) {
    return 1.0;
  }
  if (idade <= 31) {
    return 0.8;
  }
  if (idade <= 33) {
    return 0.6;
  }
  return 0.4;
}

/**
 * Valor de mercado calculado (BRASFOOT_MASTER §9.2), calibrado à curva
 * EXPONENCIAL do seed (overall 70 ≈ R$ 2M, +16%/ponto): base × posição × idade
 * × (1 + 0.10 × nº habilidades). Usado para jogadores SEM valor curado
 * (academia/novos); os valores autorais do seed são preservados de propósito.
 *
 * Obs.: o desconto por TIPO (novato aposta / veterano em fim) NÃO entra no valor
 * de mercado base — senão ficaria "preso" no valor herdado ao longo da carreira
 * (um novato graduado carregaria o desconto para sempre). Esse efeito é melhor
 * aplicado na NEGOCIAÇÃO (ver `MULTIPLICADOR_VALOR_TIPO`).
 */
export function calcularValor(jogador: Player): number {
  const base = 2_000_000 * Math.pow(1.16, jogador.overall - 70);
  const nHabilidades = jogador.habilidades?.length ?? 0;
  const valor =
    base *
    MULT_VALOR_POSICAO[jogador.posicaoPrincipal] *
    fatorIdadeValor(jogador.idade) *
    (1 + 0.1 * nHabilidades);
  return Math.max(50_000, Math.round(valor));
}

function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor));
}

/**
 * Fator de (des)valorização anual por idade, independente do overall. Jovens
 * têm leve prêmio (margem de evolução) e veteranos desvalorizam mesmo mantendo
 * o overall — aplicado por temporada (compõe ao longo da carreira).
 */
export function fatorValorPorIdade(idade: number): number {
  if (idade <= 23) {
    return 1.04;
  }
  if (idade <= 29) {
    return 1.0;
  }
  if (idade <= 32) {
    return 0.95;
  }
  if (idade <= 34) {
    return 0.88;
  }
  return 0.78;
}

export function evoluirJogador(jogador: Player, clube: Clube): Player {
  // Curva de força por idade (BRASFOOT_MASTER §3.3): crescimento forte na base,
  // moderado dos 21-24, PICO/plateau 25-29, e declínio progressivo a partir dos 30.
  const jovem = jogador.idade < 21;
  const desenvolvimento = jogador.idade >= 21 && jogador.idade <= 24;
  const auge = jogador.idade >= 25 && jogador.idade <= 29;
  const veterano = jogador.idade >= 33;
  const margemPotencial = jogador.potencial - jogador.overall;
  const desempenhoBom =
    jogador.estatisticasTemporada.jogos >= 20 &&
    jogador.estatisticasTemporada.notaMedia >= 7;
  const infraestruturaBonus =
    jovem && clube.estadio.nivelInfraestrutura >= 4 ? 0.5 : 0;
  // Jovens evoluem mais rápido (Módulo 14): multiplicador por idade.
  const multiplicadorJovem =
    jogador.idade < 19 ? 2.0 : jogador.idade < 21 ? 1.5 : 1.0;
  // Declínio modulado pelo desempenho: um veterano que ainda joga muito e bem
  // cai mais devagar do que um encostado. (Faixa 29-32 = pré-declínio.)
  const delta = jovem
    ? Math.min(3, Math.max(0.5, margemPotencial * 0.15)) * multiplicadorJovem +
      infraestruturaBonus
    : desenvolvimento
      ? Math.min(2, Math.max(0, margemPotencial * 0.12)) +
        (desempenhoBom ? 0.5 : 0)
      : auge
        ? desempenhoBom
          ? 1
          : 0
        : veterano
          ? desempenhoBom
            ? -1
            : -2
          : // pré-declínio (30-32): cai devagar, mais rápido se já não rende.
            desempenhoBom
            ? 0
            : -0.5;
  const novoOverall = Math.round(
    limitar(jogador.overall + delta, 1, jogador.potencial),
  );

  const novaIdade = jogador.idade + 1;
  return {
    ...jogador,
    idade: novaIdade,
    overall: novoOverall,
    // Reclassifica o tipo: NOVATO gradua ao crescer/envelhecer, e o jogador
    // entra em VETERANO ao atingir a idade-limite (§3.4).
    tipo: derivarTipoJogador({...jogador, idade: novaIdade, overall: novoOverall}),
    valorMercado: Math.max(
      50000,
      Math.round(
        jogador.valorMercado *
          (novoOverall / Math.max(1, jogador.overall)) *
          fatorValorPorIdade(novaIdade),
      ),
    ),
    historicoTemporadas: [
      jogador.estatisticasTemporada,
      ...jogador.historicoTemporadas,
    ],
    estatisticasTemporada: {
      temporada: String(Number(jogador.estatisticasTemporada.temporada) + 1),
      jogos: 0,
      gols: 0,
      assistencias: 0,
      cartoesAmarelos: 0,
      cartoesVermelhos: 0,
      notaMedia: 0,
    },
  };
}
