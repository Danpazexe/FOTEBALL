/**
 * reconstruirLanceMinuto — contrato da reconstrução derivada do lance de um
 * minuto: determinismo por seed real + minuto, toques só de jogadores em
 * campo, evento real sempre ancorado no fim (autor real do gol finaliza) e
 * posse guiada pelo momento real.
 */
import type {ChutePartida, EventoPartida, Position} from '../../../types';

import {
  coordenadaBasePosicao,
  paraCampoHorizontal,
  reconstruirLanceMinuto,
  type EntradaLanceMinuto,
  type JogadorEmCampoLance,
} from '../reconstruirLanceMinuto';

const CASA = 'clube_casa';
const FORA = 'clube_fora';

const POSICOES_433: Position[] = [
  'GOL', 'LD', 'ZAG', 'ZAG', 'LE', 'VOL', 'MC', 'MEI', 'PD', 'CA', 'PE',
];

function lado(prefixo: string): JogadorEmCampoLance[] {
  return POSICOES_433.map((posicao, i) => ({id: `${prefixo}_${i}`, posicao}));
}

function entradaBase(extra?: Partial<EntradaLanceMinuto>): EntradaLanceMinuto {
  return {
    seedPartida: 123_456,
    minuto: 10,
    momentoMinuto: 0,
    timeCasaId: CASA,
    timeForaId: FORA,
    emCampoCasa: lado('c'),
    emCampoFora: lado('f'),
    eventosDoMinuto: [],
    chutesDoMinuto: [],
    ...extra,
  };
}

function chuteFixture(extra?: Partial<ChutePartida>): ChutePartida {
  return {
    id: 'chute_1',
    timeId: CASA,
    jogadorId: 'c_9',
    minuto: 10,
    posseId: 'posse_1',
    situacao: 'jogo_aberto',
    corpo: 'pe_direito',
    x: 0.6,
    y: 0.4,
    xg: 0.2,
    xgot: 0.1,
    resultado: 'defesa',
    grandeChance: false,
    deFora: false,
    ...extra,
  };
}

function eventoFixture(extra?: Partial<EventoPartida>): EventoPartida {
  return {
    minuto: 10,
    tipo: 'cartao_amarelo',
    timeId: FORA,
    jogadorId: 'f_2',
    descricao: 'Cartão amarelo.',
    ...extra,
  };
}

describe('reconstruirLanceMinuto — determinismo', () => {
  it('mesma entrada ⇒ exatamente o mesmo lance (sem sorteio fora da seed)', () => {
    const entrada = entradaBase({momentoMinuto: 0.4});
    expect(reconstruirLanceMinuto(entrada)).toEqual(
      reconstruirLanceMinuto(entrada),
    );
  });

  it('minutos diferentes derivam lances diferentes (seed por minuto)', () => {
    const a = reconstruirLanceMinuto(entradaBase({minuto: 10, momentoMinuto: 0.4}));
    const b = reconstruirLanceMinuto(entradaBase({minuto: 11, momentoMinuto: 0.4}));
    expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b));
  });
});

describe('reconstruirLanceMinuto — jogadores em campo', () => {
  it('todo toque é de um jogador que está em campo no minuto', () => {
    const emCampoIds = new Set([
      ...lado('c').map(j => j.id),
      ...lado('f').map(j => j.id),
    ]);
    const casos = [
      entradaBase({momentoMinuto: 0.7}),
      entradaBase({momentoMinuto: -0.7}),
      entradaBase({chutesDoMinuto: [chuteFixture()]}),
      entradaBase({eventosDoMinuto: [eventoFixture()]}),
    ];
    for (const entrada of casos) {
      const lance = reconstruirLanceMinuto(entrada);
      expect(lance).not.toBeNull();
      for (const toque of lance?.toques ?? []) {
        expect(emCampoIds.has(toque.jogadorId)).toBe(true);
      }
    }
  });

  it('sem jogadores em campo para a posse ⇒ null', () => {
    expect(
      reconstruirLanceMinuto(
        entradaBase({momentoMinuto: 0.9, emCampoCasa: []}),
      ),
    ).toBeNull();
  });
});

describe('reconstruirLanceMinuto — âncora no evento real', () => {
  it('chute do minuto: quem finaliza é o autor REAL, no ponto REAL do ledger', () => {
    const chute = chuteFixture({resultado: 'defesa'});
    const lance = reconstruirLanceMinuto(
      entradaBase({chutesDoMinuto: [chute]}),
    );
    expect(lance?.timeId).toBe(CASA);
    const final = lance?.toques[lance.toques.length - 1];
    expect(final?.tipo).toBe('finalizacao');
    expect(final?.jogadorId).toBe(chute.jogadorId);
    // Mesma projeção do mapa de chutes: terço de ataque → campo horizontal.
    const esperado = paraCampoHorizontal({x: chute.x, y: chute.y * 0.33}, true);
    expect(final?.x).toBeCloseTo(esperado.x, 10);
    expect(final?.y).toBeCloseTo(esperado.y, 10);
  });

  it('gol: o lance termina na rede com o autor real; assistente real participa', () => {
    const chute = chuteFixture({
      resultado: 'gol',
      jogadorId: 'c_9',
      assistenciaId: 'c_7',
      golX: 0.5,
    });
    const lance = reconstruirLanceMinuto(
      entradaBase({chutesDoMinuto: [chute]}),
    );
    const toques = lance?.toques ?? [];
    const final = toques[toques.length - 1];
    expect(final?.tipo).toBe('gol');
    expect(final?.jogadorId).toBe('c_9');
    // Casa ataca para a direita: a rede fica na ponta direita do radar.
    expect(final?.x).toBe(1);
    const finalizacao = toques[toques.length - 2];
    expect(finalizacao?.tipo).toBe('finalizacao');
    expect(finalizacao?.jogadorId).toBe('c_9');
    expect(toques.some(t => t.tipo === 'assistencia' && t.jogadorId === 'c_7')).toBe(
      true,
    );
  });

  it('gol contra: o toque final é do DEFENSOR real, creditado ao time dele', () => {
    const chute = chuteFixture({
      resultado: 'gol',
      timeId: CASA,
      jogadorId: 'f_3',
      golContra: true,
    });
    const lance = reconstruirLanceMinuto(
      entradaBase({chutesDoMinuto: [chute]}),
    );
    expect(lance?.timeId).toBe(CASA);
    const final = lance?.toques[lance.toques.length - 1];
    expect(final?.tipo).toBe('gol_contra');
    expect(final?.jogadorId).toBe('f_3');
    expect(final?.timeId).toBe(FORA);
  });

  it('cartão sem chute: a posse é do adversário e o lance para na falta', () => {
    const lance = reconstruirLanceMinuto(
      entradaBase({eventosDoMinuto: [eventoFixture({timeId: FORA})]}),
    );
    expect(lance?.timeId).toBe(CASA);
    const final = lance?.toques[lance.toques.length - 1];
    expect(final?.tipo).toBe('falta_sofrida');
    for (const toque of lance?.toques ?? []) {
      expect(toque.timeId).toBe(CASA);
      expect(toque.jogadorId.startsWith('c_')).toBe(true);
    }
  });
});

describe('reconstruirLanceMinuto — posse pelo momento real', () => {
  it('momento positivo dá a bola à casa; negativo, ao visitante', () => {
    expect(
      reconstruirLanceMinuto(entradaBase({momentoMinuto: 0.5}))?.timeId,
    ).toBe(CASA);
    expect(
      reconstruirLanceMinuto(entradaBase({momentoMinuto: -0.5}))?.timeId,
    ).toBe(FORA);
  });

  it('momento mais forte circula a bola mais fundo no campo adversário', () => {
    // Mesma seed/minuto ⇒ mesmos jogadores e jitter; só a profundidade-alvo
    // muda com |momento| — todo toque desloca para o gol adversário.
    const fraco = reconstruirLanceMinuto(entradaBase({momentoMinuto: 0.1}));
    const forte = reconstruirLanceMinuto(entradaBase({momentoMinuto: 0.9}));
    const media = (toques: Array<{x: number}>): number =>
      toques.reduce((s, t) => s + t.x, 0) / toques.length;
    expect(media(forte?.toques ?? [])).toBeGreaterThan(
      media(fraco?.toques ?? []),
    );
  });

  it('minuto sem evento termina em recepção (reciclagem neutra de posse)', () => {
    const lance = reconstruirLanceMinuto(entradaBase({momentoMinuto: 0.3}));
    expect(lance?.toques[lance.toques.length - 1].tipo).toBe('recepcao');
  });
});

describe('geometria compartilhada', () => {
  it('paraCampoHorizontal: linha do gol adversário da casa é a ponta direita', () => {
    expect(paraCampoHorizontal({x: 0.5, y: 0}, true)).toEqual({x: 1, y: 0.5});
    expect(paraCampoHorizontal({x: 0.5, y: 0}, false)).toEqual({x: 0, y: 0.5});
  });

  it('coordenadaBasePosicao devolve cópia (não expõe a tabela interna)', () => {
    const a = coordenadaBasePosicao('CA');
    a.x = 99;
    expect(coordenadaBasePosicao('CA').x).not.toBe(99);
  });
});
