import type {Clube, Player} from '../../types';

function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor));
}

export function evoluirJogador(jogador: Player, clube: Clube): Player {
  const jovem = jogador.idade < 21;
  const veterano = jogador.idade >= 33;
  const auge = jogador.idade >= 21 && jogador.idade <= 28;
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
    : auge
      ? desempenhoBom
        ? 1
        : 0
      : veterano
        ? desempenhoBom
          ? -1
          : -2
        : desempenhoBom
          ? 0
          : -0.5;
  const novoOverall = Math.round(
    limitar(jogador.overall + delta, 1, jogador.potencial),
  );

  return {
    ...jogador,
    idade: jogador.idade + 1,
    overall: novoOverall,
    valorMercado: Math.max(
      50000,
      Math.round(jogador.valorMercado * (novoOverall / jogador.overall)),
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
