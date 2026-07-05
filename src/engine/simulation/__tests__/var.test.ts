import {simularPartida} from '../matchSimulator';
import {ehEventoGol} from '../../../types';
import type {Clube, Partida, Player, Position, Tatica} from '../../../types';

/**
 * Verifica o VAR (anula gol por impedimento; flagra pênalti no lance de perigo)
 * de forma DETERMINÍSTICA e — o mais importante — que o invariante
 * `placar === nº de eventos 'gol'` se mantém mesmo com gols anulados (o momentos
 * engine depende disso). O impacto no balanceamento é medido em matchBalance.test.
 */

const POSICOES: Position[] = [
  'GOL', 'LD', 'ZAG', 'ZAG', 'LE', 'VOL', 'MC', 'MEI', 'PD', 'CA', 'PE',
];

const TATICA: Tatica = {
  estiloOfensivo: 'Equilibrado',
  marcacao: 'Zona',
  linhaDefensiva: 'Normal',
  ritmo: 'Normal',
};

function criarJogadores(prefixo: string): Player[] {
  return POSICOES.map((posicao, index) => ({
    id: `${prefixo}_${index}`,
    nome: `${prefixo} ${index}`,
    idade: 26,
    nacionalidade: 'Brazil',
    posicaoPrincipal: posicao,
    posicoesSecundarias: [],
    pernaDominante: 'D',
    atributos: {
      finalizacao: 78, passe: 78, marcacao: 78, desarme: 78, velocidade: 78,
      resistencia: 78, forca: 78, reflexos: 78, posicionamento: 78, drible: 78,
      cabeceio: 78, cruzamento: 78,
    },
    overall: 78,
    potencial: 78,
    condicaoFisica: 100,
    moral: 65,
    forma: 0,
    valorMercado: 1_000_000,
    salario: 10_000,
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

function criarClube(id: string, jogadores: Player[]): Clube {
  return {
    id, nome: id, sigla: id.slice(0, 3).toUpperCase(), cidade: '', estado: '',
    fundacao: null,
    elenco: jogadores.map(j => j.id),
    formacaoAtual: {
      tipo: '4-3-3',
      titulares: jogadores.map((j, i) => ({
        jogadorId: j.id,
        posicao: POSICOES[i] ?? j.posicaoPrincipal,
      })),
      reservas: [],
    },
    taticaAtual: TATICA,
    financas: {
      saldo: 5_000_000,
      receitaMensal: {bilheteria: 0, patrocinio: 0, premiacoes: 0, vendaJogadores: 0},
      despesaMensal: {salarios: 0, manutencaoEstadio: 0, comissoes: 0, contratacoes: 0},
      patrocinadores: [], historicoTransacoes: [],
    },
    estadio: {nome: `Estádio ${id}`, capacidade: 30000, precoMedioIngresso: 40, nivelInfraestrutura: 3},
    reputacao: 50,
    controladoPorIA: true,
  };
}

function simularAmostra(total: number): Partida[] {
  const jc = criarJogadores('casa');
  const jf = criarJogadores('fora');
  const casa = criarClube('casa', jc);
  const fora = criarClube('fora', jf);
  return Array.from({length: total}, (_, i) =>
    simularPartida({timeCasa: casa, timeFora: fora, jogadoresCasa: jc, jogadoresFora: jf, seed: i + 1}),
  );
}

describe('VAR na simulação', () => {
  const partidas = simularAmostra(200);

  it('invariante: o placar sempre bate com o nº de eventos de gol (anulado não conta; gol contra conta)', () => {
    for (const p of partidas) {
      const golsEvento = p.eventos.filter(e => ehEventoGol(e.tipo)).length;
      expect((p.placarCasa ?? 0) + (p.placarFora ?? 0)).toBe(golsEvento);
    }
  });

  it('o VAR aparece na amostra (anulações e/ou pênaltis)', () => {
    const comVar = partidas.filter(p =>
      p.eventos.some(e => e.descricao.includes('VAR')),
    );
    expect(comVar.length).toBeGreaterThan(0);
  });

  it('há gols anulados pelo VAR na amostra (não incrementam o placar)', () => {
    const anulados = partidas.flatMap(p =>
      p.eventos.filter(e => e.descricao.includes('anulado')),
    );
    expect(anulados.length).toBeGreaterThan(0);
    // Gol anulado NÃO é evento do tipo 'gol'.
    expect(anulados.every(e => e.tipo !== 'gol')).toBe(true);
  });

  it('é determinística (mesma seed → mesma partida)', () => {
    const jc = criarJogadores('casa');
    const jf = criarJogadores('fora');
    const casa = criarClube('casa', jc);
    const fora = criarClube('fora', jf);
    const a = simularPartida({timeCasa: casa, timeFora: fora, jogadoresCasa: jc, jogadoresFora: jf, seed: 42});
    const b = simularPartida({timeCasa: casa, timeFora: fora, jogadoresCasa: jc, jogadoresFora: jf, seed: 42});
    expect(a.placarCasa).toBe(b.placarCasa);
    expect(a.placarFora).toBe(b.placarFora);
    expect(a.eventos.length).toBe(b.eventos.length);
  });
});
