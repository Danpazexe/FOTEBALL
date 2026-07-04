import {
  definirObjetivoTemporada,
  deltaReputacaoMeta,
  metaCumprida,
} from '../objetivo';

describe('definirObjetivoTemporada', () => {
  it('clube forte na Série A busca o título', () => {
    expect(definirObjetivoTemporada(85, 'Série A').tipo).toBe('Título');
  });

  it('clube mediano na Série A mira a Libertadores', () => {
    expect(definirObjetivoTemporada(70, 'Série A').tipo).toBe('Libertadores');
  });

  it('clube fraco na Série A luta pra não cair', () => {
    expect(definirObjetivoTemporada(40, 'Série A').tipo).toBe('Não cair');
  });

  it('clube forte na Série B busca o acesso', () => {
    expect(definirObjetivoTemporada(65, 'Série B').tipo).toBe('Acesso');
  });
});

describe('metaCumprida / deltaReputacaoMeta', () => {
  const obj = definirObjetivoTemporada(70, 'Série A'); // Libertadores, alvo 6

  it('cumpre a meta ao terminar na posição-alvo ou acima', () => {
    expect(metaCumprida(obj, 4)).toBe(true);
    expect(metaCumprida(obj, 6)).toBe(true);
    expect(metaCumprida(obj, 8)).toBe(false);
  });

  it('rende reputação positiva ao cumprir e negativa ao falhar', () => {
    expect(deltaReputacaoMeta(obj, 3)).toBeGreaterThan(0);
    expect(deltaReputacaoMeta(obj, 12)).toBeLessThan(0);
  });
});

describe('objetivo x dificuldade', () => {
  it('Difícil exige posição-alvo melhor que Normal; Fácil folga', () => {
    const normal = definirObjetivoTemporada(70, 'Série A', 'Normal');
    const dificil = definirObjetivoTemporada(70, 'Série A', 'Difícil');
    const facil = definirObjetivoTemporada(70, 'Série A', 'Fácil');
    expect(dificil.posicaoAlvo).toBeLessThan(normal.posicaoAlvo);
    expect(facil.posicaoAlvo).toBeGreaterThan(normal.posicaoAlvo);
  });

  it('a posição-alvo nunca sai de 1..20', () => {
    const lendario = definirObjetivoTemporada(85, 'Série A', 'Lendário'); // base alvo 1
    expect(lendario.posicaoAlvo).toBeGreaterThanOrEqual(1);
    const facilFraco = definirObjetivoTemporada(30, 'Série A', 'Fácil'); // base 16 +3
    expect(facilFraco.posicaoAlvo).toBeLessThanOrEqual(20);
  });

  it('sem dificuldade o comportamento é o de Normal (retrocompatível)', () => {
    expect(definirObjetivoTemporada(70, 'Série A')).toEqual(
      definirObjetivoTemporada(70, 'Série A', 'Normal'),
    );
  });

  it('a penalidade por falhar escala com a dificuldade (recompensa não muda)', () => {
    const obj = definirObjetivoTemporada(70, 'Série A', 'Normal'); // alvo 6
    // Recompensa fixa em qualquer dificuldade.
    expect(deltaReputacaoMeta(obj, 3, 'Fácil')).toBe(
      deltaReputacaoMeta(obj, 3, 'Lendário'),
    );
    // Punição pior no mais difícil (mais negativa).
    expect(deltaReputacaoMeta(obj, 15, 'Lendário')).toBeLessThan(
      deltaReputacaoMeta(obj, 15, 'Normal'),
    );
    expect(deltaReputacaoMeta(obj, 15, 'Normal')).toBeLessThan(
      deltaReputacaoMeta(obj, 15, 'Fácil'),
    );
  });
});
