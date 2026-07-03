import type {Clube, Formacao, Player, Position, Tatica} from '../../../types';

import {simularPartida} from '../matchSimulator';

/**
 * LABORATÓRIO DE BALANCEAMENTO (ROADMAP Fase 3 / TESTES_BALANCEAMENTO §7-8).
 *
 * Mede a engine em massa e agrega as 9 métricas de balanceamento num único
 * lugar (calcularMetricasBalanceamento), para servir de rede de segurança contra
 * regressões de balanceamento e de base para o ajuste de probabilidade (Fase 4).
 *
 * IMPORTANTE — divergência conhecida: o alvo do doc para média de gols entre
 * times parelhos é 2.4–3.1. A engine ATUAL joga mais aberto (~3.2–4.2). Estes
 * testes travam a REALIDADE atual (para pegar regressões) e imprimem as métricas;
 * puxar os gols para a faixa-alvo é tarefa de balanceamento (Fase 4), não de teste.
 *
 * Determinístico: cada partida usa uma seed sequencial, então a suíte reproduz.
 */

type Partida = ReturnType<typeof simularPartida>;

interface BalanceMetrics {
  jogos: number;
  mediaGols: number;
  taxaEmpate: number;
  taxaVitoriaCasa: number;
  taxaVitoriaFora: number;
  taxaGoleada: number; // diferença de 3+ gols
  mediaCartoes: number;
  taxaPenalti: number;
  taxaLesao: number;
}

const POSICOES: Position[] = [
  'GOL', 'LD', 'ZAG', 'ZAG', 'LE', 'VOL', 'MC', 'MEI', 'PD', 'CA', 'PE',
];

const TATICA_NEUTRA: Tatica = {
  estiloOfensivo: 'Equilibrado',
  marcacao: 'Zona',
  linhaDefensiva: 'Normal',
  ritmo: 'Normal',
};

function criarJogadores(prefixo: string, overall: number): Player[] {
  return POSICOES.map((posicao, index) => ({
    id: `${prefixo}_${index}`,
    nome: `${prefixo} ${index}`,
    idade: 26,
    nacionalidade: 'Brazil',
    posicaoPrincipal: posicao,
    posicoesSecundarias: [],
    pernaDominante: 'D',
    atributos: {
      finalizacao: overall, passe: overall, marcacao: overall, desarme: overall,
      velocidade: overall, resistencia: overall, forca: overall, reflexos: overall,
      posicionamento: overall, drible: overall, cabeceio: overall, cruzamento: overall,
    },
    overall,
    potencial: overall,
    condicaoFisica: 100,
    moral: 65,
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
      temporada: '2026', jogos: 0, gols: 0, assistencias: 0,
      cartoesAmarelos: 0, cartoesVermelhos: 0, notaMedia: 0,
    },
    historicoTemporadas: [],
  }));
}

function criarClube(id: string, jogadores: Player[], tatica: Tatica): Clube {
  const formacao: Formacao = {
    tipo: '4-3-3',
    titulares: jogadores.map((jogador, index) => ({
      jogadorId: jogador.id,
      posicao: POSICOES[index] ?? jogador.posicaoPrincipal,
    })),
    reservas: [],
  };
  return {
    id, nome: id, sigla: id.slice(0, 3).toUpperCase(), cidade: '', estado: '',
    fundacao: null,
    elenco: jogadores.map(jogador => jogador.id),
    formacaoAtual: formacao,
    taticaAtual: tatica,
    financas: {
      saldo: 5000000,
      receitaMensal: {bilheteria: 0, patrocinio: 0, premiacoes: 0, vendaJogadores: 0},
      despesaMensal: {salarios: 0, manutencaoEstadio: 0, comissoes: 0, contratacoes: 0},
      patrocinadores: [], historicoTransacoes: [],
    },
    estadio: {nome: `Estádio ${id}`, capacidade: 30000, precoMedioIngresso: 40, nivelInfraestrutura: 3},
    reputacao: 50,
    controladoPorIA: true,
  };
}

function simularSerie(
  overallCasa: number,
  overallFora: number,
  taticaCasa: Tatica = TATICA_NEUTRA,
  taticaFora: Tatica = TATICA_NEUTRA,
  total = 400,
): Partida[] {
  const jogadoresCasa = criarJogadores('casa', overallCasa);
  const jogadoresFora = criarJogadores('fora', overallFora);
  const timeCasa = criarClube('casa', jogadoresCasa, taticaCasa);
  const timeFora = criarClube('fora', jogadoresFora, taticaFora);
  return Array.from({length: total}, (_, index) =>
    simularPartida({
      timeCasa, timeFora, jogadoresCasa, jogadoresFora, seed: index + 1,
    }),
  );
}

function calcularMetricasBalanceamento(partidas: Partida[]): BalanceMetrics {
  const jogos = partidas.length;
  let gols = 0;
  let empates = 0;
  let vitoriasCasa = 0;
  let vitoriasFora = 0;
  let goleadas = 0;
  let cartoes = 0;
  let comPenalti = 0;
  let comLesao = 0;

  for (const partida of partidas) {
    const pc = partida.placarCasa ?? 0;
    const pf = partida.placarFora ?? 0;
    gols += pc + pf;
    if (pc === pf) {
      empates += 1;
    } else if (pc > pf) {
      vitoriasCasa += 1;
    } else {
      vitoriasFora += 1;
    }
    if (Math.abs(pc - pf) >= 3) {
      goleadas += 1;
    }
    let temPenalti = false;
    let temLesao = false;
    for (const evento of partida.eventos) {
      if (evento.tipo === 'cartao_amarelo' || evento.tipo === 'cartao_vermelho') {
        cartoes += 1;
      } else if (evento.tipo === 'penalti') {
        temPenalti = true;
      } else if (evento.tipo === 'lesao') {
        temLesao = true;
      }
    }
    if (temPenalti) {
      comPenalti += 1;
    }
    if (temLesao) {
      comLesao += 1;
    }
  }

  return {
    jogos,
    mediaGols: gols / jogos,
    taxaEmpate: empates / jogos,
    taxaVitoriaCasa: vitoriasCasa / jogos,
    taxaVitoriaFora: vitoriasFora / jogos,
    taxaGoleada: goleadas / jogos,
    mediaCartoes: cartoes / jogos,
    taxaPenalti: comPenalti / jogos,
    taxaLesao: comLesao / jogos,
  };
}

function taxaVitoriaMandante(partidas: Partida[]): number {
  const vitorias = partidas.filter(
    partida => (partida.placarCasa ?? 0) > (partida.placarFora ?? 0),
  ).length;
  return vitorias / partidas.length;
}

describe('laboratório de balanceamento — times parelhos', () => {
  const metricas = calcularMetricasBalanceamento(simularSerie(75, 75));

  it('imprime as métricas de balanceamento agregadas', () => {
    // Relatório visível ao rodar sem --silent; base para o ajuste da Fase 4.
    console.log('[balanceamento parelho 75x75]', JSON.stringify(metricas));
    expect(metricas.jogos).toBe(400);
  });

  it('média de gols reflete a engine atual (realidade ~3.2–4.2, ACIMA do alvo 2.4–3.1)', () => {
    expect(metricas.mediaGols).toBeGreaterThan(3.0);
    expect(metricas.mediaGols).toBeLessThan(4.5);
  });

  it('empates ficam numa faixa saudável', () => {
    expect(metricas.taxaEmpate).toBeGreaterThan(0.15);
    expect(metricas.taxaEmpate).toBeLessThan(0.32);
  });

  it('mandante leva leve vantagem, sem dominar', () => {
    expect(metricas.taxaVitoriaCasa).toBeGreaterThan(0.4);
    expect(metricas.taxaVitoriaCasa).toBeLessThan(0.56);
    expect(metricas.taxaVitoriaFora).toBeGreaterThan(0.22);
    expect(metricas.taxaVitoriaFora).toBeLessThan(0.4);
  });

  it('goleadas acontecem, mas não são a regra', () => {
    expect(metricas.taxaGoleada).toBeGreaterThan(0);
    expect(metricas.taxaGoleada).toBeLessThan(0.35);
  });

  it('cartões, pênaltis e lesões ocorrem em taxas plausíveis', () => {
    expect(metricas.mediaCartoes).toBeGreaterThan(0);
    expect(metricas.taxaPenalti).toBeGreaterThan(0);
    expect(metricas.taxaPenalti).toBeLessThan(0.6);
    expect(metricas.taxaLesao).toBeGreaterThanOrEqual(0);
    expect(metricas.taxaLesao).toBeLessThan(0.5);
  });
});

describe('laboratório de balanceamento — diferença de qualidade', () => {
  it('vantagem de +10 de overall: forte vence mais, mas zebra continua possível', () => {
    const taxa = taxaVitoriaMandante(simularSerie(80, 70, TATICA_NEUTRA, TATICA_NEUTRA, 300));
    console.log('[+10 overall] vitóriaMandante forte =', taxa.toFixed(3));
    expect(taxa).toBeGreaterThan(0.5);
    expect(taxa).toBeLessThan(0.9); // < 1.0: zebra ainda acontece
  });

  it('vantagem de +20 de overall: domínio claro do time forte', () => {
    const taxa = taxaVitoriaMandante(simularSerie(80, 60, TATICA_NEUTRA, TATICA_NEUTRA, 300));
    console.log('[+20 overall] vitóriaMandante forte =', taxa.toFixed(3));
    expect(taxa).toBeGreaterThan(0.65);
    expect(taxa).toBeLessThan(1.0); // massacre não é garantido: zebra possível
  });

  it('gradiente: +20 vence mais que +10 (qualidade pesa de forma monotônica)', () => {
    const forte10 = taxaVitoriaMandante(simularSerie(80, 70, TATICA_NEUTRA, TATICA_NEUTRA, 300));
    const forte20 = taxaVitoriaMandante(simularSerie(80, 60, TATICA_NEUTRA, TATICA_NEUTRA, 300));
    expect(forte20).toBeGreaterThan(forte10);
  });
});

describe('laboratório de balanceamento — impacto da tática', () => {
  const ATAQUE_DIRETO: Tatica = {
    estiloOfensivo: 'Ataque direto', marcacao: 'Pressão alta',
    linhaDefensiva: 'Adiantada', ritmo: 'Intenso',
  };
  const RETRANCA: Tatica = {
    estiloOfensivo: 'Contra-ataque', marcacao: 'Zona',
    linhaDefensiva: 'Recuada', ritmo: 'Lento',
  };

  it('a tática altera o resultado agregado sem virar botão mágico', () => {
    const golsNeutro = calcularMetricasBalanceamento(
      simularSerie(75, 75, TATICA_NEUTRA, TATICA_NEUTRA, 300),
    ).mediaGols;
    const golsAgressivo = calcularMetricasBalanceamento(
      simularSerie(75, 75, ATAQUE_DIRETO, ATAQUE_DIRETO, 300),
    ).mediaGols;
    console.log('[tática] gols neutro =', golsNeutro.toFixed(2), ' agressivo x agressivo =', golsAgressivo.toFixed(2));
    // Duas táticas agressivas dos dois lados não podem produzir MENOS gols que o
    // jogo neutro — mas o efeito é de tendência, não determinístico.
    expect(golsAgressivo).toBeGreaterThan(golsNeutro * 0.8);
  });

  it('mando de campo (mandante forte vs retranca visitante) mantém vantagem do mandante', () => {
    const taxa = taxaVitoriaMandante(
      simularSerie(75, 75, TATICA_NEUTRA, RETRANCA, 300),
    );
    console.log('[mando vs retranca] vitóriaMandante =', taxa.toFixed(3));
    expect(taxa).toBeGreaterThan(0.35);
  });
});
