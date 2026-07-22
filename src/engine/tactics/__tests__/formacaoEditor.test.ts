import {montarFormacao, trocarEsquema, trocarTitular} from '../escalacao';
import type {Player, Position} from '../../../types';

function jogador(id: string, posicao: Position, overall: number): Player {
  return {
    id,
    nome: `Jogador ${id}`,
    idade: 25,
    nacionalidade: 'Brasil',
    posicaoPrincipal: posicao,
    posicoesSecundarias: [],
    pernaDominante: 'D',
    atributos: {
      finalizacao: overall,
      passe: overall,
      marcacao: overall,
      desarme: overall,
      velocidade: overall,
      resistencia: overall,
      forca: overall,
      reflexos: overall,
      posicionamento: overall,
      drible: overall,
      cabeceio: overall,
      cruzamento: overall,
    },
    overall,
    potencial: overall,
    condicaoFisica: 100,
    moral: 70,
    forma: 70,
    valorMercado: 1_000_000,
    salario: 10_000,
    contratoAte: '2030-12-31',
    clubeId: 'time',
    lesionado: false,
    diasLesao: 0,
    suspenso: false,
    jogosSuspensao: 0,
    estatisticasTemporada: {
      temporada: '2026',
      jogos: 0,
      gols: 0,
      assistencias: 0,
      cartoesAmarelos: 0,
      cartoesVermelhos: 0,
      notaMedia: 0,
    },
    historicoTemporadas: [],
  };
}

function elencoCompleto(): Player[] {
  const posicoes: Position[] = [
    'GOL',
    'LD',
    'ZAG',
    'ZAG',
    'LE',
    'VOL',
    'MC',
    'MC',
    'MEI',
    'PD',
    'PE',
    'CA',
    'SA',
    'GOL',
    'ZAG',
    'MC',
  ];
  return posicoes.map((pos, i) => jogador(`p${i}`, pos, 80 - i));
}

describe('trocarEsquema', () => {
  it('mantém exatamente os 11 titulares ao mudar o esquema', () => {
    const elenco = elencoCompleto();
    const formacao = montarFormacao(elenco, '4-3-3');
    const antes = new Set(formacao.titulares.map(t => t.jogadorId));

    const nova = trocarEsquema(formacao, elenco, '3-5-2');

    expect(nova.tipo).toBe('3-5-2');
    expect(nova.titulares).toHaveLength(11);
    const depois = new Set(nova.titulares.map(t => t.jogadorId));
    expect(depois).toEqual(antes);
    // As posições passam a ser as do novo esquema.
    expect(nova.titulares.map(t => t.posicao)).toEqual([
      'GOL',
      'ZAG',
      'ZAG',
      'ZAG',
      'VOL',
      'MC',
      'MC',
      'MEI',
      'MEI',
      'CA',
      'SA',
    ]);
  });

  it('é no-op quando o esquema é o mesmo', () => {
    const elenco = elencoCompleto();
    const formacao = montarFormacao(elenco, '4-4-2');
    expect(trocarEsquema(formacao, elenco, '4-4-2')).toBe(formacao);
  });
});

describe('montarFormacao — prioridade por posição + condição/moral', () => {
  it('escala o jogador da POSIÇÃO CERTA mesmo com overall menor (não improvisa)', () => {
    // Um goleiro fraco (60) e um atacante craque (99). O goleiro DEVE ir ao gol.
    const gol = jogador('gk', 'GOL', 60);
    const outros: Player[] = [
      gol,
      ...(['LD', 'ZAG', 'ZAG', 'LE', 'VOL', 'MC', 'MC', 'PD', 'PE', 'CA'] as Position[]).map(
        (pos, i) => jogador(`x${i}`, pos, 85),
      ),
      jogador('craque', 'CA', 99), // craque fora de posição p/ o gol
    ];
    const formacao = montarFormacao(outros, '4-3-3');
    const slotGol = formacao.titulares.find(t => t.posicao === 'GOL');
    expect(slotGol?.jogadorId).toBe('gk'); // e NÃO 'craque'
  });

  it('só improvisa (posição diferente) quando não há jogador da posição', () => {
    // Nenhum goleiro no elenco: o slot GOL é preenchido por alguém de fora.
    const semGoleiro: Player[] = (
      ['ZAG', 'LD', 'ZAG', 'LE', 'VOL', 'MC', 'MC', 'MEI', 'PD', 'PE', 'CA'] as Position[]
    ).map((pos, i) => jogador(`n${i}`, pos, 80 - i));
    const formacao = montarFormacao(semGoleiro, '4-3-3');
    const slotGol = formacao.titulares.find(t => t.posicao === 'GOL');
    expect(slotGol).toBeDefined();
    expect(formacao.titulares).toHaveLength(11); // preenche mesmo sem goleiro
  });

  it('empate de posição/overall: prefere o mais INTEIRO e com MELHOR moral', () => {
    const cansado = jogador('cansado', 'GOL', 85);
    cansado.condicaoFisica = 55; // desgastado
    const inteiro = jogador('inteiro', 'GOL', 85);
    inteiro.condicaoFisica = 100;
    const elenco: Player[] = [
      cansado,
      inteiro,
      ...(['LD', 'ZAG', 'ZAG', 'LE', 'VOL', 'MC', 'MC', 'PD', 'PE', 'CA'] as Position[]).map(
        (pos, i) => jogador(`y${i}`, pos, 80),
      ),
    ];
    const formacao = montarFormacao(elenco, '4-3-3');
    const slotGol = formacao.titulares.find(t => t.posicao === 'GOL');
    expect(slotGol?.jogadorId).toBe('inteiro'); // o cansado vai pro banco
  });

  it('NÃO escala lesionado/suspenso no XI havendo alternativa apta', () => {
    const golLes = jogador('golLes', 'GOL', 90);
    golLes.lesionado = true;
    const golApto = jogador('golApto', 'GOL', 70);
    const outfield = (
      ['LD', 'ZAG', 'ZAG', 'LE', 'VOL', 'MC', 'MEI', 'PD', 'CA', 'PE'] as Position[]
    ).map((pos, i) => jogador(`h${i}`, pos, 82));
    const formacao = montarFormacao([golLes, golApto, ...outfield], '4-3-3');
    const gol = formacao.titulares.find(t => t.posicao === 'GOL');
    expect(gol?.jogadorId).toBe('golApto'); // o goleiro apto (70), não o lesionado (90)
    expect(formacao.titulares.some(t => t.jogadorId === 'golLes')).toBe(false);
  });

  it('banco NÃO inclui lesionado/suspenso havendo aptos (vão p/ fora do jogo)', () => {
    const base = (
      ['GOL', 'LD', 'ZAG', 'ZAG', 'LE', 'VOL', 'MC', 'MEI', 'PD', 'CA', 'PE'] as Position[]
    ).map((pos, i) => jogador(`t${i}`, pos, 80));
    const extra = jogador('extra', 'MC', 75); // apto → deve entrar no banco
    const les = jogador('les', 'ZAG', 88);
    les.lesionado = true;
    const sus = jogador('sus', 'CA', 88);
    sus.suspenso = true;
    const formacao = montarFormacao([...base, extra, les, sus], '4-3-3');
    expect(formacao.reservas).toContain('extra');
    expect(formacao.reservas).not.toContain('les');
    expect(formacao.reservas).not.toContain('sus');
  });
});

describe('trocarTitular (troca de posições entre titulares)', () => {
  it('troca os jogadores de dois slots mantendo as posições', () => {
    const elenco = elencoCompleto();
    const formacao = montarFormacao(elenco, '4-3-3');
    const idA = formacao.titulares[1].jogadorId;
    const idB = formacao.titulares[9].jogadorId;

    const nova = trocarTitular(formacao, 1, idB);

    expect(nova.titulares[1].jogadorId).toBe(idB);
    expect(nova.titulares[9].jogadorId).toBe(idA);
    expect(nova.titulares[1].posicao).toBe(formacao.titulares[1].posicao);
    expect(nova.titulares[9].posicao).toBe(formacao.titulares[9].posicao);
  });
});
