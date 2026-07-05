/**
 * Objetivo da diretoria por temporada (meta contratada). Puro e determinístico:
 * a força/reputação do clube + a divisão definem uma meta clara (do "não cair"
 * ao "título"), com uma posição-alvo na tabela. O progresso é lido da posição
 * atual; o fim de temporada rende um ajuste de reputação por cumprir ou não.
 */

import {
  type Dificuldade,
  modificadoresDificuldade,
} from './dificuldade';

export type MetaTipo =
  | 'Título'
  | 'Libertadores'
  | 'Meio de tabela'
  | 'Acesso'
  | 'Não cair';

export type ObjetivoTemporada = {
  tipo: MetaTipo;
  /** Terminar ATÉ esta posição cumpre a meta (menor = melhor). */
  posicaoAlvo: number;
  descricao: string;
};

function alvoBase(reputacaoClube: number, divisao: string): ObjetivoTemporada {
  if (divisao === 'Série B') {
    if (reputacaoClube >= 62) {
      return {tipo: 'Acesso', posicaoAlvo: 4, descricao: 'Conquistar o acesso'};
    }
    if (reputacaoClube >= 45) {
      return {
        tipo: 'Meio de tabela',
        posicaoAlvo: 10,
        descricao: 'Fazer boa campanha',
      };
    }
    return {tipo: 'Não cair', posicaoAlvo: 16, descricao: 'Escapar da queda'};
  }
  // Série A (e padrão).
  if (reputacaoClube >= 80) {
    return {tipo: 'Título', posicaoAlvo: 1, descricao: 'Brigar pelo título'};
  }
  if (reputacaoClube >= 68) {
    return {
      tipo: 'Libertadores',
      posicaoAlvo: 6,
      descricao: 'Vaga na Libertadores (G6)',
    };
  }
  if (reputacaoClube >= 55) {
    return {
      tipo: 'Meio de tabela',
      posicaoAlvo: 12,
      descricao: 'Terminar no meio da tabela',
    };
  }
  return {tipo: 'Não cair', posicaoAlvo: 16, descricao: 'Fugir do rebaixamento'};
}

function limitarPosicao(posicao: number): number {
  return Math.min(20, Math.max(1, posicao));
}

/**
 * Define a meta da temporada pela reputação + divisão, ajustada pela dificuldade:
 * mais difícil = posição-alvo mais exigente (a diretoria cobra mais).
 */
export function definirObjetivoTemporada(
  reputacaoClube: number,
  divisao: string,
  dificuldade: Dificuldade = 'Normal',
): ObjetivoTemporada {
  const base = alvoBase(reputacaoClube, divisao);
  const {ajusteMetaPosicao} = modificadoresDificuldade(dificuldade);
  if (ajusteMetaPosicao === 0) {
    return base;
  }
  return {
    ...base,
    posicaoAlvo: limitarPosicao(base.posicaoAlvo + ajusteMetaPosicao),
  };
}

/** A meta foi cumprida com esta posição final (ou atual)? */
export function metaCumprida(
  objetivo: ObjetivoTemporada,
  posicao: number,
): boolean {
  return posicao <= objetivo.posicaoAlvo;
}

/**
 * Ajuste de reputação no fim da temporada por cumprir (ou não) a meta. A
 * recompensa é fixa (+5); a PENALIDADE escala com a dificuldade (mais dura = pior).
 */
export function deltaReputacaoMeta(
  objetivo: ObjetivoTemporada,
  posicaoFinal: number,
  dificuldade: Dificuldade = 'Normal',
): number {
  if (metaCumprida(objetivo, posicaoFinal)) {
    return 5;
  }
  const {fatorPenalidadeMeta} = modificadoresDificuldade(dificuldade);
  return -Math.round(5 * fatorPenalidadeMeta);
}
