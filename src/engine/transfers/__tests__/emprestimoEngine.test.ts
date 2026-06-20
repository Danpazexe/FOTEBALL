import {criarPlayer} from '../../../testing/fixtures';

import {
  BONUS_DESENVOLVIMENTO_EMPRESTIMO,
  criarEmprestimo,
  custoEmprestimo,
  ehEmprestado,
  processarRetornosEmprestimo,
  TAXA_EMPRESTIMO,
} from '../emprestimoEngine';

describe('criarEmprestimo', () => {
  it('move o jogador para o destino e registra o dono', () => {
    const jogador = criarPlayer({id: 'p', clubeId: 'dono'});
    const emprestado = criarEmprestimo(jogador, 'destino', '2027');
    expect(emprestado.clubeId).toBe('destino');
    expect(emprestado.emprestimo).toEqual({
      clubeDonoId: 'dono',
      retornaEmTemporada: '2027',
    });
    expect(ehEmprestado(emprestado)).toBe(true);
    expect(ehEmprestado(jogador)).toBe(false);
  });
});

describe('custoEmprestimo', () => {
  it('é uma fração do valor de mercado', () => {
    const jogador = criarPlayer({id: 'p', valorMercado: 10_000_000});
    expect(custoEmprestimo(jogador)).toBe(10_000_000 * TAXA_EMPRESTIMO);
  });
});

describe('processarRetornosEmprestimo', () => {
  it('devolve ao dono quando a temporada de retorno chega', () => {
    const emprestado = criarEmprestimo(
      criarPlayer({id: 'p', clubeId: 'dono', idade: 28}),
      'destino',
      '2027',
    );
    const [retornado] = processarRetornosEmprestimo([emprestado], '2027');
    expect(retornado.clubeId).toBe('dono');
    expect(retornado.emprestimo).toBeUndefined();
  });

  it('mantém o empréstimo se a temporada de retorno ainda não chegou', () => {
    const emprestado = criarEmprestimo(
      criarPlayer({id: 'p', clubeId: 'dono'}),
      'destino',
      '2028',
    );
    const [mantido] = processarRetornosEmprestimo([emprestado], '2027');
    expect(mantido.clubeId).toBe('destino');
    expect(ehEmprestado(mantido)).toBe(true);
  });

  it('jovem volta com leve desenvolvimento (capado no potencial)', () => {
    const jovem = criarEmprestimo(
      criarPlayer({id: 'j', clubeId: 'dono', idade: 19, overall: 70, potencial: 85}),
      'destino',
      '2027',
    );
    const [voltou] = processarRetornosEmprestimo([jovem], '2027');
    expect(voltou.overall).toBe(70 + BONUS_DESENVOLVIMENTO_EMPRESTIMO);

    const noTeto = criarEmprestimo(
      criarPlayer({id: 't', clubeId: 'dono', idade: 19, overall: 85, potencial: 85}),
      'destino',
      '2027',
    );
    expect(processarRetornosEmprestimo([noTeto], '2027')[0].overall).toBe(85);
  });

  it('veterano não ganha desenvolvimento', () => {
    const velho = criarEmprestimo(
      criarPlayer({id: 'v', clubeId: 'dono', idade: 30, overall: 78}),
      'destino',
      '2027',
    );
    expect(processarRetornosEmprestimo([velho], '2027')[0].overall).toBe(78);
  });
});
