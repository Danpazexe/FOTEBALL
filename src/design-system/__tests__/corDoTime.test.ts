import {contrasteTexto, corDoTime} from '../sports/corDoTime';

describe('corDoTime (fonte única da identidade de cor do clube)', () => {
  it('é determinística: mesmo clube → sempre a mesma cor', () => {
    expect(corDoTime('club_flamengo')).toBe(corDoTime('club_flamengo'));
    expect(corDoTime('qualquer-id')).toBe(corDoTime('qualquer-id'));
  });

  it('sempre devolve um hex sólido, mesmo para id vazio ou desconhecido', () => {
    for (const id of ['', 'club_flamengo', 'id_que_nao_existe']) {
      expect(corDoTime(id)).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  // Travas de regressão da migração do tema antigo: mudar paleta ou hash
  // mudaria a cor que o jogador já associa a cada clube na narração.
  it.each([
    ['', '#E5484D'],
    ['club_flamengo', '#10B981'],
    ['club_palmeiras', '#43A047'],
    ['club_remo', '#F4511E'],
  ])('preserva o hash do tema antigo: %s → %s', (id, cor) => {
    expect(corDoTime(id)).toBe(cor);
  });
});

describe('contrasteTexto', () => {
  it('fundo claro → texto escuro', () => {
    expect(contrasteTexto('#FDD835')).toBe('#17233B');
    expect(contrasteTexto('#FFFFFF')).toBe('#17233B');
  });

  it('fundo escuro → texto claro', () => {
    expect(contrasteTexto('#151515')).toBe('#FFFFFF');
    expect(contrasteTexto('#1E88E5')).toBe('#FFFFFF');
  });
});
