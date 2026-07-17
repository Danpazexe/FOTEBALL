/**
 * POLÍTICA DE JANELA DE TRANSFERÊNCIAS — orientada a DATA (não a rodada).
 * Decide se a janela está aberta para um clube/operação numa dada data. Pura e
 * determinística; centraliza a regra para não espalhar datas em condicionais.
 */
import type {
  CompetitionDefinition,
  TipoTransferencia,
  TransferWindowDefinition,
} from '../../types/world';
import {competicaoPorId, janelaPorId} from '../competitions/registry/competitionRegistry';

/** A data ISO (YYYY-MM-DD) está dentro de [startsAt, endsAt] inclusivo? */
function dentroDoIntervalo(data: string, inicio: string, fim: string): boolean {
  return data >= inicio && data <= fim;
}

/** A janela permite o tipo de operação? */
function permiteTipo(
  janela: TransferWindowDefinition,
  tipo: TipoTransferencia,
): boolean {
  if (tipo === 'loan' || tipo === 'loan_return') {
    return janela.allowLoans;
  }
  if (tipo === 'free_agent') {
    // Agentes livres podem entrar mesmo fora de janela permanente, se a política
    // permitir — regra clássica de manager. Aqui segue o flag da janela.
    return janela.allowFreeAgents;
  }
  return janela.allowPermanent;
}

/** A janela cobre a competição (por escopo global/país/competição)? */
function cobreCompeticao(
  janela: TransferWindowDefinition,
  competicao: CompetitionDefinition | undefined,
): boolean {
  if (janela.scope === 'global') {
    return true;
  }
  if (!competicao) {
    return false;
  }
  if (janela.scope === 'competition') {
    return (janela.competitionIds ?? []).includes(competicao.id);
  }
  return (janela.countryIds ?? []).includes(competicao.countryId);
}

export interface ContextoJanela {
  /** Data atual do mundo (ISO). */
  data: string;
  /** Competição do clube envolvido (para escopo país/competição). */
  competitionId?: string;
  tipo: TipoTransferencia;
}

/**
 * A janela está aberta para esta operação nesta data? Varre a política de janela
 * da competição (e, como a 1ª versão usa janela universal global, isso cobre
 * todas as ligas carregadas).
 */
export function janelaAberta(ctx: ContextoJanela): boolean {
  const competicao = ctx.competitionId
    ? competicaoPorId(ctx.competitionId)
    : undefined;
  const politicaId = competicao?.transferWindowPolicyId;
  const janela = politicaId ? janelaPorId(politicaId) : undefined;
  if (!janela) {
    // Sem política conhecida → assume janela universal aberta (compat).
    return true;
  }
  return (
    dentroDoIntervalo(ctx.data, janela.startsAt, janela.endsAt) &&
    permiteTipo(janela, ctx.tipo) &&
    cobreCompeticao(janela, competicao)
  );
}
