import {calcularJornada} from '../jornada';

describe('calcularJornada', () => {
  it('reputação baixa → Desconhecido, com próximo marco Promessa', () => {
    const j = calcularJornada(10);
    expect(j.estagioAtual).toBe('Desconhecido');
    expect(j.proximoMarco?.estagio).toBe('Promessa');
  });

  it('avança de estágio nos limiares', () => {
    expect(calcularJornada(40).estagioAtual).toBe('Promessa');
    expect(calcularJornada(55).estagioAtual).toBe('Respeitado');
    expect(calcularJornada(70).estagioAtual).toBe('Renomado');
    expect(calcularJornada(85).estagioAtual).toBe('Ídolo');
    expect(calcularJornada(95).estagioAtual).toBe('Lenda');
  });

  it('Lenda não tem próximo marco e progresso 1', () => {
    const j = calcularJornada(100);
    expect(j.proximoMarco).toBeNull();
    expect(j.progressoAteProximo).toBe(1);
  });

  it('progresso é proporcional dentro do estágio', () => {
    // Respeitado começa em 55, próximo (Renomado) em 70 → 15 de faixa.
    const meio = calcularJornada(62); // (62-55)/15 ≈ 0.47
    expect(meio.progressoAteProximo).toBeGreaterThan(0.4);
    expect(meio.progressoAteProximo).toBeLessThan(0.6);
  });

  it('progresso fica sempre em 0..1 e clampa reputação fora de faixa', () => {
    expect(calcularJornada(-10).estagioAtual).toBe('Desconhecido');
    const j = calcularJornada(200);
    expect(j.estagioAtual).toBe('Lenda');
    expect(j.progressoAteProximo).toBeLessThanOrEqual(1);
  });

  it('é determinística', () => {
    expect(calcularJornada(72)).toEqual(calcularJornada(72));
  });
});
