import type {
  Clube,
  Formacao,
  Partida,
  Player,
  Position,
  TabelaClassificacao,
  Tatica,
} from '../../../types';

import {simularPartida} from '../../../engine/simulation/matchSimulator';
import {
  DURACAO,
  avancarJogosAoVivo,
  criarJogosAoVivo,
  projetarTabela,
} from '../jogosAoVivo';

const posicoes433: Position[] = [
  'GOL', 'LD', 'ZAG', 'ZAG', 'LE', 'VOL', 'MC', 'MEI', 'PD', 'CA', 'PE',
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
      receitaMensal: {bilheteria: 0, patrocinio: 0, premiacoes: 0, vendaJogadores: 0},
      despesaMensal: {salarios: 0, manutencaoEstadio: 0, comissoes: 0, contratacoes: 0},
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

function criarPartida(id: string, timeCasa: string, timeFora: string): Partida {
  return {
    id,
    competicaoId: 'brasileirao_a',
    rodada: 1,
    data: '2026-04-06',
    timeCasa,
    timeFora,
    jogada: false,
    modoJogado: 'simulado',
    eventos: [],
  };
}

function linhaTabela(clubeId: string, extra?: Partial<TabelaClassificacao>): TabelaClassificacao {
  return {
    clubeId,
    pontos: 0,
    jogos: 0,
    vitorias: 0,
    empates: 0,
    derrotas: 0,
    golsPro: 0,
    golsContra: 0,
    saldoGols: 0,
    ...extra,
  };
}

describe('projetarTabela', () => {
  it('soma o resultado parcial na base sem mutar a base', () => {
    const base = [linhaTabela('fla', {pontos: 4, jogos: 2}), linhaTabela('pal')];
    const projetada = projetarTabela(base, [
      {timeCasa: 'fla', timeFora: 'pal', golsCasa: 2, golsFora: 0},
    ]);

    const fla = projetada.find(l => l.clubeId === 'fla');
    const pal = projetada.find(l => l.clubeId === 'pal');
    expect(fla).toMatchObject({pontos: 7, jogos: 3, vitorias: 1, golsPro: 2, saldoGols: 2});
    expect(pal).toMatchObject({pontos: 0, derrotas: 1, golsContra: 2, saldoGols: -2});
    // Base intocada (a projeção é um retrato descartável por minuto).
    expect(base[0].pontos).toBe(4);
    expect(base[1].derrotas).toBe(0);
  });

  it('empate parcial vale +1 para cada lado', () => {
    const projetada = projetarTabela(
      [linhaTabela('a'), linhaTabela('b')],
      [{timeCasa: 'a', timeFora: 'b', golsCasa: 1, golsFora: 1}],
    );
    expect(projetada[0].pontos).toBe(1);
    expect(projetada[1].pontos).toBe(1);
    expect(projetada[0].empates).toBe(1);
  });

  it('clube fora da base entra zerado e recebe o parcial', () => {
    const projetada = projetarTabela(
      [linhaTabela('a')],
      [{timeCasa: 'novo', timeFora: 'a', golsCasa: 3, golsFora: 1}],
    );
    const novo = projetada.find(l => l.clubeId === 'novo');
    expect(novo).toMatchObject({pontos: 3, jogos: 1, golsPro: 3, saldoGols: 2});
  });

  it('ordena por pontos, depois saldo, depois gols pró', () => {
    const projetada = projetarTabela(
      [
        linhaTabela('saldo', {pontos: 3, saldoGols: 5, golsPro: 5}),
        linhaTabela('pontos', {pontos: 6, saldoGols: 0}),
        linhaTabela('golspro', {pontos: 3, saldoGols: 5, golsPro: 8}),
      ],
      [],
    );
    expect(projetada.map(l => l.clubeId)).toEqual(['pontos', 'golspro', 'saldo']);
  });
});

describe('criarJogosAoVivo e avancarJogosAoVivo', () => {
  const jogadoresA = criarJogadores('clube_a', 78);
  const jogadoresB = criarJogadores('clube_b', 74);
  const jogadoresC = criarJogadores('clube_c', 70);
  const jogadoresD = criarJogadores('clube_d', 72);
  const clubes = [
    criarClube('clube_a', jogadoresA),
    criarClube('clube_b', jogadoresB),
    criarClube('clube_c', jogadoresC),
    criarClube('clube_d', jogadoresD),
  ];
  const partidas = [
    criarPartida('p_user', 'clube_a', 'clube_b'),
    criarPartida('p_ia', 'clube_c', 'clube_d'),
  ];
  const st = {
    partidas,
    clubes,
    jogadores: [...jogadoresA, ...jogadoresB, ...jogadoresC, ...jogadoresD],
    rodadaAtual: 1,
  };

  it('exclui a partida do usuário e clube sem formação válida', () => {
    const jogos = criarJogosAoVivo(st, 'p_user');
    expect(jogos.map(j => j.id)).toEqual(['p_ia']);

    const semFormacao = {
      ...st,
      clubes: st.clubes.map(
        (c): Clube => (c.id === 'clube_c' ? {...c, formacaoAtual: null} : c),
      ),
    };
    expect(criarJogosAoVivo(semFormacao, 'p_user')).toEqual([]);
  });

  it('ao vivo chega ao MESMO placar do simularPartida do store (mesma seed)', () => {
    const jogos = criarJogosAoVivo(st, 'p_user');
    const jogo = jogos[0];
    // Roda até bem além do fim: o laço deve parar sozinho em 90'+acréscimos.
    avancarJogosAoVivo(jogos, 200);
    expect(jogo.minutoSimulado).toBe(DURACAO + jogo.acrescimos);

    // Mesma seed do store ao concluir a rodada (rodada*1000 + índice na lista).
    const headless = simularPartida({
      timeCasa: jogo.clubeCasa,
      timeFora: jogo.clubeFora,
      jogadoresCasa: jogo.jogadoresCasa,
      jogadoresFora: jogo.jogadoresFora,
      seed: 1 * 1000 + 1,
      competicaoId: 'brasileirao_a',
      rodada: 1,
      data: '2026-04-06',
    });
    expect(jogo.estado.placarCasa).toBe(headless.placarCasa);
    expect(jogo.estado.placarFora).toBe(headless.placarFora);
  });
});
