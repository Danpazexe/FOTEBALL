/**
 * FACHADA do mapa de finalizações (RF-09/RF-11/CA-10/CA-11):
 *  • partida V2 → chutes FACTUAIS do ledger (posições persistidas, factual);
 *  • partida legacy (sem ledger) → reconstrução plausível, marcada como
 *    NÃO-factual (a UI rotula como estimativa) — nada é fabricado como real.
 */
import type {Partida, Position} from '../../../types';

import {criarClubeLab, criarJogadoresLab, TATICA_NEUTRA_LAB} from '../../lab/fixtures';
import {obterFinalizacoesPartida} from '../finalizacoes';
import {simularPartida} from '../matchSimulator';

function simular(seed: number): {partida: Partida; posicoes: Record<string, Position>} {
  const jogadoresCasa = criarJogadoresLab('casa', 76);
  const jogadoresFora = criarJogadoresLab('fora', 74);
  const partida = simularPartida({
    timeCasa: criarClubeLab('casa', jogadoresCasa, TATICA_NEUTRA_LAB),
    timeFora: criarClubeLab('fora', jogadoresFora, TATICA_NEUTRA_LAB),
    jogadoresCasa,
    jogadoresFora,
    seed,
  });
  const posicoes: Record<string, Position> = {};
  for (const j of [...jogadoresCasa, ...jogadoresFora]) {
    posicoes[j.id] = j.posicaoPrincipal;
  }
  return {partida, posicoes};
}

describe('obterFinalizacoesPartida — factual (V2) × estimado (legacy)', () => {
  it('partida V2 devolve exatamente os chutes do ledger, com posições persistidas', () => {
    const {partida, posicoes} = simular(11);
    const {finalizacoes, factual} = obterFinalizacoesPartida(partida, posicoes);
    expect(factual).toBe(true);
    const validos = (partida.chutes ?? []).filter(c => c.resultado !== 'gol_anulado');
    expect(finalizacoes).toHaveLength(validos.length);
    // Gols do mapa == placar (CA-10) e coordenadas idênticas às do ledger.
    const golsMapa = finalizacoes.filter(f => f.gol);
    expect(golsMapa).toHaveLength(
      (partida.placarCasa ?? 0) + (partida.placarFora ?? 0),
    );
    for (const fin of finalizacoes) {
      const chute = validos.find(
        c => c.minuto === fin.minuto && c.jogadorId === fin.jogadorId && c.x === fin.x,
      );
      expect(chute).toBeDefined();
      expect(fin.y).toBe(chute?.y);
      expect(fin.xG).toBe(chute?.xg);
    }
  });

  it('partida legacy (sem ledger) cai na reconstrução e é marcada como estimada', () => {
    const {partida, posicoes} = simular(12);
    const legacy: Partida = {...partida, chutes: undefined, engineVersion: undefined};
    const {finalizacoes, factual} = obterFinalizacoesPartida(legacy, posicoes);
    expect(factual).toBe(false);
    // A reconstrução continua honrando o invariante gols == placar.
    expect(finalizacoes.filter(f => f.gol)).toHaveLength(
      (partida.placarCasa ?? 0) + (partida.placarFora ?? 0),
    );
  });

  it('gol anulado pelo VAR fica fora do mapa factual', () => {
    // Procura numa amostra uma partida com gol anulado (flag estruturada).
    for (let seed = 1; seed <= 120; seed += 1) {
      const {partida, posicoes} = simular(seed);
      const anulados = (partida.chutes ?? []).filter(
        c => c.resultado === 'gol_anulado',
      );
      if (anulados.length === 0) {
        continue;
      }
      const {finalizacoes} = obterFinalizacoesPartida(partida, posicoes);
      expect(finalizacoes.filter(f => f.gol)).toHaveLength(
        (partida.placarCasa ?? 0) + (partida.placarFora ?? 0),
      );
      return;
    }
    throw new Error('amostra sem gol anulado — aumente a busca');
  });
});
