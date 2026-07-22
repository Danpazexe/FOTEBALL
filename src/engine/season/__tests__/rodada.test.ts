import type {Clube, Formacao, Partida, Player, Position, Tatica} from '../../../types';

import {criarRNGComSeed} from '../../simulation/rng';
import {
  aplicarResultadoNosJogadores,
  enxugarEstatisticasIA,
  resolverJogosRodada,
  sortearDuracaoLesao,
} from '../rodada';

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

function criarPartida(
  id: string,
  timeCasa: string,
  timeFora: string,
): Partida {
  return {
    id,
    competicaoId: 'brasileirao_a',
    rodada: 1,
    data: '2026-04-06',
    timeCasa,
    timeFora,
    eventos: [],
    jogada: false,
    modoJogado: 'simulado',
  };
}

/** Cenário padrão: 4 clubes, 2 jogos na rodada (o do usuário e um da IA). */
function criarCenario() {
  const clubesIds = ['meu', 'adv', 'ia1', 'ia2'];
  const jogadores = clubesIds.flatMap(id => criarJogadores(id, 70));
  const clubes = clubesIds.map(id =>
    criarClube(id, jogadores.filter(j => j.clubeId === id)),
  );
  const partidas = [
    criarPartida('r1_meu_adv', 'meu', 'adv'),
    criarPartida('r1_ia1_ia2', 'ia1', 'ia2'),
  ];
  return {clubes, jogadores, partidas};
}

describe('sortearDuracaoLesao', () => {
  it('é determinística e fica nas faixas reais de calendário (4-35 dias)', () => {
    for (let seed = 1; seed <= 30; seed += 1) {
      const dias = sortearDuracaoLesao(criarRNGComSeed(seed));
      expect(dias).toBe(sortearDuracaoLesao(criarRNGComSeed(seed)));
      expect(dias).toBeGreaterThanOrEqual(4);
      expect(dias).toBeLessThanOrEqual(35);
    }
  });
});

describe('resolverJogosRodada', () => {
  it('simula a rodada de forma determinística, com jogo da IA enxugado e o do usuário completo', () => {
    const {clubes, jogadores, partidas} = criarCenario();
    const rodar = () =>
      resolverJogosRodada({
        partidas,
        jogosRodada: partidas,
        clubes,
        jogadores,
        disciplinaProcessada: [],
        rodadaAtual: 1,
        clubeUsuarioId: 'meu',
      });
    const a = rodar();
    expect(a).toEqual(rodar());

    for (const partida of a.partidas) {
      expect(partida.jogada).toBe(true);
      expect(partida.placarCasa).toBeDefined();
      expect(partida.placarFora).toBeDefined();
    }
    // Ids do calendário preservados (simularPartida gera id próprio).
    expect(a.partidas.map(p => p.id)).toEqual(partidas.map(p => p.id));

    // Save enxuto: detalhe por jogador só na partida do usuário.
    const doUsuario = a.partidas.find(p => p.id === 'r1_meu_adv');
    const daIA = a.partidas.find(p => p.id === 'r1_ia1_ia2');
    expect(daIA?.estatisticas?.casa.finalizacoesPorJogador).toEqual({});
    expect(daIA?.estatisticas?.momentumPorMinuto).toEqual([]);
    expect(
      Object.keys(doUsuario?.estatisticas?.casa.finalizacoesPorJogador ?? {})
        .length + (doUsuario?.estatisticas?.momentumPorMinuto.length ?? 0),
    ).toBeGreaterThan(0);

    // Disciplina idempotente: as duas partidas entram no ledger processado.
    expect(a.disciplinaProcessada).toEqual(
      expect.arrayContaining(['r1_meu_adv', 'r1_ia1_ia2']),
    );

    // Pós-partida aplicado: titulares que jogaram somam jogo e perdem condição.
    const titular = a.jogadores.find(j => j.id === 'meu_10');
    expect(titular?.estatisticasTemporada.jogos).toBe(1);
    expect(titular?.condicaoFisica).toBeLessThan(100);
  });

  it('absorve a partida decidida ao vivo e mantém os jogos da IA idênticos ao caminho simulado (mesmas seeds)', () => {
    const {clubes, jogadores, partidas} = criarCenario();
    const base = {
      partidas,
      jogosRodada: partidas,
      clubes,
      jogadores,
      disciplinaProcessada: [],
      rodadaAtual: 1,
      clubeUsuarioId: 'meu',
    };
    const simulado = resolverJogosRodada(base);
    const aoVivo = resolverJogosRodada({
      ...base,
      aoVivo: {
        partidaId: 'r1_meu_adv',
        placarCasa: 2,
        placarFora: 1,
        eventos: [
          {minuto: 88, tipo: 'gol', timeId: 'meu', jogadorId: 'meu_9', descricao: 'Gol!'},
          {minuto: 12, tipo: 'gol', timeId: 'meu', jogadorId: 'meu_9', descricao: 'Gol!'},
          {minuto: 40, tipo: 'gol', timeId: 'adv', jogadorId: 'adv_9', descricao: 'Gol!'},
        ],
      },
    });

    const partidaUsuario = aoVivo.partidas.find(p => p.id === 'r1_meu_adv');
    expect(partidaUsuario?.placarCasa).toBe(2);
    expect(partidaUsuario?.placarFora).toBe(1);
    expect(partidaUsuario?.modoJogado).toBe('interativo');
    // Eventos reordenados por minuto e titulares do apito registrados.
    expect(partidaUsuario?.eventos.map(e => e.minuto)).toEqual([12, 40, 88]);
    expect(partidaUsuario?.titularesCasa).toHaveLength(11);

    // Paridade de seeds: o jogo da IA independe do caminho do jogo do usuário.
    const iaSimulado = simulado.partidas.find(p => p.id === 'r1_ia1_ia2');
    const iaAoVivo = aoVivo.partidas.find(p => p.id === 'r1_ia1_ia2');
    expect(iaAoVivo?.placarCasa).toBe(iaSimulado?.placarCasa);
    expect(iaAoVivo?.placarFora).toBe(iaSimulado?.placarFora);
    expect(iaAoVivo?.eventos).toEqual(iaSimulado?.eventos);

    // O artilheiro do jogo ao vivo credita os 2 gols nas estatísticas.
    const artilheiro = aoVivo.jogadores.find(j => j.id === 'meu_9');
    expect(artilheiro?.estatisticasTemporada.gols).toBe(2);
  });
});

describe('aplicarResultadoNosJogadores e enxugarEstatisticasIA', () => {
  it('aplica lesão nova com duração determinística e poupa quem não jogou', () => {
    const jogadores = [...criarJogadores('casa', 70), ...criarJogadores('fora', 70)];
    const clubeCasa = criarClube('casa', jogadores.slice(0, 11));
    const clubeFora = criarClube('fora', jogadores.slice(11));
    const partida: Partida = {
      ...criarPartida('jogo_lesao', 'casa', 'fora'),
      jogada: true,
      placarCasa: 1,
      placarFora: 0,
      eventos: [
        {minuto: 30, tipo: 'lesao', timeId: 'casa', jogadorId: 'casa_5', descricao: 'Lesão'},
        {minuto: 60, tipo: 'gol', timeId: 'casa', jogadorId: 'casa_9', descricao: 'Gol!'},
      ],
    };
    const a = aplicarResultadoNosJogadores(jogadores, partida, clubeCasa, clubeFora);
    const b = aplicarResultadoNosJogadores(jogadores, partida, clubeCasa, clubeFora);

    const lesionado = a.find(j => j.id === 'casa_5');
    expect(lesionado?.lesionado).toBe(true);
    expect(lesionado?.diasLesao).toBeGreaterThanOrEqual(4);
    expect(lesionado?.diasLesao).toBe(b.find(j => j.id === 'casa_5')?.diasLesao);

    const goleador = a.find(j => j.id === 'casa_9');
    expect(goleador?.estatisticasTemporada.gols).toBe(1);
    expect(goleador?.estatisticasTemporada.notaMedia).toBeGreaterThan(0);

    // Titular do visitante também soma o jogo (pós-partida cobre os DOIS lados).
    expect(a.find(j => j.id === 'fora_3')?.estatisticasTemporada.jogos).toBe(1);
  });

  it('enxuga só o que pesa no save da IA e preserva agregados', () => {
    const semEstatisticas = criarPartida('sem_stats', 'a', 'b');
    expect(enxugarEstatisticasIA(semEstatisticas)).toBe(semEstatisticas);
  });
});
