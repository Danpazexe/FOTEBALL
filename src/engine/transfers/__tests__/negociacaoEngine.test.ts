import {criarClube, criarPlayer} from '../../../testing/fixtures';
import {criarRNGComSeed} from '../../simulation/rng';
import {
  respostaIAProposta,
  type PropostaTransferencia,
} from '../negociacaoEngine';

const jogador = criarPlayer({id: 'j', valorMercado: 1_000_000});
const clube = criarClube({id: 'c'});
const base: PropostaTransferencia = {
  id: 'pr',
  jogadorId: 'j',
  clubeOfertante: 'usuario',
  valorProposto: 0,
  status: 'pendente',
  expiracaoRodada: 5,
};

describe('negociacaoEngine', () => {
  it('aceita proposta >= 92% do valor de mercado', () => {
    const resposta = respostaIAProposta(
      {...base, valorProposto: 950_000},
      jogador,
      clube,
      criarRNGComSeed(1),
    );
    expect(resposta).toBe('aceita');
  });

  it('recusa proposta < 70% do valor de mercado', () => {
    const resposta = respostaIAProposta(
      {...base, valorProposto: 600_000},
      jogador,
      clube,
      criarRNGComSeed(1),
    );
    expect(resposta).toBe('recusada');
  });

  it('faz contraproposta no intervalo do meio', () => {
    const resposta = respostaIAProposta(
      {...base, valorProposto: 800_000},
      jogador,
      clube,
      criarRNGComSeed(1),
    );
    expect(typeof resposta).toBe('object');
    if (typeof resposta !== 'string') {
      expect(resposta.status).toBe('contra-proposta');
      expect(resposta.contraPropostaValor ?? 0).toBeGreaterThan(0);
    }
  });
});
