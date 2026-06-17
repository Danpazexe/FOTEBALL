import type {Clube, Partida, TabelaClassificacao} from '../../types';

function criarLinha(clubeId: string): TabelaClassificacao {
  return {
    clubeId,
    pontos: 0,
    jogos: 0,
    vitorias: 0,
    empates: 0,
    derrotas: 0,
    golsPro: 0,
    golsContra: 0,
    saldoGols: 0,
  };
}

export function calcularTabela(
  clubes: Clube[],
  partidas: Partida[],
): TabelaClassificacao[] {
  const tabela = new Map(clubes.map(clube => [clube.id, criarLinha(clube.id)]));

  for (const partida of partidas) {
    if (!partida.jogada || partida.placarCasa === undefined || partida.placarFora === undefined) {
      continue;
    }

    const casa = tabela.get(partida.timeCasa);
    const fora = tabela.get(partida.timeFora);

    if (!casa || !fora) {
      continue;
    }

    casa.jogos += 1;
    fora.jogos += 1;
    casa.golsPro += partida.placarCasa;
    casa.golsContra += partida.placarFora;
    fora.golsPro += partida.placarFora;
    fora.golsContra += partida.placarCasa;
    casa.saldoGols = casa.golsPro - casa.golsContra;
    fora.saldoGols = fora.golsPro - fora.golsContra;

    if (partida.placarCasa > partida.placarFora) {
      casa.vitorias += 1;
      casa.pontos += 3;
      fora.derrotas += 1;
    } else if (partida.placarCasa < partida.placarFora) {
      fora.vitorias += 1;
      fora.pontos += 3;
      casa.derrotas += 1;
    } else {
      casa.empates += 1;
      fora.empates += 1;
      casa.pontos += 1;
      fora.pontos += 1;
    }
  }

  return [...tabela.values()].sort(
    (a, b) =>
      b.pontos - a.pontos ||
      b.vitorias - a.vitorias ||
      b.saldoGols - a.saldoGols ||
      b.golsPro - a.golsPro ||
      a.clubeId.localeCompare(b.clubeId),
  );
}
