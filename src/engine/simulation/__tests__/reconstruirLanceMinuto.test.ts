/**
 * reconstruirLanceMinuto — contrato da reconstrução derivada do lance de um
 * minuto: determinismo por seed real + minuto, toques só de jogadores em
 * campo, evento real sempre ancorado no fim (autor real do gol finaliza) e
 * posse guiada pelo momento real.
 */
import type {ChutePartida, EventoPartida, Position} from '../../../types';

import {
  coordenadaBasePosicao,
  fimDoLance,
  paraCampoHorizontal,
  posicaoJogadorNoMinuto,
  posicionarElencosMinuto,
  reconstruirLanceMinuto,
  type EntradaLanceMinuto,
  type FimLanceMinuto,
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
    // A falta acontece ONDE o punido (f_2, ZAG) está no radar neste minuto.
    const punido = lado('f')[2];
    const esperado = posicaoJogadorNoMinuto(123_456, 10, 0, punido, false);
    expect(final?.x).toBeCloseTo(esperado.x, 10);
    expect(final?.y).toBeCloseTo(esperado.y, 10);
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

  it('minuto sem evento termina em recepção ou drible (posse viva, nunca no ar)', () => {
    const lance = reconstruirLanceMinuto(entradaBase({momentoMinuto: 0.3}));
    expect(['recepcao', 'drible']).toContain(
      lance?.toques[lance.toques.length - 1].tipo,
    );
  });
});

describe('posicionarElencosMinuto — os 22 pontos do radar', () => {
  it('posiciona os dois elencos inteiros, com goleiro sinalizado', () => {
    const elencos = posicionarElencosMinuto(entradaBase());
    expect(elencos.casa).toHaveLength(11);
    expect(elencos.fora).toHaveLength(11);
    expect(elencos.casa.filter(p => p.goleiro).map(p => p.id)).toEqual(['c_0']);
    expect(elencos.fora.filter(p => p.goleiro).map(p => p.id)).toEqual(['f_0']);
    // Goleiros perto do gol que defendem: casa à esquerda, visitante à direita.
    expect(elencos.casa[0].x).toBeLessThan(0.15);
    expect(elencos.fora[0].x).toBeGreaterThan(0.85);
  });

  it('é determinístico e muda com o minuto (micro-drift por seed+minuto)', () => {
    const a = posicionarElencosMinuto(entradaBase({minuto: 10}));
    const b = posicionarElencosMinuto(entradaBase({minuto: 10}));
    const c = posicionarElencosMinuto(entradaBase({minuto: 11}));
    expect(a).toEqual(b);
    expect(JSON.stringify(a)).not.toEqual(JSON.stringify(c));
  });

  it('ancora no slot REAL da formação quando ele existe', () => {
    // Atacante da casa escalado bem adiantado (y=0.9 na convenção da tática):
    // o ponto dele no radar fica colado no gol adversário (direita).
    const casa = lado('c').map((j, i) =>
      i === 10 ? {...j, ancora: {x: 0.5, y: 0.9}} : j,
    );
    const elencos = posicionarElencosMinuto(
      entradaBase({emCampoCasa: casa, momentoMinuto: 0}),
    );
    expect(elencos.casa[10].x).toBeGreaterThan(0.84);
  });

  it('o bloco desliza com o momento: quem pressiona sobe, quem apanha recua', () => {
    const neutro = posicionarElencosMinuto(entradaBase({momentoMinuto: 0}));
    const pressao = posicionarElencosMinuto(entradaBase({momentoMinuto: 0.9}));
    // Linha da casa sobe (x maior) e a do visitante recua (x maior também —
    // empurrada para o próprio gol, à direita). Drift idêntico (mesma seed).
    const zagueiroCasa = 2;
    const zagueiroFora = 2;
    expect(pressao.casa[zagueiroCasa].x).toBeGreaterThan(
      neutro.casa[zagueiroCasa].x,
    );
    expect(pressao.fora[zagueiroFora].x).toBeGreaterThan(
      neutro.fora[zagueiroFora].x,
    );
  });

  it('os toques de construção do lance caem SOBRE os pontos visíveis', () => {
    const entrada = entradaBase({momentoMinuto: 0.4});
    const lance = reconstruirLanceMinuto(entrada);
    const elencos = posicionarElencosMinuto(entrada);
    const pontos = new Map(
      [...elencos.casa, ...elencos.fora].map(p => [p.id, p]),
    );
    // Só a CONSTRUÇÃO fica presa aos pontos; drible/desfechos/transições
    // ancoram na bola/no fato (drible avança, chute vai ao ponto real).
    const construcao = (lance?.toques ?? []).filter(t =>
      ['passe', 'conducao', 'recepcao'].includes(t.tipo),
    );
    expect(construcao.length).toBeGreaterThan(0);
    for (const toque of construcao) {
      const ponto = pontos.get(toque.jogadorId);
      expect(ponto).toBeDefined();
      expect(toque.x).toBeCloseTo(ponto?.x ?? -1, 10);
      expect(toque.y).toBeCloseTo(ponto?.y ?? -1, 10);
    }
  });
});

describe('reconstruirLanceMinuto — continuidade entre minutos', () => {
  const fimCasa: FimLanceMinuto = {
    timeId: CASA,
    jogadorId: 'c_7',
    tipoUltimoToque: 'recepcao',
    x: 0.61,
    y: 0.42,
  };

  it('mesma posse: o portador anterior abre o lance de ONDE parou (sem teleporte)', () => {
    const lance = reconstruirLanceMinuto(
      entradaBase({momentoMinuto: 0.5, lanceAnterior: fimCasa}),
    );
    expect(lance?.timeId).toBe(CASA);
    const primeiro = lance?.toques[0];
    expect(primeiro?.jogadorId).toBe('c_7');
    expect(primeiro?.x).toBe(0.61);
    expect(primeiro?.y).toBe(0.42);
    expect(['passe', 'conducao']).toContain(primeiro?.tipo);
  });

  it('posse TROCOU: jogador real do novo time toma a bola ali (desarme visível)', () => {
    const lance = reconstruirLanceMinuto(
      entradaBase({momentoMinuto: -0.5, lanceAnterior: fimCasa}),
    );
    expect(lance?.timeId).toBe(FORA);
    const primeiro = lance?.toques[0];
    expect(['desarme', 'interceptacao']).toContain(primeiro?.tipo);
    expect(primeiro?.timeId).toBe(FORA);
    expect(primeiro?.jogadorId.startsWith('f_')).toBe(true);
    expect(primeiro?.x).toBe(0.61);
    expect(primeiro?.y).toBe(0.42);
  });

  it('após finalização, a defesa RECUPERA (não "desarma" um chute)', () => {
    const fimChute: FimLanceMinuto = {
      ...fimCasa,
      tipoUltimoToque: 'finalizacao',
      x: 0.9,
      y: 0.5,
    };
    const lance = reconstruirLanceMinuto(
      entradaBase({momentoMinuto: -0.5, lanceAnterior: fimChute}),
    );
    expect(lance?.toques[0]?.tipo).toBe('recuperacao');
    expect(lance?.toques[0]?.timeId).toBe(FORA);
  });

  it('momento equilibrado: quem TINHA a bola segue com ela', () => {
    const lance = reconstruirLanceMinuto(
      entradaBase({momentoMinuto: 0, lanceAnterior: fimCasa}),
    );
    expect(lance?.timeId).toBe(CASA);
  });

  it('fimDoLance encadeia o próximo minuto; gol devolve null (saída de bola)', () => {
    const lance = reconstruirLanceMinuto(entradaBase({momentoMinuto: 0.5}));
    const fim = lance ? fimDoLance(lance) : null;
    expect(fim?.timeId).toBe(CASA);
    expect(fim?.jogadorId).toBe(
      lance?.toques[lance.toques.length - 1].jogadorId,
    );
    const golLance = reconstruirLanceMinuto(
      entradaBase({chutesDoMinuto: [chuteFixture({resultado: 'gol'})]}),
    );
    expect(golLance ? fimDoLance(golLance) : undefined).toBeNull();
  });
});

describe('reconstruirLanceMinuto — vocabulário de ações', () => {
  it('escanteio real: cobrado do CANTO pelo garçom real, chute no ponto real', () => {
    const chute = chuteFixture({
      situacao: 'escanteio',
      corpo: 'cabeca',
      assistenciaId: 'c_8',
      x: 0.7,
      y: 0.1,
    });
    const lance = reconstruirLanceMinuto(
      entradaBase({chutesDoMinuto: [chute]}),
    );
    const escanteio = lance?.toques[0];
    expect(escanteio?.tipo).toBe('escanteio');
    expect(escanteio?.jogadorId).toBe('c_8');
    // Canto do ataque da casa: quina direita do radar.
    expect(escanteio?.x).toBeGreaterThan(0.95);
    expect(Math.min(escanteio?.y ?? 0.5, 1 - (escanteio?.y ?? 0.5))).toBeLessThan(
      0.05,
    );
    const final = lance?.toques.find(t => t.tipo === 'finalizacao');
    const esperado = paraCampoHorizontal({x: 0.7, y: 0.1 * 0.33}, true);
    expect(final?.x).toBeCloseTo(esperado.x, 10);
    expect(final?.y).toBeCloseTo(esperado.y, 10);
  });

  it('cabeçada em jogo corrido chega por CRUZAMENTO da faixa lateral', () => {
    const chute = chuteFixture({
      corpo: 'cabeca',
      situacao: 'jogo_aberto',
      assistenciaId: 'c_8',
    });
    const lance = reconstruirLanceMinuto(
      entradaBase({chutesDoMinuto: [chute]}),
    );
    const cruzamento = lance?.toques.find(t => t.tipo === 'cruzamento');
    expect(cruzamento?.jogadorId).toBe('c_8');
    // Faixa ofensiva da casa, colado numa das laterais.
    expect(cruzamento?.x).toBeGreaterThanOrEqual(0.62);
    expect(
      Math.min(cruzamento?.y ?? 0.5, 1 - (cruzamento?.y ?? 0.5)),
    ).toBeLessThanOrEqual(0.08);
  });

  it('chute termina no ponto real MESMO com transição de desarme no início', () => {
    const chute = chuteFixture();
    const lance = reconstruirLanceMinuto(
      entradaBase({
        chutesDoMinuto: [chute],
        lanceAnterior: {
          timeId: FORA,
          jogadorId: 'f_6',
          tipoUltimoToque: 'recepcao',
          x: 0.4,
          y: 0.5,
        },
      }),
    );
    expect(['desarme', 'interceptacao']).toContain(lance?.toques[0]?.tipo);
    const final = lance?.toques.find(t => t.tipo === 'finalizacao');
    const esperado = paraCampoHorizontal({x: chute.x, y: chute.y * 0.33}, true);
    expect(final?.x).toBeCloseTo(esperado.x, 10);
    expect(final?.y).toBeCloseTo(esperado.y, 10);
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
