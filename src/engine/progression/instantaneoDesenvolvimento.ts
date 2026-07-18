/**
 * Instantâneo longitudinal da média do elenco (épico Overall Dinâmico) — alimenta
 * o gráfico de "Evolução média dos atributos" da tela Desenvolvimento. Puro e
 * determinístico: recebe o elenco e o tempo por parâmetro. Captura a média do
 * elenco do usuário por CATEGORIA (físico/técnico/mental) + overall, num ponto
 * do tempo. É dado REAL (não projeta nada) e cresce um ponto por temporada.
 */
import type {InstantaneoDesenvolvimento, Player} from '../../types';
import {atributosDaCategoria} from './categoriasAtributos';

const FISICOS = atributosDaCategoria('fisico');
const TECNICOS = atributosDaCategoria('tecnico');
const MENTAIS = atributosDaCategoria('mental');

function media(valores: number[]): number {
  if (valores.length === 0) {
    return 0;
  }
  return valores.reduce((s, v) => s + v, 0) / valores.length;
}

/** Média (0-100) dos atributos de uma lista para um jogador. */
function mediaCategoria(jogador: Player, chaves: readonly (keyof Player['atributos'])[]): number {
  return media(chaves.map(c => jogador.atributos[c]));
}

/**
 * Instantâneo da média do elenco de `clubeId` no momento (`data`,`temporada`).
 * Retorna `null` se o clube não tem jogadores (nada a registrar).
 */
export function instantaneoDoElenco(
  jogadores: Player[],
  clubeId: string,
  data: string,
  temporada: string,
): InstantaneoDesenvolvimento | null {
  const elenco = jogadores.filter(j => j.clubeId === clubeId);
  if (elenco.length === 0) {
    return null;
  }
  return {
    data,
    temporada,
    fisico: Math.round(media(elenco.map(j => mediaCategoria(j, FISICOS)))),
    tecnico: Math.round(media(elenco.map(j => mediaCategoria(j, TECNICOS)))),
    mental: Math.round(media(elenco.map(j => mediaCategoria(j, MENTAIS)))),
    overall: Math.round(media(elenco.map(j => j.overall))),
  };
}
