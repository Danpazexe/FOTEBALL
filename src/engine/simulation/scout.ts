/**
 * Scout do adversário. Puro e determinístico: analisa o elenco do próximo rival
 * e resume a ameaça — força por setor (ataque/meio/defesa), setor mais forte e
 * mais fraco e o melhor jogador. Derivação do elenco já existente; sem estado,
 * sem RNG. Ignora indisponíveis (lesionados/suspensos), pois não entram em campo.
 */

import type {Player, Position} from '../../types';
import {linhaDaPosicao} from './teamStrength';

export type Setor = 'ataque' | 'meio' | 'defesa';

export interface ScoutJogador {
  id: string;
  nome: string;
  posicao: Position;
  overall: number;
}

export interface ScoutAdversario {
  forcaAtaque: number;
  forcaMeio: number;
  forcaDefesa: number;
  setorForte: Setor;
  setorFraco: Setor;
  melhorJogador: ScoutJogador | null;
}

/** Quantos jogadores por setor entram na média (aprox. um XI: 5 def c/ GOL, 3+3). */
const TOP_POR_SETOR: Record<Setor, number> = {defesa: 5, meio: 3, ataque: 3};

function mediaTopN(overalls: number[], n: number): number {
  if (overalls.length === 0) {
    return 0;
  }
  const top = [...overalls].sort((a, b) => b - a).slice(0, n);
  return Math.round(top.reduce((soma, ov) => soma + ov, 0) / top.length);
}

/** Resume a ameaça do elenco adversário (só jogadores disponíveis). */
export function analisarAdversario(jogadores: Player[]): ScoutAdversario {
  const disponiveis = jogadores.filter(
    jogador => !jogador.lesionado && !jogador.suspenso,
  );

  const porSetor: Record<Setor, number[]> = {ataque: [], meio: [], defesa: []};
  let melhorJogador: ScoutJogador | null = null;
  for (const jogador of disponiveis) {
    porSetor[linhaDaPosicao(jogador.posicaoPrincipal)].push(jogador.overall);
    if (!melhorJogador || jogador.overall > melhorJogador.overall) {
      melhorJogador = {
        id: jogador.id,
        nome: jogador.apelido ?? jogador.nome,
        posicao: jogador.posicaoPrincipal,
        overall: jogador.overall,
      };
    }
  }

  const forcaAtaque = mediaTopN(porSetor.ataque, TOP_POR_SETOR.ataque);
  const forcaMeio = mediaTopN(porSetor.meio, TOP_POR_SETOR.meio);
  const forcaDefesa = mediaTopN(porSetor.defesa, TOP_POR_SETOR.defesa);

  const setores: Array<{setor: Setor; forca: number}> = [
    {setor: 'ataque', forca: forcaAtaque},
    {setor: 'meio', forca: forcaMeio},
    {setor: 'defesa', forca: forcaDefesa},
  ];
  // Ordem estável (ataque > meio > defesa em empate) para determinismo.
  const setorForte = setores.reduce((forte, atual) =>
    atual.forca > forte.forca ? atual : forte,
  ).setor;
  const setorFraco = setores.reduce((fraco, atual) =>
    atual.forca < fraco.forca ? atual : fraco,
  ).setor;

  return {
    forcaAtaque,
    forcaMeio,
    forcaDefesa,
    setorForte,
    setorFraco,
    melhorJogador,
  };
}
