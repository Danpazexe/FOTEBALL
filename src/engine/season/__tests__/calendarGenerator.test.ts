import {loadSeedData} from '../../../api/database/seed/loadSeed';
import {calcularTabela} from '../classification';
import {gerarCalendarioLiga} from '../calendarGenerator';

describe('gerarCalendarioLiga', () => {
  it('creates 380 matches and 38 matches for every club', () => {
    const seed = loadSeedData();
    // O jogo roda UMA divisão por vez (20 clubes); o seed traz Série A + B.
    const clubesLiga = seed.clubes.filter(clube => clube.divisao === 'Série A');
    const partidas = gerarCalendarioLiga(
      clubesLiga.map(clube => clube.id),
      '2026',
    );
    const contagem = new Map(clubesLiga.map(clube => [clube.id, 0]));

    for (const partida of partidas) {
      contagem.set(partida.timeCasa, (contagem.get(partida.timeCasa) ?? 0) + 1);
      contagem.set(partida.timeFora, (contagem.get(partida.timeFora) ?? 0) + 1);
    }

    expect(partidas).toHaveLength(380);
    expect([...contagem.values()].every(total => total === 38)).toBe(true);
  });

  it('tem 38 rodadas com 10 jogos cada e ninguém joga contra si mesmo', () => {
    const seed = loadSeedData();
    const ids = seed.clubes
      .filter(clube => clube.divisao === 'Série A')
      .map(clube => clube.id);
    const partidas = gerarCalendarioLiga(ids, '2026');

    const rodadas = new Set(partidas.map(partida => partida.rodada));
    expect(rodadas.size).toBe(38);
    for (const rodada of rodadas) {
      expect(
        partidas.filter(partida => partida.rodada === rodada),
      ).toHaveLength(10);
    }
    expect(
      partidas.every(partida => partida.timeCasa !== partida.timeFora),
    ).toBe(true);
  });

  it('inverte o mando no returno (returno = turno com casa/fora trocados)', () => {
    const seed = loadSeedData();
    const ids = seed.clubes
      .filter(clube => clube.divisao === 'Série A')
      .map(clube => clube.id);
    const partidas = gerarCalendarioLiga(ids, '2026');

    const turno = partidas.filter(partida => partida.rodada <= 19);
    const returno = partidas.filter(partida => partida.rodada > 19);
    expect(turno).toHaveLength(190);
    expect(returno).toHaveLength(190);

    // Para cada A(casa)×B(fora) no turno existe B(casa)×A(fora) no returno.
    const returnoConfrontos = new Set(
      returno.map(partida => `${partida.timeCasa}|${partida.timeFora}`),
    );
    expect(
      turno.every(partida =>
        returnoConfrontos.has(`${partida.timeFora}|${partida.timeCasa}`),
      ),
    ).toBe(true);
  });

  it('gera datas crescentes ao longo das rodadas', () => {
    const seed = loadSeedData();
    const ids = seed.clubes
      .filter(clube => clube.divisao === 'Série A')
      .map(clube => clube.id);
    const partidas = gerarCalendarioLiga(ids, '2026');

    const dataPorRodada = new Map<number, string>();
    for (const partida of partidas) {
      dataPorRodada.set(partida.rodada, partida.data);
    }
    const rodadasOrdenadas = [...dataPorRodada.keys()].sort((a, b) => a - b);
    for (let i = 1; i < rodadasOrdenadas.length; i += 1) {
      const anterior = dataPorRodada.get(rodadasOrdenadas[i - 1]!)!;
      const atual = dataPorRodada.get(rodadasOrdenadas[i]!)!;
      // Datas ISO (YYYY-MM-DD) comparam cronologicamente como string.
      expect(atual > anterior).toBe(true);
    }
  });

  it('keeps classification points coherent', () => {
    const seed = loadSeedData();
    const [clubeA, clubeB] = seed.clubes;

    if (!clubeA || !clubeB) {
      throw new Error('Seed incompleto');
    }

    const tabela = calcularTabela(seed.clubes, [
      {
        id: 'teste',
        competicaoId: 'liga',
        rodada: 1,
        data: '2026-01-01',
        timeCasa: clubeA.id,
        timeFora: clubeB.id,
        placarCasa: 2,
        placarFora: 1,
        eventos: [],
        jogada: true,
        modoJogado: 'simulado',
      },
    ]);

    expect(tabela.find(linha => linha.clubeId === clubeA.id)?.pontos).toBe(3);
    expect(tabela.find(linha => linha.clubeId === clubeB.id)?.pontos).toBe(0);
  });

  it('nº ímpar de clubes: round-robin com FOLGA (cada rodada um descansa)', () => {
    const ids = ['a', 'b', 'c'];
    const partidas = gerarCalendarioLiga(ids, '2026', 'liga_impar');

    // 3 clubes: turno = 3 jogos em 3 rodadas (1 por rodada) + returno = 6.
    expect(partidas).toHaveLength(6);
    expect(new Set(partidas.map(partida => partida.rodada)).size).toBe(6);

    // Cada clube joga 4 vezes (2 no turno + 2 no returno) e folga 2 rodadas.
    const contagem = new Map(ids.map(id => [id, 0]));
    for (const partida of partidas) {
      contagem.set(partida.timeCasa, (contagem.get(partida.timeCasa) ?? 0) + 1);
      contagem.set(partida.timeFora, (contagem.get(partida.timeFora) ?? 0) + 1);
    }
    expect([...contagem.values()]).toEqual([4, 4, 4]);

    // A folga é interna — nunca vaza como "clube" nas partidas.
    expect(
      partidas.every(
        partida =>
          ids.includes(partida.timeCasa) && ids.includes(partida.timeFora),
      ),
    ).toBe(true);

    // Todo confronto do turno tem o mando invertido no returno.
    const turno = partidas.filter(partida => partida.rodada <= 3);
    const confrontosReturno = new Set(
      partidas
        .filter(partida => partida.rodada > 3)
        .map(partida => `${partida.timeCasa}|${partida.timeFora}`),
    );
    expect(
      turno.every(partida =>
        confrontosReturno.has(`${partida.timeFora}|${partida.timeCasa}`),
      ),
    ).toBe(true);
  });

  it('nº par segue sem folga: 4 clubes → 12 jogos em 6 rodadas', () => {
    const partidas = gerarCalendarioLiga(['a', 'b', 'c', 'd'], '2026', 'liga_par');
    expect(partidas).toHaveLength(12);
    expect(new Set(partidas.map(partida => partida.rodada)).size).toBe(6);
  });
});
