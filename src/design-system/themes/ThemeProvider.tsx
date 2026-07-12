/**
 * ThemeProvider — ciclo de vida do tema (não é um Context; o tema é entregue pelo
 * store via `useTheme()`). Responsável por:
 *  1. seguir o esquema do SO (`Appearance`) quando `modo === 'sistema'`;
 *  2. hidratar o `modo` persistido no boot;
 *  3. persistir o `modo` a cada mudança.
 *
 * Montado uma vez no `App`. Mantém op-sqlite fora de quem só consome tema.
 */
import React, {useEffect} from 'react';
import {Appearance, type ColorSchemeName} from 'react-native';

import {useTemaStore} from '../../store/useTemaStore';
import {carregarModo, salvarModo} from '../../store/temaPersistence';

type Props = {children: React.ReactNode};

export function ThemeProvider({children}: Props): React.JSX.Element {
  // 1. Esquema do sistema → store.
  useEffect(() => {
    const aplicar = (cs: ColorSchemeName | null | undefined): void =>
      useTemaStore
        .getState()
        .definirEsquemaSistema(cs === 'light' ? 'claro' : 'escuro');
    aplicar(Appearance.getColorScheme());
    const assinatura = Appearance.addChangeListener(({colorScheme}) =>
      aplicar(colorScheme),
    );
    return () => assinatura.remove();
  }, []);

  // 2. Hidrata o modo persistido e 3. persiste em cada mudança.
  useEffect(() => {
    let ativo = true;
    carregarModo()
      .then(modo => {
        if (ativo && modo) {
          useTemaStore.getState().definirModo(modo);
        }
      })
      .catch(() => {});
    const cancelar = useTemaStore.subscribe((estado, anterior) => {
      if (estado.modo !== anterior.modo) {
        salvarModo(estado.modo).catch(() => {});
      }
    });
    return () => {
      ativo = false;
      cancelar();
    };
  }, []);

  return <>{children}</>;
}
