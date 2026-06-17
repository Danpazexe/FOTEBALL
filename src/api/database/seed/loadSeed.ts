import {clubesSeed} from '../../../data/seed/clubes';
import {jogadoresSeed} from '../../../data/seed/jogadores';
import type {Clube, Player} from '../../../types';

import {aplicarDefaultsClube} from './defaults';

export interface SeedData {
  clubes: Clube[];
  jogadores: Player[];
}

/**
 * Carrega o seed dos arquivos modulares: clubes em
 * `data/seed/clubes/<pais>/<campeonato>/<divisao>.json` e jogadores em UM
 * arquivo por time em `data/seed/jogadores/<time>.json` (ver os index.ts).
 */
export function loadSeedData(): SeedData {
  return {
    jogadores: jogadoresSeed,
    clubes: clubesSeed.map(clube => aplicarDefaultsClube(clube, jogadoresSeed)),
  };
}
