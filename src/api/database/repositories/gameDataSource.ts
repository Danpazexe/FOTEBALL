import type {Clube, Competicao, Partida, Player} from '../../../types';

export interface GameDataSource {
  getClubes(): Promise<Clube[]>;
  getClubeById(id: string): Promise<Clube | null>;
  saveClube(clube: Clube): Promise<void>;
  getJogadores(): Promise<Player[]>;
  getJogadorById(id: string): Promise<Player | null>;
  getJogadoresByClube(clubeId: string): Promise<Player[]>;
  saveJogador(jogador: Player): Promise<void>;
  getPartidas(): Promise<Partida[]>;
  getPartidaById(id: string): Promise<Partida | null>;
  savePartida(partida: Partida): Promise<void>;
  getCompeticoes(): Promise<Competicao[]>;
  getCompeticaoById(id: string): Promise<Competicao | null>;
  saveCompeticao(competicao: Competicao): Promise<void>;
}
