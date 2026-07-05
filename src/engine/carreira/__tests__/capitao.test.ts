import {capitaoValido, sugerirCapitao} from '../capitao';
import {criarPlayer} from '../../../testing/fixtures';
import type {Player} from '../../../types';

function jog(id: string, overall: number, idade = 25): Player {
  return criarPlayer({id, overall, idade});
}

describe('capitaoValido', () => {
  it('null quando não há capitão definido', () => {
    expect(capitaoValido(undefined, [jog('a', 70)])).toBeNull();
  });

  it('mantém o capitão que ainda está no elenco', () => {
    const elenco = [jog('a', 70), jog('b', 75)];
    expect(capitaoValido('a', elenco)).toBe('a');
  });

  it('descarta capitão que saiu do elenco (vendido/emprestado)', () => {
    const elenco = [jog('b', 75)];
    expect(capitaoValido('a', elenco)).toBeNull();
  });
});

describe('sugerirCapitao', () => {
  it('null para elenco vazio', () => {
    expect(sugerirCapitao([])).toBeNull();
  });

  it('escolhe o maior overall', () => {
    expect(sugerirCapitao([jog('a', 70), jog('b', 82), jog('c', 78)])).toBe('b');
  });

  it('desempata pelo mais experiente (idade)', () => {
    expect(
      sugerirCapitao([jog('novo', 80, 22), jog('veterano', 80, 34)]),
    ).toBe('veterano');
  });

  it('é determinística', () => {
    const elenco = [jog('a', 80, 30), jog('b', 80, 30)];
    expect(sugerirCapitao(elenco)).toBe(sugerirCapitao(elenco));
  });
});
