import {
  aplicarAcertoFinanceiroAnual,
  aplicarBilheteria,
  aplicarCotaTV,
  aplicarJurosSaldoNegativo,
  aplicarManutencaoEstadio,
  aplicarPatrocinioAnual,
  cotaTV,
  faixaPctFolha,
  fatorOcupacaoPorPreco,
  MANUTENCAO_POR_LUGAR,
  PATROCINIO_POR_REPUTACAO,
  pctFolhaSobreReceita,
  TAXA_JUROS_ANUAL,
} from '../financeEngine';
import {criarClube, criarPlayer} from '../../../testing/fixtures';

const DATA = '2026-fim';

describe('financeEngine — acerto anual', () => {
  it('patrocínio anual deriva da reputação', () => {
    const clube = criarClube({id: 'a', reputacao: 50});
    const depois = aplicarPatrocinioAnual(clube, DATA);
    const esperado = 50 * PATROCINIO_POR_REPUTACAO;
    expect(depois.financas.saldo).toBe(clube.financas.saldo + esperado);
    expect(depois.financas.historicoTransacoes[0].categoria).toBe('patrocinio');
  });

  it('pularPatrocinioReputacao: o acerto anual NÃO paga o patrocínio-por-reputação', () => {
    // Clube do usuário com CONTRATO ativo: a renda vem do contrato — o acerto
    // pula o por-reputação para não pagar duas vezes. Diferença exata = 50·taxa.
    const clube = criarClube({id: 'a', reputacao: 50});
    const comReputacao = aplicarAcertoFinanceiroAnual(clube, [], DATA, false);
    const semReputacao = aplicarAcertoFinanceiroAnual(clube, [], DATA, true);
    expect(comReputacao.financas.saldo - semReputacao.financas.saldo).toBe(
      50 * PATROCINIO_POR_REPUTACAO,
    );
    expect(
      semReputacao.financas.historicoTransacoes.some(
        transacao => transacao.categoria === 'patrocinio',
      ),
    ).toBe(false);
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

describe('cotaTV (§8.3)', () => {
  it('Série A premia muito melhor que B e C, e cai com a posição', () => {
    expect(cotaTV('Série A', 1)).toBe(120_000_000);
    expect(cotaTV('Série A', 4)).toBe(80_000_000);
    expect(cotaTV('Série A', 8)).toBe(55_000_000);
    expect(cotaTV('Série A', 20)).toBe(18_000_000);
    // Campeão da A > campeão da B > campeão da C.
    expect(cotaTV('Série A', 1)).toBeGreaterThan(cotaTV('Série B', 1));
    expect(cotaTV('Série B', 1)).toBeGreaterThan(cotaTV('Série C', 1));
  });

  it('é monotônica decrescente por faixa dentro da divisão', () => {
    expect(cotaTV('Série A', 1)).toBeGreaterThanOrEqual(cotaTV('Série A', 5));
    expect(cotaTV('Série A', 5)).toBeGreaterThanOrEqual(cotaTV('Série A', 13));
    expect(cotaTV('Série B', 4)).toBeGreaterThanOrEqual(cotaTV('Série B', 13));
    expect(cotaTV('Série C', 4)).toBeGreaterThanOrEqual(cotaTV('Série C', 10));
  });

  it('aplicarCotaTV credita o valor como receita categoria cota_tv', () => {
    const clube = criarClube({id: 'a'});
    const depois = aplicarCotaTV(clube, 'Série A', 1, DATA);
    expect(depois.financas.saldo).toBe(clube.financas.saldo + 120_000_000);
    expect(depois.financas.historicoTransacoes[0].categoria).toBe('cota_tv');
  });
});

describe('peso da folha na receita (regra que vivia em TransferMarket/Financas)', () => {
  it('pctFolhaSobreReceita: 0 sem receita, proporcional, teto em 100', () => {
    expect(pctFolhaSobreReceita(500_000, 0)).toBe(0);
    expect(pctFolhaSobreReceita(300_000, 1_000_000)).toBe(30);
    expect(pctFolhaSobreReceita(2_000_000, 1_000_000)).toBe(100);
  });

  it('faixaPctFolha: >80 crítica, >60 atenção, senão saudável', () => {
    expect(faixaPctFolha(60)).toBe('saudavel');
    expect(faixaPctFolha(61)).toBe('atencao');
    expect(faixaPctFolha(80)).toBe('atencao');
    expect(faixaPctFolha(81)).toBe('critica');
  });
});

describe('preço de ingresso (§8.2)', () => {
  it('fatorOcupacaoPorPreco: caro esvazia, barato lota (com teto), normal é neutro', () => {
    expect(fatorOcupacaoPorPreco(1)).toBe(1);
    expect(fatorOcupacaoPorPreco(1.5)).toBeLessThan(1);
    expect(fatorOcupacaoPorPreco(0.5)).toBeGreaterThan(1);
    expect(fatorOcupacaoPorPreco(0.5)).toBeLessThanOrEqual(1.2);
  });

  it('há um ponto ideal: caro moderado > normal > barato demais na bilheteria', () => {
    const clube = criarClube({id: 'a'});
    const receita = (fator: number): number => {
      const c = {
        ...clube,
        estadio: {...clube.estadio, precoIngressoFator: fator},
      };
      return aplicarBilheteria(c, 1, DATA).financas.saldo - c.financas.saldo;
    };
    expect(receita(1.4)).toBeGreaterThan(receita(1.0));
    expect(receita(1.0)).toBeGreaterThan(receita(0.5));
  });
});
