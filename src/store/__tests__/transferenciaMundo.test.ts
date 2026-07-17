/**
 * Adaptador store↔applyTransfer: prova que a migração da IA para a operação
 * atômica corrige o PI-09 (formação do vendedor sem id fantasma), conserva
 * dinheiro e registra histórico — e que negócios inválidos são pulados.
 */
import {criarClube, criarPlayer} from '../../testing/fixtures';
import {verificarInvariantesMundo} from '../../domain/world/worldInvariants';
import {criarWorld} from '../../domain/world/worldTypes';
import {aplicarTransferenciasNaLiga} from '../transferenciaMundo';
import type {Clube} from '../../types';

function clubeComSaldo(id: string, saldo: number, elenco: string[]): Clube {
  const base = criarClube({id, divisao: 'Série A', elenco});
  return {...base, financas: {...base.financas, saldo}};
}

describe('aplicarTransferenciasNaLiga (migração da IA)', () => {
  it('corrige PI-09: repara a formação do vendedor (sem id fantasma)', () => {
    const alvo = criarPlayer({id: 'p1', clubeId: 'vende'});
    const reserva = criarPlayer({id: 'p2', clubeId: 'vende'});
    const vende: Clube = {
      ...clubeComSaldo('vende', 5_000_000, ['p1', 'p2']),
      formacaoAtual: {
        tipo: '4-3-3',
        titulares: [{jogadorId: 'p1', posicao: 'CA'}],
        reservas: ['p2'],
      },
    };
    const compra = clubeComSaldo('compra', 50_000_000, []);

    const r = aplicarTransferenciasNaLiga({
      clubes: [vende, compra],
      jogadores: [alvo, reserva],
      transferHistory: [],
      entradas: [
        {playerId: 'p1', fromClubId: 'vende', toClubId: 'compra', type: 'permanent', fee: 4_000_000, source: 'ai'},
      ],
      date: '2026-06-15',
      activeCompetitionId: 'br-serie-a',
      userClubId: null,
    });

    expect(r.aplicadas).toBe(1);
    const world = criarWorld({clubes: r.clubes, jogadores: r.jogadores});
    // NENHUM id fantasma na formação (o bug antigo deixava 'p1' escalado no vende).
    expect(verificarInvariantesMundo(world)).toHaveLength(0);
    const vendeDepois = r.clubes.find(c => c.id === 'vende')!;
    expect(vendeDepois.formacaoAtual!.titulares.map(t => t.jogadorId)).not.toContain('p1');
    expect(vendeDepois.formacaoAtual!.titulares.map(t => t.jogadorId)).toContain('p2'); // promovido
    expect(r.transferHistory).toHaveLength(1);
  });

  it('conserva o dinheiro entre comprador e vendedor', () => {
    const alvo = criarPlayer({id: 'p1', clubeId: 'vende'});
    const vende = clubeComSaldo('vende', 2_000_000, ['p1']);
    const compra = clubeComSaldo('compra', 30_000_000, []);
    const somaAntes = vende.financas.saldo + compra.financas.saldo;

    const r = aplicarTransferenciasNaLiga({
      clubes: [vende, compra],
      jogadores: [alvo],
      transferHistory: [],
      entradas: [
        {playerId: 'p1', fromClubId: 'vende', toClubId: 'compra', type: 'permanent', fee: 7_000_000, source: 'ai'},
      ],
      date: '2026-06-15',
      activeCompetitionId: 'br-serie-a',
      userClubId: null,
    });

    const somaDepois =
      r.clubes.find(c => c.id === 'vende')!.financas.saldo +
      r.clubes.find(c => c.id === 'compra')!.financas.saldo;
    expect(somaDepois).toBe(somaAntes);
  });

  it('pula negócio inválido (origem incoerente) sem quebrar o lote', () => {
    const alvo = criarPlayer({id: 'p1', clubeId: 'vende'});
    const outro = criarPlayer({id: 'p2', clubeId: 'vende'});
    const vende = clubeComSaldo('vende', 5_000_000, ['p1', 'p2']);
    const compra = clubeComSaldo('compra', 50_000_000, []);

    const r = aplicarTransferenciasNaLiga({
      clubes: [vende, compra],
      jogadores: [alvo, outro],
      transferHistory: [],
      entradas: [
        // Inválido: p2 não está em 'compra'.
        {playerId: 'p2', fromClubId: 'compra', toClubId: 'vende', type: 'permanent', fee: 1_000, source: 'ai'},
        // Válido.
        {playerId: 'p1', fromClubId: 'vende', toClubId: 'compra', type: 'permanent', fee: 3_000_000, source: 'ai'},
      ],
      date: '2026-06-15',
      activeCompetitionId: 'br-serie-a',
      userClubId: null,
    });

    expect(r.aplicadas).toBe(1);
    expect(r.avisos.some(a => a.includes('pulada'))).toBe(true);
    expect(r.jogadores.find(j => j.id === 'p1')!.clubeId).toBe('compra');
    expect(r.jogadores.find(j => j.id === 'p2')!.clubeId).toBe('vende'); // intacto
  });
});
