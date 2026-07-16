import {reconstruirLancesGol} from '../lanceReplay';
import {extrairFinalizacoes} from '../finalizacoes';
import type {LanceGol, PosicoesElenco} from '../lances';
import type {EventoPartida, Partida, PenaltiResultado} from '../../../types';

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

const TITULARES_CASA = [
  'casa_1',
  'casa_2',
  'casa_3',
  'casa_4',
  'casa_6',
  'casa_5',
  'casa_8',
  'casa_10',
  'casa_7',
  'casa_11',
  'casa_9',
];

const TITULARES_FORA = [
  'fora_1',
  'fora_2',
  'fora_3',
  'fora_5',
  'fora_6',
  'fora_4',
  'fora_8',
  'fora_10',
  'fora_7',
  'fora_11',
  'fora_9',
];

const POSICOES: PosicoesElenco = {
  casa_1: 'GOL',
  casa_2: 'LD',
  casa_3: 'ZAG',
  casa_4: 'ZAG',
  casa_6: 'LE',
  casa_5: 'VOL',
  casa_8: 'MC',
  casa_10: 'MEI',
  casa_7: 'PD',
  casa_11: 'PE',
  casa_9: 'CA',
  casa_12: 'MC',
  fora_1: 'GOL',
  fora_2: 'LD',
  fora_3: 'ZAG',
  fora_5: 'ZAG',
  fora_6: 'LE',
  fora_4: 'VOL',
  fora_8: 'MC',
  fora_10: 'MEI',
  fora_7: 'PD',
  fora_11: 'PE',
  fora_9: 'CA',
};

function partidaCom(
  eventos: EventoPartida[],
  extras: Partial<Partida> = {},
): Partida {
  return {
    id: 'p_replay_1',
    competicaoId: 'liga',
    rodada: 1,
    data: '2026-01-01',
    timeCasa: 'casa',
    timeFora: 'fora',
    placarCasa: 0,
    placarFora: 0,
    eventos,
    jogada: true,
    modoJogado: 'simulado',
    titularesCasa: TITULARES_CASA,
    titularesFora: TITULARES_FORA,
    ...extras,
  };
}

const penalti = (convertido: boolean): PenaltiResultado => ({
  direcaoChute: 'E',
  alturaChute: 'B',
  direcaoGoleiro: convertido ? 'D' : 'E',
  convertido,
  potencia: 0.8,
});

/** Partida com gol de jogo aberto (assistido), pênalti, gol contra e gol fora. */
function partidaRica(): Partida {
  return partidaCom([
    evento({
      tipo: 'gol',
      minuto: 12,
      timeId: 'casa',
      jogadorId: 'casa_9',
      jogadorAssistenciaId: 'casa_10',
    }),
    evento({tipo: 'chance_perdida', minuto: 40, timeId: 'fora', jogadorId: 'fora_9'}),
    evento({
      tipo: 'gol',
      minuto: 30,
      timeId: 'casa',
      jogadorId: 'casa_7',
      penaltiData: penalti(true),
    }),
    evento({tipo: 'gol_contra', minuto: 61, timeId: 'casa', jogadorId: 'fora_5'}),
    evento({tipo: 'gol', minuto: 80, timeId: 'fora', jogadorId: 'fora_9'}),
  ]);
}

function lanceDoMinuto(lances: LanceGol[], minuto: number): LanceGol {
  const lance = lances.find(l => l.minuto === minuto);
  expect(lance).toBeDefined();
  return lance as LanceGol;
}

describe('reconstruirLancesGol', () => {
  it('é determinístico: duas chamadas produzem o mesmo replay', () => {
    const a = reconstruirLancesGol(partidaRica(), POSICOES);
    const b = reconstruirLancesGol(partidaRica(), POSICOES);
    expect(a).toEqual(b);
    expect(a).toHaveLength(4);
  });

  it('gera 1 LanceGol por gol real, ordenado por minuto; chance_perdida fora', () => {
    const lances = reconstruirLancesGol(partidaRica(), POSICOES);
    expect(lances.map(l => l.minuto)).toEqual([12, 30, 61, 80]);
    expect(lances.some(l => l.minuto === 40)).toBe(false);
    expect(new Set(lances.map(l => l.id)).size).toBe(4);
  });

  it('termina em gol/gol_contra, com finalização como penúltimo passo', () => {
    for (const lance of reconstruirLancesGol(partidaRica(), POSICOES)) {
      const ultimo = lance.passos[lance.passos.length - 1];
      if (lance.origem === 'gol_contra') {
        expect(ultimo.tipo).toBe('gol_contra');
      } else {
        expect(ultimo.tipo).toBe('gol');
        expect(lance.passos[lance.passos.length - 2].tipo).toBe('finalizacao');
      }
    }
  });

  it('assistência real vira passo do assistente imediatamente antes do chute', () => {
    const lances = reconstruirLancesGol(partidaRica(), POSICOES);
    const lance = lanceDoMinuto(lances, 12);
    expect(lance.origem).toBe('jogo_aberto');
    expect(lance.assistenteId).toBe('casa_10');
    const idxFin = lance.passos.findIndex(p => p.tipo === 'finalizacao');
    expect(idxFin).toBeGreaterThan(0);
    expect(lance.passos[idxFin - 1].tipo).toBe('assistencia');
    expect(lance.passos[idxFin - 1].jogadorId).toBe('casa_10');
    expect(lance.passos[idxFin].jogadorId).toBe('casa_9');
  });

  it('ancora o chute na Finalizacao correspondente do mapa de chutes', () => {
    const partida = partidaRica();
    const lances = reconstruirLancesGol(partida, POSICOES);
    const fins = extrairFinalizacoes(partida, POSICOES);
    for (const lance of lances) {
      const fin = fins.find(
        f =>
          f.gol &&
          f.minuto === lance.minuto &&
          f.timeId === lance.timeId &&
          f.jogadorId === lance.autorId,
      );
      expect(fin).toBeDefined();
      const passoChute =
        lance.origem === 'gol_contra'
          ? lance.passos[lance.passos.length - 1]
          : lance.passos.find(p => p.tipo === 'finalizacao');
      expect(passoChute).toBeDefined();
      expect(passoChute!.x).toBeCloseTo(fin!.x, 10);
      expect(passoChute!.y).toBeCloseTo(fin!.y * 0.33, 10);
      expect(lance.golX).toBeCloseTo(fin!.golX ?? 0.5, 10);
      expect(lance.xG).toBeCloseTo(fin!.xG, 10);
    }
  });

  it('coordenadas em [0,1], 3–6 passos e progressão (y decrescente) ao gol', () => {
    for (const lance of reconstruirLancesGol(partidaRica(), POSICOES)) {
      expect(lance.passos.length).toBeGreaterThanOrEqual(3);
      expect(lance.passos.length).toBeLessThanOrEqual(6);
      for (const passo of lance.passos) {
        expect(passo.x).toBeGreaterThanOrEqual(0);
        expect(passo.x).toBeLessThanOrEqual(1);
        expect(passo.y).toBeGreaterThanOrEqual(0);
        expect(passo.y).toBeLessThanOrEqual(1);
      }
      // Escanteio parte do canto (y≈0), então não exige progressão monótona.
      if (lance.origem !== 'escanteio') {
        for (let i = 1; i < lance.passos.length; i += 1) {
          expect(lance.passos[i].y).toBeLessThan(lance.passos[i - 1].y);
        }
      }
    }
  });

  it('gol contra: construção do time beneficiado e passo final do defensor', () => {
    const lances = reconstruirLancesGol(partidaRica(), POSICOES);
    const lance = lanceDoMinuto(lances, 61);
    expect(lance.origem).toBe('gol_contra');
    expect(lance.timeId).toBe('casa');
    expect(lance.autorId).toBe('fora_5');
    const ultimo = lance.passos[lance.passos.length - 1];
    expect(ultimo.tipo).toBe('gol_contra');
    expect(ultimo.jogadorId).toBe('fora_5');
    for (const passo of lance.passos.slice(0, -1)) {
      expect(TITULARES_CASA).toContain(passo.jogadorId);
    }
    expect(lance.passos.some(p => p.tipo === 'gol')).toBe(false);
  });

  it('pênalti convertido: origem penalti, do penalti_ganho à cobrança do autor', () => {
    const lances = reconstruirLancesGol(partidaRica(), POSICOES);
    const lance = lanceDoMinuto(lances, 30);
    expect(lance.origem).toBe('penalti');
    expect(lance.passos.map(p => p.tipo)).toEqual([
      'penalti_ganho',
      'finalizacao',
      'gol',
    ]);
    for (const passo of lance.passos) {
      expect(passo.jogadorId).toBe('casa_7');
    }
  });

  it('substituído antes do gol não participa; quem entrou participa', () => {
    const partida = partidaCom(
      [
        evento({
          tipo: 'substituicao',
          minuto: 50,
          timeId: 'casa',
          jogadorId: 'casa_5',
          jogadorEntraId: 'casa_12',
        }),
        evento({tipo: 'gol', minuto: 70, timeId: 'casa', jogadorId: 'casa_9'}),
      ],
      {titularesCasa: ['casa_9', 'casa_5']},
    );
    const [lance] = reconstruirLancesGol(partida, POSICOES);
    expect(lance.passos.some(p => p.jogadorId === 'casa_5')).toBe(false);
    expect(lance.passos.some(p => p.jogadorId === 'casa_12')).toBe(true);
  });

  it('expulso antes do gol não participa da construção', () => {
    const partida = partidaCom(
      [
        evento({
          tipo: 'cartao_vermelho',
          minuto: 65,
          timeId: 'casa',
          jogadorId: 'casa_12',
        }),
        evento({tipo: 'gol', minuto: 70, timeId: 'casa', jogadorId: 'casa_9'}),
      ],
      {titularesCasa: ['casa_9', 'casa_12']},
    );
    const [lance] = reconstruirLancesGol(partida, POSICOES);
    expect(lance.passos.some(p => p.jogadorId === 'casa_12')).toBe(false);
    for (const passo of lance.passos) {
      expect(passo.jogadorId).toBe('casa_9');
    }
  });

  it('save antigo (sem titulares): sequência curta só com autor/assistente', () => {
    const partida = partidaCom(
      [
        evento({
          tipo: 'gol',
          minuto: 15,
          timeId: 'casa',
          jogadorId: 'casa_9',
          jogadorAssistenciaId: 'casa_10',
        }),
      ],
      {titularesCasa: undefined, titularesFora: undefined},
    );
    const [lance] = reconstruirLancesGol(partida, POSICOES);
    expect(lance.passos.map(p => p.tipo)).toEqual([
      'recepcao',
      'assistencia',
      'finalizacao',
      'gol',
    ]);
    expect(lance.passos.map(p => p.jogadorId)).toEqual([
      'casa_10',
      'casa_10',
      'casa_9',
      'casa_9',
    ]);
  });

  it('dois gols do mesmo autor no MESMO minuto ancoram em finalizações distintas', () => {
    // Trava o consumo 1:1 (finUsadas): sem ele, os dois lances casariam com a
    // MESMA Finalizacao e o replay do segundo gol divergiria do mapa de chutes.
    const partida = partidaCom([
      evento({tipo: 'gol', minuto: 55, timeId: 'casa', jogadorId: 'casa_9'}),
      evento({tipo: 'gol', minuto: 55, timeId: 'casa', jogadorId: 'casa_9'}),
    ]);
    const lances = reconstruirLancesGol(partida, POSICOES);
    expect(lances).toHaveLength(2);

    const fins = extrairFinalizacoes(partida, POSICOES).filter(
      f => f.gol && f.minuto === 55 && f.jogadorId === 'casa_9',
    );
    expect(fins).toHaveLength(2);
    // Ordem estável: lance i ↔ finalização i (cada uma consumida UMA vez).
    lances.forEach((lance, i) => {
      const passoChute = lance.passos.find(p => p.tipo === 'finalizacao');
      expect(passoChute).toBeDefined();
      expect(passoChute!.x).toBeCloseTo(fins[i].x, 10);
      expect(passoChute!.y).toBeCloseTo(fins[i].y * 0.33, 10);
      expect(lance.golX).toBeCloseTo(fins[i].golX ?? 0.5, 10);
    });
    // As âncoras são de fato DISTINTAS (a seed do mapa inclui o índice do evento).
    const chutes = lances.map(
      l => l.passos.find(p => p.tipo === 'finalizacao')!,
    );
    expect(
      chutes[0].x !== chutes[1].x || lances[0].golX !== lances[1].golX,
    ).toBe(true);
  });

  it('gol contra em save antigo: degrada para 2 passos do defensor, ancorados', () => {
    const partida = partidaCom(
      [evento({tipo: 'gol_contra', minuto: 33, timeId: 'casa', jogadorId: 'fora_5'})],
      {titularesCasa: undefined, titularesFora: undefined},
    );
    const [lance] = reconstruirLancesGol(partida, POSICOES);
    expect(lance.origem).toBe('gol_contra');
    // Única exceção documentada ao mínimo de 3 passos (não há elenco conhecido).
    expect(lance.passos.map(p => p.tipo)).toEqual(['interceptacao', 'gol_contra']);
    for (const passo of lance.passos) {
      expect(passo.jogadorId).toBe('fora_5');
    }
    const fin = extrairFinalizacoes(partida, POSICOES).find(f => f.gol);
    expect(fin).toBeDefined();
    const ultimo = lance.passos[lance.passos.length - 1];
    expect(ultimo.x).toBeCloseTo(fin!.x, 10);
    expect(ultimo.y).toBeCloseTo(fin!.y * 0.33, 10);
  });

  it('gol nos acréscimos (90+) reconstrói normalmente', () => {
    const partida = partidaCom([
      evento({tipo: 'gol', minuto: 97, timeId: 'fora', jogadorId: 'fora_9'}),
    ]);
    const [lance] = reconstruirLancesGol(partida, POSICOES);
    expect(lance.minuto).toBe(97);
    expect(lance.passos[lance.passos.length - 1].tipo).toBe('gol');
    for (const passo of lance.passos) {
      expect(passo.x).toBeGreaterThanOrEqual(0);
      expect(passo.x).toBeLessThanOrEqual(1);
      expect(passo.y).toBeGreaterThanOrEqual(0);
      expect(passo.y).toBeLessThanOrEqual(1);
    }
  });
});
