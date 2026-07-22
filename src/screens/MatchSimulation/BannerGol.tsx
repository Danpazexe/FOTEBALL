/**
 * BannerGol — o "GOOOL!" físico de cartaz da partida ao vivo (North Star
 * GERAL: torcida/cartaz). Quando sai gol no jogo do usuário, um cartaz toma a
 * largura da área do feed por ~2,5s: verde-bandeira (`brandStrong`) para gol
 * A FAVOR, tinta (`scoreboard`) para gol contra; "GOOOL!" gigante 900 em caixa
 * alta + autor + placar novo, moldura 2px na tinta e sombra dura.
 *
 * Só apresentação: quem detecta o gol é a tela (eventos da simulação). O
 * cartaz nunca bloqueia toques (`pointerEvents="none"`) e fica escondido do
 * leitor de tela — o lance já é anunciado pela timeline.
 */
import React, {useEffect} from 'react';
import {StyleSheet, type StyleProp, type ViewStyle} from 'react-native';
import Animated, {
  FadeOut,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import {
  Text,
  elevacao,
  espacamento,
  raios,
  useTheme,
} from '../../design-system';
import {ehEventoGol, type EventoPartidaTipo} from '../../types';

/** Tempo do cartaz em cena (~2,5s); depois ele avisa o pai e sai limpo. */
export const DURACAO_BANNER_GOL_MS = 2500;

export type DadosBannerGol = {
  /** Sequencial do gol — gol novo remonta o cartaz (o pai usa como `key`). */
  chave: number;
  /** Gol A FAVOR do usuário (verde-bandeira) ou contra ele (tinta). */
  doUsuario: boolean;
  /** Quem marcou; gol contra ganha o sufixo "(contra)". */
  autor: string;
  /** Placar NOVO já com o gol ("2 - 1", casa - fora). */
  placar: string;
};

/**
 * Monta os dados do cartaz a partir de um evento da simulação. Devolve null
 * para qualquer evento que NÃO muda o placar (só gol/gol contra viram cartaz).
 * Puro — a regra é testável sem UI.
 */
export function dadosBannerDeEvento(entrada: {
  chave: number;
  tipo: EventoPartidaTipo;
  doUsuario: boolean;
  nomeAutor: string;
  placarCasa: number;
  placarFora: number;
}): DadosBannerGol | null {
  if (!ehEventoGol(entrada.tipo)) {
    return null;
  }
  return {
    chave: entrada.chave,
    doUsuario: entrada.doUsuario,
    autor:
      entrada.tipo === 'gol_contra'
        ? `${entrada.nomeAutor} (contra)`
        : entrada.nomeAutor,
    placar: `${entrada.placarCasa} - ${entrada.placarFora}`,
  };
}

type Props = {
  dados: DadosBannerGol;
  /** Chamado após ~2,5s; o pai desmonta e o FadeOut cuida da saída. */
  onExpirar: () => void;
  /** Posicionamento — o pai decide onde o cartaz flutua. */
  style?: StyleProp<ViewStyle>;
};

/**
 * Spring rápido de cartaz batido na parede: pop com leve overshoot, sem
 * balançar. `ReduceMotion.System` corta a animação quando o sistema pede
 * redução de movimento (o cartaz aparece direto no lugar).
 */
const MOLA = {
  damping: 14,
  stiffness: 260,
  reduceMotion: ReduceMotion.System,
} as const;

export function BannerGol({dados, onExpirar, style}: Props): React.JSX.Element {
  const {cores} = useTheme();
  const progresso = useSharedValue(0);

  useEffect(() => {
    progresso.value = withSpring(1, MOLA);
    const timer = setTimeout(onExpirar, DURACAO_BANNER_GOL_MS);
    return () => clearTimeout(timer);
  }, [progresso, onExpirar]);

  const estiloAnimado = useAnimatedStyle(() => ({
    opacity: Math.min(1, progresso.value * 2),
    transform: [
      {translateY: 16 * (1 - progresso.value)},
      {scale: 0.7 + 0.3 * progresso.value},
    ],
  }));

  const corConteudo = dados.doUsuario ? 'onBrand' : 'onScoreboard';
  return (
    <Animated.View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      // Saída limpa; o FadeOut respeita redução de movimento por padrão
      // (ReduceMotion.System é o default do Reanimated).
      exiting={FadeOut.duration(160)}
      style={[
        estilos.cartaz,
        {
          backgroundColor: dados.doUsuario
            ? cores.brandStrong
            : cores.scoreboard,
          borderColor: cores.borderStrong,
        },
        estiloAnimado,
        style,
      ]}>
      <Text variant="display" color={corConteudo} align="center" numberOfLines={1}>
        GOOOL!
      </Text>
      <Text
        variant="titleM"
        color={corConteudo}
        align="center"
        numberOfLines={1}
        tabular>
        {dados.autor} · {dados.placar}
      </Text>
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  cartaz: {
    borderWidth: 2,
    borderRadius: raios.lg,
    paddingVertical: espacamento[4],
    paddingHorizontal: espacamento[3],
    alignItems: 'center',
    gap: espacamento[1],
    ...elevacao.dura,
  },
});
