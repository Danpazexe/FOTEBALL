import {create} from 'zustand';

import {CONQUISTAS, type Conquista, type ConquistaSalva} from '../data/conquistas';

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
  /** Reaplica o estado de desbloqueio vindo de um save carregado. */
  restaurarConquistas: (salvas: ConquistaSalva[]) => void;
}

function conquistasIniciais(): Conquista[] {
  return CONQUISTAS.map(conquista => ({...conquista}));
}

/** Extrai a forma mínima a persistir: só as conquistas desbloqueadas. */
export function conquistasParaSalvar(conquistas: Conquista[]): ConquistaSalva[] {
  return conquistas
    .filter(conquista => conquista.desbloqueada)
    .map(conquista => ({
      id: conquista.id,
      dataDesbloqueio: conquista.dataDesbloqueio,
    }));
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

  restaurarConquistas: salvas => {
    const porId = new Map(salvas.map(salva => [salva.id, salva]));
    set({
      // Parte do catálogo atual (pega novas conquistas adicionadas após o save)
      // e marca como desbloqueada apenas o que o save registrava.
      conquistas: conquistasIniciais().map(conquista => {
        const salva = porId.get(conquista.id);
        return salva
          ? {
              ...conquista,
              desbloqueada: true,
              dataDesbloqueio: salva.dataDesbloqueio,
            }
          : conquista;
      }),
      // Ao carregar um save, nada é "novo" (não dispara toast retroativo).
      novasNaoVistas: [],
    });
  },
}));
