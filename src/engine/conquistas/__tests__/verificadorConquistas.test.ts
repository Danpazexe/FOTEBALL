import {criarPartida, criarPlayer} from '../../../testing/fixtures';
import {
  verificarConquistas,
  type ContextoConquistas,
} from '../verificadorConquistas';

describe('verificarConquistas', () => {
  it('desbloqueia primeira_vitoria e goleada após vitória por 5+', () => {
    const partida = criarPartida({
      id: 'p',
      rodada: 1,
      timeCasa: 'meu',
      timeFora: 'rival',
      placarCasa: 5,
      placarFora: 0,
    });
    const ctx: ContextoConquistas = {
      clubeUsuarioId: 'meu',
      jogadores: [],
      partidas: [partida],
      tabela: [],
      saldoUsuario: 0,
      rodadaAtual: 2,
    };
    const novas = verificarConquistas(ctx, new Set());
    expect(novas).toContain('primeira_vitoria');
    expect(novas).toContain('goleada');
  });

  it('não retorna conquistas já desbloqueadas', () => {
    const partida = criarPartida({
      id: 'p',
      timeCasa: 'meu',
      placarCasa: 5,
      placarFora: 0,
    });
    const ctx: ContextoConquistas = {
      clubeUsuarioId: 'meu',
      jogadores: [],
      partidas: [partida],
      tabela: [],
      saldoUsuario: 0,
      rodadaAtual: 1,
    };
    const novas = verificarConquistas(
      ctx,
      new Set(['goleada', 'primeira_vitoria']),
    );
    expect(novas).not.toContain('goleada');
    expect(novas).not.toContain('primeira_vitoria');
  });

  it('saldo_positivo quando saldo > 10M e artilheiro_proprio com 15+ gols', () => {
    const craque = criarPlayer({id: 'art', clubeId: 'meu'});
    craque.estatisticasTemporada.gols = 16;
    const ctx: ContextoConquistas = {
      clubeUsuarioId: 'meu',
      jogadores: [craque],
      partidas: [],
      tabela: [],
      saldoUsuario: 11_000_000,
      rodadaAtual: 1,
    };
    const novas = verificarConquistas(ctx, new Set());
    expect(novas).toContain('saldo_positivo');
    expect(novas).toContain('artilheiro_proprio');
  });
});
