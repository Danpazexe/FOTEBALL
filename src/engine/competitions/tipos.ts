/**
 * Tipos da engine de competições nacionais (Série D, e adiante Copa do Brasil).
 * Reaproveitam os tipos de domínio existentes (`TabelaClassificacao`, `Clube`,
 * `Partida`) e adicionam o que falta para grupos + mata-mata ida/volta.
 */
import type {TabelaClassificacao} from '../../types';

/**
 * Linha de classificação estendida com cartões — necessária para o desempate
 * COMPLETO da CBF (vermelhos e amarelos), que a `TabelaClassificacao` base não
 * carrega. Compatível por extensão com a base.
 */
export interface LinhaClassificacao extends TabelaClassificacao {
  cartoesAmarelos: number;
  cartoesVermelhos: number;
}

/** Um grupo da fase de grupos (ex.: Grupo 'A' com 6 clubes). */
export interface GrupoCompeticao {
  id: string;
  clubeIds: string[];
}

/** Classificação final de um grupo (linhas já ordenadas pelo desempate CBF). */
export interface ClassificacaoGrupo {
  grupoId: string;
  linhas: LinhaClassificacao[];
}

/**
 * Clube que avançou da fase de grupos, com sua posição no grupo e o `seed`
 * geral (1 = melhor campanha) usado para semear o chaveamento do mata-mata.
 */
export interface Classificado {
  clubeId: string;
  grupoId: string;
  /** Posição no grupo (1 = líder). */
  posicao: number;
  linha: LinhaClassificacao;
  /** Ranking geral entre todos os classificados (1..N), atribuído no seeding. */
  seed: number;
}

/** Como um confronto de mata-mata foi decidido. */
export type DecididoPor = 'AGREGADO' | 'PENALTIS' | 'WO';

/**
 * Confronto eliminatório. Semântica de mando:
 * - Ida e volta: a IDA é na casa do `clubeA` e a VOLTA na casa do `clubeB`. O
 *   mando final (jogar a volta em casa) é dado à MELHOR campanha → `clubeB`.
 * - Jogo único: disputado na casa do `clubeB` (melhor campanha / melhor ranking).
 *
 * Sem gol fora (abolido pela CBF em 2018): empate no agregado → pênaltis.
 */
export interface ConfrontoMataMata {
  id: string;
  fase: string;
  /** Manda a ida (pior campanha). Visitante no jogo único. */
  clubeA: string;
  /** Manda a volta / o jogo único (melhor campanha). */
  clubeB: string;
  jogoUnico: boolean;
  golsIdaA?: number;
  golsIdaB?: number;
  /** Placar da volta — `clubeA` joga como visitante. Ausente no jogo único. */
  golsVoltaA?: number;
  golsVoltaB?: number;
  agregadoA?: number;
  agregadoB?: number;
  /** Pênaltis (só quando o agregado empata). */
  penaltisA?: number;
  penaltisB?: number;
  vencedor?: string;
  perdedor?: string;
  decididoPor?: DecididoPor;
}

/** Uma fase inteira do mata-mata. */
export interface FaseMataMata {
  nome: string;
  confrontos: ConfrontoMataMata[];
}

/**
 * Força efetiva de um clube (0–100) usada pela simulação rápida de partidas de
 * fundo (jogos que o usuário não disputa ao vivo). Deriva da média dos 11
 * melhores overalls do elenco (ver `forcaDoElenco`).
 */
export type ForcaPorClube = Map<string, number>;
