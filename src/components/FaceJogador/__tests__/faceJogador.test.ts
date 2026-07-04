import {iniciaisDoNome} from '../index';

describe('iniciaisDoNome', () => {
  it('usa a primeira letra do primeiro e do último nome', () => {
    expect(iniciaisDoNome('Neymar Junior')).toBe('NJ');
    expect(iniciaisDoNome('Gabriel Barbosa Almeida')).toBe('GA');
  });

  it('nome único usa só a primeira letra', () => {
    expect(iniciaisDoNome('Hulk')).toBe('H');
  });

  it('ignora espaços extras', () => {
    expect(iniciaisDoNome('  Rodrigo   Silva  ')).toBe('RS');
  });

  it('nome vazio cai em "?"', () => {
    expect(iniciaisDoNome('')).toBe('?');
    expect(iniciaisDoNome('   ')).toBe('?');
  });
});
