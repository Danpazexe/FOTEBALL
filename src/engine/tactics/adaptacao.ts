import type {Player, Position} from '../../types';
import {
  distanciaGrupos,
  grupoDaPosicao,
  linhaDaPosicao,
} from './posicoes';

/**
 * Penalidade por jogar fora de posição. Dado o perfil posicional de um jogador
 * (posição principal + secundárias) e a posição em que ele foi de fato escalado,
 * devolve um FATOR em [0,1] (1 = rendimento pleno) e um nível/rótulo legível.
 *
 * O fator é calibrado a partir do grafo de afinidade entre GRUPOS de posição
 * definido em `posicoes` (ver ADJACENCIA_GRUPOS): quanto mais distantes os
 * grupos, maior a penalidade. Dois overrides corrigem casos em que a mera
 * distância no grafo não captura bem a realidade do futebol:
 *   - GOLEIRO: trocar gol por linha (ou vice-versa) é sempre um improviso pesado.
 *   - TERÇO OPOSTO: um defensor puro escalado no ataque (ou vice-versa) rende
 *     bem pouco, mesmo que o grafo os ligue por poucas arestas.
 *
 * Módulo puro: sem React, sem efeitos colaterais.
 */

export type NivelAdaptacao = 'natural' | 'similar' | 'adaptado' | 'improvisado';

export interface ResultadoAdaptacao {
  nivel: NivelAdaptacao;
  fator: number;
  rotulo: string;
}

/**
 * Calcula apenas o fator [0,1] de adaptação a partir das posições "cruas".
 *
 * Ordem de avaliação:
 *   1. escalada === principal            -> 1.0
 *   2. escalada está nas secundárias     -> 0.95
 *   3. override GOLEIRO                   -> 0.5
 *   4. override TERÇO OPOSTO             -> 0.6
 *   5. tabela por distância de grupos
 */
export function fatorAdaptacao(
  posicaoNatural: Position,
  secundarias: Position[],
  posicaoEscalada: Position,
): number {
  if (posicaoEscalada === posicaoNatural) {
    return 1.0;
  }
  if (secundarias.includes(posicaoEscalada)) {
    return 0.95;
  }

  // Overrides — verificados ANTES da tabela por distância.
  const grupoNatural = grupoDaPosicao(posicaoNatural);
  const grupoEscalada = grupoDaPosicao(posicaoEscalada);

  // Goleiro: exatamente UMA das duas posições é 'GOL'.
  const naturalEhGol = posicaoNatural === 'GOL';
  const escaladaEhGol = posicaoEscalada === 'GOL';
  if (naturalEhGol !== escaladaEhGol) {
    return 0.5;
  }

  // Terço oposto: defesa <-> ataque.
  const linhaNatural = linhaDaPosicao(posicaoNatural);
  const linhaEscalada = linhaDaPosicao(posicaoEscalada);
  const tercoOposto =
    (linhaNatural === 'DEFESA' && linhaEscalada === 'ATAQUE') ||
    (linhaNatural === 'ATAQUE' && linhaEscalada === 'DEFESA');
  if (tercoOposto) {
    return 0.6;
  }

  // Tabela por distância no grafo de afinidade entre grupos.
  const d = distanciaGrupos(grupoNatural, grupoEscalada);
  if (d === 0) {
    return 0.92;
  }
  if (d === 1) {
    return 0.9;
  }
  if (d === 2) {
    return 0.85;
  }
  if (d === 3) {
    return 0.78;
  }
  return 0.65;
}

/**
 * Classifica o fator em um nível qualitativo com rótulo amigável (PT-BR).
 *   fator >= 0.93 -> 'natural'    ('Posição natural')
 *   fator >= 0.83 -> 'similar'    ('Posição similar')
 *   fator >= 0.68 -> 'adaptado'   ('Adaptado')
 *   senão         -> 'improvisado' ('Improvisado')
 */
function classificarFator(fator: number): ResultadoAdaptacao {
  if (fator >= 0.93) {
    return {nivel: 'natural', fator, rotulo: 'Posição natural'};
  }
  if (fator >= 0.83) {
    return {nivel: 'similar', fator, rotulo: 'Posição similar'};
  }
  if (fator >= 0.68) {
    return {nivel: 'adaptado', fator, rotulo: 'Adaptado'};
  }
  return {nivel: 'improvisado', fator, rotulo: 'Improvisado'};
}

/**
 * Resultado completo de adaptação para um jogador escalado numa dada posição.
 * Usa `jogador.posicaoPrincipal` e `jogador.posicoesSecundarias`.
 */
export function nivelAdaptacao(
  jogador: Player,
  posicaoEscalada: Position,
): ResultadoAdaptacao {
  const fator = fatorAdaptacao(
    jogador.posicaoPrincipal,
    jogador.posicoesSecundarias,
    posicaoEscalada,
  );
  return classificarFator(fator);
}
