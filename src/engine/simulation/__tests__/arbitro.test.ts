import type {Clube, Player, Position, Tatica} from '../../../types';

import {
  NOMES_ARBITROS,
  fatorRigorArbitro,
  sortearArbitro,
  varDisponivelPartida,
} from '../arbitro';
import {simularPartida} from '../matchSimulator';

/**
 * Arbitragem: sorteio determinístico por seed (via hash, sem consumir RNG da
 * partida), fator de rigor limitado e neutro em média, VAR por divisão e a
 * integração com simularPartida (partida.arbitro + determinismo bit a bit).
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
      finalizacao: 76, passe: 76, marcacao: 76, desarme: 76, velocidade: 76,
      resistencia: 76, forca: 76, reflexos: 76, posicionamento: 76, drible: 76,
      cabeceio: 76, cruzamento: 76,
    },
    overall: 76,
    potencial: 76,
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

function criarClube(id: string, jogadores: Player[], divisao?: string): Clube {
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
      historicoTransacoes: [],
    },
    estadio: {nome: `Estádio ${id}`, capacidade: 30000, precoMedioIngresso: 40, nivelInfraestrutura: 3},
    reputacao: 50,
    controladoPorIA: true,
    divisao,
  };
}

describe('sortearArbitro', () => {
  it('é determinístico: mesma seed ⇒ mesmo árbitro', () => {
    for (const seed of [1, 42, 999, 123_456]) {
      expect(sortearArbitro(seed)).toEqual(sortearArbitro(seed));
    }
  });

  it('rigor é sempre inteiro entre 1 e 5; nome vem do pool', () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const arbitro = sortearArbitro(seed);
      expect(Number.isInteger(arbitro.rigor)).toBe(true);
      expect(arbitro.rigor).toBeGreaterThanOrEqual(1);
      expect(arbitro.rigor).toBeLessThanOrEqual(5);
      expect(NOMES_ARBITROS).toContain(arbitro.nome);
    }
  });

  it('varia entre seeds (não é um árbitro fixo)', () => {
    const nomes = new Set(
      Array.from({length: 50}, (_, i) => sortearArbitro(i + 1).nome),
    );
    const rigores = new Set(
      Array.from({length: 50}, (_, i) => sortearArbitro(i + 1).rigor),
    );
    expect(nomes.size).toBeGreaterThan(1);
    expect(rigores.size).toBeGreaterThan(1);
  });
});

describe('fatorRigorArbitro', () => {
  it('é crescente com o rigor e fica em ~[0.8, 1.25]', () => {
    let anterior = 0;
    for (let rigor = 1; rigor <= 5; rigor += 1) {
      const fator = fatorRigorArbitro(rigor);
      expect(fator).toBeGreaterThanOrEqual(0.8);
      expect(fator).toBeLessThanOrEqual(1.25);
      expect(fator).toBeGreaterThan(anterior);
      anterior = fator;
    }
  });

  it('clampa rigor fora da faixa (0 ⇒ mínimo; 6 ⇒ máximo)', () => {
    expect(fatorRigorArbitro(0)).toBe(fatorRigorArbitro(1));
    expect(fatorRigorArbitro(6)).toBe(fatorRigorArbitro(5));
  });

  it('média sobre o pool de rigores ≈ 1.0 (neutro no balanceamento agregado)', () => {
    const media =
      [1, 2, 3, 4, 5].reduce((soma, r) => soma + fatorRigorArbitro(r), 0) / 5;
    expect(media).toBeGreaterThan(0.97);
    expect(media).toBeLessThan(1.05);
  });
});

describe('varDisponivelPartida', () => {
  it('Séries A/B (ou divisão ausente) têm VAR', () => {
    expect(varDisponivelPartida('Série A', 'Série A')).toBe(true);
    expect(varDisponivelPartida('Série A', 'Série B')).toBe(true);
    expect(varDisponivelPartida('Série B', 'Série B')).toBe(true);
    expect(varDisponivelPartida(undefined, undefined)).toBe(true);
    expect(varDisponivelPartida(undefined, 'Série A')).toBe(true);
  });

  it('Série C ou D em QUALQUER lado tira o VAR da partida', () => {
    expect(varDisponivelPartida('Série C', 'Série C')).toBe(false);
    expect(varDisponivelPartida('Série D', 'Série D')).toBe(false);
    expect(varDisponivelPartida('Série A', 'Série C')).toBe(false);
    expect(varDisponivelPartida('Série D', 'Série A')).toBe(false);
    expect(varDisponivelPartida(undefined, 'Série D')).toBe(false);
  });
});

describe('integração com simularPartida', () => {
  const jc = criarJogadores('casa');
  const jf = criarJogadores('fora');

  it('preenche partida.arbitro com o árbitro derivado da MESMA seed', () => {
    const partida = simularPartida({
      timeCasa: criarClube('casa', jc),
      timeFora: criarClube('fora', jf),
      jogadoresCasa: jc,
      jogadoresFora: jf,
      seed: 77,
    });
    expect(partida.arbitro).toEqual(sortearArbitro(77));
  });

  it('mesma seed ⇒ mesmo placar e mesmos eventos em duas execuções', () => {
    const input = {
      timeCasa: criarClube('casa', jc),
      timeFora: criarClube('fora', jf),
      jogadoresCasa: jc,
      jogadoresFora: jf,
      seed: 4242,
    };
    const a = simularPartida(input);
    const b = simularPartida(input);
    expect(a.placarCasa).toBe(b.placarCasa);
    expect(a.placarFora).toBe(b.placarFora);
    expect(a.eventos).toEqual(b.eventos);
    expect(a.chutes).toEqual(b.chutes);
    expect(a.arbitro).toEqual(b.arbitro);
  });

  it('partida de Série C/D não tem NENHUM lance de VAR (prob ×0, draw consumido)', () => {
    const casa = criarClube('casa', jc, 'Série C');
    const fora = criarClube('fora', jf, 'Série D');
    for (let seed = 1; seed <= 60; seed += 1) {
      const partida = simularPartida({
        timeCasa: casa,
        timeFora: fora,
        jogadoresCasa: jc,
        jogadoresFora: jf,
        seed,
      });
      expect(
        partida.eventos.some(evento => evento.descricao.includes('VAR')),
      ).toBe(false);
      expect(
        (partida.chutes ?? []).some(
          chute => chute.resultado === 'gol_anulado',
        ),
      ).toBe(false);
    }
  });
});
