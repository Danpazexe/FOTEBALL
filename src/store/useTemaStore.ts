import {create} from 'zustand';

import type {Esquema, ModoTema} from '../design-system/themes/types';

/**
 * Store do tema. Fonte única da preferência de aparência (`modo`) e do esquema do
 * sistema (`esquemaSistema`), consumidos pelo `useTheme()` do design-system.
 *
 * PURO de I/O: não importa op-sqlite. A hidratação/persistência de `modo` e o
 * listener de `Appearance` vivem no `ThemeProvider` (mantém este store, importado
 * em todo lado, seguro no ambiente de testes).
 */
interface TemaState {
  /** Preferência do usuário: claro | escuro | sistema. */
  modo: ModoTema;
  /** Esquema do SO (Appearance), aplicado quando `modo === 'sistema'`. */
  esquemaSistema: Esquema;
  definirModo: (modo: ModoTema) => void;
  definirEsquemaSistema: (esquema: Esquema) => void;
}

export const useTemaStore = create<TemaState>(set => ({
  // Padrão 'claro' (North Star): as telas migradas assumem o tema claro. As telas
  // ainda NÃO migradas seguem escuras por constantes importadas de src/theme.
  modo: 'claro',
  esquemaSistema: 'escuro',
  definirModo: modo => set({modo}),
  definirEsquemaSistema: esquemaSistema => set({esquemaSistema}),
}));
