import type {Clube, Player} from '../types';

/**
 * Formata um valor monetário (sem centavos). O símbolo é rótulo de EXIBIÇÃO —
 * não há câmbio (£ 900.000 é o valor no clube inglês, não convertido). Ex.:
 * R$ 8.829.546 / £ 900.000. Padrão R$ para preservar as chamadas existentes.
 */
export function moeda(valor: number, simbolo = 'R$'): string {
  return `${simbolo} ${Math.round(valor).toLocaleString('pt-BR')}`;
}

/** Formata valores grandes de forma compacta. Ex.: R$ 8,8 mi / £ 350 mil */
export function moedaCompacta(valor: number, simbolo = 'R$'): string {
  const abs = Math.abs(valor);
  if (abs >= 1_000_000) {
    return `${simbolo} ${(valor / 1_000_000).toFixed(1).replace('.', ',')} mi`;
  }
  if (abs >= 1_000) {
    return `${simbolo} ${Math.round(valor / 1_000)} mil`;
  }
  return moeda(valor, simbolo);
}

/** Resolve o nome de um clube a partir do id (fallback: o próprio id). */
export function nomeClube(clubes: Clube[], clubeId: string): string {
  return clubes.find(clube => clube.id === clubeId)?.nome ?? clubeId;
}

/** Sigla do clube a partir do id (fallback: nome ou id). */
export function siglaClube(clubes: Clube[], clubeId: string): string {
  const clube = clubes.find(item => item.id === clubeId);
  return clube?.sigla ?? clube?.nome ?? clubeId;
}

/**
 * Nome de exibição da liga a partir da `divisao` do clube. As Séries
 * brasileiras ("Série A"…"Série D") ganham o prefixo "Brasileirão"; ligas
 * internacionais guardam o próprio nome na divisão ("Premier League",
 * "Primera División") e são exibidas como chegam, SEM prefixo. Fallback
 * (divisão ausente): "Brasileirão Série A".
 */
export function nomeCompeticao(divisao?: string): string {
  const nome = divisao ?? 'Série A';
  return nome.startsWith('Série') ? `Brasileirão ${nome}` : nome;
}

/** Nome de exibição curto do jogador: apelido quando houver, senão o nome. */
export function nomeCurto(jogador: Player): string {
  return jogador.apelido ?? jogador.nome;
}

/** Faixa overall→potencial quando há margem ("78–85"); só o overall se não há. */
export function faixaOverall(jogador: Player): string {
  return jogador.potencial > jogador.overall
    ? `${jogador.overall}–${jogador.potencial}`
    : `${jogador.overall}`;
}
