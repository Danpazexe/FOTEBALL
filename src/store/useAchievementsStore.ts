import {create} from 'zustand';

import {CONQUISTAS, type Conquista} from '../data/conquistas';

/**
 * Store de conquistas (Módulo 15), separado do estado de jogo. Guarda quais
 * conquistas foram desbloqueadas e quais ainda não foram exibidas ao usuário
 * (para o toast). `useGameStore` chama `desbloquearConquista` após cada rodada.
 */
interface AchievementsState {
  conquistas: Conquista[];
  novasNaoVistas: string[];
  desbloquearConquista: (id: string) => void;
  marcarComoVistas: () => void;
  reiniciarConquistas: () => void;
}

function conquistasIniciais(): Conquista[] {
  return CONQUISTAS.map(conquista => ({...conquista}));
}

export const useAchievementsStore = create<AchievementsState>(set => ({
  conquistas: conquistasIniciais(),
  novasNaoVistas: [],

  desbloquearConquista: id => {
    set(state => {
      const alvo = state.conquistas.find(conquista => conquista.id === id);
      if (!alvo || alvo.desbloqueada) {
        return state;
      }
      return {
        conquistas: state.conquistas.map(conquista =>
          conquista.id === id
            ? {
                ...conquista,
                desbloqueada: true,
                dataDesbloqueio: new Date().toISOString().slice(0, 10),
              }
            : conquista,
        ),
        novasNaoVistas: [...state.novasNaoVistas, id],
      };
    });
  },

  marcarComoVistas: () => {
    set({novasNaoVistas: []});
  },

  reiniciarConquistas: () => {
    set({conquistas: conquistasIniciais(), novasNaoVistas: []});
  },
}));
