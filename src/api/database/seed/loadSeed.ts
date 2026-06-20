import {clubesSeed} from '../../../data/seed/clubes';
import {jogadoresSeed} from '../../../data/seed/jogadores';
import {comHabilidades} from '../../../engine/progression/habilidades';
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
  // Deriva as habilidades especiais dos atributos uma única vez no load
  // (respeitando o que vier explícito no JSON).
  const jogadores = jogadoresSeed.map(comHabilidades);
  return {
    jogadores,
    clubes: clubesSeed.map(clube => aplicarDefaultsClube(clube, jogadores)),
  };
}
