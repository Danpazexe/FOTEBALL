/**
 * CALIBRAÇÃO ATRIBUTOS ↔ OVERALL (épico Overall Dinâmico, Onda 2 — PR-01).
 *
 * A auditoria (H1) encontrou DRIFT permanente: o seed traz overall curado ≠
 * calcularOverall(atributos) e três fluxos mutavam o overall sem tocar nos
 * atributos. A estratégia aprovada preserva o overall CURADO (ninguém perde o
 * craque conhecido) e ajusta os ATRIBUTOS para casarem com ele — uma vez, de
 * forma idempotente, no load. Daí em diante o overall é sempre derivado.
 *
 * Também vive aqui o passo-alvo dos fluxos de desenvolvimento: dado um novo
 * overall-alvo (curva de idade, retorno de empréstimo), os pontos entram/saem
 * dos ATRIBUTOS — com viés por CATEGORIA e idade (físico evolui/decai cedo;
 * técnico dura mais; mental amadurece tarde) — e o overall resulta deles.
 * Tudo puro e determinístico (sem RNG: desempate por ordem fixa de pesos).
 */
import type {
  AtributoChave,
  CategoriaAtributo,
  Player,
  PlayerAttributes,
  Position,
} from '../../types';

import {CATEGORIA_POR_ATRIBUTO} from './categoriasAtributos';
import {calcularOverall, pesosDaPosicao} from './overall';

const MIN_ATRIBUTO = 1;
const MAX_ATRIBUTO = 99;
const MAX_AJUSTES = 400;

function clampAtributo(valor: number): number {
  return Math.min(MAX_ATRIBUTO, Math.max(MIN_ATRIBUTO, Math.round(valor)));
}

/** Atributos do PERFIL da posição, do maior para o menor peso (ordem estável). */
function atributosDoPerfil(posicao: Position): AtributoChave[] {
  const pesos = pesosDaPosicao(posicao);
  return (Object.keys(pesos) as AtributoChave[]).sort(
    (a, b) => (pesos[b] ?? 0) - (pesos[a] ?? 0),
  );
}

/**
 * Ajusta os atributos para que `calcularOverall` bata EXATAMENTE no alvo:
 * escala proporcional (preserva a identidade/forma do jogador) + lapidação
 * ±1 nos atributos do perfil até cruzar o arredondamento. Puro e idempotente.
 */
export function calibrarAtributosParaOverall(
  atributos: PlayerAttributes,
  posicao: Position,
  alvo: number,
): PlayerAttributes {
  const alvoLimitado = Math.min(MAX_ATRIBUTO, Math.max(MIN_ATRIBUTO, alvo));
  if (calcularOverall(atributos, posicao) === alvoLimitado) {
    return atributos;
  }

  // Passo 1 — escala proporcional de TODOS os atributos (mantém o perfil).
  const derivado = calcularOverall(atributos, posicao);
  const fator = alvoLimitado / Math.max(1, derivado);
  const escalados = {...atributos};
  for (const chave of Object.keys(escalados) as AtributoChave[]) {
    escalados[chave] = clampAtributo(escalados[chave] * fator);
  }

  // Passo 2 — lapidação: ±1 nos atributos do perfil (maior peso primeiro)
  // até o arredondamento do overall cair no alvo.
  const perfil = atributosDoPerfil(posicao);
  let ajustes = 0;
  while (calcularOverall(escalados, posicao) !== alvoLimitado && ajustes < MAX_AJUSTES) {
    ajustes += 1;
    const passo = calcularOverall(escalados, posicao) < alvoLimitado ? 1 : -1;
    const chave = perfil.find(atributo => {
      const proximo = escalados[atributo] + passo;
      return proximo >= MIN_ATRIBUTO && proximo <= MAX_ATRIBUTO;
    });
    if (!chave) {
      break; // todos os atributos do perfil no limite — melhor esforço.
    }
    escalados[chave] = escalados[chave] + passo;
  }
  return escalados;
}

/**
 * Migração do drift no LOAD (padrão comHabilidades/comTipo): no-op quando os
 * atributos já derivam o overall declarado; senão calibra preservando o
 * overall curado. Idempotente por construção.
 */
export function comAtributosCalibrados(jogador: Player): Player {
  if (calcularOverall(jogador.atributos, jogador.posicaoPrincipal) === jogador.overall) {
    return jogador;
  }
  return {
    ...jogador,
    atributos: calibrarAtributosParaOverall(
      jogador.atributos,
      jogador.posicaoPrincipal,
      jogador.overall,
    ),
  };
}

/**
 * Viés de desenvolvimento por categoria conforme a idade (curvas do briefing):
 * físico evolui/decai primeiro; técnico dura mais; mental amadurece tarde.
 * Números maiores = categoria preferida para RECEBER (crescimento) ou PERDER
 * (declínio) pontos naquela fase da carreira.
 */
function viesDaCategoria(
  categoria: CategoriaAtributo,
  idade: number,
  crescendo: boolean,
): number {
  if (crescendo) {
    if (idade < 21) {
      return {fisico: 3, tecnico: 2, mental: 1, goleiro: 2}[categoria];
    }
    if (idade <= 24) {
      return {fisico: 2, tecnico: 3, mental: 2, goleiro: 2}[categoria];
    }
    return {fisico: 1, tecnico: 2, mental: 3, goleiro: 2}[categoria];
  }
  // Declínio: físico cai primeiro; reflexos (goleiro) antes de posicionamento.
  if (idade >= 33) {
    return {fisico: 3, tecnico: 2, mental: 1, goleiro: 2}[categoria];
  }
  return {fisico: 3, tecnico: 1, mental: 1, goleiro: 2}[categoria];
}

/**
 * Move o jogador para um OVERALL-ALVO mexendo nos atributos, ponto a ponto,
 * preferindo os atributos do perfil com maior (viés da categoria × peso).
 * É a porta única dos fluxos de desenvolvimento anual/empréstimo (PR-01):
 * o overall retornado é SEMPRE derivado dos atributos finais.
 */
export function aplicarAlvoDeOverall(
  jogador: Player,
  alvo: number,
): {atributos: PlayerAttributes; overall: number} {
  const posicao = jogador.posicaoPrincipal;
  const alvoLimitado = Math.min(MAX_ATRIBUTO, Math.max(MIN_ATRIBUTO, Math.round(alvo)));
  const atual = calcularOverall(jogador.atributos, posicao);
  if (atual === alvoLimitado) {
    return {atributos: jogador.atributos, overall: atual};
  }

  const crescendo = alvoLimitado > atual;
  const pesos = pesosDaPosicao(posicao);
  // Ordem de preferência: viés da categoria (idade) × peso no perfil.
  const ordem = (Object.keys(pesos) as AtributoChave[]).sort(
    (a, b) =>
      viesDaCategoria(CATEGORIA_POR_ATRIBUTO[b], jogador.idade, crescendo) *
        (pesos[b] ?? 0) -
      viesDaCategoria(CATEGORIA_POR_ATRIBUTO[a], jogador.idade, crescendo) *
        (pesos[a] ?? 0),
  );

  const atributos = {...jogador.atributos};
  const passo = crescendo ? 1 : -1;
  let ajustes = 0;
  while (calcularOverall(atributos, posicao) !== alvoLimitado && ajustes < MAX_AJUSTES) {
    ajustes += 1;
    // Roda a ordem de preferência de forma cíclica para espalhar os pontos.
    const chave = ordem[(ajustes - 1) % ordem.length];
    const proximo = atributos[chave] + passo;
    if (proximo < MIN_ATRIBUTO || proximo > MAX_ATRIBUTO) {
      continue;
    }
    atributos[chave] = proximo;
  }

  // Declínio de veterano tem sabor físico mesmo FORA do perfil (não move o
  // overall, mas o perfil visível do atleta envelhece — velocidade cai antes).
  if (!crescendo && jogador.idade >= 33) {
    for (const chave of ['velocidade', 'resistencia'] as AtributoChave[]) {
      if ((pesos[chave] ?? 0) === 0 && atributos[chave] > MIN_ATRIBUTO) {
        atributos[chave] = atributos[chave] - 1;
      }
    }
  }

  return {atributos, overall: calcularOverall(atributos, posicao)};
}
