import {calcularTabela} from '../classification';
import {criarClube, criarPartida} from '../../../testing/fixtures';

describe('calcularTabela', () => {
  it('ordena por pontos e usa saldo como desempate', () => {
    const clubes = [criarClube({id: 'a'}), criarClube({id: 'b'})];
    const partidas = [
      // a vence (3 pts, saldo +2); b perde.
      criarPartida({id: 'm1', timeCasa: 'a', timeFora: 'b', placarCasa: 2, placarFora: 0}),
    ];
    const tabela = calcularTabela(clubes, partidas);
    expect(tabela[0].clubeId).toBe('a');
    expect(tabela[0].pontos).toBe(3);
    expect(tabela[1].clubeId).toBe('b');
  });

  it('aplica confronto direto antes do desempate por id', () => {
    // 'zz' e 'aa' terminam idênticos em pontos/vitórias/saldo/gols pró, mas
    // 'zz' venceu o confronto direto. Por id, 'aa' viria antes — logo, se 'zz'
    // aparecer à frente, foi o confronto direto que decidiu.
    const clubes = [
      criarClube({id: 'zz'}),
      criarClube({id: 'aa'}),
      criarClube({id: 'd1'}),
      criarClube({id: 'e1'}),
    ];
    const partidas = [
      criarPartida({id: 'h2h', timeCasa: 'zz', timeFora: 'aa', placarCasa: 1, placarFora: 0}),
      criarPartida({id: 'm2', timeCasa: 'aa', timeFora: 'e1', placarCasa: 1, placarFora: 0}),
      criarPartida({id: 'm3', timeCasa: 'd1', timeFora: 'zz', placarCasa: 1, placarFora: 0}),
    ];

    const tabela = calcularTabela(clubes, partidas);
    const linhaZZ = tabela.find(l => l.clubeId === 'zz')!;
    const linhaAA = tabela.find(l => l.clubeId === 'aa')!;

    // Pré-condição: estão de fato empatados em todos os critérios anteriores.
    expect(linhaZZ.pontos).toBe(linhaAA.pontos);
    expect(linhaZZ.vitorias).toBe(linhaAA.vitorias);
    expect(linhaZZ.saldoGols).toBe(linhaAA.saldoGols);
    expect(linhaZZ.golsPro).toBe(linhaAA.golsPro);

    // Confronto direto coloca 'zz' à frente de 'aa'.
    expect(tabela.indexOf(linhaZZ)).toBeLessThan(tabela.indexOf(linhaAA));
  });
});
