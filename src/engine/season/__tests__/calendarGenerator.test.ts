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
});
