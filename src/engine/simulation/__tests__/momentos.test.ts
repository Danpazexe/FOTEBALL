import {analisarMomentos, type ContextoMomentos} from '../momentos';
import type {EventoPartida} from '../../../types';

function gol(minuto: number, timeId: string): EventoPartida {
  return {minuto, tipo: 'gol', timeId, jogadorId: 'j', descricao: ''};
}
function vermelho(minuto: number, timeId: string): EventoPartida {
  return {minuto, tipo: 'cartao_vermelho', timeId, jogadorId: 'j', descricao: ''};
}

// meuTime = 'A' (mandante salvo indicado); adversário = 'B'.
function ctx(over: Partial<ContextoMomentos>): ContextoMomentos {
  return {
    eventos: [],
    timeCasa: 'A',
    timeFora: 'B',
    placarCasa: 0,
    placarFora: 0,
    meuTimeId: 'A',
    ...over,
  };
}

const tipos = (m: ReturnType<typeof analisarMomentos>) => m.map(x => x.tipo);

describe('analisarMomentos', () => {
  it('empate morno sem lances tardios → nenhum momento', () => {
    const m = analisarMomentos(
      ctx({
        eventos: [gol(20, 'A'), gol(30, 'B')],
        placarCasa: 1,
        placarFora: 1,
      }),
    );
    expect(m).toEqual([]);
  });

  it('estar atrás e vencer → virada', () => {
    const m = analisarMomentos(
      ctx({
        eventos: [gol(10, 'B'), gol(40, 'A'), gol(70, 'A')],
        placarCasa: 2,
        placarFora: 1,
      }),
    );
    expect(tipos(m)).toContain('virada');
    expect(m.find(x => x.tipo === 'virada')?.tom).toBe('bom');
  });

  it('estar na frente e perder → virada sofrida', () => {
    const m = analisarMomentos(
      ctx({
        eventos: [gol(10, 'A'), gol(20, 'A'), gol(60, 'B'), gol(70, 'B'), gol(80, 'B')],
        placarCasa: 2,
        placarFora: 3,
      }),
    );
    expect(tipos(m)).toContain('viradaSofrida');
  });

  it('gol tardio para vencer (sem ter estado atrás) → golNoFim, não virada', () => {
    const m = analisarMomentos(
      ctx({
        eventos: [gol(10, 'A'), gol(50, 'B'), gol(88, 'A')],
        placarCasa: 2,
        placarFora: 1,
      }),
    );
    expect(tipos(m)).toContain('golNoFim');
    expect(tipos(m)).not.toContain('virada');
  });

  it('empate no apagar das luzes → golNoFim (empatar)', () => {
    const m = analisarMomentos(
      ctx({eventos: [gol(30, 'B'), gol(87, 'A')], placarCasa: 1, placarFora: 1}),
    );
    const fim = m.find(x => x.tipo === 'golNoFim');
    expect(fim?.texto).toContain('empatar');
  });

  it('gol sofrido no fim que custou o resultado → sofridoNoFim', () => {
    const m = analisarMomentos(
      ctx({eventos: [gol(20, 'A'), gol(89, 'B')], placarCasa: 1, placarFora: 1}),
    );
    expect(tipos(m)).toContain('sofridoNoFim');
  });

  it('goleada aplicada e sofrida', () => {
    const aplicada = analisarMomentos(
      ctx({
        eventos: [gol(10, 'A'), gol(20, 'A'), gol(30, 'A'), gol(40, 'A')],
        placarCasa: 4,
        placarFora: 0,
      }),
    );
    expect(tipos(aplicada)).toContain('goleadaAplicada');
    const sofrida = analisarMomentos(
      ctx({
        eventos: [gol(10, 'B'), gol(20, 'B'), gol(30, 'B'), gol(40, 'B'), gol(50, 'B')],
        placarCasa: 0,
        placarFora: 5,
      }),
    );
    expect(tipos(sofrida)).toContain('goleadaSofrida');
  });

  it('decisão nos pênaltis usa vencedorPenaltis (não o placar)', () => {
    const classificado = analisarMomentos(
      ctx({
        eventos: [gol(30, 'A'), gol(60, 'B')],
        placarCasa: 1,
        placarFora: 1,
        vencedorPenaltis: 'A',
      }),
    );
    expect(classificado.find(x => x.tipo === 'penaltis')?.tom).toBe('bom');
    // Sem goleada quando decidido nos pênaltis.
    expect(tipos(classificado)).not.toContain('goleadaAplicada');

    const eliminado = analisarMomentos(
      ctx({
        eventos: [gol(30, 'A'), gol(60, 'B')],
        placarCasa: 1,
        placarFora: 1,
        vencedorPenaltis: 'B',
      }),
    );
    expect(eliminado.find(x => x.tipo === 'penaltis')?.tom).toBe('ruim');
  });

  it('empate no tempo decidido nos pênaltis NÃO vira "virada"/"viradaSofrida"', () => {
    // Estive atrás no tempo (B marca antes), empatei e venci nos pênaltis.
    const venceuPenaltis = analisarMomentos(
      ctx({
        eventos: [gol(10, 'B'), gol(50, 'A')],
        placarCasa: 1,
        placarFora: 1,
        vencedorPenaltis: 'A',
      }),
    );
    expect(tipos(venceuPenaltis)).not.toContain('virada');
    expect(tipos(venceuPenaltis)).toContain('penaltis');

    // Estive na frente no tempo (A marca antes), fui alcançado e perdi nos pênaltis.
    const perdeuPenaltis = analisarMomentos(
      ctx({
        eventos: [gol(10, 'A'), gol(50, 'B')],
        placarCasa: 1,
        placarFora: 1,
        vencedorPenaltis: 'B',
      }),
    );
    expect(tipos(perdeuPenaltis)).not.toContain('viradaSofrida');
    expect(tipos(perdeuPenaltis)).toContain('penaltis');
  });

  it('dois lances tardios: empatar e depois perder → só sofridoNoFim', () => {
    // Ótica do visitante A: perdia 1x2, empatou aos 86' (2x2), sofreu aos 89' (2x3).
    const m = analisarMomentos({
      eventos: [gol(10, 'B'), gol(30, 'A'), gol(50, 'B'), gol(86, 'A'), gol(89, 'B')],
      timeCasa: 'B',
      timeFora: 'A',
      placarCasa: 3,
      placarFora: 2,
      meuTimeId: 'A',
    });
    expect(tipos(m)).toContain('sofridoNoFim');
    expect(tipos(m)).not.toContain('golNoFim'); // resultado final é derrota
  });

  it('dois lances tardios: sofrer e depois empatar → golNoFim + sofridoNoFim', () => {
    // Mandante A: sofreu aos 86' (1x2) e empatou aos 89' (2x2).
    const m = analisarMomentos(
      ctx({
        eventos: [gol(10, 'B'), gol(40, 'A'), gol(86, 'B'), gol(89, 'A')],
        placarCasa: 2,
        placarFora: 2,
      }),
    );
    expect(tipos(m)).toContain('golNoFim');
    expect(tipos(m)).toContain('sofridoNoFim');
  });

  it('expulsões — nossa (ruim) e do adversário (bom)', () => {
    const nossa = analisarMomentos(
      ctx({eventos: [gol(10, 'A'), vermelho(50, 'A')], placarCasa: 1, placarFora: 0}),
    );
    expect(tipos(nossa)).toContain('expulsaoNossa');
    const deles = analisarMomentos(
      ctx({eventos: [gol(10, 'A'), vermelho(50, 'B')], placarCasa: 1, placarFora: 0}),
    );
    expect(tipos(deles)).toContain('expulsaoAdversario');
  });

  it('orientação correta quando meu time é o visitante', () => {
    const m = analisarMomentos({
      eventos: [gol(10, 'B'), gol(40, 'A'), gol(80, 'A')],
      timeCasa: 'B',
      timeFora: 'A',
      placarCasa: 1,
      placarFora: 2,
      meuTimeId: 'A',
    });
    expect(tipos(m)).toContain('virada'); // A (fora) esteve atrás e venceu
  });

  it('guarda: progressão que não bate com o placar não inventa virada', () => {
    // Placar diz 3x0 mas só há 1 evento de gol → reconstrução não confere.
    const m = analisarMomentos(
      ctx({eventos: [gol(10, 'A')], placarCasa: 3, placarFora: 0}),
    );
    expect(tipos(m)).not.toContain('virada');
    expect(tipos(m)).not.toContain('golNoFim');
    // diff 3 < 4 → nem goleada; resultado sem drama detectável.
    expect(m).toEqual([]);
  });

  it('é determinística para a mesma entrada', () => {
    const entrada = ctx({
      eventos: [gol(10, 'B'), gol(40, 'A'), gol(90, 'A')],
      placarCasa: 2,
      placarFora: 1,
    });
    expect(analisarMomentos(entrada)).toEqual(analisarMomentos(entrada));
  });
});
