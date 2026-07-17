/**
 * SELECTORS DO MUNDO (AD-05) — consultas puras sobre o WorldState. É por aqui
 * que o mercado passa a enxergar TODAS as ligas carregadas (não só a ativa), e
 * que qualquer clube é acessível por id.
 */
import type {Clube, Player, Position} from '../../types';
import {competicaoPorDivisaoLegada, competicaoPorId} from '../../engine/competitions/registry/competitionRegistry';
import type {WorldState} from './worldTypes';

export function selectClubePorId(
  world: WorldState,
  clubeId: string,
): Clube | undefined {
  return world.clubsById[clubeId];
}

export function selectJogadorPorId(
  world: WorldState,
  jogadorId: string,
): Player | undefined {
  return world.playersById[jogadorId];
}

/** Jogadores QUE ATUAM num clube (posse = clubeId; inclui emprestados que jogam lá). */
export function selectJogadoresClube(
  world: WorldState,
  clubeId: string,
): Player[] {
  return Object.values(world.playersById).filter(j => j.clubeId === clubeId);
}

/** Clubes de uma competição (via divisão legada equivalente enquanto migra). */
export function selectClubesCompeticao(
  world: WorldState,
  competitionId: string,
): Clube[] {
  const competicao = competicaoPorId(competitionId);
  if (!competicao) {
    return [];
  }
  return Object.values(world.clubsById).filter(clube => {
    const comp = competicaoPorDivisaoLegada(clube.divisao);
    return comp?.id === competitionId;
  });
}

/** Clubes da liga ATIVA da carreira. */
export function selectClubesLigaAtiva(world: WorldState): Clube[] {
  return world.activeCompetitionId
    ? selectClubesCompeticao(world, world.activeCompetitionId)
    : [];
}

export interface FiltrosMercadoGlobal {
  /** Texto: nome/apelido do jogador ou nome do clube. */
  busca?: string;
  /** Restringe por país (via competição do clube). */
  countryId?: string;
  /** Restringe por competição. */
  competitionId?: string;
  posicao?: Position;
  idadeMax?: number;
  overallMin?: number;
  valorMax?: number;
  /** Só agentes livres (clubeId null). */
  soAgentesLivres?: boolean;
  /** Só quem NÃO é do clube informado (ex.: esconder o próprio elenco). */
  excluirClubeId?: string;
}

function normalizar(texto: string): string {
  // Remove diacríticos combinantes (U+0300–U+036F) para busca acento-insensível.
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * MERCADO GLOBAL (RF-06/RF-07/RF-08): todos os jogadores de TODAS as ligas
 * carregadas, filtrados. Puro; a paginação/ordenação fica no chamador (a tela
 * aplica limite). Não inclui o próprio jogador se `excluirClubeId` casar.
 */
export function selectJogadoresMercadoGlobal(
  world: WorldState,
  filtros: FiltrosMercadoGlobal = {},
): Player[] {
  const buscaNorm = filtros.busca ? normalizar(filtros.busca) : undefined;
  return Object.values(world.playersById).filter(jogador => {
    if (filtros.soAgentesLivres && jogador.clubeId !== null) {
      return false;
    }
    if (filtros.excluirClubeId && jogador.clubeId === filtros.excluirClubeId) {
      return false;
    }
    if (filtros.posicao && jogador.posicaoPrincipal !== filtros.posicao) {
      return false;
    }
    if (filtros.idadeMax !== undefined && jogador.idade > filtros.idadeMax) {
      return false;
    }
    if (filtros.overallMin !== undefined && jogador.overall < filtros.overallMin) {
      return false;
    }
    if (filtros.valorMax !== undefined && jogador.valorMercado > filtros.valorMax) {
      return false;
    }
    const clube = jogador.clubeId ? world.clubsById[jogador.clubeId] : undefined;
    if (filtros.countryId || filtros.competitionId) {
      const comp = competicaoPorDivisaoLegada(clube?.divisao);
      if (filtros.competitionId && comp?.id !== filtros.competitionId) {
        return false;
      }
      if (filtros.countryId && comp?.countryId !== filtros.countryId) {
        return false;
      }
    }
    if (buscaNorm) {
      const alvo = normalizar(
        `${jogador.nome} ${jogador.apelido ?? ''} ${clube?.nome ?? ''}`,
      );
      if (!alvo.includes(buscaNorm)) {
        return false;
      }
    }
    return true;
  });
}
