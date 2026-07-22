import type {Player, Position} from '../../../types';

import {disputarPenaltis} from '../matchSimulator';
import {
  ordenarBatedores,
  simularDisputaPenaltis,
  type DisputaPenaltis,
} from '../penaltis';
import {criarRNGComSeed} from '../rng';

function criarJogador(
  id: string,
  posicao: Position,
  finalizacao: number,
  overall = 70,
): Player {
  return {
    id,
    nome: id,
    idade: 26,
    nacionalidade: 'Brazil',
    posicaoPrincipal: posicao,
    posicoesSecundarias: [],
    pernaDominante: 'D',
    atributos: {
      finalizacao,
      passe: 70,
      marcacao: 70,
      desarme: 70,
      velocidade: 70,
      resistencia: 70,
      forca: 70,
      reflexos: 70,
      posicionamento: 70,
      drible: 70,
      cabeceio: 70,
      cruzamento: 70,
    },
    overall,
    potencial: overall,
    condicaoFisica: 100,
    moral: 70,
    forma: 0,
    valorMercado: 1000000,
    salario: 10000,
    contratoAte: '2028-12-31',
    clubeId: 'clube',
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
  };
}

function golsDoTime(disputa: DisputaPenaltis, timeId: string): number {
  return disputa.cobrancas.filter(c => c.timeId === timeId && c.convertido)
    .length;
}

describe('simularDisputaPenaltis', () => {
  it('é determinística: mesma seed produz a mesma disputa', () => {
    const a = simularDisputaPenaltis(criarRNGComSeed(42), 70, 70, 'A', 'B');
    const b = simularDisputaPenaltis(criarRNGComSeed(42), 70, 70, 'A', 'B');
    expect(a).toEqual(b);
  });

  it('mantém a disputa consistente: placar bate com as cobranças e o vencedor', () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const disputa = simularDisputaPenaltis(
        criarRNGComSeed(seed),
        65,
        80,
        'A',
        'B',
      );
      expect(golsDoTime(disputa, 'A')).toBe(disputa.golsCasa);
      expect(golsDoTime(disputa, 'B')).toBe(disputa.golsFora);
      expect(disputa.golsCasa).not.toBe(disputa.golsFora);
      expect(disputa.vencedor).toBe(
        disputa.golsCasa > disputa.golsFora ? 'A' : 'B',
      );

      // Cobranças sempre pareadas; série normal tem 5 por lado (rodadas 1-5)
      // e a morte súbita começa na rodada 6.
      const deA = disputa.cobrancas.filter(c => c.timeId === 'A');
      const deB = disputa.cobrancas.filter(c => c.timeId === 'B');
      expect(deA.length).toBe(deB.length);
      expect(deA.length).toBeGreaterThanOrEqual(5);
      expect(deA.slice(0, 5).map(c => c.rodada)).toEqual([1, 2, 3, 4, 5]);
      deA.slice(5).forEach((c, i) => expect(c.rodada).toBe(6 + i));
    }
  });

  it('preserva o vencedor do wrapper disputarPenaltis (mesma sequência de RNG)', () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const detalhada = simularDisputaPenaltis(
        criarRNGComSeed(seed),
        60,
        85,
        'casa',
        'fora',
      );
      const vencedor = disputarPenaltis(
        criarRNGComSeed(seed),
        60,
        85,
        'casa',
        'fora',
      );
      expect(detalhada.vencedor).toBe(vencedor);
    }
  });

  it('atribui batedores por finalização, goleiro por último e em rodízio', () => {
    const elenco = [
      criarJogador('goleiro', 'GOL', 90),
      criarJogador('artilheiro', 'CA', 88),
      criarJogador('meia', 'MEI', 75),
      criarJogador('zagueiro', 'ZAG', 40),
    ];
    expect(ordenarBatedores(elenco).map(j => j.id)).toEqual([
      'artilheiro',
      'meia',
      'zagueiro',
      'goleiro',
    ]);

    const disputa = simularDisputaPenaltis(
      criarRNGComSeed(7),
      70,
      70,
      'A',
      'B',
      elenco,
      [],
    );
    const deA = disputa.cobrancas.filter(c => c.timeId === 'A');
    expect(deA.slice(0, 4).map(c => c.jogadorId)).toEqual([
      'artilheiro',
      'meia',
      'zagueiro',
      'goleiro',
    ]);
    if (deA.length > 4) {
      expect(deA[4]?.jogadorId).toBe('artilheiro');
    }
    // Sem elenco informado, a cobrança sai sem batedor (atribuição opcional).
    disputa.cobrancas
      .filter(c => c.timeId === 'B')
      .forEach(c => expect(c.jogadorId).toBeUndefined());
  });
});
