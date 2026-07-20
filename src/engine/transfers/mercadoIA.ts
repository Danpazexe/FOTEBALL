import type {Clube, Player} from '../../types';
import {criarRNGComSeed, embaralhar, type RandomGenerator} from '../simulation/rng';

/**
 * Mercado IA↔IA (BRASFOOT_MASTER §9.4): os clubes controlados pela IA negociam
 * ENTRE SI entre as rodadas, deixando o mundo vivo (os elencos evoluem mesmo sem
 * o usuário). Puro e determinístico (RNG semeado por temporada/rodada); o caixa
 * é conservado (comprador paga, vendedor recebe). O clube do usuário não entra.
 */

export interface TransferenciaIA {
  jogadorId: string;
  deClubeId: string;
  paraClubeId: string;
  valor: number;
}

/** Faixa de overall que a IA negocia (craques > 82 raramente trocam de clube). */
const OVERALL_MIN = 62;
const OVERALL_MAX = 82;
/** Sobre-preço da IA sobre o valor de mercado. */
const MARKUP = 1.1;
/** Saldo mínimo para um clube da IA entrar como comprador. */
const SALDO_MINIMO_COMPRADOR = 1_000_000;

function mediaTop11(jogadores: Player[]): number {
  if (jogadores.length === 0) {
    return 0;
  }
  const melhores = [...jogadores]
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 11);
  return melhores.reduce((soma, j) => soma + j.overall, 0) / melhores.length;
}

/**
 * Gera as transferências entre os clubes da IA para uma rodada. `clubes` já deve
 * vir SEM o clube do usuário. Um jogador mid-tier vai para um clube que (a) não é
 * o atual, (b) pode pagar e (c) MELHORA com a contratação (média < overall dele).
 */
export function gerarTransferenciasIA(args: {
  clubes: Clube[];
  jogadores: Player[];
  seed: number;
  maxTransferencias?: number;
}): TransferenciaIA[] {
  const {clubes, jogadores, seed} = args;
  const max = args.maxTransferencias ?? 2;
  const rng = criarRNGComSeed(seed);
  const idsClubes = new Set(clubes.map(clube => clube.id));

  const saldoPorClube = new Map(
    clubes.map(clube => [clube.id, clube.financas.saldo]),
  );
  const jogadoresPorClube = new Map<string, Player[]>();
  for (const jogador of jogadores) {
    if (jogador.clubeId && idsClubes.has(jogador.clubeId)) {
      const lista = jogadoresPorClube.get(jogador.clubeId) ?? [];
      lista.push(jogador);
      jogadoresPorClube.set(jogador.clubeId, lista);
    }
  }
  const mediaPorClube = new Map(
    clubes.map(clube => [
      clube.id,
      mediaTop11(jogadoresPorClube.get(clube.id) ?? []),
    ]),
  );

  const candidatos = embaralhar(
    jogadores.filter(
      jogador =>
        jogador.clubeId != null &&
        idsClubes.has(jogador.clubeId) &&
        !jogador.emprestimo &&
        jogador.overall >= OVERALL_MIN &&
        jogador.overall <= OVERALL_MAX,
    ),
    rng,
  );

  const transferencias: TransferenciaIA[] = [];
  for (const alvo of candidatos) {
    if (transferencias.length >= max) {
      break;
    }
    const vendedorId = alvo.clubeId;
    if (!vendedorId) {
      continue;
    }
    const valor = Math.round(alvo.valorMercado * MARKUP);
    const compradores = clubes.filter(
      clube =>
        clube.id !== vendedorId &&
        (saldoPorClube.get(clube.id) ?? 0) >= valor &&
        (saldoPorClube.get(clube.id) ?? 0) >= SALDO_MINIMO_COMPRADOR &&
        (mediaPorClube.get(clube.id) ?? 0) < alvo.overall,
    );
    if (compradores.length === 0) {
      continue;
    }
    const comprador = compradores[Math.floor(rng() * compradores.length)];
    if (!comprador) {
      continue;
    }
    saldoPorClube.set(comprador.id, (saldoPorClube.get(comprador.id) ?? 0) - valor);
    saldoPorClube.set(vendedorId, (saldoPorClube.get(vendedorId) ?? 0) + valor);
    transferencias.push({
      jogadorId: alvo.id,
      deClubeId: vendedorId,
      paraClubeId: comprador.id,
      valor,
    });
  }
  return transferencias;
}
