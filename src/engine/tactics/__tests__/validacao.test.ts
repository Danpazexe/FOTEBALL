import type {Formacao, Position, TitularFormacao} from '../../../types';
import {criarPlayer} from '../../../testing/fixtures';
import {validarEscalacao} from '../validacao';

/**
 * Testes de validarEscalacao: cobrem uma escalação 4-3-3 válida e os principais
 * erros/avisos das regras mínimas da escalação livre.
 */

// Posições de um 4-3-3 clássico (1 GOL, 4 defesa, 3 meio, 3 ataque).
const POSICOES_433: Position[] = [
  'GOL',
  'ZAG',
  'ZAG',
  'LD',
  'LE',
  'VOL',
  'MC',
  'MEI',
  'PD',
  'PE',
  'CA',
];

/** Monta uma Formacao Personalizada com um titular por posição informada. */
function montarFormacao(posicoes: Position[]): Formacao {
  const titulares: TitularFormacao[] = posicoes.map((posicao, indice) => ({
    posicao,
    jogadorId: `j${indice}`,
  }));
  return {tipo: 'Personalizada', titulares, reservas: []};
}

/** Cria os 11 jogadores correspondentes (j0..j10), aceitando sobrescritas. */
function criarElenco(parciais: Partial<ReturnType<typeof criarPlayer>>[] = []) {
  return POSICOES_433.map((_, indice) =>
    criarPlayer({id: `j${indice}`, ...parciais[indice]}),
  );
}

describe('validarEscalacao', () => {
  it('aprova uma escalação 4-3-3 válida sem erros nem avisos', () => {
    const formacao = montarFormacao(POSICOES_433);
    const elenco = criarElenco();

    const resultado = validarEscalacao(formacao, elenco);

    expect(resultado.valido).toBe(true);
    expect(resultado.erros).toEqual([]);
    expect(resultado.avisos).toEqual([]);
    expect(resultado.contagem).toEqual({
      goleiros: 1,
      defesa: 4,
      meio: 3,
      ataque: 3,
    });
  });

  it('acusa erro quando não há goleiro', () => {
    // Troca o GOL por mais um zagueiro: fica com 0 goleiros e 5 na defesa.
    const posicoes: Position[] = ['ZAG', ...POSICOES_433.slice(1)];
    const formacao = montarFormacao(posicoes);
    const elenco = criarElenco();

    const resultado = validarEscalacao(formacao, elenco);

    expect(resultado.valido).toBe(false);
    expect(resultado.contagem.goleiros).toBe(0);
    expect(resultado.erros).toContain('É necessário exatamente 1 goleiro.');
  });

  it('acusa erro quando há menos de 3 defensores', () => {
    // 1 GOL, 2 defesa, 5 meio, 3 ataque (total ainda 11).
    const posicoes: Position[] = [
      'GOL',
      'ZAG',
      'ZAG',
      'VOL',
      'VOL',
      'MC',
      'MC',
      'MEI',
      'PD',
      'PE',
      'CA',
    ];
    const formacao = montarFormacao(posicoes);
    const elenco = criarElenco();

    const resultado = validarEscalacao(formacao, elenco);

    expect(resultado.valido).toBe(false);
    expect(resultado.contagem.defesa).toBe(2);
    expect(resultado.erros).toContain('Escale ao menos 3 defensores.');
  });

  it('acusa erro quando há jogador duplicado', () => {
    const formacao = montarFormacao(POSICOES_433);
    // Faz o último titular repetir o id do primeiro de campo.
    formacao.titulares[10].jogadorId = formacao.titulares[1].jogadorId;
    const elenco = criarElenco();

    const resultado = validarEscalacao(formacao, elenco);

    expect(resultado.valido).toBe(false);
    expect(resultado.erros).toContain('Há jogadores repetidos na escalação.');
  });

  it('gera apenas AVISO para titular lesionado, mantendo válida', () => {
    const formacao = montarFormacao(POSICOES_433);
    const elenco = criarElenco([{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {lesionado: true}]);

    const resultado = validarEscalacao(formacao, elenco);

    expect(resultado.valido).toBe(true);
    expect(resultado.erros).toEqual([]);
    expect(resultado.avisos.length).toBe(1);
    expect(resultado.avisos[0]).toContain('indisponível');
  });
});
