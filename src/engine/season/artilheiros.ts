import type {Player} from '../../types';

/**
 * Ranking de artilheiros da competição (BRASFOOT_MASTER §11). Função pura: a
 * partir dos jogadores da liga, ordena os goleadores da temporada. Desempate por
 * gols → assistências → nome (estável, sem sorteio).
 */

export interface LinhaArtilheiro {
  jogadorId: string;
  nome: string;
  clubeId: string | null;
  gols: number;
  assistencias: number;
}

export function calcularArtilheiros(
  jogadores: Player[],
  limite = 20,
): LinhaArtilheiro[] {
  return jogadores
    .filter(jogador => jogador.estatisticasTemporada.gols > 0)
    .map(jogador => ({
      jogadorId: jogador.id,
      nome: jogador.nome,
      clubeId: jogador.clubeId,
      gols: jogador.estatisticasTemporada.gols,
      assistencias: jogador.estatisticasTemporada.assistencias,
    }))
    .sort(
      (a, b) =>
        b.gols - a.gols ||
        b.assistencias - a.assistencias ||
        a.nome.localeCompare(b.nome),
    )
    .slice(0, limite);
}
