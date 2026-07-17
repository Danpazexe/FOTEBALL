import type {Player} from '../../types';

import {aplicarAlvoDeOverall} from '../progression/calibracaoAtributos';

/**
 * Empréstimos de jogadores (BRASFOOT_MASTER §9.3). Um jogador cedido joga por
 * outro clube até o início da temporada de retorno, quando volta ao dono. O
 * salário acompanha o `clubeId` (quem usa, paga). Funções puras — o store
 * dispara as ações e o `finalizarTemporada` processa os retornos.
 */

/** Taxa do empréstimo (fração do valor de mercado) paga por quem pega emprestado. */
export const TAXA_EMPRESTIMO = 0.1;
/** Idade até a qual um jovem cedido volta com um leve desenvolvimento. */
export const IDADE_MAX_DESENVOLVIMENTO = 23;
/** Ganho de overall do jovem ao voltar de um empréstimo (capado no potencial). */
export const BONUS_DESENVOLVIMENTO_EMPRESTIMO = 1;

export function ehEmprestado(jogador: Player): boolean {
  return jogador.emprestimo !== undefined;
}

/** Custo do empréstimo para quem pega o jogador (taxa sobre o valor de mercado). */
export function custoEmprestimo(jogador: Player): number {
  return Math.round(jogador.valorMercado * TAXA_EMPRESTIMO);
}

/**
 * Cede o jogador a `clubeDestinoId` até `retornaEmTemporada`. O dono passa a ser
 * o clube atual; o jogador joga (e tem o salário pago) por `clubeDestinoId`.
 */
export function criarEmprestimo(
  jogador: Player,
  clubeDestinoId: string,
  retornaEmTemporada: string,
): Player {
  return {
    ...jogador,
    clubeId: clubeDestinoId,
    emprestimo: {
      clubeDonoId: jogador.clubeId ?? clubeDestinoId,
      retornaEmTemporada,
    },
  };
}

/**
 * Devolve aos donos os jogadores cujo empréstimo expira até `novaTemporada`.
 * Jovens (idade < 23) voltam com um leve desenvolvimento (minutos no clube que
 * o pegou), capado no potencial.
 */
export function processarRetornosEmprestimo(
  jogadores: Player[],
  novaTemporada: string,
): Player[] {
  return jogadores.map(jogador => {
    const emprestimo = jogador.emprestimo;
    if (!emprestimo || emprestimo.retornaEmTemporada > novaTemporada) {
      return jogador;
    }
    // PR-01 (épico Overall Dinâmico): o bônus de desenvolvimento entra pelos
    // ATRIBUTOS (viés por categoria/idade) e o overall resulta deles.
    const alvo =
      jogador.idade < IDADE_MAX_DESENVOLVIMENTO
        ? Math.min(
            jogador.potencial,
            jogador.overall + BONUS_DESENVOLVIMENTO_EMPRESTIMO,
          )
        : jogador.overall;
    const {atributos, overall} = aplicarAlvoDeOverall(jogador, alvo);
    return {
      ...jogador,
      clubeId: emprestimo.clubeDonoId,
      atributos,
      overall,
      emprestimo: undefined,
    };
  });
}
