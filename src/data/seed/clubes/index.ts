/**
 * Índice dos clubes do seed — organizados por nacionalidade / campeonato /
 * divisão em `clubes/<pais>/<campeonato>/<divisao>.json`. Para adicionar uma
 * liga/divisão, crie o JSON na pasta e some o import + spread aqui.
 */
import type {Clube} from '../../../types';

import brasileiraoSerieA from './brasil/brasileirao/serie-a.json';
import brasileiraoSerieB from './brasil/brasileirao/serie-b.json';
import brasileiraoSerieC from './brasil/brasileirao/serie-c.json';
import brasileiraoSerieD from './brasil/brasileirao/serie-d.json';
// Prova multi-liga (PESDB eFootball 2026): Argentina + Inglaterra (A e B).
import argentinaPrimera from './argentina/primera-division/primera-division.json';
import inglaterraPremier from './inglaterra/premier-league/premier-league.json';
import inglaterraChampionship from './inglaterra/championship/championship.json';

export const clubesSeed: Clube[] = [
  ...(brasileiraoSerieA as Clube[]),
  ...(brasileiraoSerieB as Clube[]),
  ...(brasileiraoSerieC as Clube[]),
  ...(brasileiraoSerieD as Clube[]),
  ...(argentinaPrimera as Clube[]),
  ...(inglaterraPremier as Clube[]),
  ...(inglaterraChampionship as Clube[]),
];
