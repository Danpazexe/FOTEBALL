import type {Tatica} from '../../types';

import {limitar} from './rng';
import type {ForcaTime} from './teamStrength';

export interface ProbabilidadesPartida {
  probGolCasaPorMinuto: number;
  probGolForaPorMinuto: number;
  probCartaoCasaPorMinuto: number;
  probCartaoForaPorMinuto: number;
  probPenaltiCasaPorMinuto: number;
  probPenaltiForaPorMinuto: number;
  probLesaoCasaPorMinuto: number;
  probLesaoForaPorMinuto: number;
  probChanceNarrativaPorMinuto: number;
}

function fatorCartao(tatica: Tatica): number {
  let fator = 1;

  if (tatica.marcacao === 'Individual') {
    fator += 0.15;
  }

  if (tatica.marcacao === 'Pressão alta') {
    fator += 0.25;
  }

  if (tatica.ritmo === 'Intenso') {
    fator += 0.12;
  }

  return fator;
}

/**
 * Marcação pesada concede mais pênaltis (faltas na área). Aplica-se ao time
 * ADVERSÁRIO (quem marca pesado é quem comete o pênalti contra si).
 */
function fatorPenalti(tatica: Tatica): number {
  let fator = 1;
  if (tatica.marcacao === 'Individual') {
    fator += 0.3;
  }
  if (tatica.marcacao === 'Pressão alta') {
    fator += 0.7;
  }
  if (tatica.linhaDefensiva === 'Adiantada') {
    fator += 0.15;
  }
  return fator;
}

function fatorLesao(tatica: Tatica): number {
  return tatica.ritmo === 'Intenso' ? 1.35 : 1;
}

/** Ritmo do jogo: 'Intenso' acelera (mais gols/chances), 'Lento' segura. Normal = 1. */
function fatorRitmoGols(ritmo: Tatica['ritmo']): number {
  if (ritmo === 'Intenso') {
    return 1.05;
  }
  if (ritmo === 'Lento') {
    return 0.95;
  }
  return 1;
}

function fatorRitmoChances(ritmo: Tatica['ritmo']): number {
  if (ritmo === 'Intenso') {
    return 1.25;
  }
  if (ritmo === 'Lento') {
    return 0.85;
  }
  return 1;
}

/**
 * Qualidade do goleiro adversário reduz os gols esperados. Goleiro ~70 é
 * neutro (1.0); um paredão (95) corta ~10%, um goleiro fraco (50) concede ~8%
 * a mais. Centrado em 1.0 para não desbalancear times homogêneos.
 */
function fatorGoleiro(forcaGoleiroAdversario: number): number {
  return limitar(1 - (forcaGoleiroAdversario - 70) / 250, 0.82, 1.15);
}

/**
 * Matchup tático (pedra-papel-tesoura): quanto o estilo de A explora a
 * montagem de B. Devolve um acréscimo ADITIVO aos gols esperados de A (pode ser
 * negativo). Estilos neutros entre si => 0.
 */
function modMatchupAtaque(a: Tatica, b: Tatica): number {
  let mod = 0;

  if (a.estiloOfensivo === 'Contra-ataque') {
    // Contra-ataque devora quem se expõe (posse/pressão/linha alta).
    if (b.estiloOfensivo === 'Posse de bola') {
      mod += 0.16;
    }
    if (b.marcacao === 'Pressão alta') {
      mod += 0.14;
    }
    if (b.linhaDefensiva === 'Adiantada') {
      mod += 0.12;
    }
  }

  if (a.estiloOfensivo === 'Ataque direto') {
    // Bola longa pune linha adiantada, mas trava contra bloco recuado.
    if (b.linhaDefensiva === 'Adiantada') {
      mod += 0.12;
    }
    if (b.linhaDefensiva === 'Recuada') {
      mod -= 0.1;
    }
  }

  if (a.estiloOfensivo === 'Posse de bola') {
    // Posse sofre contra pressão alta (perde a bola no campo de defesa).
    if (b.marcacao === 'Pressão alta') {
      mod -= 0.12;
    }
    if (b.linhaDefensiva === 'Recuada') {
      mod -= 0.06;
    }
  }

  if (a.marcacao === 'Pressão alta') {
    // Pressão alta força erros de quem constrói devagar.
    if (b.estiloOfensivo === 'Posse de bola' || b.ritmo === 'Lento') {
      mod += 0.1;
    }
  }

  return mod;
}

export function calcularProbabilidades(
  casa: ForcaTime,
  fora: ForcaTime,
  taticaCasa: Tatica,
  taticaFora: Tatica,
  /** Vantagem de mando (estádio/torcida/reputação). 1.0 = neutro. */
  mando = 1,
): ProbabilidadesPartida {
  const diferencaCasa = casa.overall - fora.overall;
  const vantagemAtaqueCasa = (casa.ataque - fora.defesa) * 0.01;
  const vantagemAtaqueFora = (fora.ataque - casa.defesa) * 0.01;

  // Base de gols esperados (por 90') elevada para um jogo mais movimentado —
  // média de ~3.4 gols por partida entre times parelhos, com tetos maiores para
  // permitir goleadas. Ajuste de balanceamento: "mais gols".
  const golsEsperadosCasa = limitar(
    (1.78 +
      diferencaCasa * 0.025 +
      vantagemAtaqueCasa +
      modMatchupAtaque(taticaCasa, taticaFora)) *
      mando *
      fatorRitmoGols(taticaCasa.ritmo) *
      fatorGoleiro(fora.forcaGoleiro),
    0.45,
    4.0,
  );
  const golsEsperadosFora = limitar(
    (1.54 -
      diferencaCasa * 0.018 +
      vantagemAtaqueFora +
      modMatchupAtaque(taticaFora, taticaCasa)) *
      (1 - (mando - 1) * 0.55) *
      fatorRitmoGols(taticaFora.ritmo) *
      fatorGoleiro(casa.forcaGoleiro),
    0.38,
    3.5,
  );

  const ritmoChance =
    (fatorRitmoChances(taticaCasa.ritmo) + fatorRitmoChances(taticaFora.ritmo)) /
    2;
  const probChanceNarrativaPorMinuto = limitar(
    (golsEsperadosCasa + golsEsperadosFora) * 0.011 * ritmoChance,
    0.012,
    0.05,
  );

  return {
    probGolCasaPorMinuto: golsEsperadosCasa / 90,
    probGolForaPorMinuto: golsEsperadosFora / 90,
    probCartaoCasaPorMinuto: 0.0045 * fatorCartao(taticaCasa),
    probCartaoForaPorMinuto: 0.0045 * fatorCartao(taticaFora),
    // Pênalti: o adversário marca pesado => esta equipe ganha o pênalti.
    probPenaltiCasaPorMinuto: 0.0013 * fatorPenalti(taticaFora),
    probPenaltiForaPorMinuto: 0.0013 * fatorPenalti(taticaCasa),
    probLesaoCasaPorMinuto: 0.00035 * fatorLesao(taticaCasa),
    probLesaoForaPorMinuto: 0.00035 * fatorLesao(taticaFora),
    probChanceNarrativaPorMinuto,
  };
}

/**
 * Vantagem de mando a partir do estádio e reputação do mandante. Estádio médio
 * (~30k) + reputação 50 ≈ 1.0 (neutro); estádios/torcidas grandes empurram o
 * fator levemente acima de 1, mando fraco abaixo. Mantido modesto para não
 * dominar a qualidade dos times.
 */
export function calcularMando(capacidade: number, reputacao: number): number {
  const bonusEstadio = limitar((capacidade - 30000) / 400000, -0.05, 0.08);
  const bonusReputacao = limitar((reputacao - 50) / 1000, -0.04, 0.05);
  return limitar(1.08 + bonusEstadio + bonusReputacao, 1.0, 1.22);
}
