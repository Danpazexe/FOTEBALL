/**
 * Operação atômica de transferência: conservação financeira, sem duplicidade,
 * reparo de formação, empréstimo/retorno/agente livre, validações de janela e
 * orçamento, e invariantes do mundo intactos após cada negócio.
 */
import {criarClube, criarPlayer} from '../../../testing/fixtures';
import {criarWorld} from '../../../domain/world/worldTypes';
import {verificarInvariantesMundo} from '../../../domain/world/worldInvariants';
import {selectJogadoresClube} from '../../../domain/world/worldSelectors';
import {applyTransfer, RESERVA_FINANCEIRA} from '../applyTransfer';
import type {Clube} from '../../../types';

const DATA = '2026-06-01'; // dentro da janela universal 2026

function clubeCom(id: string, saldo: number, elenco: string[], divisao = 'Série A'): Clube {
  const base = criarClube({id, divisao, elenco});
  return {...base, financas: {...base.financas, saldo}};
}

function mundoCompraVenda() {
  const alvo = criarPlayer({id: 'p1', nome: 'Alvo', clubeId: 'vende', valorMercado: 5_000_000, salario: 50_000});
  const outros = ['a', 'b', 'c'].map(s =>
    criarPlayer({id: `v_${s}`, clubeId: 'vende'}),
  );
  const vende = clubeCom('vende', 3_000_000, ['p1', 'v_a', 'v_b', 'v_c']);
  const compra = clubeCom('compra', 20_000_000, []);
  // Formação do vendedor escala o alvo como titular + um reserva.
  const vendeComForm: Clube = {
    ...vende,
    formacaoAtual: {
      tipo: '4-3-3',
      titulares: [{jogadorId: 'p1', posicao: 'CA'}],
      reservas: ['v_a'],
    },
    capitaoId: 'p1',
  };
  return criarWorld({
    clubes: [vendeComForm, compra],
    jogadores: [alvo, ...outros],
    activeCompetitionId: 'br-serie-a',
  });
}

describe('applyTransfer — compra permanente', () => {
  it('conserva dinheiro, move a posse e não duplica', () => {
    const world = mundoCompraVenda();
    const saldoVendeAntes = world.clubsById.vende!.financas.saldo;
    const saldoCompraAntes = world.clubsById.compra!.financas.saldo;

    const r = applyTransfer({
      world, playerId: 'p1', fromClubId: 'vende', toClubId: 'compra',
      type: 'permanent', fee: 5_000_000, salary: 60_000, date: DATA, source: 'user',
    });

    expect(r.ok).toBe(true);
    // Conservação: soma dos saldos dos dois clubes inalterada.
    const vende = r.world.clubsById.vende!;
    const compra = r.world.clubsById.compra!;
    expect(compra.financas.saldo).toBe(saldoCompraAntes - 5_000_000);
    expect(vende.financas.saldo).toBe(saldoVendeAntes + 5_000_000);
    // Posse migrou; sem duplicidade.
    expect(r.world.playersById.p1!.clubeId).toBe('compra');
    expect(compra.elenco.filter(id => id === 'p1')).toHaveLength(1);
    expect(vende.elenco).not.toContain('p1');
    expect(selectJogadoresClube(r.world, 'compra').map(j => j.id)).toEqual(['p1']);
    // Salário atualizado; histórico registrado.
    expect(r.world.playersById.p1!.salario).toBe(60_000);
    expect(r.world.transferHistory).toHaveLength(1);
    // Invariantes intactos (formação do vendedor reparada, capitão trocado).
    expect(verificarInvariantesMundo(r.world)).toHaveLength(0);
  });

  it('repara a formação do vendedor (promove reserva ao lugar do titular vendido)', () => {
    const world = mundoCompraVenda();
    const r = applyTransfer({
      world, playerId: 'p1', fromClubId: 'vende', toClubId: 'compra',
      type: 'permanent', fee: 1_000_000, date: DATA, source: 'user',
    });
    const form = r.world.clubsById.vende!.formacaoAtual!;
    expect(form.titulares.map(t => t.jogadorId)).toContain('v_a'); // reserva promovido
    expect(form.titulares.map(t => t.jogadorId)).not.toContain('p1');
    // Capitão era o vendido → limpo (não aponta para fora do clube).
    expect(r.world.clubsById.vende!.capitaoId).toBeUndefined();
  });
});

describe('applyTransfer — validações', () => {
  it('recusa fora da janela', () => {
    const world = mundoCompraVenda();
    const r = applyTransfer({
      world, playerId: 'p1', fromClubId: 'vende', toClubId: 'compra',
      type: 'permanent', fee: 1_000_000, date: '2026-01-15', source: 'user', // fora
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some(e => e.includes('janela'))).toBe(true);
  });

  it('recusa orçamento insuficiente', () => {
    const world = mundoCompraVenda();
    const pobre = {...world, clubsById: {...world.clubsById, compra: clubeCom('compra', 500_000, [])}};
    const r = applyTransfer({
      world: pobre, playerId: 'p1', fromClubId: 'vende', toClubId: 'compra',
      type: 'permanent', fee: 5_000_000, date: DATA, source: 'user',
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some(e => e.includes('orçamento'))).toBe(true);
  });

  it('recusa origem incoerente com a posse real', () => {
    const world = mundoCompraVenda();
    const r = applyTransfer({
      world, playerId: 'p1', fromClubId: 'compra', toClubId: 'compra',
      type: 'permanent', fee: 0, date: DATA, source: 'user',
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some(e => e.includes('origem incoerente'))).toBe(true);
  });

  it('avisa quando a compra fura a reserva financeira (sem bloquear)', () => {
    const world = mundoCompraVenda();
    const justo = {...world, clubsById: {...world.clubsById, compra: clubeCom('compra', RESERVA_FINANCEIRA + 100_000, [])}};
    const r = applyTransfer({
      world: justo, playerId: 'p1', fromClubId: 'vende', toClubId: 'compra',
      type: 'permanent', fee: 500_000, date: DATA, source: 'user',
    });
    expect(r.ok).toBe(true);
    expect(r.warnings.some(w => w.includes('reserva'))).toBe(true);
  });
});

describe('applyTransfer — empréstimo, retorno e agente livre', () => {
  it('empréstimo: posse de jogo muda, dono permanece; retorno reverte', () => {
    const world = mundoCompraVenda();
    const ida = applyTransfer({
      world, playerId: 'p1', fromClubId: 'vende', toClubId: 'compra',
      type: 'loan', fee: 0, salary: 40_000, date: DATA, source: 'user',
    });
    expect(ida.ok).toBe(true);
    const jog = ida.world.playersById.p1!;
    expect(jog.clubeId).toBe('compra'); // joga no clube que pegou emprestado
    expect(jog.emprestimo?.clubeDonoId).toBe('vende'); // dono continua sendo o vende
    expect(verificarInvariantesMundo(ida.world)).toHaveLength(0);

    const volta = applyTransfer({
      world: ida.world, playerId: 'p1', fromClubId: 'compra', toClubId: 'vende',
      type: 'loan_return', fee: 0, date: '2026-07-01', source: 'ai',
    });
    expect(volta.ok).toBe(true);
    expect(volta.world.playersById.p1!.clubeId).toBe('vende');
    expect(volta.world.playersById.p1!.emprestimo).toBeUndefined();
    expect(verificarInvariantesMundo(volta.world)).toHaveLength(0);
  });

  it('retorno de empréstimo NÃO move dinheiro nem com fee>0 (não destrói caixa)', () => {
    const world = mundoCompraVenda();
    const ida = applyTransfer({
      world, playerId: 'p1', fromClubId: 'vende', toClubId: 'compra',
      type: 'loan', fee: 0, date: DATA, source: 'user',
    });
    const saldoCompraAntes = ida.world.clubsById.compra!.financas.saldo;
    const saldoVendeAntes = ida.world.clubsById.vende!.financas.saldo;
    // Retorno com fee>0 (não deveria acontecer, mas não pode sumir com dinheiro).
    const volta = applyTransfer({
      world: ida.world, playerId: 'p1', fromClubId: 'compra', toClubId: 'vende',
      type: 'loan_return', fee: 999_999, date: '2026-07-01', source: 'ai',
    });
    expect(volta.ok).toBe(true);
    expect(volta.world.clubsById.compra!.financas.saldo).toBe(saldoCompraAntes);
    expect(volta.world.clubsById.vende!.financas.saldo).toBe(saldoVendeAntes);
  });

  it('agente livre: entra sem vendedor, clubeId null → clube', () => {
    const livre = criarPlayer({id: 'free', clubeId: null, salario: 0});
    const clube = clubeCom('novo', 10_000_000, []);
    const world = criarWorld({clubes: [clube], jogadores: [livre], activeCompetitionId: 'br-serie-a'});
    const r = applyTransfer({
      world, playerId: 'free', fromClubId: null, toClubId: 'novo',
      type: 'free_agent', fee: 0, salary: 30_000, date: DATA, source: 'ai',
    });
    expect(r.ok).toBe(true);
    expect(r.world.playersById.free!.clubeId).toBe('novo');
    expect(r.world.clubsById.novo!.elenco).toContain('free');
    expect(verificarInvariantesMundo(r.world)).toHaveLength(0);
  });

  it('não tem efeito colateral: o world de entrada permanece inalterado', () => {
    const world = mundoCompraVenda();
    const snapshot = JSON.stringify(world);
    applyTransfer({
      world, playerId: 'p1', fromClubId: 'vende', toClubId: 'compra',
      type: 'permanent', fee: 5_000_000, date: DATA, source: 'user',
    });
    expect(JSON.stringify(world)).toBe(snapshot);
  });
});
