import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  espacamento,
  raios,
  useEstilosDS,
  useTheme,
  type TemaDS,
} from '../../design-system';

// ─────────────────────────────────────────────────────────────────────────────
// Confirmação + Toast: provider único usado por toda a UI.
// Telas chamam useConfirm() para pedir confirmação antes de ações importantes
// (vender/comprar, etc.) e useToast() para dar feedback do resultado.
// ─────────────────────────────────────────────────────────────────────────────

export interface ConfirmOpcoes {
  titulo: string;
  mensagem?: string;
  confirmarLabel?: string;
  cancelarLabel?: string;
  /** Destaca o botão de confirmação em vermelho (ações destrutivas). */
  perigo?: boolean;
  /** Linhas de detalhe (ex.: "Valor: R$ X", "Saldo após: R$ Y"). */
  detalhes?: {rotulo: string; valor: string; alerta?: boolean}[];
}

type ToastTipo = 'info' | 'sucesso' | 'erro';

interface FeedbackContextValor {
  confirm: (opcoes: ConfirmOpcoes) => Promise<boolean>;
  toast: (mensagem: string, tipo?: ToastTipo) => void;
}

const FeedbackContext = createContext<FeedbackContextValor | null>(null);

interface ConfirmEstado extends ConfirmOpcoes {
  visivel: boolean;
}

export function FeedbackProvider({children}: {children: React.ReactNode}) {
  const {cores} = useTheme();
  const styles = useEstilosDS(criarEstilos);
  const [confirmEstado, setConfirmEstado] = useState<ConfirmEstado>({
    visivel: false,
    titulo: '',
  });
  const resolverRef = useRef<((valor: boolean) => void) | null>(null);

  const [toastMsg, setToastMsg] = useState<{texto: string; tipo: ToastTipo} | null>(
    null,
  );
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const confirm = useCallback((opcoes: ConfirmOpcoes) => {
    return new Promise<boolean>(resolve => {
      resolverRef.current = resolve;
      setConfirmEstado({...opcoes, visivel: true});
    });
  }, []);

  const fechar = useCallback(
    (valor: boolean) => {
      setConfirmEstado(estado => ({...estado, visivel: false}));
      resolverRef.current?.(valor);
      resolverRef.current = null;
    },
    [],
  );

  const toast = useCallback(
    (mensagem: string, tipo: ToastTipo = 'info') => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
      setToastMsg({texto: mensagem, tipo});
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
      toastTimer.current = setTimeout(() => {
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }).start(() => setToastMsg(null));
      }, 2200);
    },
    [toastOpacity],
  );

  const valor = useMemo<FeedbackContextValor>(
    () => ({confirm, toast}),
    [confirm, toast],
  );

  const corConfirmar = confirmEstado.perigo ? cores.danger : cores.brandStrong;
  const corToast =
    toastMsg?.tipo === 'erro'
      ? cores.danger
      : toastMsg?.tipo === 'sucesso'
      ? cores.success
      : cores.border;

  return (
    <FeedbackContext.Provider value={valor}>
      {children}

      <Modal
        visible={confirmEstado.visivel}
        transparent
        animationType="fade"
        onRequestClose={() => fechar(false)}>
        <Pressable style={styles.backdrop} onPress={() => fechar(false)}>
          <Pressable style={styles.dialog}>
            <Text style={styles.titulo}>{confirmEstado.titulo}</Text>
            {confirmEstado.mensagem ? (
              <Text style={styles.mensagem}>{confirmEstado.mensagem}</Text>
            ) : null}

            {confirmEstado.detalhes && confirmEstado.detalhes.length > 0 ? (
              <View style={styles.detalhes}>
                {confirmEstado.detalhes.map(linha => (
                  <View key={linha.rotulo} style={styles.detalheLinha}>
                    <Text style={styles.detalheRotulo}>{linha.rotulo}</Text>
                    <Text
                      style={[
                        styles.detalheValor,
                        linha.alerta ? styles.detalheAlerta : null,
                      ]}>
                      {linha.valor}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.acoes}>
              <Pressable
                accessibilityRole="button"
                style={[styles.botao, styles.botaoCancelar]}
                onPress={() => fechar(false)}>
                <Text style={styles.botaoCancelarTexto}>
                  {confirmEstado.cancelarLabel ?? 'Cancelar'}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={[styles.botao, {backgroundColor: corConfirmar}]}
                onPress={() => fechar(true)}>
                <Text style={styles.botaoConfirmarTexto}>
                  {confirmEstado.confirmarLabel ?? 'Confirmar'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {toastMsg ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.toast, {opacity: toastOpacity, borderColor: corToast}]}>
          <Text style={styles.toastTexto}>{toastMsg.texto}</Text>
        </Animated.View>
      ) : null}
    </FeedbackContext.Provider>
  );
}

export function useConfirm(): (opcoes: ConfirmOpcoes) => Promise<boolean> {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    throw new Error('useConfirm precisa estar dentro de <FeedbackProvider>');
  }
  return ctx.confirm;
}

export function useToast(): (mensagem: string, tipo?: ToastTipo) => void {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    throw new Error('useToast precisa estar dentro de <FeedbackProvider>');
  }
  return ctx.toast;
}

const criarEstilos = (t: TemaDS) =>
  StyleSheet.create({
    backdrop: {
      alignItems: 'center',
      backgroundColor: t.cores.overlay,
      flex: 1,
      justifyContent: 'center',
      padding: espacamento[6],
    },
    dialog: {
      backgroundColor: t.cores.surface,
      borderColor: t.cores.border,
      borderRadius: raios.lg,
      borderWidth: 1,
      gap: espacamento[3],
      padding: espacamento[6],
      width: '100%',
    },
    titulo: {
      color: t.cores.textPrimary,
      fontSize: 19,
      fontWeight: '800',
    },
    mensagem: {
      color: t.cores.textSecondary,
      fontSize: 14,
      lineHeight: 20,
    },
    detalhes: {
      backgroundColor: t.cores.surfaceSubtle,
      borderRadius: raios.md,
      gap: espacamento[1],
      padding: espacamento[3],
    },
    detalheLinha: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    detalheRotulo: {
      color: t.cores.textSecondary,
      fontSize: 13,
    },
    detalheValor: {
      color: t.cores.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    detalheAlerta: {
      color: t.cores.danger,
    },
    acoes: {
      flexDirection: 'row',
      gap: espacamento[2],
      marginTop: espacamento[1],
    },
    botao: {
      alignItems: 'center',
      borderRadius: raios.sm,
      flex: 1,
      minHeight: 46,
      justifyContent: 'center',
      paddingHorizontal: espacamento[3],
    },
    botaoCancelar: {
      backgroundColor: 'transparent',
      borderColor: t.cores.border,
      borderWidth: 1,
    },
    botaoCancelarTexto: {
      color: t.cores.textPrimary,
      fontSize: 15,
      fontWeight: '700',
    },
    botaoConfirmarTexto: {
      color: t.cores.onBrand,
      fontSize: 15,
      fontWeight: '800',
    },
    toast: {
      alignSelf: 'center',
      backgroundColor: t.cores.scoreboard,
      borderRadius: raios.md,
      borderWidth: 1.5,
      bottom: 90,
      maxWidth: '90%',
      paddingHorizontal: espacamento[4],
      paddingVertical: espacamento[3],
      position: 'absolute',
    },
    toastTexto: {
      color: t.cores.onScoreboard,
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
    },
  });
