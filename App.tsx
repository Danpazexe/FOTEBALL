import React, {useEffect, useState} from 'react';
import {AppState, StatusBar, StyleSheet} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from 'react-native-safe-area-context';
import {
  DefaultTheme,
  NavigationContainer,
  type Theme,
} from '@react-navigation/native';

import {RootNavigator} from './src/navigation/RootNavigator';
import {FeedbackProvider} from './src/components/feedback';
import ToastConquista from './src/components/ToastConquista';
import Loading from './src/screens/Loading';
import {carregarJogo, limparSave, salvarJogo} from './src/store/persistence';
import {useGameStore} from './src/store/useGameStore';
import {
  conquistasParaSalvar,
  useAchievementsStore,
} from './src/store/useAchievementsStore';
import {cores} from './src/theme';

const DEBOUNCE_SALVAR_MS = 800;

const temaFoteball: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: cores.primaria,
    background: cores.fundo,
    card: cores.superficie,
    text: cores.texto,
    border: cores.borda,
    notification: cores.secundaria,
  },
};

/**
 * App = apenas o controlador de telas. Toda a UI vive em src/screens (telas)
 * e src/components (componentes reutilizáveis); a navegação em src/navigation.
 */
function App(): React.JSX.Element {
  const [carregando, setCarregando] = useState(true);

  // Boot: hidrata o save (se houver) antes de montar a navegação.
  useEffect(() => {
    let ativo = true;
    carregarJogo()
      .then(resultado => {
        if (!ativo || resultado.tipo !== 'ok') {
          // 'vazio' (sem save) e 'erro' (corrompido sem backup) caem no estado
          // inicial limpo — nunca apagamos o save aqui, para não perder a chance
          // de recuperação manual de um save danificado.
          return;
        }
        useGameStore.setState(resultado.estado);
        useAchievementsStore
          .getState()
          .restaurarConquistas(resultado.conquistas);
      })
      .catch(() => {})
      .finally(() => {
        if (ativo) {
          setCarregando(false);
        }
      });
    return () => {
      ativo = false;
    };
  }, []);

  // Auto-save: salva (com debounce) a cada mudança quando há carreira ativa;
  // apaga o save ao reiniciar a carreira (clubeUsuarioId volta a ser null).
  useEffect(() => {
    if (carregando) {
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Último estado COM carreira ainda não gravado — usado no flush (background).
    let pendente: ReturnType<typeof useGameStore.getState> | null = null;

    const gravar = (
      estado: ReturnType<typeof useGameStore.getState>,
    ): void => {
      const conquistas = conquistasParaSalvar(
        useAchievementsStore.getState().conquistas,
      );
      salvarJogo(estado, conquistas).catch(erro =>
        console.warn('[save] falha ao gravar:', erro),
      );
    };

    const cancelar = useGameStore.subscribe(estado => {
      if (timer) {
        clearTimeout(timer);
      }
      if (!estado.clubeUsuarioId) {
        pendente = null;
        timer = setTimeout(() => {
          limparSave().catch(() => {});
        }, 300);
        return;
      }
      pendente = estado;
      timer = setTimeout(() => {
        gravar(estado);
        pendente = null;
      }, DEBOUNCE_SALVAR_MS);
    });

    // Flush imediato ao mandar o app pro background/inativo (fechar após a
    // partida): grava JÁ o pendente, sem esperar o debounce — senão o save some.
    const flush = (proximo: string): void => {
      if (proximo !== 'background' && proximo !== 'inactive') {
        return;
      }
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
      if (pendente) {
        gravar(pendente);
        pendente = null;
      }
    };
    const assinaturaApp = AppState.addEventListener('change', flush);

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      // Grava o pendente ao desmontar também (rede de segurança).
      if (pendente) {
        gravar(pendente);
      }
      assinaturaApp.remove();
      cancelar();
    };
  }, [carregando]);

  if (carregando) {
    return <Loading />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <StatusBar barStyle="dark-content" backgroundColor={cores.fundo} />
        <NavigationContainer theme={temaFoteball}>
          <FeedbackProvider>
            <RootNavigator />
          </FeedbackProvider>
        </NavigationContainer>
        <ToastConquista />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default App;
