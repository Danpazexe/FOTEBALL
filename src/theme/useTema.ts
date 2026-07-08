/**
 * Hooks de tema — separados de `./index` (que é PURO, sem React) para não puxar
 * React onde não deve. Telas/componentes migrados para dia/noite consomem daqui.
 *
 *   const {cores} = useTema();                    // valores inline
 *   const styles = useEstilos(criarEstilos);      // StyleSheet reativo
 *
 * onde `criarEstilos = (t: Tema) => StyleSheet.create({...})` fica em escopo de
 * módulo (identidade estável) e recebe o tema ativo.
 */
import {useMemo} from 'react';

import {useTemaStore} from '../store/useTemaStore';
import type {Tema} from './index';

/** Tema ativo — único ("noite de estádio"); vem do store para um só ponto de leitura. */
export function useTema(): Tema {
  return useTemaStore(estado => estado.tema);
}

/** Monta um StyleSheet a partir do tema ativo, memorizado por tema. */
export function useEstilos<T>(criar: (tema: Tema) => T): T {
  const tema = useTema();
  return useMemo(() => criar(tema), [tema, criar]);
}
