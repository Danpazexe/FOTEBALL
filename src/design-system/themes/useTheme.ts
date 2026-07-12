/**
 * Hooks do tema do Design System v2. Consomem a preferência (`modo`) e o esquema
 * do sistema do `useTemaStore` e resolvem o tema claro/escuro. PUROS de estado —
 * a montagem do listener de `Appearance`/persistência vive no `ThemeProvider`.
 *
 *   const t = useTheme();                       // { esquema, cores, esporte }
 *   const styles = useEstilosDS(criarEstilos);  // StyleSheet reativo ao tema
 */
import {useMemo} from 'react';

import {useTemaStore} from '../../store/useTemaStore';
import {temaClaroDS} from './light';
import {temaEscuroDS} from './dark';
import type {Esquema, ModoTema, TemaDS} from './types';

/** Resolve o esquema efetivo a partir da preferência e do esquema do sistema. */
export function resolverEsquema(modo: ModoTema, esquemaSistema: Esquema): Esquema {
  return modo === 'sistema' ? esquemaSistema : modo;
}

/** Tema ativo (referência estável por esquema — bom para memo). */
export function useTheme(): TemaDS {
  const modo = useTemaStore(estado => estado.modo);
  const esquemaSistema = useTemaStore(estado => estado.esquemaSistema);
  return resolverEsquema(modo, esquemaSistema) === 'claro'
    ? temaClaroDS
    : temaEscuroDS;
}

/** Preferência atual + setter (para o seletor de aparência). */
export function useModoTema(): {modo: ModoTema; definirModo: (modo: ModoTema) => void} {
  const modo = useTemaStore(estado => estado.modo);
  const definirModo = useTemaStore(estado => estado.definirModo);
  return {modo, definirModo};
}

/** Monta um StyleSheet a partir do tema ativo, memorizado por tema. */
export function useEstilosDS<T>(criar: (tema: TemaDS) => T): T {
  const tema = useTheme();
  return useMemo(() => criar(tema), [tema, criar]);
}
