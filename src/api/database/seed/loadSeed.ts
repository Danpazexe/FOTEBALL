import {clubesSeed} from '../../../data/seed/clubes';
import {jogadoresSeed} from '../../../data/seed/jogadores';
import {comAtributosCalibrados} from '../../../engine/progression/calibracaoAtributos';
import {comHabilidades} from '../../../engine/progression/habilidades';
import {comTipo} from '../../../engine/progression/tipoJogador';
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
  // Calibra atributos ↔ overall curado (PR-01: overall vira derivado; o valor
  // autoral do seed é preservado) e deriva habilidades/tipo — tudo idempotente,
  // respeitando o que vier explícito no JSON.
  const jogadores = jogadoresSeed
    .map(comAtributosCalibrados)
    .map(comHabilidades)
    .map(comTipo);
  return {
    jogadores,
    clubes: clubesSeed.map(clube => aplicarDefaultsClube(clube, jogadores)),
  };
}
