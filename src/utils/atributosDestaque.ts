import type {PlayerAttributes, Position} from '../types';

/**
 * Os 3 atributos-chave de cada posição (Módulo 7 — cards e radar).
 * Usado para destacar no card e para escolher o que mostrar primeiro.
 */
export function atributosDestaquePorPosicao(
  posicao: Position,
): Array<keyof PlayerAttributes> {
  const mapa: Record<Position, Array<keyof PlayerAttributes>> = {
    GOL: ['reflexos', 'posicionamento', 'forca'],
    ZAG: ['marcacao', 'desarme', 'cabeceio'],
    LD: ['marcacao', 'cruzamento', 'velocidade'],
    LE: ['marcacao', 'cruzamento', 'velocidade'],
    VOL: ['desarme', 'marcacao', 'passe'],
    MC: ['passe', 'posicionamento', 'resistencia'],
    MEI: ['passe', 'drible', 'finalizacao'],
    PD: ['cruzamento', 'drible', 'velocidade'],
    PE: ['cruzamento', 'drible', 'velocidade'],
    SA: ['finalizacao', 'cabeceio', 'posicionamento'],
    CA: ['finalizacao', 'drible', 'velocidade'],
  };
  return mapa[posicao];
}

/** Sigla de 3 letras de cada atributo (para os cards). */
export const SIGLA_ATRIBUTO: Record<keyof PlayerAttributes, string> = {
  finalizacao: 'FIN',
  passe: 'PAS',
  marcacao: 'MAR',
  desarme: 'DES',
  velocidade: 'VEL',
  resistencia: 'RES',
  forca: 'FOR',
  reflexos: 'REF',
  posicionamento: 'POS',
  drible: 'DRI',
  cabeceio: 'CAB',
  cruzamento: 'CRU',
};
