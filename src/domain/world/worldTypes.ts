/**
 * ESTADO CANÔNICO DO MUNDO (AD-05) — visão indexada por id sobre o conjunto
 * MESTRE de clubes/jogadores da carreira. É a fonte inequívoca para operações de
 * mercado e selectors; a store mantém os arrays por compatibilidade e converte
 * nas bordas (criarWorld / worldParaArrays).
 *
 * Propriedade do jogador = `Player.clubeId` (fonte única, RN-01). `Clube.elenco`
 * e `Clube.formacaoAtual` são DERIVADOS e mantidos coerentes pelas operações.
 */
import type {Clube, Player} from '../../types';
import type {TransferRecord} from '../../types/world';

export interface WorldState {
  clubsById: Record<string, Clube>;
  playersById: Record<string, Player>;
  /** Competição ativa da carreira (ver competitionRegistry). */
  activeCompetitionId: string | null;
  userClubId: string | null;
  /** Histórico mundial de transferências (AD-09). */
  transferHistory: TransferRecord[];
}

export interface CriarWorldInput {
  clubes: Clube[];
  jogadores: Player[];
  activeCompetitionId?: string | null;
  userClubId?: string | null;
  transferHistory?: TransferRecord[];
}

function indexarPorId<T extends {id: string}>(itens: T[]): Record<string, T> {
  const mapa: Record<string, T> = {};
  for (const item of itens) {
    mapa[item.id] = item;
  }
  return mapa;
}

/** Constrói o WorldState a partir dos arrays MESTRES (todosClubes/todosJogadores). */
export function criarWorld(input: CriarWorldInput): WorldState {
  return {
    clubsById: indexarPorId(input.clubes),
    playersById: indexarPorId(input.jogadores),
    activeCompetitionId: input.activeCompetitionId ?? null,
    userClubId: input.userClubId ?? null,
    transferHistory: input.transferHistory ?? [],
  };
}

/** Converte o WorldState de volta para arrays (para a store persistir). */
export function worldParaArrays(world: WorldState): {
  clubes: Clube[];
  jogadores: Player[];
  transferHistory: TransferRecord[];
} {
  return {
    clubes: Object.values(world.clubsById),
    jogadores: Object.values(world.playersById),
    transferHistory: world.transferHistory,
  };
}
