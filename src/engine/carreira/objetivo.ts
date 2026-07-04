/**
 * Objetivo da diretoria por temporada (meta contratada). Puro e determinístico:
 * a força/reputação do clube + a divisão definem uma meta clara (do "não cair"
 * ao "título"), com uma posição-alvo na tabela. O progresso é lido da posição
 * atual; o fim de temporada rende um ajuste de reputação por cumprir ou não.
 */

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

/** Define a meta da temporada pela reputação do clube + divisão. */
export function definirObjetivoTemporada(
  reputacaoClube: number,
  divisao: string,
): ObjetivoTemporada {
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

/** A meta foi cumprida com esta posição final (ou atual)? */
export function metaCumprida(
  objetivo: ObjetivoTemporada,
  posicao: number,
): boolean {
  return posicao <= objetivo.posicaoAlvo;
}

/** Ajuste de reputação no fim da temporada por cumprir (ou não) a meta. */
export function deltaReputacaoMeta(
  objetivo: ObjetivoTemporada,
  posicaoFinal: number,
): number {
  return metaCumprida(objetivo, posicaoFinal) ? 5 : -5;
}
