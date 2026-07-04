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
