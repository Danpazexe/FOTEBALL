import type {Clube, Player} from '../../types';

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
