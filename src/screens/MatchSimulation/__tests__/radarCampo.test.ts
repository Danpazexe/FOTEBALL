/**
 * radarCampo — mapeamentos PUROS do Radar da Partida: momento→zona de pressão,
 * chute/passo→ponto no campo horizontal e evento→ponto (coordenada real do
 * ledger quando existe; zona de pressão do minuto quando a engine não produz
 * coordenada). Nada de dado inventado: os testes fixam esse contrato.
 */
import {
  pontoChuteNoRadar,
  pontoEventoNoRadar,
  pontoPassoNoRadar,
  resumoRadar,
  zonaPressao,
} from '../radarCampo';

describe('zonaPressao', () => {
  it('sem amostras: centro do campo, sem pressão, jogo neutro', () => {
    expect(zonaPressao([])).toEqual({x: 0.5, intensidade: 0, lado: 'neutro'});
  });

  it('momento positivo (casa pressiona) desloca a zona para o campo do visitante', () => {
    const zona = zonaPressao([0.6, 0.6, 0.6]);
    expect(zona.lado).toBe('casa');
    expect(zona.x).toBeGreaterThan(0.5);
    expect(zona.intensidade).toBeCloseTo(0.6, 5);
  });

  it('momento negativo (visitante pressiona) desloca para o campo da casa', () => {
    const zona = zonaPressao([-0.8, -0.8, -0.8]);
    expect(zona.lado).toBe('fora');
    expect(zona.x).toBeLessThan(0.5);
  });

  it('momento fraco fica dentro do limiar neutro', () => {
    expect(zonaPressao([0.02, 0.03, 0.01]).lado).toBe('neutro');
  });

  it('suaviza pró-recente: o último minuto pesa mais que os anteriores', () => {
    // Pesos 1,2,3 → (0·1 + 0·2 + 1·3)/6 = 0.5 (metade do valor cru do último).
    const zona = zonaPressao([0, 0, 1]);
    expect(zona.lado).toBe('casa');
    expect(zona.x).toBeCloseTo(0.5 + 0.5 * 0.38, 5);
  });

  it('momento máximo (±1) mantém a zona dentro do campo', () => {
    expect(zonaPressao([1, 1, 1]).x).toBeCloseTo(0.88, 5);
    expect(zonaPressao([-1, -1, -1]).x).toBeCloseTo(0.12, 5);
  });

  it('respeita a janela: só as últimas amostras contam', () => {
    expect(zonaPressao([1, 1, 1, -1], 1).lado).toBe('fora');
  });
});

describe('pontoPassoNoRadar (campo inteiro, ataque para cima → horizontal)', () => {
  it('casa ataca para a DIREITA: linha do gol adversário (y=0) vira x=1', () => {
    expect(pontoPassoNoRadar({x: 0.5, y: 0}, true)).toEqual({x: 1, y: 0.5});
    expect(pontoPassoNoRadar({x: 0.5, y: 1}, true)).toEqual({x: 0, y: 0.5});
  });

  it('visitante ataca para a ESQUERDA: linha do gol adversário vira x=0', () => {
    expect(pontoPassoNoRadar({x: 0.5, y: 0}, false)).toEqual({x: 0, y: 0.5});
    expect(pontoPassoNoRadar({x: 0.5, y: 1}, false)).toEqual({x: 1, y: 0.5});
  });

  it('lateral segue o atacante: esquerda da casa é o topo; do visitante, a base', () => {
    expect(pontoPassoNoRadar({x: 0, y: 0.5}, true)).toEqual({x: 0.5, y: 0});
    expect(pontoPassoNoRadar({x: 0, y: 0.5}, false)).toEqual({x: 0.5, y: 1});
  });

  it('coordenadas fora de 0..1 são limitadas antes de projetar', () => {
    expect(pontoPassoNoRadar({x: 2, y: -1}, true)).toEqual({x: 1, y: 1});
  });
});

describe('pontoChuteNoRadar (terço de ataque do ledger → campo inteiro)', () => {
  const CASA = 'clube_casa';

  it('chute da casa na linha do gol cai na ponta direita do radar', () => {
    const ponto = pontoChuteNoRadar({x: 0.5, y: 0, timeId: CASA}, CASA);
    expect(ponto).toEqual({x: 1, y: 0.5});
  });

  it('fundo do terço de ataque da casa fica a 33% do gol adversário', () => {
    const ponto = pontoChuteNoRadar({x: 0.5, y: 1, timeId: CASA}, CASA);
    expect(ponto.x).toBeCloseTo(1 - 0.33, 5);
  });

  it('chute do visitante espelha para o lado esquerdo', () => {
    const ponto = pontoChuteNoRadar({x: 0.5, y: 0, timeId: 'fora'}, CASA);
    expect(ponto).toEqual({x: 0, y: 0.5});
  });

  it('equivale ao passo de lance com y comprimido ao terço (0.33)', () => {
    const chute = {x: 0.3, y: 0.6, timeId: CASA};
    expect(pontoChuteNoRadar(chute, CASA)).toEqual(
      pontoPassoNoRadar({x: 0.3, y: 0.6 * 0.33}, true),
    );
  });
});

describe('pontoEventoNoRadar', () => {
  const CASA = 'clube_casa';
  const chutes = [
    {id: 'chute_1', x: 0.4, y: 0.2, timeId: CASA},
    {id: 'chute_2', x: 0.7, y: 0.5, timeId: 'clube_fora'},
  ];

  it('evento com chuteId usa a coordenada REAL do ledger', () => {
    const {ponto, coordenadaReal} = pontoEventoNoRadar(
      {tipo: 'bola_trave', minuto: 10, timeId: CASA, jogadorId: 'j1', chuteId: 'chute_1'},
      chutes,
      CASA,
      [0.5],
    );
    expect(coordenadaReal).toBe(true);
    expect(ponto).toEqual(pontoChuteNoRadar(chutes[0], CASA));
  });

  it('evento sem coordenada usa a posição NATURAL do jogador envolvido', () => {
    // Zagueiro da casa: defende a esquerda do radar — o cartão pinga no setor
    // dele, não numa coordenada inventada.
    const {ponto, coordenadaReal} = pontoEventoNoRadar(
      {tipo: 'cartao_amarelo', minuto: 3, timeId: CASA, jogadorId: 'zag_1'},
      chutes,
      CASA,
      [0.8, 0.8, 0.8],
      {zag_1: 'ZAG'},
    );
    expect(coordenadaReal).toBe(false);
    expect(ponto.x).toBeLessThan(0.5);
  });

  it('sem chute e sem posição conhecida cai na zona de pressão DO MINUTO', () => {
    // Momento era todo da casa até o minuto 3; depois virou — o cartão aos 3'
    // fica onde a pressão estava AOS 3', não onde está agora.
    const momentum = [0.8, 0.8, 0.8, -0.9, -0.9];
    const {ponto, coordenadaReal} = pontoEventoNoRadar(
      {tipo: 'cartao_amarelo', minuto: 3, timeId: CASA, jogadorId: 'sem_pos'},
      chutes,
      CASA,
      momentum,
    );
    expect(coordenadaReal).toBe(false);
    expect(ponto.y).toBe(0.5);
    expect(ponto.x).toEqual(zonaPressao(momentum.slice(0, 3)).x);
    expect(ponto.x).toBeGreaterThan(0.5);
  });

  it('chuteId sem par no ledger degrada honestamente (nunca inventa ponto real)', () => {
    const {coordenadaReal} = pontoEventoNoRadar(
      {tipo: 'chance_perdida', minuto: 1, timeId: CASA, jogadorId: 'x', chuteId: 'nao_existe'},
      chutes,
      CASA,
      [],
    );
    expect(coordenadaReal).toBe(false);
  });

  it('minuto 0 (sem momento produzido, jogador desconhecido) fica no centro', () => {
    const {ponto} = pontoEventoNoRadar(
      {tipo: 'substituicao', minuto: 0, timeId: CASA, jogadorId: 'x'},
      chutes,
      CASA,
      [0.9],
    );
    expect(ponto).toEqual({x: 0.5, y: 0.5});
  });
});

describe('resumoRadar (accessibilityLabel)', () => {
  it('nomeia quem pressiona com a posse do próprio time', () => {
    expect(resumoRadar('Flamengo', 'Grêmio', 62, 'casa')).toBe(
      'Pressão do Flamengo, 62% de posse',
    );
    expect(resumoRadar('Flamengo', 'Grêmio', 62, 'fora')).toBe(
      'Pressão do Grêmio, 38% de posse',
    );
  });

  it('jogo neutro informa equilíbrio com a posse da casa', () => {
    expect(resumoRadar('Flamengo', 'Grêmio', 50, 'neutro')).toBe(
      'Jogo equilibrado, Flamengo com 50% de posse',
    );
  });
});
