import type {Clube} from '../types';

/**
 * Agrupa clubes por divisão e ordena as divisões conforme `ordem` (divisões que
 * não estão na lista vão para o fim). Puro — cada tela passa a SUA ordem de
 * divisões, já que os catálogos diferem (só Brasil vs. Brasil + internacionais).
 */
export function agruparClubesPorDivisao(
  clubes: Clube[],
  ordem: readonly string[],
): Array<{divisao: string; clubes: Clube[]}> {
  const grupos = new Map<string, Clube[]>();
  for (const clube of clubes) {
    const divisao = clube.divisao ?? 'Série A';
    const lista = grupos.get(divisao) ?? [];
    lista.push(clube);
    grupos.set(divisao, lista);
  }
  return [...grupos.keys()]
    .sort((a, b) => {
      const ia = ordem.indexOf(a);
      const ib = ordem.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    })
    .map(divisao => ({divisao, clubes: grupos.get(divisao) ?? []}));
}
