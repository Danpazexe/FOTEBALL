import React, {useEffect, useMemo, useState} from 'react';
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
import SaveIndicator from './src/components/SaveIndicator';
import {carregarJogo, limparSave, salvarJogo} from './src/store/persistence';
import {sincronizarMusica} from './src/audio/musica';
import {useGameStore} from './src/store/useGameStore';
import {
  conquistasParaSalvar,
  useAchievementsStore,
} from './src/store/useAchievementsStore';
import {type Tema} from './src/theme';
import {useTemaStore} from './src/store/useTemaStore';
import {
  carregarModoTema,
  salvarModoTema,
} from './src/api/database/preferencias';

const DEBOUNCE_SALVAR_MS = 800;

/** Tema de navegação derivado da paleta ativa (dia/noite). */
function criarTemaNav(tema: Tema): Theme {
  return {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: tema.cores.primaria,
      background: tema.cores.fundo,
      card: tema.cores.superficie,
      text: tema.cores.texto,
      border: tema.cores.borda,
      notification: tema.cores.secundaria,
    },
  };
}

/**
 * App = apenas o controlador de telas. Toda a UI vive em src/screens (telas)
 * e src/components (componentes reutilizáveis); a navegação em src/navigation.
 */
function App(): React.JSX.Element {
  const [carregando, setCarregando] = useState(true);

  // Tema visual (dia/noite): paleta ativa + tema de navegação derivado.
  const temaAtivo = useTemaStore(estado => estado.tema);
  const modoTema = useTemaStore(estado => estado.modo);
  const temaFoteball = useMemo(() => criarTemaNav(temaAtivo), [temaAtivo]);

  // Hidrata a preferência de tema salva (fora do save da carreira).
  useEffect(() => {
    let ativo = true;
    carregarModoTema()
      .then(modo => {
        if (ativo && modo) {
          useTemaStore.getState().definirModo(modo);
        }
      })
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, []);

  // Persiste o tema a cada troca (idempotente na hidratação).
  useEffect(
    () =>
      useTemaStore.subscribe(estado => {
        salvarModoTema(estado.modo);
      }),
    [],
  );

  // Boot: hidrata o save (se houver) antes de montar a navegação.
  useEffect(() => {
    let ativo = true;
    carregarJogo()
      .then(resultado => {
        if (!ativo) {
          return;
        }
        // Log de diagnóstico (visível no Metro/logcat): separa "sem save" (VAZIO)
        // de "load quebrou" (ERRO) — antes ambos caíam mudos em jogo novo.
        if (resultado.tipo === 'erro') {
          console.warn('[boot] load ERRO:', resultado.mensagem);
          return;
        }
        if (resultado.tipo === 'vazio') {
          console.warn('[boot] load VAZIO — disco sem save');
          return;
        }
        console.warn(
          '[boot] load OK origem=',
          resultado.origem,
          'clubeUsuarioId=',
          resultado.estado.clubeUsuarioId,
        );
        useGameStore.setState(resultado.estado);
        useAchievementsStore
          .getState()
          .restaurarConquistas(resultado.conquistas);
      })
      .catch(erro => console.warn('[boot] carregarJogo rejeitou:', erro))
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
    // Exclusão do save agendada (reinício de carreira) ainda não executada — o
    // flush precisa saber disso para não engolir o limparSave ao ir pro background.
    let limparPendente = false;

    const gravar = (estado: ReturnType<typeof useGameStore.getState>): void => {
      const conquistas = conquistasParaSalvar(
        useAchievementsStore.getState().conquistas,
      );
      salvarJogo(estado, conquistas).catch(erro =>
        console.warn('[save] falha ao gravar:', erro),
      );
    };

    const cancelar = useGameStore.subscribe((estado, anterior) => {
      if (timer) {
        clearTimeout(timer);
      }
      if (!estado.clubeUsuarioId) {
        pendente = null;
        // Só apaga o save quando o usuário SAI de uma carreira (reinício
        // explícito): transição clubeUsuarioId setado → null. NUNCA apaga por um
        // null "de boot" (ex.: load que falhou), o que destruiria um save válido.
        if (anterior.clubeUsuarioId) {
          limparPendente = true;
          timer = setTimeout(() => {
            limparSave().catch(() => {});
            limparPendente = false;
          }, 300);
        }
        return;
      }
      limparPendente = false;
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
      // Exclusão agendada (reinício de carreira) também precisa ir JÁ — senão o
      // clearTimeout acima a cancelaria e o save antigo voltaria no próximo boot.
      if (limparPendente) {
        limparSave().catch(() => {});
        limparPendente = false;
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
      if (limparPendente) {
        limparSave().catch(() => {});
        limparPendente = false;
      }
      assinaturaApp.remove();
      cancelar();
    };
  }, [carregando]);

  // Música de fundo CONTÍNUA: dirigida no nível do app (não por tela), então não
  // corta ao navegar. A partida a suspende via suprimirMusica (em MatchSimulation)
  // e o app em background pausa/retoma (dentro de musica.ts). Só arranca depois
  // de hidratar o save, para respeitar a faixa/volume/on-off salvos.
  const musicaHabilitada = useGameStore(state => state.config.musicaHabilitada);
  const volumeMusica = useGameStore(state => state.config.volumeMusica);
  const musicaSelecionada = useGameStore(
    state => state.config.musicaSelecionada,
  );
  // Só toca com carreira ativa: o controle (vinil) vive na aba Início, dentro do
  // jogo. Sem isso, no fresh install a música tocaria no menu sem nenhum controle.
  const temCarreira = useGameStore(state => state.clubeUsuarioId !== null);
  useEffect(() => {
    if (carregando) {
      return;
    }
    sincronizarMusica({
      faixa: musicaSelecionada,
      volume: volumeMusica,
      habilitada: musicaHabilitada && temCarreira,
    });
  }, [carregando, musicaHabilitada, volumeMusica, musicaSelecionada, temCarreira]);

  if (carregando) {
    return <Loading />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <StatusBar
          barStyle={modoTema === 'escuro' ? 'light-content' : 'dark-content'}
          backgroundColor={temaAtivo.cores.fundo}
        />
        <NavigationContainer theme={temaFoteball}>
          <FeedbackProvider>
            <RootNavigator />
          </FeedbackProvider>
        </NavigationContainer>
        <ToastConquista />
        <SaveIndicator />
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
