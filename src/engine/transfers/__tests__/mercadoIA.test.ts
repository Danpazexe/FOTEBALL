import {criarClube, criarPlayer} from '../../../testing/fixtures';
import type {Player} from '../../../types';

import {gerarTransferenciasIA} from '../mercadoIA';

function elenco(clubeId: string, overall: number, n = 11): Player[] {
  return Array.from({length: n}, (_, i) =>
    criarPlayer({id: `${clubeId}_${i}`, clubeId, overall}),
  );
}

describe('gerarTransferenciasIA', () => {
  it('clube fraco e rico contrata jogador mid-tier de outro clube', () => {
    const rico = criarClube({id: 'rico'});
    rico.financas.saldo = 100_000_000;
    const vendedor = criarClube({id: 'vendedor'});
    vendedor.financas.saldo = 5_000_000;
    const jogadores = [...elenco('rico', 60), ...elenco('vendedor', 70)];

    const ts = gerarTransferenciasIA({
      clubes: [rico, vendedor],
      jogadores,
      seed: 1,
      maxTransferencias: 1,
    });
    expect(ts).toHaveLength(1);
    expect(ts[0].paraClubeId).toBe('rico'); // melhora (média 60 < 70)
    expect(ts[0].deClubeId).toBe('vendedor');
    expect(ts[0].valor).toBeLessThanOrEqual(100_000_000);
  });

  it('é determinístico para a mesma seed', () => {
    const a = criarClube({id: 'a'});
    a.financas.saldo = 80_000_000;
    const b = criarClube({id: 'b'});
    b.financas.saldo = 80_000_000;
    const jogadores = [...elenco('a', 64), ...elenco('b', 76)];
    const args = {clubes: [a, b], jogadores, seed: 42, maxTransferencias: 2};
    expect(gerarTransferenciasIA(args)).toEqual(gerarTransferenciasIA(args));
  });

  it('não negocia craques (>82) nem jogadores fracos (<62)', () => {
    const rico = criarClube({id: 'rico'});
    rico.financas.saldo = 100_000_000;
    const craques = criarClube({id: 'craques'});
    const jogadores = [...elenco('rico', 55), ...elenco('craques', 88)];
    expect(
      gerarTransferenciasIA({clubes: [rico, craques], jogadores, seed: 1}),
    ).toHaveLength(0);
  });

  it('não contrata quem não melhora o elenco', () => {
    const a = criarClube({id: 'a'});
    a.financas.saldo = 100_000_000;
    const b = criarClube({id: 'b'});
    b.financas.saldo = 100_000_000;
    const jogadores = [...elenco('a', 70), ...elenco('b', 70)];
    // média 70, alvos overall 70 → ninguém melhora (70 < 70 é falso).
    expect(
      gerarTransferenciasIA({clubes: [a, b], jogadores, seed: 1}),
    ).toHaveLength(0);
  });

  it('não negocia quem está emprestado', () => {
    const rico = criarClube({id: 'rico'});
    rico.financas.saldo = 100_000_000;
    const dono = criarClube({id: 'dono'});
    const jogadores = [
      ...elenco('rico', 60),
      ...elenco('dono', 70).map(j => ({
        ...j,
        emprestimo: {clubeDonoId: 'outro', retornaEmTemporada: '2027'},
      })),
    ];
    expect(
      gerarTransferenciasIA({clubes: [rico, dono], jogadores, seed: 1}),
    ).toHaveLength(0);
  });
});
