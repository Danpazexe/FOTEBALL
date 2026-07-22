import {nomeCompeticao} from '../formatters';

describe('nomeCompeticao', () => {
  it('prefixa "Brasileirão" nas Séries brasileiras', () => {
    expect(nomeCompeticao('Série A')).toBe('Brasileirão Série A');
    expect(nomeCompeticao('Série B')).toBe('Brasileirão Série B');
    expect(nomeCompeticao('Série C')).toBe('Brasileirão Série C');
    expect(nomeCompeticao('Série D')).toBe('Brasileirão Série D');
  });

  it('mantém o nome real de ligas internacionais, sem prefixo', () => {
    // Regressão: o Pré-jogo exibia "Brasileirão Premier League · Rodada 18".
    expect(nomeCompeticao('Premier League')).toBe('Premier League');
    expect(nomeCompeticao('Primera División')).toBe('Primera División');
    expect(nomeCompeticao('Championship')).toBe('Championship');
  });

  it('cai para a Série A quando a divisão está ausente', () => {
    expect(nomeCompeticao(undefined)).toBe('Brasileirão Série A');
  });
});
