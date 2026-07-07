import {create} from 'zustand';

import {temaClaro, temaEscuro, type Tema} from '../theme';

/**
 * Store do tema visual (dia/noite). PURO: não toca no banco — a persistência da
 * preferência é ligada por fora (em App.tsx, via `preferencias.ts`), para que
 * nenhum componente que use `useTema()` arraste o op-sqlite (que não existe no
 * ambiente de testes). Default = escuro ("Noite de estádio").
 */
export type ModoTema = 'claro' | 'escuro';

interface TemaState {
  modo: ModoTema;
  /** Paleta ativa — o objeto que `useTema()` entrega às telas. */
  tema: Tema;
  definirModo: (modo: ModoTema) => void;
  alternar: () => void;
}

function temaDoModo(modo: ModoTema): Tema {
  return modo === 'claro' ? temaClaro : temaEscuro;
}

export const useTemaStore = create<TemaState>((set, get) => ({
  modo: 'escuro',
  tema: temaEscuro,
  definirModo: modo => set({modo, tema: temaDoModo(modo)}),
  alternar: () => {
    const proximo: ModoTema = get().modo === 'escuro' ? 'claro' : 'escuro';
    set({modo: proximo, tema: temaDoModo(proximo)});
  },
}));
