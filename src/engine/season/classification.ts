import type {Clube, Partida, TabelaClassificacao} from '../../types';

/**
 * Confronto direto entre dois clubes (critério de desempate da CBF, aplicado
 * entre 2 times). Compara pontos e, em seguida, saldo de gols SÓ nos jogos
 * entre eles. Retorna um número no padrão de comparador (negativo = `a` na
 * frente); 0 quando empatam no confronto ou ainda não se enfrentaram.
 */
function confrontoDireto(
  aId: string,
  bId: string,
  partidas: Partida[],
): number {
  let pontosA = 0;
  let pontosB = 0;
  let saldoA = 0;
  for (const partida of partidas) {
    if (
      !partida.jogada ||
      partida.placarCasa === undefined ||
      partida.placarFora === undefined
    ) {
      continue;
    }
    const entreOsDois =
      (partida.timeCasa === aId && partida.timeFora === bId) ||
      (partida.timeCasa === bId && partida.timeFora === aId);
    if (!entreOsDois) {
      continue;
    }
    const aEhCasa = partida.timeCasa === aId;
    const golsA = aEhCasa ? partida.placarCasa : partida.placarFora;
    const golsB = aEhCasa ? partida.placarFora : partida.placarCasa;
    saldoA += golsA - golsB;
    if (golsA > golsB) {
      pontosA += 3;
    } else if (golsB > golsA) {
      pontosB += 3;
    } else {
      pontosA += 1;
      pontosB += 1;
    }
  }
  // Mais pontos no confronto fica à frente (b - a => negativo coloca `a` antes).
  return pontosB - pontosA || -saldoA;
}

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

  // Critérios de desempate (ordem CBF): pontos, vitórias, saldo, gols pró,
  // confronto direto e, por fim, ordem estável por id (no lugar do sorteio).
  return [...tabela.values()].sort(
    (a, b) =>
      b.pontos - a.pontos ||
      b.vitorias - a.vitorias ||
      b.saldoGols - a.saldoGols ||
      b.golsPro - a.golsPro ||
      confrontoDireto(a.clubeId, b.clubeId, partidas) ||
      a.clubeId.localeCompare(b.clubeId),
  );
}
