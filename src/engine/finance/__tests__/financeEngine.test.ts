import {
  aplicarAcertoFinanceiroAnual,
  aplicarJurosSaldoNegativo,
  aplicarManutencaoEstadio,
  aplicarPatrocinioAnual,
  MANUTENCAO_POR_LUGAR,
  PATROCINIO_POR_REPUTACAO,
  TAXA_JUROS_ANUAL,
} from '../financeEngine';
import {criarClube, criarPlayer} from '../../../testing/fixtures';

const DATA = '2026-fim';

describe('financeEngine — acerto anual', () => {
  it('patrocínio anual deriva da reputação quando não há patrocinadores', () => {
    const clube = criarClube({id: 'a', reputacao: 50});
    const depois = aplicarPatrocinioAnual(clube, DATA);
    const esperado = 50 * PATROCINIO_POR_REPUTACAO;
    expect(depois.financas.saldo).toBe(clube.financas.saldo + esperado);
    expect(depois.financas.historicoTransacoes[0].categoria).toBe('patrocinio');
  });

  it('manutenção do estádio deriva da capacidade', () => {
    const clube = criarClube({id: 'a'}); // capacidade 30000
    const depois = aplicarManutencaoEstadio(clube, DATA);
    const esperado = 30000 * MANUTENCAO_POR_LUGAR;
    expect(depois.financas.saldo).toBe(clube.financas.saldo - esperado);
    expect(depois.financas.historicoTransacoes[0].categoria).toBe('manutencao');
  });

  it('cobra juros só quando o saldo está negativo', () => {
    const positivo = criarClube({id: 'p'});
    expect(aplicarJurosSaldoNegativo(positivo, DATA)).toBe(positivo); // no-op

    const devedor = criarClube({id: 'd'});
    devedor.financas.saldo = -1_000_000;
    const depois = aplicarJurosSaldoNegativo(devedor, DATA);
    expect(depois.financas.saldo).toBe(
      -1_000_000 - Math.round(1_000_000 * TAXA_JUROS_ANUAL),
    );
    expect(depois.financas.historicoTransacoes[0].categoria).toBe('juros');
  });

  it('acerto anual: patrocínio entra, salários e manutenção saem', () => {
    const clube = criarClube({id: 'a', reputacao: 50});
    const jogadores = [
      criarPlayer({id: 'j1', salario: 100_000, clubeId: 'a'}),
      criarPlayer({id: 'j2', salario: 100_000, clubeId: 'a'}),
    ];
    const depois = aplicarAcertoFinanceiroAnual(clube, jogadores, DATA);

    const patrocinio = 50 * PATROCINIO_POR_REPUTACAO;
    const manutencao = 30000 * MANUTENCAO_POR_LUGAR;
    const folha = 200_000;
    expect(depois.financas.saldo).toBe(
      clube.financas.saldo + patrocinio - folha - manutencao,
    );
    const categorias = depois.financas.historicoTransacoes.map(t => t.categoria);
    expect(categorias).toEqual(
      expect.arrayContaining(['patrocinio', 'salarios', 'manutencao']),
    );
    // Terminou positivo → sem juros.
    expect(categorias).not.toContain('juros');
  });

  it('acerto anual cobra juros quando termina no vermelho', () => {
    const clube = criarClube({id: 'a', reputacao: 10});
    clube.financas.saldo = -5_000_000;
    const jogadores = [criarPlayer({id: 'j1', salario: 100_000, clubeId: 'a'})];
    const depois = aplicarAcertoFinanceiroAnual(clube, jogadores, DATA);
    expect(depois.financas.saldo).toBeLessThan(0);
    expect(
      depois.financas.historicoTransacoes.some(t => t.categoria === 'juros'),
    ).toBe(true);
  });
});
