import {classificarCenario} from '../cenarios';

describe('classificarCenario', () => {
  it('Série A forte e saudável → Favorito ao título', () => {
    expect(
      classificarCenario({reputacao: 85, saldo: 5_000_000, divisao: 'Série A'})
        .nome,
    ).toBe('Favorito ao título');
  });

  it('Série A mediano saudável → Sonho da Libertadores / Meio de tabela', () => {
    expect(
      classificarCenario({reputacao: 68, saldo: 0, divisao: 'Série A'}).nome,
    ).toBe('Sonho da Libertadores');
    expect(
      classificarCenario({reputacao: 55, saldo: 0, divisao: 'Série A'}).nome,
    ).toBe('Meio de tabela');
  });

  it('Série A fraco saudável → Azarão da elite', () => {
    expect(
      classificarCenario({reputacao: 45, saldo: 100, divisao: 'Série A'}).nome,
    ).toBe('Azarão da elite');
  });

  it('Série A no vermelho: grande → crise; pequeno → sobrevivência', () => {
    expect(
      classificarCenario({reputacao: 78, saldo: -1_000_000, divisao: 'Série A'})
        .nome,
    ).toBe('Gigante em crise');
    expect(
      classificarCenario({reputacao: 50, saldo: -1_000_000, divisao: 'Série A'})
        .nome,
    ).toBe('Sobrevivência');
  });

  it('fora da Série A: reputação alta → gigante fora da elite; baixa → reconstrução', () => {
    expect(
      classificarCenario({reputacao: 70, saldo: 0, divisao: 'Série B'}).nome,
    ).toBe('Gigante fora da elite');
    expect(
      classificarCenario({reputacao: 40, saldo: 0, divisao: 'Série B'}).nome,
    ).toBe('Reconstrução');
  });

  it('crise financeira tem prioridade sobre a expectativa na Série A', () => {
    // Reputação de título, mas no vermelho → cenário de crise, não "Favorito".
    expect(
      classificarCenario({reputacao: 85, saldo: -500_000, divisao: 'Série A'})
        .nome,
    ).toBe('Gigante em crise');
  });

  it('é determinística', () => {
    const args = {reputacao: 60, saldo: 0, divisao: 'Série A'};
    expect(classificarCenario(args)).toEqual(classificarCenario(args));
  });

  it('elite INTERNACIONAL (tier 1 no registry) é tratada como a Série A', () => {
    // Man City na Premier: favorito ao título, não "gigante fora da elite".
    expect(
      classificarCenario({
        reputacao: 90,
        saldo: 50_000_000,
        divisao: 'Premier League',
      }).nome,
    ).toBe('Favorito ao título');
    expect(
      classificarCenario({reputacao: 80, saldo: 0, divisao: 'Primera División'})
        .nome,
    ).toBe('Favorito ao título');
    // Championship (tier 2) segue como divisão de acesso.
    expect(
      classificarCenario({reputacao: 70, saldo: 0, divisao: 'Championship'})
        .nome,
    ).toBe('Gigante fora da elite');
  });
});
