/**
 * Button — CTA do design system, estilo cartaz (v3): primary em verde-bandeira
 * com rótulo 900 em caixa alta, borda dura 2px na tinta e sombra deslocada
 * sólida (`elevacao.dura`; ghost e disabled ficam planos). Variantes
 * primary/secondary/ghost/danger, tamanhos sm/md/lg, estados default/pressed/
 * disabled/loading. Alvo de toque sempre ≥44 (via primitivo Pressable).
 * Cor por token.
 */
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import type {IconeNome} from '../../../components/Icone';
import {Icon} from '../../primitives/Icon';
import {Pressable} from '../../primitives/Pressable';
import {Text, type CorTexto} from '../../primitives/Text';
import {elevacao, espacamento, raios} from '../../tokens';
import {useTheme} from '../../themes/useTheme';

type Variante = 'primary' | 'secondary' | 'ghost' | 'danger';
type Tamanho = 'sm' | 'md' | 'lg';

type Props = {
  titulo: string;
  onPress: () => void;
  variante?: Variante;
  tamanho?: Tamanho;
  disabled?: boolean;
  loading?: boolean;
  icone?: IconeNome;
  /** Tamanho do ícone (default 'sm'). Use maior em botões só-ícone. */
  iconeSize?: number | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

// Alturas ≥44 (acessibilidade), crescendo por tamanho.
const ALTURA: Record<Tamanho, number> = {sm: 44, md: 48, lg: 56};

export function Button({
  titulo,
  onPress,
  variante = 'primary',
  tamanho = 'md',
  disabled,
  loading,
  icone,
  iconeSize = 'sm',
  fullWidth,
  style,
}: Props): React.JSX.Element {
  const {cores} = useTheme();
  const bloqueado = disabled || loading;

  const fundo =
    variante === 'primary'
      ? cores.brandStrong
      : variante === 'danger'
      ? cores.danger
      : variante === 'secondary'
      ? cores.surface
      : 'transparent';
  // Ghost usa brandStrong (verde com contraste AA de texto sobre papel/tinta).
  const corConteudo: CorTexto =
    variante === 'primary' || variante === 'danger'
      ? 'onBrand'
      : variante === 'ghost'
      ? 'brandStrong'
      : 'textPrimary';
  // Cartaz: borda dura na tinta em todo botão sólido; ghost fica sem moldura.
  const borda = variante === 'ghost' ? 'transparent' : cores.borderStrong;
  const sombra =
    variante === 'ghost' || bloqueado ? elevacao.nivel0 : elevacao.dura;

  return (
    <Pressable
      onPress={onPress}
      disabled={bloqueado}
      accessibilityState={{disabled: !!bloqueado, busy: !!loading}}
      style={[
        estilos.base,
        sombra,
        {
          backgroundColor: fundo,
          borderColor: borda,
          minHeight: ALTURA[tamanho],
          borderRadius: raios.md,
        },
        fullWidth ? estilos.fullWidth : null,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={cores[corConteudo]} />
      ) : (
        <View style={estilos.conteudo}>
          {icone ? (
            <Icon nome={icone} size={iconeSize} color={corConteudo} />
          ) : null}
          <Text
            variant="labelL"
            color={corConteudo}
            weight="900"
            style={estilos.rotulo}>
            {titulo}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    borderWidth: 2,
    paddingHorizontal: espacamento[4],
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {alignSelf: 'stretch'},
  conteudo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[2],
  },
  /** Grito de cartaz: caixa alta com respiro entre letras. */
  rotulo: {textTransform: 'uppercase', letterSpacing: 0.8},
});
