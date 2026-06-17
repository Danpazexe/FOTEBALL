import type {Clube} from '../types';

/** Formata um valor em reais (sem centavos). Ex.: R$ 8.829.546 */
export function moeda(valor: number): string {
  return `R$ ${Math.round(valor).toLocaleString('pt-BR')}`;
}

/** Formata valores grandes de forma compacta. Ex.: R$ 8,8 mi / R$ 350 mil */
export function moedaCompacta(valor: number): string {
  const abs = Math.abs(valor);
  if (abs >= 1_000_000) {
    return `R$ ${(valor / 1_000_000).toFixed(1).replace('.', ',')} mi`;
  }
  if (abs >= 1_000) {
    return `R$ ${Math.round(valor / 1_000)} mil`;
  }
  return moeda(valor);
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
