/**
 * MODELO DE xG POR CHUTE (Etapas 5–6 da cadeia causal).
 *
 * O xG é a qualidade OBJETIVA da oportunidade — não muda com quem chuta nem
 * com o goleiro (RN-03). A execução entra depois, na probabilidade final de
 * conversão (ajusteFinalizador × ajusteGoleiro), com médias centradas em 1.0
 * para o balanceamento agregado não se mover com elencos típicos.
 *
 * Fórmula explícita e monotônica (RNF-07): base por zona × situação × corpo ×
 * pressão. Sem machine learning, sem números fora de matchModelConfig.
 */
import {limitar} from '../rng';
import {RESOLUCAO_CAUSAL, XG_CAUSAL} from './matchModelConfig';

import type {ParteCorpoChute, SituacaoLance} from '../../../types';

export interface PerfilChute {
  situacao: SituacaoLance;
  corpo: ParteCorpoChute;
  /** Chute de fora da área. */
  deFora: boolean;
  /** Dentro da pequena área / cara do gol (só quando não é deFora). */
  areaCurta: boolean;
  /** Pressão defensiva sobre o chute (0..1). */
  pressao: number;
}

/** xG-base da oportunidade (0..1), antes da execução. Pênalti/falta são fixos. */
export function calcularBaseXG(perfil: PerfilChute): number {
  if (perfil.situacao === 'penalti') {
    return XG_CAUSAL.xgPenalti;
  }
  if (perfil.situacao === 'falta') {
    return XG_CAUSAL.xgFaltaDireta;
  }

  let xg = perfil.deFora
    ? XG_CAUSAL.baseFora
    : perfil.areaCurta
      ? XG_CAUSAL.baseAreaCurta
      : XG_CAUSAL.baseArea;

  if (perfil.corpo === 'cabeca') {
    xg *= XG_CAUSAL.multCabeca;
  }
  if (perfil.situacao === 'contra_ataque') {
    xg *= XG_CAUSAL.multContraAtaque;
  } else if (perfil.situacao === 'escanteio') {
    xg *= XG_CAUSAL.multEscanteio;
  } else if (perfil.situacao === 'rebote') {
    xg *= XG_CAUSAL.multRebote;
  }

  xg *= 1 - XG_CAUSAL.pesoPressao * limitar(perfil.pressao, 0, 1);

  return limitar(xg, XG_CAUSAL.minimo, XG_CAUSAL.maximo);
}

/** Execução do finalizador: ±~10% entre um 45 e um 95 (centrado no 72). */
export function ajusteFinalizador(atributoFinalizacao: number): number {
  return (
    1 +
    (atributoFinalizacao - RESOLUCAO_CAUSAL.atributoFinalizadorNeutro) /
      RESOLUCAO_CAUSAL.divisorFinalizador
  );
}

/**
 * Efeito do goleiro na conversão do chute — mesma curva do antigo fatorGoleiro
 * (probabilityCalc), agora aplicada no lugar CERTO da cadeia: a resolução.
 */
export function ajusteGoleiro(forcaGoleiro: number): number {
  return limitar(
    1 -
      (forcaGoleiro - RESOLUCAO_CAUSAL.goleiroNeutro) /
        RESOLUCAO_CAUSAL.divisorGoleiro,
    RESOLUCAO_CAUSAL.pisoAjusteGoleiro,
    RESOLUCAO_CAUSAL.tetoAjusteGoleiro,
  );
}

/** Probabilidade FINAL de conversão: chance objetiva × execução × goleiro. */
export function probConversaoChute(
  baseXG: number,
  atributoFinalizacao: number,
  forcaGoleiroAdversario: number,
): number {
  return limitar(
    baseXG *
      ajusteFinalizador(atributoFinalizacao) *
      ajusteGoleiro(forcaGoleiroAdversario),
    RESOLUCAO_CAUSAL.pisoConversao,
    RESOLUCAO_CAUSAL.tetoConversao,
  );
}
