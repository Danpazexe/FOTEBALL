import {criarPartida} from '../../testing/fixtures';
import {
  selecionarFormaRecente,
  selecionarHistoricoConfrontos,
} from '../selectors';
import type {GameState} from '../useGameStore';

// Só usamos as fatias necessárias do estado nos seletores; o cast é seguro.
function estado(parcial: Partial<GameState>): GameState {
  return parcial as GameState;
}

describe('selectors', () => {
  it('selecionarFormaRecente devolve V/E/D do clube do usuário (até 5)', () => {
    const partidas = [
      criarPartida({id: '1', rodada: 1, timeCasa: 'meu', timeFora: 'a', placarCasa: 2, placarFora: 0}),
      criarPartida({id: '2', rodada: 2, timeCasa: 'b', timeFora: 'meu', placarCasa: 1, placarFora: 1}),
      criarPartida({id: '3', rodada: 3, timeCasa: 'meu', timeFora: 'c', placarCasa: 0, placarFora: 1}),
    ];
    const forma = selecionarFormaRecente(estado({clubeUsuarioId: 'meu', partidas}));
    expect(forma).toEqual(['V', 'E', 'D']);
  });

  it('selecionarHistoricoConfrontos pega só os duelos diretos, mais recentes primeiro', () => {
    const partidas = [
      criarPartida({id: '1', rodada: 1, timeCasa: 'meu', timeFora: 'rival', placarCasa: 1, placarFora: 0}),
      criarPartida({id: '2', rodada: 5, timeCasa: 'rival', timeFora: 'meu', placarCasa: 2, placarFora: 2}),
      criarPartida({id: '3', rodada: 2, timeCasa: 'meu', timeFora: 'outro', placarCasa: 1, placarFora: 1}),
    ];
    const historico = selecionarHistoricoConfrontos(
      estado({clubeUsuarioId: 'meu', partidas}),
      'meu',
      'rival',
    );
    expect(historico).toHaveLength(2);
    expect(historico[0].id).toBe('2'); // rodada 5 vem primeiro
  });
});
