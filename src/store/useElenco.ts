/**
 * Hooks React de leitura do elenco do usuário — derivam listas estáveis do store
 * com useMemo. Ficam FORA do useGameStore (que é estado puro, sem React); a store
 * apenas os RE-EXPORTA para manter a API das telas. O import de `useGameStore`
 * aqui + o re-export lá formam um ciclo que resolve em runtime porque o
 * re-export vem DEPOIS da definição do store e os hooks só o chamam em render.
 *
 * NÃO usar como seletores diretos do zustand: criam novas referências
 * (arrays/objetos) a cada chamada, o que dispara "Maximum update depth exceeded"
 * com o useSyncExternalStore interno. Por isso derivam de fatias estáveis.
 */
import {useMemo} from 'react';

import {
  calcularForcaTime,
  type ForcaTime,
} from '../engine/simulation/teamStrength';
import type {Clube, Player} from '../types';
import {jogadoresDoClube} from './helpers';
import {useGameStore} from './useGameStore';

function forcaClube(clube: Clube, jogadores: Player[]): ForcaTime | null {
  if (!clube.formacaoAtual || !clube.taticaAtual) {
    return null;
  }

  return calcularForcaTime(
    clube.formacaoAtual,
    jogadoresDoClube(jogadores, clube.id),
    clube.taticaAtual,
  );
}

/** Elenco do usuário ordenado por overall (desc), memoizado. */
export function useJogadoresUsuario(): Player[] {
  const jogadores = useGameStore(state => state.jogadores);
  const clubeUsuarioId = useGameStore(state => state.clubeUsuarioId);

  return useMemo(() => {
    if (!clubeUsuarioId) {
      return [];
    }

    return jogadoresDoClube(jogadores, clubeUsuarioId).sort(
      (a, b) => b.overall - a.overall,
    );
  }, [jogadores, clubeUsuarioId]);
}

/** Força do time do usuário (ou null se sem formação/tática definidas). */
export function useForcaUsuario(): ForcaTime | null {
  const clubes = useGameStore(state => state.clubes);
  const clubeUsuarioId = useGameStore(state => state.clubeUsuarioId);
  const jogadores = useGameStore(state => state.jogadores);

  return useMemo(() => {
    const clube = clubes.find(item => item.id === clubeUsuarioId);
    return clube ? forcaClube(clube, jogadores) : null;
  }, [clubes, clubeUsuarioId, jogadores]);
}
