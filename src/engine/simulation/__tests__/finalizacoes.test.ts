import {extrairFinalizacoes} from '../finalizacoes';
import type {EventoPartida, Partida, PenaltiResultado, Position} from '../../../types';

function evento(
  parcial: Partial<EventoPartida> & Pick<EventoPartida, 'tipo' | 'timeId'>,
): EventoPartida {
  return {
    minuto: 10,
    jogadorId: 'casa_9',
    descricao: 'lance',
    ...parcial,
  };
}

function partidaCom(eventos: EventoPartida[]): Partida {
  return {
    id: 'p_teste_1',
    competicaoId: 'liga',
    rodada: 1,
    data: '2026-01-01',
    timeCasa: 'casa',
    timeFora: 'fora',
    placarCasa: 0,
    placarFora: 0,
    eventos,
    jogada: true,
    modoJogado: 'interativo',
  };
}

const POSICOES: Record<string, Position> = {
  casa_9: 'CA',
  casa_7: 'PD',
  fora_9: 'CA',
};

const penalti = (convertido: boolean): PenaltiResultado => ({
  direcaoChute: 'E',
  alturaChute: 'B',
  direcaoGoleiro: convertido ? 'D' : 'E',
  convertido,
  potencia: 0.8,
});

describe('extrairFinalizacoes', () => {
  it('produz o mesmo mapa para a mesma partida (determinístico)', () => {
    const partida = partidaCom([
      evento({tipo: 'gol', minuto: 12, timeId: 'casa', jogadorId: 'casa_9'}),
      evento({tipo: 'chance_perdida', minuto: 33, timeId: 'fora', jogadorId: 'fora_9'}),
      evento({tipo: 'bola_trave', minuto: 70, timeId: 'casa', jogadorId: 'casa_7'}),
    ]);
    const a = extrairFinalizacoes(partida, POSICOES);
    const b = extrairFinalizacoes(partida, POSICOES);
    expect(a).toEqual(b);
    expect(a).toHaveLength(3);
  });

  it('nº de chutes-gol por time == gols do time (invariante do placar)', () => {
    const partida = partidaCom([
      evento({tipo: 'gol', minuto: 20, timeId: 'casa', jogadorId: 'casa_9'}),
      evento({tipo: 'gol', minuto: 55, timeId: 'casa', jogadorId: 'casa_7'}),
      evento({tipo: 'gol_contra', minuto: 61, timeId: 'casa', jogadorId: 'fora_5'}),
      evento({tipo: 'gol', minuto: 80, timeId: 'fora', jogadorId: 'fora_9'}),
      evento({tipo: 'chance_perdida', minuto: 40, timeId: 'fora', jogadorId: 'fora_9'}),
    ]);
    const chutes = extrairFinalizacoes(partida, POSICOES);
    const golsCasa = chutes.filter(c => c.timeId === 'casa' && c.gol).length;
    const golsFora = chutes.filter(c => c.timeId === 'fora' && c.gol).length;
    expect(golsCasa).toBe(3); // 2 gols + 1 gol contra a favor
    expect(golsFora).toBe(1);
  });

  it('coordenadas e xG ficam nos limites válidos', () => {
    const partida = partidaCom([
      evento({tipo: 'gol', minuto: 5, timeId: 'casa', jogadorId: 'casa_9'}),
      evento({tipo: 'falta_cobranca', minuto: 25, timeId: 'fora', jogadorId: 'fora_9'}),
      evento({tipo: 'chance_perdida', minuto: 88, timeId: 'casa', jogadorId: 'casa_7'}),
    ]);
    for (const c of extrairFinalizacoes(partida, POSICOES)) {
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.x).toBeLessThanOrEqual(1);
      expect(c.y).toBeGreaterThanOrEqual(0);
      expect(c.y).toBeLessThanOrEqual(1);
      expect(c.xG).toBeGreaterThanOrEqual(0.02);
      expect(c.xG).toBeLessThanOrEqual(0.95);
    }
  });

  it('ignora não-chutes (cartão/substituição/lesão) e gol anulado pelo VAR', () => {
    const partida = partidaCom([
      evento({tipo: 'cartao_amarelo', minuto: 15, timeId: 'casa', jogadorId: 'casa_9'}),
      evento({tipo: 'substituicao', minuto: 60, timeId: 'casa', jogadorId: 'casa_7'}),
      evento({tipo: 'lesao', minuto: 62, timeId: 'fora', jogadorId: 'fora_9'}),
      evento({
        tipo: 'chance_perdida',
        minuto: 70,
        timeId: 'fora',
        jogadorId: 'fora_9',
        descricao: 'Gol anulado pelo VAR',
      }),
    ]);
    expect(extrairFinalizacoes(partida, POSICOES)).toHaveLength(0);
  });

  it('pênalti convertido é gol de xG alto; pênalti perdido não é gol', () => {
    const partida = partidaCom([
      evento({
        tipo: 'gol',
        minuto: 30,
        timeId: 'casa',
        jogadorId: 'casa_9',
        penaltiData: penalti(true),
      }),
      evento({
        tipo: 'penalti',
        minuto: 75,
        timeId: 'fora',
        jogadorId: 'fora_9',
        penaltiData: penalti(false),
      }),
    ]);
    const chutes = extrairFinalizacoes(partida, POSICOES);
    const golPen = chutes.find(c => c.minuto === 30)!;
    const penPerdido = chutes.find(c => c.minuto === 75)!;
    expect(golPen.gol).toBe(true);
    expect(golPen.xG).toBeGreaterThan(0.7);
    expect(golPen.deFora).toBe(false);
    expect(penPerdido.gol).toBe(false);
    expect(penPerdido.resultado).toBe('defesa'); // goleiro no mesmo canto do chute (E)
  });

  it('marca primeiro/segundo tempo pelo minuto', () => {
    const partida = partidaCom([
      evento({tipo: 'gol', minuto: 44, timeId: 'casa', jogadorId: 'casa_9'}),
      evento({tipo: 'gol', minuto: 46, timeId: 'fora', jogadorId: 'fora_9'}),
    ]);
    const chutes = extrairFinalizacoes(partida, POSICOES);
    expect(chutes.find(c => c.minuto === 44)!.primeiroTempo).toBe(true);
    expect(chutes.find(c => c.minuto === 46)!.primeiroTempo).toBe(false);
  });
});
