/**
 * Propostas de emprego ao técnico. Puro e determinístico: a reputação do técnico
 * atrai clubes MAIORES que o atual (um passo acima) e dispostos a contratá-lo.
 * Deriva de clubeElegivelParaTecnico (mesma régua do mercado de técnicos); sem
 * estado, sem RNG. Aceitar uma proposta reusa a ação assumirClube da store.
 */

import {clubeElegivelParaTecnico} from './carreiraEngine';

export interface ClubeCandidato {
  id: string;
  nome: string;
  reputacao: number;
  divisao?: string;
}

export interface PropostaEmprego {
  clubeId: string;
  nome: string;
  reputacao: number;
  divisao: string;
}

/**
 * Lista os clubes que fariam proposta ao técnico: maiores que o clube atual e
 * ainda dispostos a contratá-lo pela reputação. Ordenados do maior ao menor.
 */
export function proporEmpregos(args: {
  reputacaoTecnico: number;
  clubeAtualId: string;
  reputacaoClubeAtual: number;
  clubes: ClubeCandidato[];
  maximo?: number;
}): PropostaEmprego[] {
  const {
    reputacaoTecnico,
    clubeAtualId,
    reputacaoClubeAtual,
    clubes,
    maximo = 3,
  } = args;

  return clubes
    .filter(
      clube =>
        clube.id !== clubeAtualId &&
        clube.reputacao > reputacaoClubeAtual &&
        clubeElegivelParaTecnico(reputacaoTecnico, clube.reputacao),
    )
    .sort((a, b) => b.reputacao - a.reputacao || a.id.localeCompare(b.id))
    .slice(0, Math.max(0, maximo))
    .map(clube => ({
      clubeId: clube.id,
      nome: clube.nome,
      reputacao: clube.reputacao,
      divisao: clube.divisao ?? 'Série A',
    }));
}
