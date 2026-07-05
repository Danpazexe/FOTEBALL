/**
 * Clássicos / rivalidades do futebol brasileiro. Puro e determinístico: um mapa
 * estático de rivalidades entre os clubes do jogo + um lookup por par (em
 * qualquer ordem). Sem estado, sem RNG — só reconhecimento para dar peso e
 * atmosfera aos confrontos.
 */

export interface Classico {
  nome: string;
}

/** Rivalidades reconhecidas (par de ids + nome do clássico). */
const RIVALIDADES: ReadonlyArray<{a: string; b: string; nome: string}> = [
  // Rio de Janeiro
  {a: 'club_flamengo', b: 'club_fluminense', nome: 'Fla-Flu'},
  {a: 'club_flamengo', b: 'club_vasco', nome: 'Clássico dos Milhões'},
  {a: 'club_flamengo', b: 'club_botafogo', nome: 'Clássico da Rivalidade'},
  {a: 'club_fluminense', b: 'club_botafogo', nome: 'Clássico Vovô'},
  {a: 'club_fluminense', b: 'club_vasco', nome: 'Clássico dos Gigantes'},
  {a: 'club_botafogo', b: 'club_vasco', nome: 'Clássico da Amizade'},
  // São Paulo
  {a: 'club_corinthians', b: 'club_palmeiras', nome: 'Derby Paulista'},
  {a: 'club_corinthians', b: 'club_sao_paulo', nome: 'Majestoso'},
  {a: 'club_corinthians', b: 'club_santos', nome: 'Clássico Alvinegro'},
  {a: 'club_palmeiras', b: 'club_sao_paulo', nome: 'Choque-Rei'},
  {a: 'club_palmeiras', b: 'club_santos', nome: 'Clássico da Saudade'},
  {a: 'club_sao_paulo', b: 'club_santos', nome: 'San-São'},
  // Rio Grande do Sul
  {a: 'club_gremio', b: 'club_internacional', nome: 'Gre-Nal'},
  // Minas Gerais
  {a: 'club_atletico_mg', b: 'club_cruzeiro', nome: 'Clássico Mineiro'},
  // Bahia
  {a: 'club_bahia', b: 'club_vitoria', nome: 'Ba-Vi'},
  // Paraná
  {a: 'club_athletico_pr', b: 'club_coritiba', nome: 'Atletiba'},
];

/** Devolve o clássico entre dois clubes (em qualquer ordem), ou null. */
export function classicoEntre(clubeA: string, clubeB: string): Classico | null {
  if (clubeA === clubeB) {
    return null;
  }
  for (const rivalidade of RIVALIDADES) {
    if (
      (rivalidade.a === clubeA && rivalidade.b === clubeB) ||
      (rivalidade.a === clubeB && rivalidade.b === clubeA)
    ) {
      return {nome: rivalidade.nome};
    }
  }
  return null;
}

/** O confronto entre dois clubes é um clássico? */
export function ehClassico(clubeA: string, clubeB: string): boolean {
  return classicoEntre(clubeA, clubeB) !== null;
}
