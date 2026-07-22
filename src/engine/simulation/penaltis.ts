/**
 * Disputa de pênaltis detalhada — mesma regra e MESMA ordem de consumo do RNG
 * de `disputarPenaltis` (matchSimulator), mas devolvendo a disputa cobrança a
 * cobrança para a apresentação ao vivo. Cinco cobranças por lado e, persistindo
 * o empate, morte súbita em rodadas pareadas.
 *
 * A atribuição de batedores é COSMÉTICA: não consome RNG nem altera o
 * resultado — ordem determinística por finalização (goleiro por último).
 */
import type {Player} from '../../types';

import {limitar, type RandomGenerator} from './rng';

export interface CobrancaPenalti {
  /** Clube que cobrou. */
  timeId: string;
  /** Batedor (ausente quando o elenco não foi informado). */
  jogadorId?: string;
  convertido: boolean;
  /** 1-5 = série normal; >5 = morte súbita. */
  rodada: number;
}

export interface DisputaPenaltis {
  cobrancas: CobrancaPenalti[];
  golsCasa: number;
  golsFora: number;
  vencedor: string;
}

/**
 * Ordem de cobrança determinística: melhores finalizadores primeiro, goleiros
 * por último (desempate por overall e id para estabilidade).
 */
export function ordenarBatedores(jogadores: Player[]): Player[] {
  return [...jogadores].sort((a, b) => {
    const goleiroA = a.posicaoPrincipal === 'GOL' ? 1 : 0;
    const goleiroB = b.posicaoPrincipal === 'GOL' ? 1 : 0;
    if (goleiroA !== goleiroB) {
      return goleiroA - goleiroB;
    }
    if (a.atributos.finalizacao !== b.atributos.finalizacao) {
      return b.atributos.finalizacao - a.atributos.finalizacao;
    }
    if (a.overall !== b.overall) {
      return b.overall - a.overall;
    }
    return a.id < b.id ? -1 : 1;
  });
}

function batedorDaVez(batedores: Player[], indice: number): string | undefined {
  if (batedores.length === 0) {
    return undefined;
  }
  return batedores[indice % batedores.length]?.id;
}

export function simularDisputaPenaltis(
  rng: RandomGenerator,
  habilidadeCasa: number,
  habilidadeFora: number,
  casaId: string,
  foraId: string,
  elencoCasa: Player[] = [],
  elencoFora: Player[] = [],
): DisputaPenaltis {
  const probDe = (hab: number) => limitar(0.55 + hab / 300, 0.6, 0.85);
  const probCasa = probDe(habilidadeCasa);
  const probFora = probDe(habilidadeFora);
  const batedoresCasa = ordenarBatedores(elencoCasa);
  const batedoresFora = ordenarBatedores(elencoFora);

  const cobrancas: CobrancaPenalti[] = [];
  let golsCasa = 0;
  let golsFora = 0;
  let indiceCasa = 0;
  let indiceFora = 0;

  const cobrar = (lado: 'casa' | 'fora', rodada: number): boolean => {
    const daCasa = lado === 'casa';
    const convertido = rng() < (daCasa ? probCasa : probFora);
    cobrancas.push({
      timeId: daCasa ? casaId : foraId,
      jogadorId: daCasa
        ? batedorDaVez(batedoresCasa, indiceCasa)
        : batedorDaVez(batedoresFora, indiceFora),
      convertido,
      rodada,
    });
    if (daCasa) {
      indiceCasa += 1;
      golsCasa += convertido ? 1 : 0;
    } else {
      indiceFora += 1;
      golsFora += convertido ? 1 : 0;
    }
    return convertido;
  };

  for (let i = 0; i < 5; i += 1) {
    cobrar('casa', i + 1);
    cobrar('fora', i + 1);
  }
  // Morte súbita: rodadas extras até alguém abrir vantagem na mesma rodada.
  let rodada = 6;
  while (golsCasa === golsFora) {
    const fezCasa = cobrar('casa', rodada);
    const fezFora = cobrar('fora', rodada);
    rodada += 1;
    if (fezCasa !== fezFora) {
      break;
    }
  }

  return {
    cobrancas,
    golsCasa,
    golsFora,
    vencedor: golsCasa > golsFora ? casaId : foraId,
  };
}
