/**
 * CONTRATOS DO RELÓGIO DA CARREIRA (épico Overall Dinâmico, Onda 1).
 *
 * A carreira passa a ter uma DATA canônica (`dataAtual`, YYYY-MM-DD) como
 * relógio; a rodada é propriedade da competição. Modelo de avanço aprovado:
 * POR EVENTO — um toque leva ao próximo evento relevante e os dias entre eles
 * são processados em lote pelo pipeline diário determinístico (Onda 3).
 * O avanço PARA diante de bloqueadores (partida do usuário, decisão
 * obrigatória); pendências comuns não interrompem.
 */

/** Tipos de evento da fila do calendário (processados no máximo UMA vez). */
export type TipoEventoCarreira =
  | 'partida'
  | 'treino'
  | 'descanso'
  | 'inicio_janela'
  | 'fim_janela'
  | 'vencimento_contrato'
  | 'pagamento_salarial'
  | 'aniversario'
  | 'retorno_lesao'
  | 'relatorio_olheiro'
  | 'promocao_base'
  | 'decisao_diretoria'
  | 'inicio_temporada'
  | 'fim_temporada';

export type EscopoEventoCarreira = 'jogador' | 'clube' | 'competicao' | 'mundo';

/** Evento agendado/processado do calendário da carreira. */
export interface EventoCarreira {
  id: string;
  /** Data ISO (YYYY-MM-DD) em que o evento ocorre. */
  data: string;
  tipo: TipoEventoCarreira;
  escopo: EscopoEventoCarreira;
  /** Id do jogador/clube/competição alvo, quando o escopo pedir. */
  entidadeId?: string;
  /** Menor = mais cedo no processamento do dia. */
  prioridade: number;
  status: 'agendado' | 'processado' | 'cancelado' | 'bloqueado';
}

/** Tipos de pendência da Central (o calendário consulta antes de avançar). */
export type TipoPendencia =
  | 'definir_plano_treino'
  | 'escalacao_invalida'
  | 'proposta_expirando'
  | 'contrato_critico'
  | 'retorno_lesao'
  | 'risco_medico'
  | 'decisao_diretoria';

/**
 * Pendência do clube (mockup "Pendências do clube"). `bloqueante` define se o
 * avanço por evento PARA nela (ex.: escalação inválida) ou apenas a exibe
 * (ex.: risco médico) — notícias comuns nunca bloqueiam.
 */
export interface PendenciaCarreira {
  id: string;
  tipo: TipoPendencia;
  prioridade: 'alta' | 'media' | 'baixa';
  titulo: string;
  descricao?: string;
  /** Id do jogador/contrato/proposta relacionado, quando houver. */
  entidadeId?: string;
  /** Data ISO da carreira em que a pendência foi criada. */
  criadaEm: string;
  bloqueante: boolean;
}
