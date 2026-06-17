import type {Position} from '../../types';

/**
 * Metadados de posição — FONTE ÚNICA de tudo que o sistema de tática/escalação
 * precisa saber sobre as 11 posições: a que grupo e linha cada uma pertence, sua
 * coordenada padrão no campo e o grafo de afinidade entre grupos (usado para
 * calcular penalidade por jogar fora de posição).
 *
 * Antes essa informação estava duplicada em teamStrength, PitchView e
 * AjustesPartida (cada um com seu próprio `linhaDaPosicao`). Centralizar aqui
 * evita divergências e código repetido.
 *
 * Convenção de coordenadas (normalizadas, 0..1):
 *   x: 0 = lateral esquerda  · 1 = lateral direita
 *   y: 0 = nossa linha de fundo (defesa) · 1 = linha de fundo adversária (ataque)
 * A conversão para a tela (onde o ataque costuma ficar em cima) é feita na UI.
 */

export type Position_ = Position; // re-export conveniente para consumidores

/** Linha tática "grossa" — usada na detecção de formação e na força do time. */
export type LinhaTatica = 'GOL' | 'DEFESA' | 'MEIO' | 'ATAQUE';

/**
 * Grupo de posição (granularidade fina) — base do grafo de afinidade que
 * determina o quão "natural" é um jogador atuar numa posição diferente.
 */
export type GrupoPosicao =
  | 'GOL'
  | 'ZAGUEIRO'
  | 'LATERAL'
  | 'VOLANTE'
  | 'MEIA_CENTRAL'
  | 'MEIA_OFENSIVO'
  | 'PONTA'
  | 'ATACANTE';

export interface Coordenada {
  x: number;
  y: number;
}

interface MetaPosicao {
  grupo: GrupoPosicao;
  linha: LinhaTatica;
  coordenada: Coordenada;
}

/** Tabela única posição → grupo/linha/coordenada padrão. */
export const META_POSICOES: Record<Position, MetaPosicao> = {
  GOL: {grupo: 'GOL', linha: 'GOL', coordenada: {x: 0.5, y: 0.05}},
  ZAG: {grupo: 'ZAGUEIRO', linha: 'DEFESA', coordenada: {x: 0.5, y: 0.2}},
  LD: {grupo: 'LATERAL', linha: 'DEFESA', coordenada: {x: 0.86, y: 0.26}},
  LE: {grupo: 'LATERAL', linha: 'DEFESA', coordenada: {x: 0.14, y: 0.26}},
  VOL: {grupo: 'VOLANTE', linha: 'MEIO', coordenada: {x: 0.5, y: 0.4}},
  MC: {grupo: 'MEIA_CENTRAL', linha: 'MEIO', coordenada: {x: 0.5, y: 0.52}},
  MEI: {grupo: 'MEIA_OFENSIVO', linha: 'MEIO', coordenada: {x: 0.5, y: 0.64}},
  PD: {grupo: 'PONTA', linha: 'ATAQUE', coordenada: {x: 0.86, y: 0.74}},
  PE: {grupo: 'PONTA', linha: 'ATAQUE', coordenada: {x: 0.14, y: 0.74}},
  SA: {grupo: 'ATACANTE', linha: 'ATAQUE', coordenada: {x: 0.5, y: 0.8}},
  CA: {grupo: 'ATACANTE', linha: 'ATAQUE', coordenada: {x: 0.5, y: 0.92}},
};

export const TODAS_POSICOES: Position[] = Object.keys(
  META_POSICOES,
) as Position[];

export function grupoDaPosicao(posicao: Position): GrupoPosicao {
  return META_POSICOES[posicao].grupo;
}

export function linhaDaPosicao(posicao: Position): LinhaTatica {
  return META_POSICOES[posicao].linha;
}

export function coordenadaPadrao(posicao: Position): Coordenada {
  return META_POSICOES[posicao].coordenada;
}

/**
 * Grafo de afinidade entre GRUPOS de posição. A distância (em arestas) entre
 * dois grupos define a penalidade por improviso em `adaptacao`. Calibrado para
 * que um zagueiro renda ~90% como lateral, ~85% como volante e bem menos como
 * atacante (linha oposta).
 *
 * Note que ZAGUEIRO NÃO é vizinho direto de VOLANTE (passa por LATERAL): assim
 * o lateral fica mais "natural" para o zagueiro do que o volante, como no futebol.
 */
export const ADJACENCIA_GRUPOS: Record<GrupoPosicao, GrupoPosicao[]> = {
  GOL: ['ZAGUEIRO'],
  ZAGUEIRO: ['GOL', 'LATERAL'],
  LATERAL: ['ZAGUEIRO', 'VOLANTE', 'PONTA'],
  VOLANTE: ['LATERAL', 'MEIA_CENTRAL'],
  MEIA_CENTRAL: ['VOLANTE', 'MEIA_OFENSIVO'],
  MEIA_OFENSIVO: ['MEIA_CENTRAL', 'PONTA', 'ATACANTE'],
  PONTA: ['LATERAL', 'MEIA_OFENSIVO', 'ATACANTE'],
  ATACANTE: ['MEIA_OFENSIVO', 'PONTA'],
};

/**
 * Distância mínima (BFS) entre dois grupos no grafo de afinidade. 0 = mesmo
 * grupo. Memoização simples não é necessária (grafo minúsculo).
 */
export function distanciaGrupos(a: GrupoPosicao, b: GrupoPosicao): number {
  if (a === b) {
    return 0;
  }
  const visitados = new Set<GrupoPosicao>([a]);
  let fronteira: GrupoPosicao[] = [a];
  let distancia = 0;

  while (fronteira.length > 0) {
    distancia += 1;
    const proxima: GrupoPosicao[] = [];
    for (const grupo of fronteira) {
      for (const vizinho of ADJACENCIA_GRUPOS[grupo]) {
        if (vizinho === b) {
          return distancia;
        }
        if (!visitados.has(vizinho)) {
          visitados.add(vizinho);
          proxima.push(vizinho);
        }
      }
    }
    fronteira = proxima;
  }

  // Grafo é conexo, então isto não deve acontecer; valor alto por segurança.
  return 99;
}
