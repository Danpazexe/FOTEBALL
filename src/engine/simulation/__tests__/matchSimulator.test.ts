import type {Clube, Formacao, Player, Position, Tatica} from '../../../types';

import {disputarPenaltis, simularPartida} from '../matchSimulator';
import {criarRNGComSeed} from '../rng';

const posicoes433: Position[] = [
  'GOL',
  'LD',
  'ZAG',
  'ZAG',
  'LE',
  'VOL',
  'MC',
  'MEI',
  'PD',
  'CA',
  'PE',
];

const tatica: Tatica = {
  estiloOfensivo: 'Equilibrado',
  marcacao: 'Zona',
  linhaDefensiva: 'Normal',
  ritmo: 'Normal',
};

function criarJogadores(prefixo: string, overall: number): Player[] {
  return posicoes433.map((posicao, index) => ({
    id: `${prefixo}_${index}`,
    nome: `${prefixo} ${index}`,
    idade: 26,
    nacionalidade: 'Brazil',
    posicaoPrincipal: posicao,
    posicoesSecundarias: [],
    pernaDominante: 'D',
    atributos: {
      finalizacao: overall,
      passe: overall,
      marcacao: overall,
      desarme: overall,
      velocidade: overall,
      resistencia: overall,
      forca: overall,
      reflexos: overall,
      posicionamento: overall,
      drible: overall,
      cabeceio: overall,
      cruzamento: overall,
    },
    overall,
    potencial: overall,
    condicaoFisica: 100,
    moral: 70,
    forma: 0,
    valorMercado: 1000000,
    salario: 10000,
    contratoAte: '2028-12-31',
    clubeId: prefixo,
    lesionado: false,
    diasLesao: 0,
    suspenso: false,
    jogosSuspensao: 0,
    estatisticasTemporada: {
      temporada: '2026',
      jogos: 0,
      gols: 0,
      assistencias: 0,
      cartoesAmarelos: 0,
      cartoesVermelhos: 0,
      notaMedia: 0,
    },
    historicoTemporadas: [],
  }));
}

function criarFormacao(jogadores: Player[]): Formacao {
  return {
    tipo: '4-3-3',
    titulares: jogadores.map((jogador, index) => ({
      jogadorId: jogador.id,
      posicao: posicoes433[index] ?? jogador.posicaoPrincipal,
    })),
    reservas: [],
  };
}

function criarClube(id: string, jogadores: Player[]): Clube {
  return {
    id,
    nome: id,
    sigla: id.slice(0, 3).toUpperCase(),
    cidade: '',
    estado: '',
    fundacao: null,
    elenco: jogadores.map(jogador => jogador.id),
    formacaoAtual: criarFormacao(jogadores),
    taticaAtual: tatica,
    financas: {
      saldo: 5000000,
      receitaMensal: {
        bilheteria: 0,
        patrocinio: 0,
        premiacoes: 0,
        vendaJogadores: 0,
      },
      despesaMensal: {
        salarios: 0,
        manutencaoEstadio: 0,
        comissoes: 0,
        contratacoes: 0,
      },
      patrocinadores: [],
      historicoTransacoes: [],
    },
    estadio: {
      nome: `Estádio ${id}`,
      capacidade: 30000,
      precoMedioIngresso: 40,
      nivelInfraestrutura: 3,
    },
    reputacao: 50,
    controladoPorIA: true,
  };
}

function simularSerie(overallCasa: number, overallFora: number, total = 1000) {
  const jogadoresCasa = criarJogadores('casa', overallCasa);
  const jogadoresFora = criarJogadores('fora', overallFora);
  const timeCasa = criarClube('casa', jogadoresCasa);
  const timeFora = criarClube('fora', jogadoresFora);

  return Array.from({length: total}, (_, index) =>
    simularPartida({
      timeCasa,
      timeFora,
      jogadoresCasa,
      jogadoresFora,
      seed: index + 1,
    }),
  );
}

describe('simularPartida', () => {
  it('is deterministic with the same seed', () => {
    const jogadoresCasa = criarJogadores('casa', 75);
    const jogadoresFora = criarJogadores('fora', 75);
    const timeCasa = criarClube('casa', jogadoresCasa);
    const timeFora = criarClube('fora', jogadoresFora);
    const input = {
      timeCasa,
      timeFora,
      jogadoresCasa,
      jogadoresFora,
      seed: 123,
    };

    expect(simularPartida(input)).toEqual(simularPartida(input));
  });

  it('keeps equal teams near a home advantage distribution', () => {
    const partidas = simularSerie(75, 75);
    const casa = partidas.filter(
      partida => (partida.placarCasa ?? 0) > (partida.placarFora ?? 0),
    ).length;
    const empate = partidas.filter(
      partida => partida.placarCasa === partida.placarFora,
    ).length;
    const fora = partidas.length - casa - empate;

    expect(casa / partidas.length).toBeGreaterThanOrEqual(0.4);
    expect(casa / partidas.length).toBeLessThanOrEqual(0.56);
    expect(empate / partidas.length).toBeGreaterThanOrEqual(0.15);
    expect(empate / partidas.length).toBeLessThanOrEqual(0.3);
    expect(fora / partidas.length).toBeGreaterThanOrEqual(0.22);
    expect(fora / partidas.length).toBeLessThanOrEqual(0.4);
  });

  it('makes a much stronger home team win at least 65 percent', () => {
    const partidas = simularSerie(85, 60);
    const vitoriasForte = partidas.filter(
      partida => (partida.placarCasa ?? 0) > (partida.placarFora ?? 0),
    ).length;

    expect(vitoriasForte / partidas.length).toBeGreaterThanOrEqual(0.65);
  });

  it('mantém média de gols de um jogo movimentado (entre 3.2 e 4.2)', () => {
    const partidas = simularSerie(75, 75);
    const mediaGols =
      partidas.reduce(
        (total, partida) =>
          total + (partida.placarCasa ?? 0) + (partida.placarFora ?? 0),
        0,
      ) / partidas.length;

    expect(mediaGols).toBeGreaterThanOrEqual(3.2);
    expect(mediaGols).toBeLessThanOrEqual(4.2);
  });

  it('creates cards in 30 to 70 percent of matches', () => {
    const partidas = simularSerie(75, 75);
    const partidasComCartao = partidas.filter(partida =>
      partida.eventos.some(
        evento =>
          evento.tipo === 'cartao_amarelo' || evento.tipo === 'cartao_vermelho',
      ),
    ).length;

    expect(partidasComCartao / partidas.length).toBeGreaterThanOrEqual(0.3);
    expect(partidasComCartao / partidas.length).toBeLessThanOrEqual(0.7);
  });

  it('gera pênaltis (perdidos) e expulsões ao longo de muitos jogos', () => {
    const partidas = simularSerie(75, 75);
    const comPenalti = partidas.filter(partida =>
      partida.eventos.some(evento => evento.tipo === 'penalti'),
    ).length;
    const comVermelho = partidas.filter(partida =>
      partida.eventos.some(evento => evento.tipo === 'cartao_vermelho'),
    ).length;

    expect(comPenalti).toBeGreaterThan(0);
    expect(comVermelho).toBeGreaterThan(0);
  });

  it('credita assistências em parte dos gols de jogo aberto', () => {
    const partidas = simularSerie(75, 75);
    const golsComAssist = partidas
      .flatMap(partida => partida.eventos)
      .filter(evento => evento.tipo === 'gol' && evento.jogadorAssistenciaId);
    expect(golsComAssist.length).toBeGreaterThan(0);
    // O assistente nunca é o próprio autor do gol.
    expect(
      golsComAssist.every(gol => gol.jogadorAssistenciaId !== gol.jogadorId),
    ).toBe(true);
  });

  it('um time com goleiro muito melhor sofre menos gols na média', () => {
    const ataqueParelho = 70;
    const casa = criarJogadores('casa', ataqueParelho);
    const foraComParedao = criarJogadores('fora', ataqueParelho).map(j =>
      j.posicaoPrincipal === 'GOL'
        ? {...j, atributos: {...j.atributos, reflexos: 99, posicionamento: 99}}
        : j,
    );
    const foraComFrango = criarJogadores('fora', ataqueParelho).map(j =>
      j.posicaoPrincipal === 'GOL'
        ? {...j, atributos: {...j.atributos, reflexos: 40, posicionamento: 40}}
        : j,
    );
    const timeCasa = criarClube('casa', casa);
    const golsContraParedao = Array.from({length: 300}, (_, i) =>
      simularPartida({
        timeCasa,
        timeFora: criarClube('fora', foraComParedao),
        jogadoresCasa: casa,
        jogadoresFora: foraComParedao,
        seed: i + 1,
      }),
    ).reduce((t, p) => t + (p.placarCasa ?? 0), 0);
    const golsContraFrango = Array.from({length: 300}, (_, i) =>
      simularPartida({
        timeCasa,
        timeFora: criarClube('fora', foraComFrango),
        jogadoresCasa: casa,
        jogadoresFora: foraComFrango,
        seed: i + 1,
      }),
    ).reduce((t, p) => t + (p.placarCasa ?? 0), 0);
    expect(golsContraParedao).toBeLessThan(golsContraFrango);
  });
});

describe('mata-mata e pênaltis', () => {
  function montar(overallCasa: number, overallFora: number) {
    const jogadoresCasa = criarJogadores('casa', overallCasa);
    const jogadoresFora = criarJogadores('fora', overallFora);
    return {
      timeCasa: criarClube('casa', jogadoresCasa),
      timeFora: criarClube('fora', jogadoresFora),
      jogadoresCasa,
      jogadoresFora,
    };
  }

  it('com desempate, nenhum jogo termina sem vencedor', () => {
    const base = montar(75, 75);
    const partidas = Array.from({length: 200}, (_, i) =>
      simularPartida({...base, seed: i + 1, desempate: true}),
    );
    for (const p of partidas) {
      const decididoNoTempo = p.placarCasa !== p.placarFora;
      expect(decididoNoTempo || p.vencedorPenaltis !== undefined).toBe(true);
      if (p.vencedorPenaltis !== undefined) {
        expect(['casa', 'fora']).toContain(p.vencedorPenaltis);
      }
    }
    // Pelo menos um jogo precisou ir aos pênaltis na amostra.
    expect(partidas.some(p => p.vencedorPenaltis !== undefined)).toBe(true);
  });

  it('sem desempate (liga), empates são mantidos e não há pênaltis', () => {
    const base = montar(75, 75);
    const partidas = Array.from({length: 200}, (_, i) =>
      simularPartida({...base, seed: i + 1}),
    );
    expect(partidas.some(p => p.placarCasa === p.placarFora)).toBe(true);
    expect(partidas.every(p => p.vencedorPenaltis === undefined)).toBe(true);
  });

  it('disputarPenaltis é determinístico e retorna um dos dois clubes', () => {
    const a = disputarPenaltis(criarRNGComSeed(7), 75, 70, 'casa', 'fora');
    const b = disputarPenaltis(criarRNGComSeed(7), 75, 70, 'casa', 'fora');
    expect(a).toBe(b);
    expect(['casa', 'fora']).toContain(a);
  });
});
