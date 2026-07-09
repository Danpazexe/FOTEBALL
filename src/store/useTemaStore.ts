import {create} from 'zustand';

import {temaEscuro, type Tema} from '../theme';

/**
 * Store do tema visual. O jogo tem UM só mundo — "noite de estádio" — então o
 * tema é constante (não há mais modo dia/noite). Mantido como store para que
 * `useTema()`/`useEstilos()` continuem consumindo do mesmo lugar.
 */
interface TemaState {
  /** Paleta ativa — o objeto que `useTema()` entrega às telas. */
  tema: Tema;
}

export const useTemaStore = create<TemaState>(() => ({
  tema: temaEscuro,
}));
