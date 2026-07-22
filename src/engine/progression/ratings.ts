/**
 * ENGINE DE RATINGS — Overall Base pelos 4 PILARES (épico Overall Dinâmico,
 * Onda 2; briefing 40/25/20/15):
 *
 *   40% Nota Técnica        — atributos ponderados pelo perfil da posição;
 *   25% Temporada           — nota média/jogos com regressão à média;
 *   20% Estatísticas        — percentil de participação no grupo da posição;
 *   15% Mercado             — log-percentil do valor na coorte.
 *
 * ESCALA ESTÁVEL: os pilares C e D são percentis mapeados de volta na
 * DISTRIBUIÇÃO DE TÉCNICA da própria coorte (grupo de posição) — assim um
 * percentil alto vale "técnica de quem está naquele percentil", e no início
 * de temporada (sem amostra) todos os pilares regridem à técnica: o Overall
 * Base coincide com o overall curado (nada é reprecificado na migração).
 * Tudo puro; a coorte entra por parâmetro (nada de estado global).
 */
import type {PilaresRating, Player, RatingJogador} from '../../types';
import {grupoDaPosicao, type GrupoPosicao} from '../tactics/posicoes';

import {calcularOverall} from './overall';

/** Jogos para confiança máxima na amostra da temporada (≈ metade do returno). */
const JOGOS_CONFIANCA_TOTAL = 20;
/** Pontos de escala por ponto de nota acima/abaixo da referência (6.5). */
const ESCALA_POR_NOTA = 6;
const NOTA_REFERENCIA = 6.5;

const PESO_TECNICA = 0.4;
const PESO_TEMPORADA = 0.25;
const PESO_AVANCADAS = 0.2;
const PESO_MERCADO = 0.15;

function clampEscala(valor: number): number {
  return Math.min(99, Math.max(1, valor));
}

/** Faixa etária da coorte de MERCADO (briefing: posição + idade + nível). */
export type FaixaEtaria = 'ate21' | '22a25' | '26a29' | '30a33' | '34mais';

export function faixaEtaria(idade: number): FaixaEtaria {
  if (idade <= 21) {
    return 'ate21';
  }
  if (idade <= 25) {
    return '22a25';
  }
  if (idade <= 29) {
    return '26a29';
  }
  if (idade <= 33) {
    return '30a33';
  }
  return '34mais';
}

/** Coorte de comparação de UM grupo de posição (arrays ORDENADOS ascendentes). */
export interface CoorteGrupo {
  tecnicas: number[];
  participacoes: number[];
}

/** Coorte de mercado: grupo de posição × faixa etária (valores comparáveis). */
export interface CoorteMercado {
  tecnicas: number[];
  logValores: number[];
}

export interface CoortesRating {
  porGrupo: Partial<Record<GrupoPosicao, CoorteGrupo>>;
  porGrupoFaixa: Partial<Record<`${GrupoPosicao}_${FaixaEtaria}`, CoorteMercado>>;
}

/** Participações em gol por jogo (métrica-síntese do pilar C no P0). */
function participacoesPorJogo(jogador: Player): number {
  const {jogos, gols, assistencias} = jogador.estatisticasTemporada;
  return jogos > 0 ? (gols + assistencias) / jogos : 0;
}

/** Posição percentual (0..1) de `valor` num array ORDENADO ascendente. */
export function postoPercentual(ordenado: number[], valor: number): number {
  if (ordenado.length === 0) {
    return 0.5;
  }
  let baixo = 0;
  let alto = ordenado.length;
  while (baixo < alto) {
    // eslint-disable-next-line no-bitwise -- divisão inteira da busca binária
    const meio = (baixo + alto) >> 1;
    if (ordenado[meio] <= valor) {
      baixo = meio + 1;
    } else {
      alto = meio;
    }
  }
  return baixo / ordenado.length;
}

/** Valor no quantil `p` (0..1) de um array ORDENADO ascendente. */
export function quantil(ordenado: number[], p: number): number {
  if (ordenado.length === 0) {
    return 50;
  }
  const indice = Math.min(
    ordenado.length - 1,
    Math.max(0, Math.round(p * (ordenado.length - 1))),
  );
  return ordenado[indice];
}

/**
 * Monta as coortes por grupo de posição a partir da população (uma vez por
 * consulta/tela — O(n log n)). A técnica de cada jogador é derivada dos
 * atributos, nunca do campo `overall`.
 */
export function montarCoortes(jogadores: Player[]): CoortesRating {
  const porGrupo: CoortesRating['porGrupo'] = {};
  const porGrupoFaixa: CoortesRating['porGrupoFaixa'] = {};
  for (const jogador of jogadores) {
    const grupo = grupoDaPosicao(jogador.posicaoPrincipal);
    const chaveFaixa =
      `${grupo}_${faixaEtaria(jogador.idade)}` as `${GrupoPosicao}_${FaixaEtaria}`;
    const tecnica = calcularOverall(jogador.atributos, jogador.posicaoPrincipal);

    const coorteGrupo = (porGrupo[grupo] ??= {tecnicas: [], participacoes: []});
    coorteGrupo.tecnicas.push(tecnica);
    coorteGrupo.participacoes.push(participacoesPorJogo(jogador));

    const coorteMercado = (porGrupoFaixa[chaveFaixa] ??= {
      tecnicas: [],
      logValores: [],
    });
    coorteMercado.tecnicas.push(tecnica);
    coorteMercado.logValores.push(Math.log1p(jogador.valorMercado));
  }
  for (const coorte of Object.values(porGrupo)) {
    coorte.tecnicas.sort((a, b) => a - b);
    coorte.participacoes.sort((a, b) => a - b);
  }
  for (const coorte of Object.values(porGrupoFaixa)) {
    coorte.tecnicas.sort((a, b) => a - b);
    coorte.logValores.sort((a, b) => a - b);
  }
  return {porGrupo, porGrupoFaixa};
}

/** Confiança 0..1 da amostra da temporada (jogos vs referência). */
export function confiancaDaAmostra(jogos: number): number {
  return Math.min(1, Math.max(0, jogos / JOGOS_CONFIANCA_TOTAL));
}

/**
 * Calcula o rating de UM jogador contra as coortes da população. Todos os
 * pilares na escala 1–99; composição 40/25/20/15; confiança pela minutagem.
 */
export function calcularRating(
  jogador: Player,
  coortes: CoortesRating,
): RatingJogador {
  const grupo = grupoDaPosicao(jogador.posicaoPrincipal);
  const coorte: CoorteGrupo =
    coortes.porGrupo[grupo] ?? {tecnicas: [], participacoes: []};
  const chaveFaixa =
    `${grupo}_${faixaEtaria(jogador.idade)}` as `${GrupoPosicao}_${FaixaEtaria}`;
  const coorteMercado: CoorteMercado =
    coortes.porGrupoFaixa[chaveFaixa] ?? {tecnicas: [], logValores: []};

  // Pilar A — técnica: SEMPRE derivada dos atributos.
  const tecnica = calcularOverall(jogador.atributos, jogador.posicaoPrincipal);

  const {jogos, notaMedia} = jogador.estatisticasTemporada;
  const confianca = confiancaDaAmostra(jogos);

  // Pilar B — temporada: nota média ancorada na técnica, regressão à média
  // (amostra pequena → o pilar tende à própria técnica, sem punir).
  const observadoTemporada = clampEscala(
    tecnica + (notaMedia - NOTA_REFERENCIA) * ESCALA_POR_NOTA,
  );
  const temporada = clampEscala(
    tecnica + (observadoTemporada - tecnica) * confianca,
  );

  // Pilar C — avançadas: percentil de participação no grupo, mapeado na
  // distribuição de técnica do grupo (escala estável), com a mesma confiança.
  const percentilPart = postoPercentual(
    coorte.participacoes,
    participacoesPorJogo(jogador),
  );
  const observadoAvancadas = quantil(coorte.tecnicas, percentilPart);
  const avancadas = clampEscala(
    tecnica + (observadoAvancadas - tecnica) * confianca,
  );

  // Pilar D — mercado: log-percentil do valor na coorte POSIÇÃO × FAIXA
  // ETÁRIA (briefing — um veterano compara com veteranos, não com o mercado
  // inteiro), mapeado na técnica da mesma coorte. Nunca o valor absoluto.
  const percentilValor = postoPercentual(
    coorteMercado.logValores,
    Math.log1p(jogador.valorMercado),
  );
  // Influência LIMITADA (briefing: mercado nunca supera o esporte): o pilar D
  // fica a no máximo ±20 da técnica → desloca o Base em no máximo ±3.
  const mercadoBruto = quantil(coorteMercado.tecnicas, percentilValor);
  const mercado = clampEscala(
    Math.min(tecnica + 20, Math.max(tecnica - 20, mercadoBruto)),
  );

  const pilares: PilaresRating = {
    tecnica,
    temporada: Math.round(temporada),
    avancadas: Math.round(avancadas),
    mercado: Math.round(mercado),
  };
  const overallBase = clampEscala(
    Math.round(
      pilares.tecnica * PESO_TECNICA +
        pilares.temporada * PESO_TEMPORADA +
        pilares.avancadas * PESO_AVANCADAS +
        pilares.mercado * PESO_MERCADO,
    ),
  );

  return {
    overallBase,
    pilares,
    // Técnica é sempre conhecida (40%); o resto depende da amostra.
    confianca: PESO_TECNICA + (1 - PESO_TECNICA) * confianca,
  };
}
