/**
 * Capitão do time. Puro e determinístico: valida o capitão atual (só vale se
 * ainda está no elenco) e sugere o melhor candidato à braçadeira (liderança =
 * qualidade + experiência). Derivação; sem estado, sem RNG. A designação em si
 * fica no clube (Clube.capitaoId).
 */

import type {Player} from '../../types';

/** Devolve o capitão se ele ainda pertence ao elenco; senão null. */
export function capitaoValido(
  capitaoId: string | undefined,
  jogadores: Player[],
): string | null {
  if (!capitaoId) {
    return null;
  }
  return jogadores.some(jogador => jogador.id === capitaoId)
    ? capitaoId
    : null;
}

/**
 * Sugere o melhor capitão do elenco: maior overall, desempatando pelo mais
 * experiente (idade) e por fim pelo id (estável). Null se o elenco está vazio.
 */
export function sugerirCapitao(jogadores: Player[]): string | null {
  if (jogadores.length === 0) {
    return null;
  }
  let melhor = jogadores[0];
  for (const jogador of jogadores) {
    if (
      jogador.overall > melhor.overall ||
      (jogador.overall === melhor.overall && jogador.idade > melhor.idade) ||
      (jogador.overall === melhor.overall &&
        jogador.idade === melhor.idade &&
        jogador.id < melhor.id)
    ) {
      melhor = jogador;
    }
  }
  return melhor.id;
}
