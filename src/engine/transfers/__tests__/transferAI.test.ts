import {loadSeedData} from '../../../api/database/seed/loadSeed';
import {avaliarPropostaTransferencia} from '../transferAI';

describe('avaliarPropostaTransferencia', () => {
  it('rejects clearly low offers and accepts strong offers', () => {
    const seed = loadSeedData();
    const jogador = seed.jogadores[0];
    const clube = seed.clubes.find(item => item.id === jogador?.clubeId);

    if (!jogador || !clube) {
      throw new Error('Seed incompleto');
    }

    expect(
      avaliarPropostaTransferencia(jogador, clube, jogador.valorMercado * 0.75),
    ).toBe('rejeitada');
    expect(
      avaliarPropostaTransferencia(jogador, clube, jogador.valorMercado * 1.5),
    ).toBe('aceita');
  });
});
