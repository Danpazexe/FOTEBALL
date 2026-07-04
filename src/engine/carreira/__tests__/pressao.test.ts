import {calcularPressaoDiretoria} from '../pressao';

const base = {
  derrotasConsecutivas: 0,
  limiteDerrotas: 5,
  rodadasNoVermelho: 0,
  reputacaoTecnico: 50,
  posicaoAtual: 6 as number | null,
  posicaoAlvo: 6,
  totalClubes: 20,
};

describe('calcularPressaoDiretoria', () => {
  it('técnico cumprindo a meta, sem derrotas nem dívida → Tranquilo', () => {
    const r = calcularPressaoDiretoria({...base, posicaoAtual: 4});
    expect(r.nivel).toBe('Tranquilo');
    expect(r.pontuacao).toBeLessThan(20);
    expect(r.fatores).toHaveLength(0);
  });

  it('à beira do limite de derrotas → Crítico', () => {
    const r = calcularPressaoDiretoria({
      ...base,
      derrotasConsecutivas: 5,
      limiteDerrotas: 5,
    });
    expect(r.nivel).toBe('Crítico');
    expect(r.pontuacao).toBeGreaterThanOrEqual(80);
  });

  it('à beira da falência → Crítico', () => {
    const r = calcularPressaoDiretoria({...base, rodadasNoVermelho: 8});
    expect(r.nivel).toBe('Crítico');
    expect(r.pontuacao).toBeGreaterThanOrEqual(80);
  });

  it('reputação ALTA não esconde derrota a um passo da demissão', () => {
    // d=4/5 → uma derrota da demissão; verificarDemissao ignora reputação.
    const r = calcularPressaoDiretoria({
      ...base,
      derrotasConsecutivas: 4,
      reputacaoTecnico: 100,
    });
    expect(r.nivel).toBe('Crítico');
    expect(r.pontuacao).toBeGreaterThanOrEqual(80);
  });

  it('reputação ALTA não esconde falência iminente', () => {
    const r = calcularPressaoDiretoria({
      ...base,
      rodadasNoVermelho: 7,
      reputacaoTecnico: 100,
    });
    expect(r.nivel).toBe('Crítico');
    expect(r.pontuacao).toBeGreaterThanOrEqual(80);
  });

  it("agravantes soft sozinhos não passam de 'Ameaçado' (Crítico exige gatilho real)", () => {
    // Último colocado, reputação no chão, MAS sem derrota/dívida perto do gatilho.
    const r = calcularPressaoDiretoria({
      ...base,
      posicaoAtual: 20,
      posicaoAlvo: 1,
      reputacaoTecnico: 0,
    });
    expect(r.nivel).not.toBe('Crítico');
    expect(r.pontuacao).toBeLessThan(80);
  });

  it('descumprir muito a meta é bem visível (não fica em Estável)', () => {
    // Último contratado para o título, sem outros gatilhos.
    const r = calcularPressaoDiretoria({
      ...base,
      posicaoAtual: 20,
      posicaoAlvo: 1,
    });
    expect(r.pontuacao).toBeGreaterThanOrEqual(40); // ao menos 'Pressionado'
    expect(r.fatores[0]).toContain('Abaixo da meta');
  });

  it('ordena fatores por severidade: a causa real vem primeiro', () => {
    // 1 derrota (razão 0.2) x falência iminente (razão 1.0): finança deve liderar.
    const r = calcularPressaoDiretoria({
      ...base,
      derrotasConsecutivas: 1,
      rodadasNoVermelho: 8,
    });
    expect(r.fatores[0]).toContain('vermelho');
  });

  it('é monotônica no número de derrotas seguidas', () => {
    let anterior = -1;
    for (let d = 0; d <= 5; d++) {
      const p = calcularPressaoDiretoria({
        ...base,
        derrotasConsecutivas: d,
      }).pontuacao;
      expect(p).toBeGreaterThanOrEqual(anterior);
      anterior = p;
    }
  });

  it('reputação alta alivia o soft; reputação baixa agrava (mesmos sinais)', () => {
    // Cenário soft: abaixo da meta, sem gatilho de demissão.
    const cenario = {...base, posicaoAtual: 12, posicaoAlvo: 6};
    const repAlta = calcularPressaoDiretoria({
      ...cenario,
      reputacaoTecnico: 90,
    });
    const repBaixa = calcularPressaoDiretoria({
      ...cenario,
      reputacaoTecnico: 20,
    });
    expect(repAlta.pontuacao).toBeLessThan(repBaixa.pontuacao);
  });

  it('pontuação fica sempre em 0-100', () => {
    const extremo = calcularPressaoDiretoria({
      ...base,
      derrotasConsecutivas: 99,
      rodadasNoVermelho: 99,
      reputacaoTecnico: 0,
      posicaoAtual: 20,
      posicaoAlvo: 1,
    });
    expect(extremo.pontuacao).toBeLessThanOrEqual(100);
    expect(extremo.pontuacao).toBeGreaterThanOrEqual(0);
  });

  it('é determinística para a mesma entrada', () => {
    const args = {...base, derrotasConsecutivas: 3, rodadasNoVermelho: 2};
    expect(calcularPressaoDiretoria(args)).toEqual(
      calcularPressaoDiretoria(args),
    );
  });

  it('trata limiteDerrotas 0 (demissão imediata) como gatilho saturado', () => {
    const r = calcularPressaoDiretoria({
      ...base,
      derrotasConsecutivas: 1,
      limiteDerrotas: 0,
    });
    expect(Number.isFinite(r.pontuacao)).toBe(true);
    expect(r.nivel).toBe('Crítico');
  });
});
