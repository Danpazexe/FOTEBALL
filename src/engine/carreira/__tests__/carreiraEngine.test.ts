import {
  atualizarDerrotasConsecutivas,
  atualizarReputacao,
  atualizarRodadasNoVermelho,
  calcularEstadoFinanceiro,
  clubeElegivelParaTecnico,
  LIMITE_DERROTAS_DEMISSAO,
  MARGEM_CONTRATACAO,
  reputacaoFimTemporada,
  salariosAtrasados,
  verificarDemissao,
} from '../carreiraEngine';

describe('calcularEstadoFinanceiro', () => {
  it('mapeia rodadas no vermelho para o estado certo (§8.4)', () => {
    expect(calcularEstadoFinanceiro(0)).toBe('SAUDAVEL');
    expect(calcularEstadoFinanceiro(2)).toBe('ATENCAO');
    expect(calcularEstadoFinanceiro(3)).toBe('CRITICO');
    expect(calcularEstadoFinanceiro(7)).toBe('CRITICO');
    expect(calcularEstadoFinanceiro(8)).toBe('FALENCIA');
  });
});

describe('atualizarRodadasNoVermelho', () => {
  it('incrementa no vermelho e zera no azul', () => {
    expect(atualizarRodadasNoVermelho(2, -100)).toBe(3);
    expect(atualizarRodadasNoVermelho(5, 1000)).toBe(0);
    expect(atualizarRodadasNoVermelho(5, 0)).toBe(0);
  });
});

describe('salariosAtrasados', () => {
  it('atrasa a partir de 3 rodadas no vermelho', () => {
    expect(salariosAtrasados(2)).toBe(false);
    expect(salariosAtrasados(3)).toBe(true);
  });
});

describe('atualizarDerrotasConsecutivas', () => {
  it('soma na derrota e zera em vitória/empate', () => {
    expect(atualizarDerrotasConsecutivas(2, 'derrota')).toBe(3);
    expect(atualizarDerrotasConsecutivas(2, 'vitoria')).toBe(0);
    expect(atualizarDerrotasConsecutivas(2, 'empate')).toBe(0);
  });
});

describe('atualizarReputacao', () => {
  it('vitória sobe, derrota desce, limitado a [0,100]', () => {
    expect(atualizarReputacao(50, 'vitoria')).toBe(52);
    expect(atualizarReputacao(50, 'derrota')).toBe(48);
    expect(atualizarReputacao(50, 'empate')).toBe(50);
    expect(atualizarReputacao(100, 'vitoria')).toBe(100);
    expect(atualizarReputacao(0, 'derrota')).toBe(0);
  });

  it('fim de temporada: título sobe muito, rebaixamento derruba', () => {
    expect(reputacaoFimTemporada(50, 'titulo')).toBe(70);
    expect(reputacaoFimTemporada(50, 'acesso')).toBe(62);
    expect(reputacaoFimTemporada(50, 'rebaixamento')).toBe(30);
    expect(reputacaoFimTemporada(50, 'meio')).toBe(50);
  });
});

describe('verificarDemissao', () => {
  it('demite por derrotas consecutivas no limite da divisão', () => {
    expect(
      verificarDemissao({
        derrotasConsecutivas: LIMITE_DERROTAS_DEMISSAO.A,
        limiteDerrotas: LIMITE_DERROTAS_DEMISSAO.A,
        rodadasNoVermelho: 0,
      }),
    ).toBe('DERROTAS_CONSECUTIVAS');
  });

  it('demite por falência (8+ rodadas no vermelho)', () => {
    expect(
      verificarDemissao({
        derrotasConsecutivas: 0,
        limiteDerrotas: 5,
        rodadasNoVermelho: 8,
      }),
    ).toBe('FALENCIA');
  });

  it('não demite quando abaixo dos limites', () => {
    expect(
      verificarDemissao({
        derrotasConsecutivas: 4,
        limiteDerrotas: 5,
        rodadasNoVermelho: 7,
      }),
    ).toBeNull();
  });
});

describe('clubeElegivelParaTecnico', () => {
  it('aceita clubes até a reputação do técnico + a margem', () => {
    expect(clubeElegivelParaTecnico(50, 50)).toBe(true);
    expect(clubeElegivelParaTecnico(50, 50 + MARGEM_CONTRATACAO)).toBe(true);
    expect(clubeElegivelParaTecnico(50, 50 + MARGEM_CONTRATACAO + 1)).toBe(false);
  });

  it('reputação no fundo só alcança clubes fracos', () => {
    expect(clubeElegivelParaTecnico(10, 70)).toBe(false);
    expect(clubeElegivelParaTecnico(10, 18)).toBe(true);
  });
});
