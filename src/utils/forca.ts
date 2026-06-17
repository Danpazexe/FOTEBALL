import {calcularForcaTime, type ForcaTime} from '../engine/simulation/teamStrength';
import type {Clube, Player} from '../types';

/** Força do clube pela escalação atual; cai para a média de overall se faltar. */
export function forcaDoClube(clube: Clube, jogadores: Player[]): ForcaTime {
  if (clube.formacaoAtual && clube.taticaAtual) {
    return calcularForcaTime(
      clube.formacaoAtual,
      jogadores.filter(jogador => jogador.clubeId === clube.id),
      clube.taticaAtual,
    );
  }
  const doClube = jogadores
    .filter(jogador => jogador.clubeId === clube.id)
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 11);
  const media = doClube.length
    ? Math.round(doClube.reduce((s, j) => s + j.overall, 0) / doClube.length)
    : 60;
  return {ataque: media, meio: media, defesa: media, forcaGoleiro: media, overall: media};
}
