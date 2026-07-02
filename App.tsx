import React, {useEffect, useState} from 'react';
import {StatusBar, StyleSheet} from 'react-native';
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
    const cancelar = useGameStore.subscribe(estado => {
      if (timer) {
        clearTimeout(timer);
      }
      if (!estado.clubeUsuarioId) {
        timer = setTimeout(() => {
          limparSave().catch(() => {});
        }, 300);
        return;
      }
      timer = setTimeout(() => {
        const conquistas = conquistasParaSalvar(
          useAchievementsStore.getState().conquistas,
        );
        salvarJogo(estado, conquistas).catch(() => {});
      }, DEBOUNCE_SALVAR_MS);
    });
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
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
