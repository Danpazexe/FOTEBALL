import type {Partida} from '../types';
import type {GameState} from './useGameStore';

/**
 * Seletores derivados (Módulos 2 e 5). São funções puras sobre o estado.
 * Como criam novos arrays, NÃO devem ser usadas como seletor direto do zustand
 * (causaria "Maximum update depth"); a tela deve envolvê-las em `useMemo`.
 */

export type ResultadoForma = 'V' | 'E' | 'D';

function resultadoDoUsuario(
  partida: Partida,
  usuarioId: string,
): ResultadoForma {
  const ehCasa = partida.timeCasa === usuarioId;
  const golsPro = (ehCasa ? partida.placarCasa : partida.placarFora) ?? 0;
  const golsContra = (ehCasa ? partida.placarFora : partida.placarCasa) ?? 0;
  if (golsPro > golsContra) {
    return 'V';
  }
  if (golsPro < golsContra) {
    return 'D';
  }
  return 'E';
}

/** Últimos 5 resultados (V/E/D) do clube do usuário, do mais antigo ao recente. */
export function selecionarFormaRecente(state: GameState): ResultadoForma[] {
  const id = state.clubeUsuarioId;
  if (!id) {
    return [];
  }
  return state.partidas
    .filter(
      partida =>
        partida.jogada && (partida.timeCasa === id || partida.timeFora === id),
    )
    .sort((a, b) => a.rodada - b.rodada)
    .slice(-5)
    .map(partida => resultadoDoUsuario(partida, id));
}

/** Histórico de confrontos diretos já jogados entre dois clubes (mais recentes primeiro). */
export function selecionarHistoricoConfrontos(
  state: GameState,
  clubeAId: string,
  clubeBId: string,
  limite: number = 3,
): Partida[] {
  return state.partidas
    .filter(
      partida =>
        partida.jogada &&
        ((partida.timeCasa === clubeAId && partida.timeFora === clubeBId) ||
          (partida.timeCasa === clubeBId && partida.timeFora === clubeAId)),
    )
    .sort((a, b) => b.rodada - a.rodada)
    .slice(0, limite);
}
