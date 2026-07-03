import type {Position, TitularFormacao} from '../../types';
import {
  coordenadaPadrao,
  linhaDaPosicao,
  type Coordenada,
  type LinhaTatica,
} from './posicoes';

/**
 * Geometria do campo — ponte entre o mundo CONTÍNUO (coordenadas normalizadas
 * x/y de uma escalação livre) e o mundo DISCRETO (as 11 posições) usado pelo
 * resto dos engines de tática e força do time.
 *
 * Responsabilidades:
 *   1. `posicaoPorCoordenada` — dado um ponto no campo, qual posição discreta
 *      melhor o representa (usado quando o técnico arrasta um jogador).
 *   2. `detectarFormacao` — a partir dos titulares de linha, deduzir o esquema
 *      ("4-4-2", "3-5-2", ...).
 *   3. `layoutPorLinhas` / `preencherCoordenadas` — distribuir/garantir as
 *      coordenadas de cada titular a partir da sua linha tática.
 *
 * Convenção de coordenadas (normalizadas, 0..1):
 *   x: 0 = lateral esquerda  · 1 = lateral direita
 *   y: 0 = nossa linha de fundo (defesa) · 1 = linha de fundo adversária (ataque)
 *
 * Tudo aqui é função PURA: não há React, efeitos colaterais nem mutação dos
 * argumentos.
 */

/** Limita um número ao intervalo [min, max]. */
function fixar(valor: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, valor));
}

/**
 * Converte um ponto (x, y) normalizado na MELHOR posição discreta, usando bandas
 * por altura de campo (y) e, dentro de cada banda, faixas laterais (x). As bandas
 * têm folga lateral diferente porque, quanto mais avançado o jogador, mais ampla
 * é a área considerada "central".
 */
export function posicaoPorCoordenada(x: number, y: number): Position {
  const cx = fixar(x, 0, 1);
  const cy = fixar(y, 0, 1);

  // Goleiro — colado na própria linha de fundo.
  if (cy < 0.12) {
    return 'GOL';
  }

  // Defesa — zagueiros centrais com laterais nas pontas.
  if (cy < 0.3) {
    if (cx < 0.25) {
      return 'LE';
    }
    if (cx > 0.75) {
      return 'LD';
    }
    return 'ZAG';
  }

  // Volante / faixa baixa do meio — laterais ainda recuados nas pontas.
  if (cy < 0.42) {
    if (cx < 0.22) {
      return 'LE';
    }
    if (cx > 0.78) {
      return 'LD';
    }
    return 'VOL';
  }

  // Meio-campo central.
  if (cy < 0.56) {
    if (cx < 0.2) {
      return 'LE';
    }
    if (cx > 0.8) {
      return 'LD';
    }
    return 'MC';
  }

  // Meia ofensivo — pontas começam a aparecer nas faixas laterais.
  if (cy < 0.7) {
    if (cx < 0.22) {
      return 'PE';
    }
    if (cx > 0.78) {
      return 'PD';
    }
    return 'MEI';
  }

  // Ataque — pontas nas laterais; no miolo, segundo atacante (SA) ou centroavante (CA).
  if (cx < 0.25) {
    return 'PE';
  }
  if (cx > 0.75) {
    return 'PD';
  }
  return cy < 0.8 ? 'SA' : 'CA';
}

/** y de referência (centro de banda) para cada faixa da detecção de formação. */
const Y_LIMITE_DEFESA = 0.3;
const Y_LIMITE_MEIO = 0.62;
const Y_LIMITE_GOLEIRO = 0.12;

/**
 * Coordenada (x,y) normalizada de um titular no campo — FONTE ÚNICA usada por
 * TODAS as telas de escalação (DraggablePitch, AjustesPartida...). Usa as
 * coordenadas explícitas quando existem (escalação livre) e cai na coordenada
 * padrão da posição quando ausentes. Garante que o mesmo time apareça igual em
 * qualquer tela.
 *
 * Convenção: x 0..1 (esquerda→direita), y 0..1 (nossa defesa→ataque). A
 * conversão para a tela (ataque em cima) é responsabilidade de quem desenha.
 */
export function coordenadaDoTitular(titular: TitularFormacao): Coordenada {
  const padrao = coordenadaPadrao(titular.posicao);
  return {
    x: titular.x !== undefined ? titular.x : padrao.x,
    y: titular.y !== undefined ? titular.y : padrao.y,
  };
}

/** Coordenada y de cada titular: usa a explícita ou cai na coordenada padrão da posição. */
function yDoTitular(titular: TitularFormacao): number {
  return coordenadaDoTitular(titular).y;
}

/**
 * Detecta o esquema tático (ex.: "4-4-2", "3-5-2") a partir dos titulares de
 * LINHA. Goleiros (posição 'GOL' OU muito recuados) são contados à parte e NÃO
 * entram nas três faixas. Os demais são bucketizados pela altura (y):
 *   DEFESA   y < 0.30
 *   MEIO     0.30 <= y < 0.62
 *   ATAQUE   y >= 0.62
 * Retorna "<def>-<meio>-<ataque>" ou "0-0-0" se não houver jogadores de linha.
 */
export function detectarFormacao(titulares: TitularFormacao[]): string {
  let defesa = 0;
  let meio = 0;
  let ataque = 0;

  for (const titular of titulares) {
    const y = yDoTitular(titular);

    // Goleiros saem da conta das três faixas.
    if (titular.posicao === 'GOL' || y < Y_LIMITE_GOLEIRO) {
      continue;
    }

    if (y < Y_LIMITE_DEFESA) {
      defesa += 1;
    } else if (y < Y_LIMITE_MEIO) {
      meio += 1;
    } else {
      ataque += 1;
    }
  }

  if (defesa + meio + ataque === 0) {
    return '0-0-0';
  }

  return `${defesa}-${meio}-${ataque}`;
}

/** y de referência de cada linha tática no layout por linhas. */
const Y_POR_LINHA: Record<LinhaTatica, number> = {
  GOL: 0.06,
  DEFESA: 0.22,
  MEIO: 0.5,
  ATAQUE: 0.82,
};

/**
 * Dado os titulares, devolve coordenadas index-alinhadas (mesma ordem da
 * entrada) espalhando cada LINHA tática horizontalmente. Para n jogadores numa
 * linha, o k-ésimo (0-based) recebe x = (k + 1) / (n + 1); o goleiro fica
 * sempre centralizado em x = 0.5.
 */
export function layoutPorLinhas(titulares: TitularFormacao[]): Coordenada[] {
  // Índices originais agrupados por linha, preservando a ordem de entrada.
  const indicesPorLinha = new Map<LinhaTatica, number[]>();
  titulares.forEach((titular, indice) => {
    const linha = linhaDaPosicao(titular.posicao);
    const lista = indicesPorLinha.get(linha);
    if (lista) {
      lista.push(indice);
    } else {
      indicesPorLinha.set(linha, [indice]);
    }
  });

  const resultado: Coordenada[] = new Array(titulares.length);

  for (const [linha, indices] of indicesPorLinha) {
    const y = Y_POR_LINHA[linha];
    const total = indices.length;
    indices.forEach((indiceOriginal, k) => {
      const x = linha === 'GOL' ? 0.5 : (k + 1) / (total + 1);
      resultado[indiceOriginal] = {x, y};
    });
  }

  return resultado;
}

/**
 * Retorna NOVOS titulares garantindo x/y: se um titular já possui x E y
 * definidos, mantém; caso contrário, preenche a partir de `layoutPorLinhas`.
 * Função pura — não muta a entrada.
 */
export function preencherCoordenadas(
  titulares: TitularFormacao[],
): TitularFormacao[] {
  const layout = layoutPorLinhas(titulares);

  return titulares.map((titular, indice) => {
    if (titular.x !== undefined && titular.y !== undefined) {
      return {...titular};
    }
    const coord = layout[indice];
    return {...titular, x: coord.x, y: coord.y};
  });
}
