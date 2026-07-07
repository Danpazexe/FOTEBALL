/**
 * Fase de grupos da Série D: geração dos fixtures, simulação de fundo e
 * CLASSIFICAÇÃO com o desempate COMPLETO da CBF.
 *
 * Ordem de desempate (Série D 2026):
 *   pontos → vitórias → saldo → gols pró → confronto direto (SÓ entre 2 clubes)
 *   → menos cartões vermelhos → menos cartões amarelos → sorteio (semeado).
 *
 * O "confronto direto só entre 2" é respeitado de verdade: os empates são
 * resolvidos por BLOCOS — blocos de 2 usam o confronto direto; blocos de 3+
 * pulam direto para cartões (como manda o regulamento).
 */
import {gerarCalendarioLiga} from '../../season/calendarGenerator';
import {
  criarRNGComSeed,
  hashString,
  type RandomGenerator,
} from '../../simulation/rng';
import type {Partida} from '../../../types';
import type {RegulamentoSerieD} from '../rules/serieD2026';
import type {
  Classificado,
  ClassificacaoGrupo,
  GrupoCompeticao,
  LinhaClassificacao,
} from '../tipos';
import {simularPartidaRapida} from '../simulacao/placar';

function novaLinha(clubeId: string): LinhaClassificacao {
  return {
    clubeId,
    pontos: 0,
    jogos: 0,
    vitorias: 0,
    empates: 0,
    derrotas: 0,
    golsPro: 0,
    golsContra: 0,
    saldoGols: 0,
    cartoesAmarelos: 0,
    cartoesVermelhos: 0,
  };
}

/**
 * Confronto direto entre 2 clubes (pontos e saldo só nos jogos entre eles).
 * Negativo = `a` na frente; 0 = empataram ou não se enfrentaram.
 */
function confrontoDireto(aId: string, bId: string, partidas: Partida[]): number {
  let pontosA = 0;
  let pontosB = 0;
  let saldoA = 0;
  for (const partida of partidas) {
    if (
      !partida.jogada ||
      partida.placarCasa === undefined ||
      partida.placarFora === undefined
    ) {
      continue;
    }
    const entreOsDois =
      (partida.timeCasa === aId && partida.timeFora === bId) ||
      (partida.timeCasa === bId && partida.timeFora === aId);
    if (!entreOsDois) {
      continue;
    }
    const aEhCasa = partida.timeCasa === aId;
    const golsA = aEhCasa ? partida.placarCasa : partida.placarFora;
    const golsB = aEhCasa ? partida.placarFora : partida.placarCasa;
    saldoA += golsA - golsB;
    if (golsA > golsB) {
      pontosA += 3;
    } else if (golsB > golsA) {
      pontosB += 3;
    } else {
      pontosA += 1;
      pontosB += 1;
    }
  }
  return pontosB - pontosA || -saldoA;
}

/** Chave de sorteio determinística (semeada) para o último critério de desempate. */
function chaveSorteio(clubeId: string, seedSorteio: number): number {
  return hashString(`${seedSorteio}_${clubeId}`);
}

/** Compara pelos 4 critérios primários (pontos, vitórias, saldo, gols pró). */
function compararPrimario(a: LinhaClassificacao, b: LinhaClassificacao): number {
  return (
    b.pontos - a.pontos ||
    b.vitorias - a.vitorias ||
    b.saldoGols - a.saldoGols ||
    b.golsPro - a.golsPro
  );
}

/** Desempata um bloco de clubes empatados nos 4 critérios primários. */
function desempatarBloco(
  bloco: LinhaClassificacao[],
  partidas: Partida[],
  seedSorteio: number,
): LinhaClassificacao[] {
  // Bloco de exatamente 2: tenta confronto direto antes de cartões/sorteio.
  if (bloco.length === 2) {
    const cd = confrontoDireto(bloco[0].clubeId, bloco[1].clubeId, partidas);
    if (cd !== 0) {
      return cd < 0 ? [bloco[0], bloco[1]] : [bloco[1], bloco[0]];
    }
  }
  // Bloco de 3+ (ou 2 empatados no confronto direto): cartões e depois sorteio.
  return [...bloco].sort(
    (a, b) =>
      a.cartoesVermelhos - b.cartoesVermelhos ||
      a.cartoesAmarelos - b.cartoesAmarelos ||
      chaveSorteio(a.clubeId, seedSorteio) - chaveSorteio(b.clubeId, seedSorteio),
  );
}

/**
 * Ordena uma classificação aplicando o desempate CBF completo por blocos.
 * Função pura (equivalente ao `sortStandings(teams, rules)` do brief).
 */
export function ordenarClassificacao(
  linhas: LinhaClassificacao[],
  partidas: Partida[],
  seedSorteio = 0,
): LinhaClassificacao[] {
  const base = [...linhas].sort(compararPrimario);
  const resultado: LinhaClassificacao[] = [];
  let i = 0;
  while (i < base.length) {
    let j = i + 1;
    while (j < base.length && compararPrimario(base[i], base[j]) === 0) {
      j += 1;
    }
    const bloco = base.slice(i, j);
    resultado.push(
      ...(bloco.length === 1
        ? bloco
        : desempatarBloco(bloco, partidas, seedSorteio)),
    );
    i = j;
  }
  return resultado;
}

/** Monta as linhas (com cartões) de um conjunto de clubes a partir das partidas. */
function montarLinhas(
  clubeIds: string[],
  partidas: Partida[],
): LinhaClassificacao[] {
  const mapa = new Map(clubeIds.map(id => [id, novaLinha(id)]));
  for (const partida of partidas) {
    if (
      !partida.jogada ||
      partida.placarCasa === undefined ||
      partida.placarFora === undefined
    ) {
      continue;
    }
    const casa = mapa.get(partida.timeCasa);
    const fora = mapa.get(partida.timeFora);
    if (!casa || !fora) {
      continue; // partida não pertence a este grupo
    }
    casa.jogos += 1;
    fora.jogos += 1;
    casa.golsPro += partida.placarCasa;
    casa.golsContra += partida.placarFora;
    fora.golsPro += partida.placarFora;
    fora.golsContra += partida.placarCasa;
    casa.saldoGols = casa.golsPro - casa.golsContra;
    fora.saldoGols = fora.golsPro - fora.golsContra;
    if (partida.placarCasa > partida.placarFora) {
      casa.vitorias += 1;
      casa.pontos += 3;
      fora.derrotas += 1;
    } else if (partida.placarCasa < partida.placarFora) {
      fora.vitorias += 1;
      fora.pontos += 3;
      casa.derrotas += 1;
    } else {
      casa.empates += 1;
      fora.empates += 1;
      casa.pontos += 1;
      fora.pontos += 1;
    }
    for (const evento of partida.eventos) {
      const linha = mapa.get(evento.timeId);
      if (!linha) {
        continue;
      }
      if (evento.tipo === 'cartao_amarelo') {
        linha.cartoesAmarelos += 1;
      } else if (evento.tipo === 'cartao_vermelho') {
        linha.cartoesVermelhos += 1;
      }
    }
  }
  return [...mapa.values()];
}

/** Classificação ordenada de UM grupo. */
export function classificarGrupo(
  grupo: GrupoCompeticao,
  partidas: Partida[],
  seedSorteio = 0,
): ClassificacaoGrupo {
  const linhas = ordenarClassificacao(
    montarLinhas(grupo.clubeIds, partidas),
    partidas,
    seedSorteio,
  );
  return {grupoId: grupo.id, linhas};
}

/** Classificação de todos os grupos. */
export function classificarTodosGrupos(
  grupos: GrupoCompeticao[],
  partidas: Partida[],
  seedSorteio = 0,
): ClassificacaoGrupo[] {
  return grupos.map(grupo => classificarGrupo(grupo, partidas, seedSorteio));
}

/**
 * Flatten + seeding: todos os classificados (top-N de cada grupo) rankeados
 * 1..total. Melhor posição no grupo vem antes; empate por pontos/saldo/gols pró.
 * O `seed` (1 = melhor campanha) é usado para chavear o mata-mata.
 */
export function rankearClassificados(
  classificacoes: ClassificacaoGrupo[],
  regra: RegulamentoSerieD,
): Classificado[] {
  const parciais: Array<Omit<Classificado, 'seed'>> = [];
  for (const classificacao of classificacoes) {
    classificacao.linhas.slice(0, regra.classificadosPorGrupo).forEach((linha, indice) => {
      parciais.push({
        clubeId: linha.clubeId,
        grupoId: classificacao.grupoId,
        posicao: indice + 1,
        linha,
      });
    });
  }
  parciais.sort(
    (a, b) =>
      a.posicao - b.posicao ||
      b.linha.pontos - a.linha.pontos ||
      b.linha.saldoGols - a.linha.saldoGols ||
      b.linha.golsPro - a.linha.golsPro ||
      a.clubeId.localeCompare(b.clubeId),
  );
  return parciais.map((parcial, indice) => ({...parcial, seed: indice + 1}));
}

/** Gera os fixtures (turno e returno) de todos os grupos. */
export function gerarPartidasGrupos(
  grupos: GrupoCompeticao[],
  temporada: string,
): Partida[] {
  const partidas: Partida[] = [];
  for (const grupo of grupos) {
    partidas.push(
      ...gerarCalendarioLiga(
        grupo.clubeIds,
        temporada,
        `serie_d_${temporada}_grupo_${grupo.id}`,
      ),
    );
  }
  return partidas;
}

/**
 * Gera E simula a fase de grupos inteira (partidas de fundo). Determinístico:
 * o placar de cada jogo deriva de um RNG semeado por `seedBase` + id da partida.
 */
export function simularFaseGrupos(
  grupos: GrupoCompeticao[],
  temporada: string,
  forcaPorClube: Map<string, number>,
  seedBase: string,
): Partida[] {
  const fixtures = gerarPartidasGrupos(grupos, temporada);
  return fixtures.map(fixture => {
    const rng: RandomGenerator = criarRNGComSeed(
      hashString(`${seedBase}_${fixture.id}`),
    );
    const forcaCasa = forcaPorClube.get(fixture.timeCasa) ?? 50;
    const forcaFora = forcaPorClube.get(fixture.timeFora) ?? 50;
    return simularPartidaRapida(fixture, forcaCasa, forcaFora, rng);
  });
}
