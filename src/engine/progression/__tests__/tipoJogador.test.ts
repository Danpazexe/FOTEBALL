import {criarPlayer} from '../../../testing/fixtures';

import {
  comTipo,
  derivarTipoJogador,
  MULTIPLICADOR_VALOR_TIPO,
} from '../tipoJogador';

describe('derivarTipoJogador', () => {
  it('jogador velho (idade >= 33) é VETERANO', () => {
    expect(derivarTipoJogador(criarPlayer({id: 'v', idade: 34}))).toBe(
      'VETERANO',
    );
  });

  it('jovem com margem de potencial é NOVATO', () => {
    const jovem = criarPlayer({id: 'n', idade: 19, overall: 62, potencial: 80});
    expect(derivarTipoJogador(jovem)).toBe('NOVATO');
  });

  it('jovem SEM margem relevante é NORMAL', () => {
    const jovem = criarPlayer({id: 'n2', idade: 19, overall: 78, potencial: 80});
    expect(derivarTipoJogador(jovem)).toBe('NORMAL');
  });

  it('jogador em idade de pico é NORMAL', () => {
    expect(derivarTipoJogador(criarPlayer({id: 'p', idade: 27}))).toBe('NORMAL');
  });
});

describe('comTipo', () => {
  it('preserva o tipo explícito do seed', () => {
    const j = criarPlayer({id: 'e', idade: 34, tipo: 'NORMAL'});
    expect(comTipo(j).tipo).toBe('NORMAL');
  });

  it('deriva quando ausente', () => {
    const j = criarPlayer({id: 'd', idade: 34});
    expect(comTipo(j).tipo).toBe('VETERANO');
  });
});

describe('MULTIPLICADOR_VALOR_TIPO', () => {
  it('novato é aposta barata e veterano desvaloriza vs normal', () => {
    expect(MULTIPLICADOR_VALOR_TIPO.NOVATO).toBeLessThan(
      MULTIPLICADOR_VALOR_TIPO.NORMAL,
    );
    expect(MULTIPLICADOR_VALOR_TIPO.VETERANO).toBeLessThan(
      MULTIPLICADOR_VALOR_TIPO.NORMAL,
    );
  });
});
