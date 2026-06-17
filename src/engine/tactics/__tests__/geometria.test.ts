import type {Position, TitularFormacao} from '../../../types';
import {coordenadaPadrao} from '../posicoes';
import {
  detectarFormacao,
  layoutPorLinhas,
  posicaoPorCoordenada,
  preencherCoordenadas,
} from '../geometria';

/** Atalho para montar um titular só com posição (coordenadas via padrão). */
function tit(posicao: Position): TitularFormacao {
  return {posicao, jogadorId: `j-${posicao}`};
}

/** Atalho para montar um titular com coordenadas explícitas. */
function titXY(posicao: Position, x: number, y: number): TitularFormacao {
  return {posicao, jogadorId: `j-${posicao}-${x}-${y}`, x, y};
}

describe('posicaoPorCoordenada', () => {
  it('banda do goleiro (y < 0.12)', () => {
    expect(posicaoPorCoordenada(0.5, 0.05)).toBe('GOL');
    expect(posicaoPorCoordenada(0.1, 0.0)).toBe('GOL');
  });

  it('banda de defesa: laterais e zagueiro central', () => {
    expect(posicaoPorCoordenada(0.1, 0.2)).toBe('LE');
    expect(posicaoPorCoordenada(0.9, 0.2)).toBe('LD');
    expect(posicaoPorCoordenada(0.5, 0.2)).toBe('ZAG');
  });

  it('banda do volante: lateral baixo e VOL central', () => {
    expect(posicaoPorCoordenada(0.1, 0.36)).toBe('LE');
    expect(posicaoPorCoordenada(0.9, 0.36)).toBe('LD');
    expect(posicaoPorCoordenada(0.5, 0.36)).toBe('VOL');
  });

  it('banda do meio: laterais largos e MC central', () => {
    expect(posicaoPorCoordenada(0.1, 0.5)).toBe('LE');
    expect(posicaoPorCoordenada(0.9, 0.5)).toBe('LD');
    expect(posicaoPorCoordenada(0.5, 0.5)).toBe('MC');
  });

  it('banda do meia ofensivo: pontas e MEI central', () => {
    expect(posicaoPorCoordenada(0.1, 0.62)).toBe('PE');
    expect(posicaoPorCoordenada(0.9, 0.62)).toBe('PD');
    expect(posicaoPorCoordenada(0.5, 0.62)).toBe('MEI');
  });

  it('banda do ataque: pontas, segundo atacante e centroavante', () => {
    expect(posicaoPorCoordenada(0.1, 0.75)).toBe('PE');
    expect(posicaoPorCoordenada(0.9, 0.75)).toBe('PD');
    expect(posicaoPorCoordenada(0.5, 0.75)).toBe('SA');
    expect(posicaoPorCoordenada(0.5, 0.9)).toBe('CA');
  });

  it('MC arrastado para frente vira MEI', () => {
    // y na faixa do meia ofensivo, x central.
    expect(posicaoPorCoordenada(0.5, 0.65)).toBe('MEI');
  });

  it('CA arrastado para a ponta vira PD/PE', () => {
    expect(posicaoPorCoordenada(0.9, 0.92)).toBe('PD');
    expect(posicaoPorCoordenada(0.1, 0.92)).toBe('PE');
  });

  it('VOL arrastado para trás vira ZAG', () => {
    // y na faixa de defesa, x central.
    expect(posicaoPorCoordenada(0.5, 0.25)).toBe('ZAG');
  });

  it('clampa x e y fora de [0,1]', () => {
    expect(posicaoPorCoordenada(-5, -5)).toBe('GOL');
    expect(posicaoPorCoordenada(5, 5)).toBe('PD');
  });
});

describe('detectarFormacao', () => {
  it('exemplo da spec: alas em y~0.4 caem no meio -> "3-5-2"', () => {
    const titulares: TitularFormacao[] = [
      titXY('GOL', 0.5, 0.05),
      titXY('ZAG', 0.3, 0.2),
      titXY('ZAG', 0.5, 0.2),
      titXY('ZAG', 0.7, 0.2),
      titXY('LE', 0.1, 0.4), // ala
      titXY('LD', 0.9, 0.4), // ala
      titXY('MC', 0.4, 0.45),
      titXY('MC', 0.5, 0.45),
      titXY('MEI', 0.6, 0.55),
      titXY('CA', 0.45, 0.85),
      titXY('CA', 0.55, 0.85),
    ];
    expect(detectarFormacao(titulares)).toBe('3-5-2');
  });

  it('"4-4-2" a partir de coordenadas padrão', () => {
    // Meio com volantes (y=0.4) e meias-centrais (y=0.52), todos na faixa MEIO.
    const titulares: TitularFormacao[] = [
      tit('GOL'),
      tit('LE'),
      tit('ZAG'),
      tit('ZAG'),
      tit('LD'),
      tit('VOL'),
      tit('MC'),
      tit('MC'),
      tit('VOL'),
      tit('CA'),
      tit('CA'),
    ];
    expect(detectarFormacao(titulares)).toBe('4-4-2');
  });

  it('"4-3-3" a partir de coordenadas padrão', () => {
    const titulares: TitularFormacao[] = [
      tit('GOL'),
      tit('LE'),
      tit('ZAG'),
      tit('ZAG'),
      tit('LD'),
      tit('VOL'),
      tit('MC'),
      tit('MC'),
      tit('PE'),
      tit('CA'),
      tit('PD'),
    ];
    expect(detectarFormacao(titulares)).toBe('4-3-3');
  });

  it('exclui o goleiro mesmo quando colocado por coordenada baixa', () => {
    const titulares: TitularFormacao[] = [
      titXY('ZAG', 0.5, 0.05), // y baixo: tratado como goleiro, excluído
      titXY('ZAG', 0.4, 0.2),
      titXY('ZAG', 0.6, 0.2),
    ];
    expect(detectarFormacao(titulares)).toBe('2-0-0');
  });

  it('sem jogadores de linha retorna "0-0-0"', () => {
    expect(detectarFormacao([tit('GOL')])).toBe('0-0-0');
    expect(detectarFormacao([])).toBe('0-0-0');
  });
});

describe('layoutPorLinhas', () => {
  it('distribui cada linha uniformemente e centraliza o goleiro', () => {
    const titulares: TitularFormacao[] = [
      tit('GOL'),
      tit('LE'),
      tit('ZAG'),
      tit('ZAG'),
      tit('LD'),
    ];
    const layout = layoutPorLinhas(titulares);

    // Mesma ordem da entrada.
    expect(layout).toHaveLength(5);

    // Goleiro centralizado.
    expect(layout[0]).toEqual({x: 0.5, y: 0.06});

    // 4 defensores: x = 1/5, 2/5, 3/5, 4/5; y = 0.22.
    expect(layout[1]).toEqual({x: 1 / 5, y: 0.22});
    expect(layout[2]).toEqual({x: 2 / 5, y: 0.22});
    expect(layout[3]).toEqual({x: 3 / 5, y: 0.22});
    expect(layout[4]).toEqual({x: 4 / 5, y: 0.22});
  });

  it('usa o y correto por linha tática', () => {
    const titulares: TitularFormacao[] = [tit('MC'), tit('CA')];
    const layout = layoutPorLinhas(titulares);
    expect(layout[0].y).toBe(0.5); // MEIO
    expect(layout[1].y).toBe(0.82); // ATAQUE
  });
});

describe('preencherCoordenadas', () => {
  it('preenche quem não tem coordenadas', () => {
    const titulares: TitularFormacao[] = [tit('GOL'), tit('ZAG')];
    const resultado = preencherCoordenadas(titulares);
    expect(resultado[0].x).toBeDefined();
    expect(resultado[0].y).toBeDefined();
    expect(resultado[1].x).toBeDefined();
    expect(resultado[1].y).toBeDefined();
  });

  it('preserva quem já tem x E y', () => {
    const titulares: TitularFormacao[] = [titXY('MC', 0.33, 0.44)];
    const resultado = preencherCoordenadas(titulares);
    expect(resultado[0].x).toBe(0.33);
    expect(resultado[0].y).toBe(0.44);
  });

  it('é pura: não muta a entrada', () => {
    const original = tit('ZAG');
    const titulares: TitularFormacao[] = [original];
    const resultado = preencherCoordenadas(titulares);
    expect(original.x).toBeUndefined();
    expect(original.y).toBeUndefined();
    expect(resultado[0]).not.toBe(original);
  });

  it('a coordenada padrão de uma posição central concorda com posicaoPorCoordenada', () => {
    // Sanity: a coordenada padrão do MC deve mapear de volta para o meio (MC).
    const {x, y} = coordenadaPadrao('MC');
    expect(posicaoPorCoordenada(x, y)).toBe('MC');
  });
});
