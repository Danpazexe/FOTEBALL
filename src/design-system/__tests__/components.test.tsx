import React from 'react';
import {
  StyleSheet,
  Text as RNText,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import TestRenderer, {act} from 'react-test-renderer';

import {useTemaStore} from '../../store/useTemaStore';
import {coresEscuras} from '../tokens/colors';
import {Badge} from '../components/Badge';
import {Button} from '../components/Button';
import {Chip} from '../components/Chip';
import {Tabs} from '../components/Tabs';

type Renderizado = TestRenderer.ReactTestRenderer;

/** Textos renderizados (conteúdo + cor achatada) de um render. */
function textos(r: Renderizado): {texto: string; cor: unknown}[] {
  return r.root.findAllByType(RNText).map(no => ({
    texto: Array.isArray(no.props.children)
      ? no.props.children.join('')
      : String(no.props.children ?? ''),
    cor: (
      StyleSheet.flatten(no.props.style as StyleProp<TextStyle>) as TextStyle
    )?.color,
  }));
}

describe('componentes do design system', () => {
  // As asserções comparam com `coresEscuras`; na paleta cartaz (v3) claro e
  // escuro têm valores diferentes (ex.: onBrand), então o tema precisa estar
  // fixado ANTES de cada render — não só restaurado depois.
  beforeEach(() => {
    act(() => {
      useTemaStore.setState({modo: 'escuro', esquemaSistema: 'escuro'});
    });
  });

  afterEach(() => {
    act(() => {
      useTemaStore.setState({modo: 'escuro', esquemaSistema: 'escuro'});
    });
  });

  it('Button primary usa cor onBrand no rótulo', () => {
    let r!: Renderizado;
    act(() => {
      r = TestRenderer.create(<Button titulo="Salvar" onPress={() => {}} />);
    });
    const t = textos(r).find(x => x.texto === 'Salvar');
    expect(t?.cor).toBe(coresEscuras.onBrand);
  });

  it('Chip selecionado usa tinta (textPrimary, cartaz v3); não-selecionado é secundário', () => {
    let sel!: Renderizado;
    let normal!: Renderizado;
    act(() => {
      sel = TestRenderer.create(
        <Chip label="Todos" selected tom="brand" onPress={() => {}} />,
      );
      normal = TestRenderer.create(<Chip label="ATA" onPress={() => {}} />);
    });
    expect(textos(sel).find(x => x.texto === 'Todos')?.cor).toBe(
      coresEscuras.textPrimary,
    );
    expect(textos(normal).find(x => x.texto === 'ATA')?.cor).toBe(
      coresEscuras.textSecondary,
    );
  });

  it('Badge trunca contagem acima de 99', () => {
    let r!: Renderizado;
    act(() => {
      r = TestRenderer.create(<Badge count={150} />);
    });
    expect(textos(r).some(x => x.texto === '99+')).toBe(true);
  });

  it('Tabs realça a aba ativa na marca e as demais em secundário', () => {
    let r!: Renderizado;
    act(() => {
      r = TestRenderer.create(
        <Tabs
          abas={[
            {chave: 'geral', rotulo: 'Visão geral'},
            {chave: 'jogos', rotulo: 'Jogos'},
          ]}
          ativa="geral"
          onSelect={() => {}}
        />,
      );
    });
    const t = textos(r);
    expect(t.find(x => x.texto === 'Visão geral')?.cor).toBe(coresEscuras.brand);
    expect(t.find(x => x.texto === 'Jogos')?.cor).toBe(
      coresEscuras.textSecondary,
    );
  });
});
