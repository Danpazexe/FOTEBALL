import type {Clube, Competicao, Partida, Player} from '../../../types';

import type {GameDataSource} from '../repositories/gameDataSource';

export interface InMemoryGameData {
  clubes: Clube[];
  jogadores: Player[];
  partidas?: Partida[];
  competicoes?: Competicao[];
}

export function createInMemoryGameDataSource(
  data: InMemoryGameData,
): GameDataSource {
  const clubes = new Map(data.clubes.map(clube => [clube.id, clube]));
  const jogadores = new Map(data.jogadores.map(jogador => [jogador.id, jogador]));
  const partidas = new Map((data.partidas ?? []).map(partida => [partida.id, partida]));
  const competicoes = new Map(
    (data.competicoes ?? []).map(competicao => [competicao.id, competicao]),
  );

  return {
    async getClubes() {
      return [...clubes.values()];
    },
    async getClubeById(id: string) {
      return clubes.get(id) ?? null;
    },
    async saveClube(clube: Clube) {
      clubes.set(clube.id, clube);
    },
    async getJogadores() {
      return [...jogadores.values()];
    },
    async getJogadorById(id: string) {
      return jogadores.get(id) ?? null;
    },
    async getJogadoresByClube(clubeId: string) {
      return [...jogadores.values()].filter(jogador => jogador.clubeId === clubeId);
    },
    async saveJogador(jogador: Player) {
      jogadores.set(jogador.id, jogador);
    },
    async getPartidas() {
      return [...partidas.values()];
    },
    async getPartidaById(id: string) {
      return partidas.get(id) ?? null;
    },
    async savePartida(partida: Partida) {
      partidas.set(partida.id, partida);
    },
    async getCompeticoes() {
      return [...competicoes.values()];
    },
    async getCompeticaoById(id: string) {
      return competicoes.get(id) ?? null;
    },
    async saveCompeticao(competicao: Competicao) {
      competicoes.set(competicao.id, competicao);
    },
  };
}
