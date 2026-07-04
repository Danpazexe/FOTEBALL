import {
  calcularRetrospectiva,
  type EventoGolRetro,
  type PartidaRetro,
} from '../retrospectiva';

function g(jogadorId: string, timeId = 'A'): EventoGolRetro {
  return {timeId, jogadorId};
}
function p(over: Partial<PartidaRetro>): PartidaRetro {
  return {timeCasa: 'A', timeFora: 'B', placarCasa: 0, placarFora: 0, gols: [], ...over};
}

describe('calcularRetrospectiva', () => {
  it('sem partidas → tudo zerado', () => {
    const r = calcularRetrospectiva([], 'A');
    expect(r.jogos).toBe(0);
    expect(r.pontos).toBe(0);
    expect(r.aproveitamento).toBe(0);
    expect(r.maiorVitoria).toBeNull();
    expect(r.maiorDerrota).toBeNull();
    expect(r.artilheiro).toBeNull();
  });

  it('consolida balanço, pontos e aproveitamento', () => {
    const r = calcularRetrospectiva(
      [
        p({placarCasa: 2, placarFora: 0}), // A vence 2x0
        p({timeCasa: 'C', timeFora: 'A', placarCasa: 1, placarFora: 1}), // A empata 1x1 fora
        p({placarCasa: 0, placarFora: 3}), // A perde 0x3
      ],
      'A',
    );
    expect(r.jogos).toBe(3);
    expect(r.vitorias).toBe(1);
    expect(r.empates).toBe(1);
    expect(r.derrotas).toBe(1);
    expect(r.golsPro).toBe(3);
    expect(r.golsContra).toBe(4);
    expect(r.saldo).toBe(-1);
    expect(r.pontos).toBe(4);
    expect(r.aproveitamento).toBe(Math.round((4 / 9) * 100)); // 44
  });

  it('maior vitória e maior derrota pela margem', () => {
    const r = calcularRetrospectiva(
      [
        p({placarCasa: 2, placarFora: 1}),
        p({placarCasa: 4, placarFora: 0, timeFora: 'X'}), // maior vitória (margem 4)
        p({timeCasa: 'Y', timeFora: 'A', placarCasa: 5, placarFora: 1}), // maior derrota (margem 4)
      ],
      'A',
    );
    expect(r.maiorVitoria).toEqual({adversarioId: 'X', golsFavor: 4, golsContra: 0});
    expect(r.maiorDerrota).toEqual({adversarioId: 'Y', golsFavor: 1, golsContra: 5});
  });

  it('desempata a maior vitória por mais gols marcados', () => {
    const r = calcularRetrospectiva(
      [
        p({placarCasa: 3, placarFora: 1, timeFora: 'X'}), // margem 2
        p({placarCasa: 4, placarFora: 2, timeFora: 'Z'}), // margem 2, mais gols
      ],
      'A',
    );
    expect(r.maiorVitoria?.adversarioId).toBe('Z');
    expect(r.maiorVitoria?.golsFavor).toBe(4);
  });

  it('maior sequência de vitórias (quebrada por não-vitória)', () => {
    const r = calcularRetrospectiva(
      [
        p({placarCasa: 1, placarFora: 0}), // V
        p({placarCasa: 2, placarFora: 0}), // V
        p({placarCasa: 0, placarFora: 0}), // E (quebra)
        p({placarCasa: 3, placarFora: 1}), // V
      ],
      'A',
    );
    expect(r.maiorSequenciaVitorias).toBe(2);
  });

  it('artilheiro conta só os gols do clube', () => {
    const r = calcularRetrospectiva(
      [
        p({placarCasa: 2, placarFora: 1, gols: [g('joao'), g('joao'), g('rival', 'B')]}),
        p({
          timeCasa: 'C',
          timeFora: 'A',
          placarCasa: 1,
          placarFora: 1,
          gols: [g('outro', 'C'), g('pedro', 'A')],
        }),
      ],
      'A',
    );
    expect(r.artilheiro).toEqual({jogadorId: 'joao', gols: 2});
  });

  it('ignora partidas que não envolvem o clube', () => {
    const r = calcularRetrospectiva(
      [p({timeCasa: 'X', timeFora: 'Y', placarCasa: 3, placarFora: 3})],
      'A',
    );
    expect(r.jogos).toBe(0);
  });

  it('é determinística para a mesma entrada', () => {
    const partidas = [
      p({placarCasa: 2, placarFora: 0, gols: [g('joao'), g('joao')]}),
      p({placarCasa: 0, placarFora: 1}),
    ];
    expect(calcularRetrospectiva(partidas, 'A')).toEqual(
      calcularRetrospectiva(partidas, 'A'),
    );
  });
});
