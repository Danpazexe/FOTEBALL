import {atributosDestaquePorPosicao} from '../atributosDestaque';

describe('atributosDestaquePorPosicao', () => {
  it('retorna 3 atributos-chave por posição', () => {
    expect(atributosDestaquePorPosicao('CA')).toEqual([
      'finalizacao',
      'drible',
      'velocidade',
    ]);
    expect(atributosDestaquePorPosicao('GOL')).toEqual([
      'reflexos',
      'posicionamento',
      'forca',
    ]);
    expect(atributosDestaquePorPosicao('ZAG')).toHaveLength(3);
  });
});
