import {create} from 'zustand';

import {temaEscuro, type Tema} from '../theme';
import type {Esquema, ModoTema} from '../design-system/themes/types';

/**
 * Store do tema. Fonte única da preferência de aparência (`modo`) e do esquema do
 * sistema (`esquemaSistema`), consumidos pelo `useTheme()` do design-system.
 *
 * Mantém `tema` (forma ANTIGA, escuro) como PONTE: as telas ainda não migradas
 * consomem via `useTema()`/const e seguem escuras — zero regressão (ADR-0003).
 *
 * PURO de I/O: não importa op-sqlite. A hidratação/persistência de `modo` e o
 * listener de `Appearance` vivem no `ThemeProvider` (mantém este store, importado
 * em todo lado, seguro no ambiente de testes).
 */
interface TemaState {
  /** Ponte do tema antigo (escuro) — `useTema()` e telas const consomem daqui. */
  tema: Tema;
  /** Preferência do usuário: claro | escuro | sistema. */
  modo: ModoTema;
  /** Esquema do SO (Appearance), aplicado quando `modo === 'sistema'`. */
  esquemaSistema: Esquema;
  definirModo: (modo: ModoTema) => void;
  definirEsquemaSistema: (esquema: Esquema) => void;
}

export const useTemaStore = create<TemaState>(set => ({
  tema: temaEscuro,
  // Padrão 'claro' (North Star): as telas migradas assumem o tema claro. As telas
  // ainda NÃO migradas seguem escuras pela ponte `tema` (useTema()), até migrarem.
  modo: 'claro',
  esquemaSistema: 'escuro',
  definirModo: modo => set({modo}),
  definirEsquemaSistema: esquemaSistema => set({esquemaSistema}),
}));
