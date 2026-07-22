/**
 * mundoRadar — contrato do WORLDSTATE ÚNICO do radar: derivador puro e
 * determinístico (mesma entrada ⇒ mesma saída), destaques inteligentes presos
 * aos limiares exportados (janela de ícones, pressão sustentada, zona
 * perigosa), física via cortes reais do rodízio e continuidade minuto a
 * minuto (o fim do lance de um minuto é a entrada do próximo).
 */
import {criarPlayer} from '../../../testing/fixtures';
import type {FimLanceMinuto, JogadorEmCampoLance} from '../../../engine/simulation/reconstruirLanceMinuto';
import type {ChutePartida, EventoPartida, Position} from '../../../types';
import {
  JANELA_ICONES_MIN,
  PRESSAO_SUSTENTADA_LIMIAR,
  PRESSAO_SUSTENTADA_MIN,
  ZONA_PERIGO_MIN_CHUTES,
  derivarAlertaPressao,
  derivarMundoRadar,
  derivarZonasPerigo,
  duracoesDosToques,
  type EntradaMundoRadar,
} from '../mundoRadar';

const CASA = 'clube_casa';
const FORA = 'clube_fora';

const POSICOES_433: Position[] = [
  'GOL', 'LD', 'ZAG', 'ZAG', 'LE', 'VOL', 'MC', 'MEI', 'PD', 'CA', 'PE',
];

function lado(prefixo: string): JogadorEmCampoLance[] {
  return POSICOES_433.map((posicao, i) => ({id: `${prefixo}_${i}`, posicao}));
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

function entradaBase(extra?: Partial<EntradaMundoRadar>): EntradaMundoRadar {
  return {
    seedPartida: 123_456,
    minuto: 10,
    momentum: [0.1, 0.2, 0.1, 0.2],
    posseCasa: 55,
    timeCasaId: CASA,
    timeForaId: FORA,
    ladoUsuario: 'casa',
    emCampoCasa: lado('c'),
    emCampoFora: lado('f'),
    eventos: [],
    chutes: [],
    eventosDoMinuto: [],
    chutesDoMinuto: [],
    lanceAnterior: null,
    posicoes: {},
    jogadoresUsuario: [],
    ...extra,
  };
}

describe('derivarMundoRadar — pureza e determinismo', () => {
  it('mesma entrada ⇒ exatamente o mesmo mundo (sem sorteio fora da seed)', () => {
    const a = derivarMundoRadar(entradaBase());
    const b = derivarMundoRadar(entradaBase());
    expect(a).toEqual(b);
  });

  it('não muta a entrada (derivador puro)', () => {
    const entrada = entradaBase({
      chutes: [chuteFixture()],
      eventos: [eventoFixture()],
      momentum: [0.1, 0.2],
    });
    const copia = JSON.parse(JSON.stringify(entrada)) as EntradaMundoRadar;
    derivarMundoRadar(entrada);
    expect(entrada).toEqual(copia);
  });

  it('entrega o quadro completo: 22 pontos, lance, posse e pressão', () => {
    const mundo = derivarMundoRadar(entradaBase({posseCasa: 62}));
    expect(mundo.elencos.casa).toHaveLength(11);
    expect(mundo.elencos.fora).toHaveLength(11);
    expect(mundo.lance).not.toBeNull();
    expect(mundo.posse).toEqual({casa: 62, fora: 38});
    expect(mundo.pressao.x).toBeGreaterThan(0.5); // momento pró-casa
  });
});

describe('destaque — ícones de evento respeitam JANELA_ICONES_MIN', () => {
  it('evento dentro da janela pinga ícone; mais velho que a janela expira', () => {
    const minuto = 30;
    const dentro = eventoFixture({minuto: minuto - JANELA_ICONES_MIN});
    const fora = eventoFixture({minuto: minuto - JANELA_ICONES_MIN - 1});
    const soDentro = derivarMundoRadar(
      entradaBase({minuto, eventos: [dentro]}),
    );
    const soFora = derivarMundoRadar(entradaBase({minuto, eventos: [fora]}));
    expect(soDentro.iconesEvento).toHaveLength(1);
    expect(soDentro.iconesEvento[0].tipo).toBe('cartao_amarelo');
    expect(soFora.iconesEvento).toHaveLength(0);
  });

  it('gol NÃO vira ícone (tem dot persistente + replay próprios)', () => {
    const mundo = derivarMundoRadar(
      entradaBase({eventos: [eventoFixture({tipo: 'gol', minuto: 9})]}),
    );
    expect(mundo.iconesEvento).toHaveLength(0);
  });
});

describe('destaque — zona perigosa por chutes REAIS (ZONA_PERIGO_MIN_CHUTES)', () => {
  // Dois chutes da casa na MESMA célula da grade (pontos próximos no radar).
  const dupla = [
    chuteFixture({id: 'a', x: 0.6, y: 0.4}),
    chuteFixture({id: 'b', x: 0.65, y: 0.5}),
  ];

  it('abaixo do mínimo de chutes na célula não há mancha', () => {
    expect(derivarZonasPerigo([dupla[0]], CASA)).toHaveLength(0);
    expect(ZONA_PERIGO_MIN_CHUTES).toBeGreaterThan(1);
  });

  it('célula com o mínimo de chutes vira mancha no centroide, intensidade n/5', () => {
    const zonas = derivarZonasPerigo(dupla, CASA);
    expect(zonas).toHaveLength(1);
    expect(zonas[0].ladoCasa).toBe(true);
    expect(zonas[0].intensidade).toBeCloseTo(2 / 5, 10);
    // Centroide dos dois pontos projetados (mesma régua do shotmap).
    expect(zonas[0].x).toBeGreaterThan(0.8);
    expect(zonas[0].y).toBeCloseTo(0.625, 10);
  });

  it('gol anulado pelo VAR não conta para a mancha', () => {
    const comAnulado = [
      dupla[0],
      chuteFixture({id: 'b', x: 0.65, y: 0.5, resultado: 'gol_anulado'}),
    ];
    expect(derivarZonasPerigo(comAnulado, CASA)).toHaveLength(0);
  });

  it('o mundo expõe as mesmas zonas do derivador isolado', () => {
    const mundo = derivarMundoRadar(entradaBase({chutes: dupla}));
    expect(mundo.zonasPerigo).toEqual(derivarZonasPerigo(dupla, CASA));
  });
});

describe('destaque — pressão sustentada (PRESSAO_SUSTENTADA_*)', () => {
  const acima = PRESSAO_SUSTENTADA_LIMIAR + 0.05;
  const sustentadaCasa = Array.from(
    {length: PRESSAO_SUSTENTADA_MIN},
    () => acima,
  );

  it('N minutos seguidos acima do limiar para o mesmo lado disparam o alerta', () => {
    expect(derivarAlertaPressao(sustentadaCasa, 'casa')).toEqual({
      lado: 'casa',
      doAdversario: false,
    });
    expect(derivarAlertaPressao(sustentadaCasa.map(m => -m), 'casa')).toEqual({
      lado: 'fora',
      doAdversario: true,
    });
  });

  it('uma única amostra abaixo do limiar quebra a sequência (sem alerta)', () => {
    const quebrada = [...sustentadaCasa];
    quebrada[1] = PRESSAO_SUSTENTADA_LIMIAR - 0.01;
    expect(derivarAlertaPressao(quebrada, 'casa')).toBeNull();
  });

  it('série mais curta que a janela nunca alerta', () => {
    expect(
      derivarAlertaPressao(sustentadaCasa.slice(1), 'casa'),
    ).toBeNull();
  });

  it('doAdversario segue o LADO DO USUÁRIO no mundo derivado', () => {
    const mundo = derivarMundoRadar(
      entradaBase({momentum: sustentadaCasa, ladoUsuario: 'fora'}),
    );
    expect(mundo.alertaPressao).toEqual({lado: 'casa', doAdversario: true});
  });
});

describe('destaque — jogador no vermelho (cortes reais do fisicoEngine)', () => {
  it('lista só quem cruza os cortes do rodízio (prontidão/risco)', () => {
    const fresco = criarPlayer({
      id: 'u_fresco',
      condicaoFisica: 100,
      fisico: {cargaAguda: 0, cargaCronica: 60, ritmo: 90},
    });
    const exausto = criarPlayer({
      id: 'u_exausto',
      condicaoFisica: 40,
      fisico: {cargaAguda: 90, cargaCronica: 30, ritmo: 30},
    });
    const mundo = derivarMundoRadar(
      entradaBase({jogadoresUsuario: [fresco, exausto]}),
    );
    expect(mundo.jogadoresNoVermelho).toEqual(['u_exausto']);
  });
});

describe('destaque — linhas derivadas dos pontos visíveis', () => {
  it('linha de impedimento = último defensor DE LINHA adversário (sem goleiro)', () => {
    const mundo = derivarMundoRadar(entradaBase({ladoUsuario: 'casa'}));
    const linhaFora = mundo.elencos.fora.filter(p => !p.goleiro);
    // Visitante defende a direita: o último defensor é o de MAIOR x.
    expect(mundo.linhaImpedimento).toBe(
      Math.max(...linhaFora.map(p => p.x)),
    );
    const mundoFora = derivarMundoRadar(entradaBase({ladoUsuario: 'fora'}));
    const linhaCasa = mundoFora.elencos.casa.filter(p => !p.goleiro);
    expect(mundoFora.linhaImpedimento).toBe(
      Math.min(...linhaCasa.map(p => p.x)),
    );
  });

  it('linha defensiva do usuário: defesa mais recuada que o meio, compactação = distância', () => {
    const mundo = derivarMundoRadar(entradaBase({ladoUsuario: 'casa'}));
    const linha = mundo.linhaDefensiva;
    expect(linha).not.toBeNull();
    // Casa defende a esquerda: a última linha tem x menor que o meio.
    expect(linha?.xDefesa).toBeLessThan(linha?.xMeio ?? -1);
    expect(linha?.compactacao).toBeCloseTo(
      Math.abs((linha?.xMeio ?? 0) - (linha?.xDefesa ?? 0)),
      10,
    );
  });

  it('com menos de 8 jogadores de linha não há linha (sem inventar)', () => {
    const poucos = lado('c').slice(0, 8); // GOL + 7 de linha
    const mundo = derivarMundoRadar(entradaBase({emCampoCasa: poucos}));
    expect(mundo.linhaDefensiva).toBeNull();
  });
});

describe('continuidade — o fim de um minuto é a entrada do próximo', () => {
  it('gol no minuto N ⇒ fim com saída do centro; o minuto N+1 recomeça do círculo central', () => {
    const mundoGol = derivarMundoRadar(
      entradaBase({
        minuto: 10,
        chutesDoMinuto: [chuteFixture({resultado: 'gol'})],
      }),
    );
    const fim = mundoGol.fim;
    expect(fim?.reinicio).toBe('saida_centro');
    expect(fim?.timeId).toBe(FORA); // quem SOFREU repõe
    const mundoSeguinte = derivarMundoRadar(
      entradaBase({minuto: 11, momentum: [0.1, 0.5], lanceAnterior: fim}),
    );
    const primeiro = mundoSeguinte.lance?.toques[0];
    expect(primeiro?.timeId).toBe(FORA);
    expect(primeiro?.x).toBe(0.5);
    expect(primeiro?.y).toBe(0.5);
  });

  it('minuto sem lance preserva o fim anterior (a continuidade nunca se perde)', () => {
    const anterior: FimLanceMinuto = {
      timeId: CASA,
      jogadorId: 'c_7',
      tipoUltimoToque: 'recepcao',
      x: 0.61,
      y: 0.42,
      reinicio: 'nenhum',
    };
    const mundo = derivarMundoRadar(
      entradaBase({
        emCampoCasa: [],
        emCampoFora: [],
        lanceAnterior: anterior,
      }),
    );
    expect(mundo.lance).toBeNull();
    expect(mundo.fim).toEqual(anterior);
  });

  it('dots de chute persistem com idade em minutos; gol anulado não pinga', () => {
    const mundo = derivarMundoRadar(
      entradaBase({
        minuto: 30,
        chutes: [
          chuteFixture({id: 'velho', minuto: 5}),
          chuteFixture({id: 'anulado', minuto: 20, resultado: 'gol_anulado'}),
        ],
      }),
    );
    expect(mundo.dotsChute.map(d => d.id)).toEqual(['velho']);
    expect(mundo.dotsChute[0].idade).toBe(25);
  });
});

describe('duracoesDosToques — cadência preenche o minuto do relógio', () => {
  it('a soma das durações cobre o tempo do minuto na tela', () => {
    const duracoes = duracoesDosToques(['passe', 'finalizacao'], 900);
    expect(duracoes.reduce((s, d) => s + d, 0)).toBe(900);
    // Chute pesa metade de um passe: é o segmento mais curto.
    expect(duracoes[1]).toBeLessThan(duracoes[0]);
  });

  it('nunca desce do piso por segmento e lida com lista vazia', () => {
    expect(duracoesDosToques([], 900)).toEqual([]);
    const apertado = duracoesDosToques(['passe', 'passe', 'passe'], 10);
    for (const d of apertado) {
      expect(d).toBeGreaterThanOrEqual(16);
    }
  });
});
