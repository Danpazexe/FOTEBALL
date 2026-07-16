/**
 * Contratos do SISTEMA DE PATROCÍNIOS.
 *
 * Divergências deliberadas do briefing (código é fonte da verdade — CLAUDE.md):
 *  • `clubeId` é STRING (ids de clube do projeto), não number;
 *  • valores em REAIS inteiros (mesma unidade do resto das finanças);
 *  • estado vive no GameState e é persistido pelo snapshot JSON (sem SQLite).
 *
 * O estado do jogo guarda apenas o `patrocinadorId` — o logo (PNG) é resolvido
 * na UI pelo mapa estático `src/assets/patrocinadores`.
 */

export type AlcancePatrocinador = 'REGIONAL' | 'NACIONAL' | 'GLOBAL';

export type StatusPropostaPatrocinio =
  | 'PENDENTE'
  | 'ACEITA'
  | 'RECUSADA'
  | 'EXPIRADA';

export type StatusContratoPatrocinio = 'ATIVO' | 'CONCLUIDO' | 'RESCINDIDO';

export type TipoMetaPatrocinio =
  | 'POSICAO_LIGA'
  | 'ACESSO'
  | 'EVITAR_REBAIXAMENTO'
  | 'FASE_COPA'
  | 'TITULO'
  | 'VITORIAS'
  | 'INVENCIBILIDADE'
  | 'USO_DA_BASE';

/** Um patrocinador do catálogo (36 marcas fictícias). */
export interface Patrocinador {
  readonly id: string;
  readonly nome: string;
  readonly categoria: string;
  readonly alcance: AlcancePatrocinador;
  readonly ativo: boolean;
}

/** Meta de um contrato: obrigatória (compõe o fixo) ou bônus (paga se cumprida). */
export interface MetaPatrocinio {
  readonly id: string;
  readonly tipo: TipoMetaPatrocinio;
  readonly descricao: string;
  /** Alvo numérico (posição, nº de vitórias, fase da copa...). */
  readonly alvo: number;
  /** Progresso atual (derivado dos resultados). */
  readonly progresso: number;
  /** Bônus pago ao concluir (0 para meta puramente obrigatória). */
  readonly valorBonus: number;
  readonly concluida: boolean;
  /** Bônus já creditado (idempotência). */
  readonly bonusPago: boolean;
}

/** Proposta pendente que o jogador pode aceitar ou recusar. */
export interface PropostaPatrocinio {
  readonly id: string;
  readonly patrocinadorId: string;
  readonly clubeId: string;
  readonly temporadaInicio: number;
  readonly duracaoTemporadas: 1 | 2 | 3;
  readonly valorFixoTotal: number;
  /** Parcela paga por temporada (valorFixoTotal / duração). */
  readonly valorPorTemporada: number;
  /** Bônus creditado a cada vitória do clube. */
  readonly bonusPorVitoria: number;
  readonly metas: readonly MetaPatrocinio[];
  /** Temporada em que a proposta caduca (só válida na temporada de origem). */
  readonly temporadaExpiracao: number;
  readonly status: StatusPropostaPatrocinio;
  /** Renovação oferecida pelo patrocinador atual (destaque na UI). */
  readonly ehRenovacao: boolean;
}

/** Contrato ativo/encerrado, derivado de uma proposta aceita. */
export interface ContratoPatrocinio {
  readonly id: string;
  readonly propostaOrigemId: string;
  readonly patrocinadorId: string;
  readonly clubeId: string;
  readonly temporadaInicio: number;
  readonly temporadaFim: number;
  readonly valorFixoTotal: number;
  readonly valorPorTemporada: number;
  readonly bonusPorVitoria: number;
  readonly valorPago: number;
  readonly metas: readonly MetaPatrocinio[];
  readonly status: StatusContratoPatrocinio;
}

/** Fatia do estado do jogo dedicada a patrocínios (persistida no snapshot). */
export interface EstadoPatrocinio {
  readonly propostas: readonly PropostaPatrocinio[];
  readonly contratoAtivo: ContratoPatrocinio | null;
  readonly historico: readonly ContratoPatrocinio[];
  /** Temporada em que as propostas atuais foram geradas (evita regerar). */
  readonly temporadaPropostas: number;
}

export function criarEstadoPatrocinioVazio(): EstadoPatrocinio {
  return {propostas: [], contratoAtivo: null, historico: [], temporadaPropostas: 0};
}
