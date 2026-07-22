/**
 * SelectRow — seletor "dropdown" de opção única. Dois modos: `linha` (rótulo +
 * valor + ▾, ocupa a largura) e `pill` (compacto, só valor + ▾). Ao tocar, abre
 * uma folha inferior com as opções (a selecionada marcada). Cor por token.
 */
import React, {useState} from 'react';
import {Modal, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Icon} from '../../primitives/Icon';
import {Pressable} from '../../primitives/Pressable';
import {Text} from '../../primitives/Text';
import {espacamento, raios} from '../../tokens';
import {useTheme} from '../../themes/useTheme';
import {Card} from '../Card';

type Props = {
  label?: string;
  valor: string;
  opcoes: readonly string[];
  onSelect: (valor: string) => void;
  /** Compacto (só o valor + ▾), para cabeçalhos como a formação. */
  pill?: boolean;
  /** Pílula ainda menor (padding/tipografia reduzidos). Só com `pill`. */
  compacto?: boolean;
};

export function SelectRow({
  label,
  valor,
  opcoes,
  onSelect,
  pill,
  compacto,
}: Props): React.JSX.Element {
  const {cores} = useTheme();
  // Folha inferior em Modal edge-to-edge: soma o inset da gesture/nav bar.
  const insets = useSafeAreaInsets();
  const [aberto, setAberto] = useState(false);

  const escolher = (v: string) => {
    setAberto(false);
    if (v !== valor) {
      onSelect(v);
    }
  };

  const gatilho = pill ? (
    <Pressable
      onPress={() => setAberto(true)}
      minSize="min"
      accessibilityLabel={`${label ?? 'Opção'}: ${valor}`}
      style={[
        estilos.pill,
        compacto ? estilos.pillCompacto : null,
        {backgroundColor: cores.surfaceSubtle, borderColor: cores.border},
      ]}>
      <Text variant={compacto ? 'labelM' : 'labelL'} color="brand">
        {valor}
      </Text>
      <Icon nome="seta-baixo" size={compacto ? 13 : 16} color="brand" />
    </Pressable>
  ) : (
    <Card
      variante="interactive"
      onPress={() => setAberto(true)}
      padding={3}
      accessibilityLabel={`${label ?? ''}: ${valor}`}
      style={estilos.linha}>
      {label ? (
        <Text variant="labelL" style={estilos.flex}>
          {label}
        </Text>
      ) : null}
      <Text variant="labelL" color="brand">
        {valor}
      </Text>
      <Icon nome="seta-baixo" size={18} color="textMuted" />
    </Card>
  );

  return (
    <>
      {gatilho}
      <Modal
        visible={aberto}
        transparent
        animationType="slide"
        onRequestClose={() => setAberto(false)}>
        <Pressable
          onPress={() => setAberto(false)}
          accessibilityLabel="Fechar"
          style={[estilos.backdrop, {backgroundColor: cores.overlay}]}>
          <View
            style={[
              estilos.sheet,
              {
                backgroundColor: cores.surface,
                borderColor: cores.border,
                paddingBottom: espacamento[6] + insets.bottom,
              },
            ]}>
            {label ? (
              <Text
                variant="labelM"
                color="textSecondary"
                style={estilos.sheetTitulo}>
                {label}
              </Text>
            ) : null}
            {opcoes.map(op => {
              const sel = op === valor;
              return (
                <Pressable
                  key={op}
                  onPress={() => escolher(op)}
                  accessibilityState={{selected: sel}}
                  style={estilos.opcao}>
                  <Text
                    variant="bodyL"
                    color={sel ? 'brand' : 'textPrimary'}
                    style={estilos.flex}>
                    {op}
                  </Text>
                  {sel ? <Icon nome="check" size={18} color="brand" /> : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const estilos = StyleSheet.create({
  flex: {flex: 1},
  linha: {flexDirection: 'row', alignItems: 'center', gap: espacamento[2]},
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[1],
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: raios.full,
    paddingHorizontal: espacamento[3],
    paddingVertical: espacamento[1],
  },
  pillCompacto: {
    gap: 3,
    paddingHorizontal: espacamento[2],
    paddingVertical: 2,
  },
  backdrop: {flex: 1, justifyContent: 'flex-end'},
  sheet: {
    borderTopLeftRadius: raios.xl,
    borderTopRightRadius: raios.xl,
    borderWidth: 1,
    paddingHorizontal: espacamento[4],
    paddingTop: espacamento[3],
    // paddingBottom vem inline: espacamento[6] + inset inferior (edge-to-edge).
    gap: 2,
  },
  sheetTitulo: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: espacamento[2],
  },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    gap: espacamento[2],
  },
});
