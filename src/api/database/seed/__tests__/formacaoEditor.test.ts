import {montarFormacao, trocarEsquema, trocarTitular} from '../defaults';
import type {Player, Position} from '../../../../types';

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
