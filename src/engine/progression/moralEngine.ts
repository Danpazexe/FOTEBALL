import type {Partida, Player} from '../../types';

/**
 * Sistema de moral (Módulo 4). Pós-partida, cada jogador ganha/perde moral
 * conforme o resultado e o que fez em campo. Funções puras — a moral resultante
 * é sempre limitada a [10, 100] por `aplicarMoral`.
 */

export interface DeltaMoral {
  jogadorId: string;
  delta: number;
  motivo: string;
}

export type ResultadoPartida = 'casa' | 'fora' | 'empate';

export const MORAL_MIN = 10;
export const MORAL_MAX = 100;

/** Aplica um delta à moral atual, mantendo o valor entre 10 e 100. */
export function aplicarMoral(moralAtual: number, delta: number): number {
  return Math.min(MORAL_MAX, Math.max(MORAL_MIN, moralAtual + delta));
}

/**
 * Calcula os deltas de moral de um clube após uma partida.
 *
 * Regras:
 * - Vitória: titulares +3, reservas que não entraram +1
 * - Empate: 0
 * - Derrota: titulares -4, reservas -1
 * - Goleada (diferença >= 3 gols), além do resultado base (BRASFOOT_MASTER §5):
 *     vitória por goleada → +3 titular / +1 reserva
 *     derrota por goleada → -5 titular / -2 reserva (vexame pesa mais)
 * - Marcou gol na partida: +8 adicional
 * - Sofreu lesão na partida: -5 adicional
 * - Expulso (vermelho): -6 adicional
 *
 * `jogadoresEmCampo` = ids dos titulares + substitutos que entraram (tratados
 * como "titulares" para o bônus). Os demais do elenco contam como reservas.
 */
export function calcularDeltasMoralPartida(
  partida: Partida,
  clubeId: string,
  jogadoresDoClube: Player[],
  jogadoresEmCampo: string[],
  vencedor: ResultadoPartida,
): DeltaMoral[] {
  const emCampo = new Set(jogadoresEmCampo);
  const venceu =
    (vencedor === 'casa' && clubeId === partida.timeCasa) ||
    (vencedor === 'fora' && clubeId === partida.timeFora);
  const perdeu = vencedor !== 'empate' && !venceu;
  const golsCasa = partida.placarCasa ?? 0;
  const golsFora = partida.placarFora ?? 0;
  const goleada = Math.abs(golsCasa - golsFora) >= 3;

  return jogadoresDoClube.map(jogador => {
    const titular = emCampo.has(jogador.id);
    let delta = 0;
    const motivos: string[] = [];

    if (venceu) {
      delta += titular ? 3 : 1;
      motivos.push('vitória');
      if (goleada) {
        delta += titular ? 3 : 1;
        motivos.push('goleada');
      }
    } else if (perdeu) {
      delta += titular ? -4 : -1;
      motivos.push('derrota');
      if (goleada) {
        delta += titular ? -5 : -2;
        motivos.push('goleada sofrida');
      }
    } else {
      motivos.push('empate');
    }

    const eventos = partida.eventos.filter(
      evento => evento.jogadorId === jogador.id,
    );
    if (eventos.some(evento => evento.tipo === 'gol')) {
      delta += 8;
      motivos.push('gol marcado');
    }
    if (eventos.some(evento => evento.tipo === 'lesao')) {
      delta -= 5;
      motivos.push('lesão');
    }
    if (eventos.some(evento => evento.tipo === 'cartao_vermelho')) {
      delta -= 6;
      motivos.push('expulsão');
    }

    return {jogadorId: jogador.id, delta, motivo: motivos.join(', ')};
  });
}

/**
 * Ação "Conversa com o grupo" — o técnico pode usar 1x por semana.
 * Aplica +5 de moral a todos os jogadores do elenco (limitado a 100 depois).
 */
export function converteComGrupo(jogadores: Player[]): DeltaMoral[] {
  return jogadores.map(jogador => ({
    jogadorId: jogador.id,
    delta: 5,
    motivo: 'conversa com o grupo',
  }));
}
