/**
 * BannerGol — regras do cartaz de gol da partida ao vivo: quais eventos viram
 * cartaz (só o que muda o placar), rótulos (autor/placar/"contra") e o visual
 * por lado (verde-bandeira p/ gol do usuário, tinta p/ gol contra), além do
 * ciclo de vida (~2,5s em cena, sem bloquear toques).
 */
import React from 'react';
import {
  StyleSheet,
  Text as RNText,
  View as RNView,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import TestRenderer, {act} from 'react-test-renderer';

// Mock mínimo do Reanimated: o oficial (react-native-reanimated/mock) é TS/ESM
// não transformado pelo preset do Jest deste repo. Animated.View vira View
// comum; shared value/estilo/spring viram valores imediatos (sem animação).
jest.mock('react-native-reanimated', () => {
  const {View} = require('react-native');
  return {
    __esModule: true,
    default: {View},
    FadeOut: {duration: (_ms: number) => ({})},
    ReduceMotion: {System: 'system', Always: 'always', Never: 'never'},
    useSharedValue: <Valor,>(inicial: Valor) => ({value: inicial}),
    useAnimatedStyle: <Estilo,>(fabrica: () => Estilo) => fabrica(),
    withSpring: (destino: number) => destino,
  };
});

import {coresEscuras} from '../../../design-system';
import {useTemaStore} from '../../../store/useTemaStore';
import {
  BannerGol,
  DURACAO_BANNER_GOL_MS,
  dadosBannerDeEvento,
  type DadosBannerGol,
} from '../BannerGol';

type Renderizado = TestRenderer.ReactTestRenderer;

const DADOS_BASE: DadosBannerGol = {
  chave: 1,
  doUsuario: true,
  autor: 'Rei',
  placar: '2 - 1',
};

// Desmonta tudo ao fim de cada teste: o cartaz agenda um setTimeout real
// (~2,5s) que só é limpo no unmount — sem isso o Jest fica com handle aberto.
const montados: Renderizado[] = [];
afterEach(() => {
  for (const r of montados.splice(0)) {
    act(() => {
      r.unmount();
    });
  }
});

function render(dados: DadosBannerGol, onExpirar: () => void = jest.fn()) {
  let r!: Renderizado;
  act(() => {
    r = TestRenderer.create(<BannerGol dados={dados} onExpirar={onExpirar} />);
  });
  montados.push(r);
  return r;
}

/** Estilo achatado do cartaz (a View raiz com moldura de 2px). */
function estiloCartaz(r: Renderizado): ViewStyle {
  const raiz = r.root
    .findAllByType(RNView)
    .find(
      no =>
        (StyleSheet.flatten(no.props.style as StyleProp<ViewStyle>) ?? {})
          .borderWidth === 2,
    );
  expect(raiz).toBeDefined();
  return StyleSheet.flatten(raiz!.props.style as StyleProp<ViewStyle>);
}

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

describe('dadosBannerDeEvento (regra pura)', () => {
  const base = {
    chave: 7,
    doUsuario: true,
    nomeAutor: 'Rei',
    placarCasa: 2,
    placarFora: 1,
  } as const;

  it('gol vira cartaz com autor e placar novo', () => {
    expect(dadosBannerDeEvento({...base, tipo: 'gol'})).toEqual({
      chave: 7,
      doUsuario: true,
      autor: 'Rei',
      placar: '2 - 1',
    });
  });

  it('gol contra marca o autor com "(contra)" e mantém o lado beneficiado', () => {
    const dados = dadosBannerDeEvento({
      ...base,
      tipo: 'gol_contra',
      doUsuario: false,
    });
    expect(dados?.autor).toBe('Rei (contra)');
    expect(dados?.doUsuario).toBe(false);
  });

  it('evento que não muda o placar não vira cartaz', () => {
    for (const tipo of [
      'bola_trave',
      'penalti',
      'chance_perdida',
      'cartao_amarelo',
      'substituicao',
    ] as const) {
      expect(dadosBannerDeEvento({...base, tipo})).toBeNull();
    }
  });
});

describe('BannerGol (cartaz)', () => {
  beforeEach(() => {
    act(() => {
      useTemaStore.setState({modo: 'escuro', esquemaSistema: 'escuro'});
    });
  });

  it('gol do usuário: cartaz verde-bandeira com GOOOL!, autor e placar', () => {
    const r = render(DADOS_BASE);
    const estilo = estiloCartaz(r);
    expect(estilo.backgroundColor).toBe(coresEscuras.brandStrong);
    expect(estilo.borderColor).toBe(coresEscuras.borderStrong);
    const t = textos(r);
    expect(t.some(x => x.texto === 'GOOOL!')).toBe(true);
    expect(t.some(x => x.texto === 'Rei · 2 - 1')).toBe(true);
    // Serigrafia: conteúdo na cor onBrand sobre o verde.
    expect(t.find(x => x.texto === 'GOOOL!')?.cor).toBe(coresEscuras.onBrand);
  });

  it('gol contra o usuário: cartaz na tinta (scoreboard) com conteúdo papel', () => {
    const r = render({...DADOS_BASE, doUsuario: false, autor: 'Vilão'});
    const estilo = estiloCartaz(r);
    expect(estilo.backgroundColor).toBe(coresEscuras.scoreboard);
    expect(textos(r).find(x => x.texto === 'GOOOL!')?.cor).toBe(
      coresEscuras.onScoreboard,
    );
  });

  it('não bloqueia toques e fica fora do leitor de tela', () => {
    const r = render(DADOS_BASE);
    const raiz = r.root
      .findAllByType(RNView)
      .find(no => no.props.pointerEvents === 'none');
    expect(raiz).toBeDefined();
    expect(raiz!.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('expira sozinho após ~2,5s (avisa o pai uma única vez)', () => {
    jest.useFakeTimers();
    try {
      const onExpirar = jest.fn();
      render(DADOS_BASE, onExpirar);
      act(() => {
        jest.advanceTimersByTime(DURACAO_BANNER_GOL_MS - 1);
      });
      expect(onExpirar).not.toHaveBeenCalled();
      act(() => {
        jest.advanceTimersByTime(2);
      });
      expect(onExpirar).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });
});
