/**
 * OVERALL DE PARTIDA (épico Overall Dinâmico, Onda 2) — o atleta NAQUELE
 * momento. Em vez de um multiplicador escalar único (H8), o estado modula os
 * ATRIBUTOS POR CATEGORIA e o Overall de Partida é derivado dos efetivos:
 *
 *   condição  → atributos FÍSICOS (corpo cansado corre/aguenta menos);
 *   moral     → atributos MENTAIS (cabeça baixa decide pior);
 *   forma     → atributos TÉCNICOS (fase técnica: execução);
 *   goleiro   → média de físico e mental (reflexo é corpo + cabeça).
 *
 * Limites: efetivos 1–99 e Overall de Partida em [Base−8, Base+8] (briefing).
 * O Base NUNCA é alterado por aqui (atributos efetivos são uma CÓPIA).
 * Consumo: engine de partida na Onda 6; Perfil do jogador na Onda 7.
 */
import type {
  CategoriaAtributo,
  AtributoChave,
  Player,
  PlayerAttributes,
} from '../../types';

import {CATEGORIA_POR_ATRIBUTO} from './categoriasAtributos';
import {calcularOverall} from './overall';

/** Variação máxima do Overall de Partida em relação ao Base (briefing). */
export const LIMITE_VARIACAO_PARTIDA = 8;

export interface FatoresPartida {
  fisico: number;
  tecnico: number;
  mental: number;
  goleiro: number;
}

export interface OverallPartidaResultado {
  overallPartida: number;
  overallBase: number;
  atributosEfetivos: PlayerAttributes;
  fatores: FatoresPartida;
}

/**
 * Fatores por categoria a partir do estado do atleta. Faixas calibradas nas
 * dos multiplicadores atuais do motor (preparo 0.82–1.0; moral ±4%; forma
 * −6%..+10%) para a Onda 6 integrar sem choque de balanceamento.
 */
export function fatoresDoEstado(jogador: Player): FatoresPartida {
  // Condição 10–100 → 0.82–1.0 (contínuo, sem degraus).
  const fisico = 0.8 + 0.2 * (Math.max(10, Math.min(100, jogador.condicaoFisica)) / 100);
  // Moral 10–100 → 0.96–1.04.
  const mental = 0.96 + (Math.max(0, Math.min(100, jogador.moral)) / 100) * 0.08;
  // Forma −3..+5 → 0.94–1.10.
  const tecnico = 1 + Math.max(-3, Math.min(5, jogador.forma)) * 0.02;
  return {
    fisico,
    tecnico,
    mental,
    goleiro: (fisico + mental) / 2,
  };
}

function fatorDaCategoria(
  fatores: FatoresPartida,
  categoria: CategoriaAtributo,
): number {
  return fatores[categoria];
}

/** Atributos EFETIVOS da partida (cópia modulada por categoria; base intacta). */
export function atributosEfetivos(
  jogador: Player,
  fatores: FatoresPartida = fatoresDoEstado(jogador),
): PlayerAttributes {
  const efetivos = {...jogador.atributos};
  for (const chave of Object.keys(efetivos) as AtributoChave[]) {
    const fator = fatorDaCategoria(fatores, CATEGORIA_POR_ATRIBUTO[chave]);
    efetivos[chave] = Math.min(99, Math.max(1, Math.round(efetivos[chave] * fator)));
  }
  return efetivos;
}

/**
 * Overall de Partida derivado dos atributos efetivos, com clamp Base±8 e 1–99.
 * `overallBase` aqui é o overall DECLARADO do jogador (pós-calibração da Onda
 * 2 ele é sempre igual ao derivado dos atributos base).
 */
export function overallDePartida(jogador: Player): OverallPartidaResultado {
  const fatores = fatoresDoEstado(jogador);
  const efetivos = atributosEfetivos(jogador, fatores);
  const bruto = calcularOverall(efetivos, jogador.posicaoPrincipal);
  const base = jogador.overall;
  const overallPartida = Math.min(
    99,
    Math.max(
      1,
      Math.min(base + LIMITE_VARIACAO_PARTIDA, Math.max(base - LIMITE_VARIACAO_PARTIDA, bruto)),
    ),
  );
  return {overallPartida, overallBase: base, atributosEfetivos: efetivos, fatores};
}
