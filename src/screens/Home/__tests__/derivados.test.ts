import type {TabelaClassificacao} from '../../../types';
import {
  derivarJanelaClassificacao,
  derivarPendencias,
  type EntradaPendencias,
} from '../derivados';

const VAZIO: EntradaPendencias = {
  indisponiveis: 0,
  propostas: 0,
  jovens: 0,
  contratosVencendo: 0,
  saldoNegativo: false,
  saldoTexto: '',
  metaForaDoRumo: false,
};

/** Linha de tabela mínima (só o que a derivação usa: clubeId/jogos/pontos). */
function linha(clubeId: string, pontos: number, jogos = 10): TabelaClassificacao {
  return {
    clubeId,
    pontos,
    jogos,
    vitorias: 0,
    empates: 0,
    derrotas: 0,
    golsPro: 0,
    golsContra: 0,
    saldoGols: 0,
  };
}

const clube = (id: string) => ({id, sigla: id.toUpperCase(), nome: `Clube ${id}`});

describe('derivarPendencias', () => {
  it('não gera pendência quando não há sinais', () => {
    expect(derivarPendencias(VAZIO)).toEqual([]);
  });

  it('prioriza perigo → atenção → info e usa singular/plural', () => {
    const lista = derivarPendencias({
      indisponiveis: 1,
      propostas: 2,
      jovens: 1,
      contratosVencendo: 2,
      saldoNegativo: true,
      saldoTexto: '-R$ 2,0 mi',
      metaForaDoRumo: true,
    });
    // Ordem: indisponiveis(danger), saldo(danger), propostas(warning),
    // meta(warning), contratos(warning), jovens(info).
    expect(lista.map(p => p.id)).toEqual([
      'indisponiveis',
      'saldo',
      'propostas',
      'meta',
      'contratos',
      'jovens',
    ]);
    expect(lista[0].titulo).toBe('1 jogador indisponível');
    expect(lista[0].tom).toBe('danger');
    expect(lista[2].titulo).toBe('2 propostas recebidas');
    expect(lista[4].titulo).toBe('2 contratos vencem nesta temporada');
    expect(lista[5].titulo).toBe('1 jovem para avaliar');
  });

  it('contratos vencendo geram pendência de atenção rumo à tela Contratos', () => {
    const [unico] = derivarPendencias({...VAZIO, contratosVencendo: 1});
    expect(unico.id).toBe('contratos');
    expect(unico.titulo).toBe('1 contrato vence nesta temporada');
    expect(unico.tom).toBe('warning');
    expect(unico.destino).toBe('contratos');

    expect(derivarPendencias(VAZIO)).toEqual([]);
  });

  it('cada pendência aponta para o destino correto', () => {
    const lista = derivarPendencias({
      ...VAZIO,
      indisponiveis: 3,
      propostas: 1,
    });
    const porId = Object.fromEntries(lista.map(p => [p.id, p.destino]));
    expect(porId.indisponiveis).toBe('elenco');
    expect(porId.propostas).toBe('mercado');
  });
});

describe('derivarJanelaClassificacao', () => {
  const tabela = [
    linha('a', 30),
    linha('b', 27),
    linha('c', 24),
    linha('d', 21),
    linha('e', 18), // 5º — clube do usuário
    linha('f', 15),
    linha('g', 12),
    linha('h', 9),
  ];
  const clubes = tabela.map(l => clube(l.clubeId));

  it('vazia sem tabela', () => {
    expect(
      derivarJanelaClassificacao({tabela: [], clubes, clubeUsuarioId: 'e'}),
    ).toEqual([]);
  });

  it('centra a janela no clube e o marca como destacado', () => {
    const janela = derivarJanelaClassificacao({
      tabela,
      clubes,
      clubeUsuarioId: 'e',
      tamanho: 5,
    });
    expect(janela.map(l => l.clubeId)).toEqual(['c', 'd', 'e', 'f', 'g']);
    expect(janela.map(l => l.posicao)).toEqual([3, 4, 5, 6, 7]);
    const destacada = janela.find(l => l.destacado);
    expect(destacada?.clubeId).toBe('e');
    expect(janela.filter(l => l.destacado)).toHaveLength(1);
  });

  it('prende a janela no topo quando o clube é líder', () => {
    const janela = derivarJanelaClassificacao({
      tabela,
      clubes,
      clubeUsuarioId: 'a',
      tamanho: 5,
    });
    expect(janela.map(l => l.posicao)).toEqual([1, 2, 3, 4, 5]);
  });

  it('prende a janela no fim quando o clube é lanterna', () => {
    const janela = derivarJanelaClassificacao({
      tabela,
      clubes,
      clubeUsuarioId: 'h',
      tamanho: 5,
    });
    expect(janela.map(l => l.posicao)).toEqual([4, 5, 6, 7, 8]);
  });

  it('classifica zonas de acesso e rebaixamento (faixa 4)', () => {
    const janela = derivarJanelaClassificacao({
      tabela,
      clubes,
      clubeUsuarioId: 'a',
      tamanho: 8,
    });
    expect(janela[0].zona).toBe('promocao'); // 1º
    expect(janela[3].zona).toBe('promocao'); // 4º
    expect(janela[4].zona).toBe('rebaixamento'); // 5º de 8 → últimos 4
    expect(janela[7].zona).toBe('rebaixamento'); // 8º
  });
});
