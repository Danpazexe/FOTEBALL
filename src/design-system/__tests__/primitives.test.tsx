import React from 'react';
import {
  StyleSheet,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import TestRenderer, {act} from 'react-test-renderer';

import {useTemaStore} from '../../store/useTemaStore';
import {coresClaras, coresEscuras} from '../tokens/colors';
import {Box} from '../primitives/Box';
import {Pressable} from '../primitives/Pressable';
import {Text} from '../primitives/Text';

type NoJson = ReturnType<TestRenderer.ReactTestRenderer['toJSON']>;

/** Estilo achatado do nó-raiz renderizado (cor/fundo/tamanho). */
function estiloDoNo(no: NoJson): ViewStyle & TextStyle {
  const alvo = Array.isArray(no) ? no[0] : no;
  const style = (alvo as {props?: {style?: unknown}} | null)?.props?.style;
  return (StyleSheet.flatten(style as StyleProp<ViewStyle & TextStyle>) ??
    {}) as ViewStyle & TextStyle;
}

describe('primitives do design system', () => {
  afterEach(() => {
    act(() => {
      useTemaStore.setState({modo: 'escuro', esquemaSistema: 'escuro'});
    });
  });

  it('Text usa a cor do tema escuro por padrão', () => {
    let r!: TestRenderer.ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(<Text>olá</Text>);
    });
    expect(estiloDoNo(r.toJSON()).color).toBe(coresEscuras.textPrimary);
  });

  it('Text reage à troca de tema (escuro → claro)', () => {
    let r!: TestRenderer.ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(<Text color="brand">placar</Text>);
    });
    expect(estiloDoNo(r.toJSON()).color).toBe(coresEscuras.brand);
    act(() => {
      useTemaStore.getState().definirModo('claro');
    });
    expect(estiloDoNo(r.toJSON()).color).toBe(coresClaras.brand);
  });

  it('Box aplica cor de fundo por token', () => {
    let r!: TestRenderer.ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(<Box bg="surface" padding={4} />);
    });
    expect(estiloDoNo(r.toJSON()).backgroundColor).toBe(coresEscuras.surface);
  });

  it('Pressable com minSize garante alvo de toque acessível', () => {
    let r!: TestRenderer.ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(
        <Pressable minSize="min" disabled accessibilityLabel="teste">
          <Text>x</Text>
        </Pressable>,
      );
    });
    expect(r.toJSON()).toBeTruthy();
    expect(estiloDoNo(r.toJSON()).minHeight).toBe(44);
  });
});
