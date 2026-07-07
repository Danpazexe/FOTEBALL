/**
 * Mata-mata JOGÁVEL da Série D (carreira do usuário). Lógica PURA e
 * determinística: o usuário disputa sua chave (ida/volta) enquanto o restante do
 * chaveamento roda em background. Modela também o PLAYOFF DE ACESSO dos
 * eliminados nas quartas. Sem React; a store apenas guarda o estado e chama estas
 * funções.
 *
 * Acesso à Série C (formato 2026): sobem os 4 SEMIFINALISTAS (quem VENCE as
 * quartas) + os 2 vencedores do playoff entre os 4 eliminados nas quartas. Logo,
 * o clube do usuário garante acesso se VENCER as quartas OU vencer o playoff.
 */
import {
  classificarTodosGrupos,
  criarConfronto,
  filtrarClubesSerieD,
  mapaDeForca,
  montarFase,
  rankearClassificados,
  resolverConfronto,
  simularFaseGrupos,
  SERIE_D_2026,
  type ConfrontoMataMata,
  type FaseMataMata,
  type RegulamentoSerieD,
  type Semente,
} from '../engine/competitions';
import {criarRNGComSeed, hashString} from '../engine/simulation/rng';
import type {Clube, Partida, Player} from '../types';

import {grupoDoClube, gruposSerieDDaTemporada} from './serieDSeason';

export type FaseSerieDCarreira =
  | 'mata_mata'
  | 'playoff_acesso'
  | 'eliminado'
  | 'campeao';

export interface EstadoSerieDCarreira {
  temporada: string;
  grupoId: string;
  fase: FaseSerieDCarreira;
  /** Clubes vivos que entram na fase corrente (com seed de campanha). */
  sementes: Semente[];
  /** Confrontos da fase corrente (o do usuário aguardando resolução). */
  faseCorrente: FaseMataMata | null;
  /** Fases já resolvidas (na ordem em que aconteceram). */
  fasesResolvidas: FaseMataMata[];
  /** O clube do usuário garantiu acesso à Série C? */
  acessoConquistado: boolean;
  /** Campeão da Série D quando a final é decidida (senão null). */
  campeao: string | null;
}

const NOME_PLAYOFF = 'Playoff de acesso';

function rngConfronto(temporada: string, confrontoId: string) {
  return criarRNGComSeed(hashString(`${temporada}_${confrontoId}`));
}

/**
 * Classifica os 16 grupos: o do usuário pelas partidas REAIS (jogadas na
 * carreira) e os outros 15 simulados em background. Retorna os 64 classificados
 * já rankeados por campanha (seed 1 = melhor).
 */
export function classificadosSerieDCarreira(
  todosClubes: Clube[],
  jogadores: Player[],
  temporada: string,
  clubeUsuarioId: string,
  partidasGrupoUsuario: Partida[],
  regra: RegulamentoSerieD = SERIE_D_2026,
): {sementes: Semente[]; usuarioClassificado: boolean; grupoId: string} {
  const clubesD = filtrarClubesSerieD(todosClubes);
  const grupos = gruposSerieDDaTemporada(clubesD, temporada, regra);
  const grupoUsuario = grupoDoClube(grupos, clubeUsuarioId);
  const forca = mapaDeForca(
    clubesD.map(clube => clube.id),
    jogadores,
  );
  const outrosGrupos = grupos.filter(grupo => grupo.id !== grupoUsuario?.id);
  const partidasOutros = simularFaseGrupos(
    outrosGrupos,
    temporada,
    forca,
    `${temporada}_serie_d`,
  );
  const classificacoes = classificarTodosGrupos(
    grupos,
    [...partidasGrupoUsuario, ...partidasOutros],
    hashString(`${temporada}_serie_d_sorteio`),
  );
  const classificados = rankearClassificados(classificacoes, regra);
  const sementes = classificados.map(c => ({clubeId: c.clubeId, seed: c.seed}));
  return {
    sementes,
    usuarioClassificado: sementes.some(s => s.clubeId === clubeUsuarioId),
    grupoId: grupoUsuario?.id ?? '',
  };
}

/**
 * Monta o mata-mata da carreira a partir dos classificados. Se o clube do
 * usuário está entre eles, começa a 1ª fase eliminatória; senão, `eliminado`.
 */
export function iniciarMataMataSerieDCarreira(
  sementes: Semente[],
  clubeUsuarioId: string,
  temporada: string,
  grupoId: string,
): EstadoSerieDCarreira {
  const classificado = sementes.some(s => s.clubeId === clubeUsuarioId);
  if (!classificado) {
    return {
      temporada,
      grupoId,
      fase: 'eliminado',
      sementes: [],
      faseCorrente: null,
      fasesResolvidas: [],
      acessoConquistado: false,
      campeao: null,
    };
  }
  const confrontos = montarFase(sementes, temporada, 0);
  return {
    temporada,
    grupoId,
    fase: 'mata_mata',
    sementes,
    faseCorrente: {nome: confrontos[0]?.fase ?? '', confrontos},
    fasesResolvidas: [],
    acessoConquistado: false,
    campeao: null,
  };
}

/** Resolve o confronto do usuário (por resultado forçado) ou simula por força. */
function resolverUm(
  confronto: ConfrontoMataMata,
  clubeUsuarioId: string,
  forca: Map<string, number>,
  temporada: string,
  forcarVitoriaUsuario: boolean | undefined,
): ConfrontoMataMata {
  const envolveUsuario =
    confronto.clubeA === clubeUsuarioId || confronto.clubeB === clubeUsuarioId;
  if (envolveUsuario && forcarVitoriaUsuario !== undefined) {
    const usuarioEhA = confronto.clubeA === clubeUsuarioId;
    const usuarioVence = forcarVitoriaUsuario;
    const vencedor =
      usuarioVence === usuarioEhA ? confronto.clubeA : confronto.clubeB;
    const perdedor =
      vencedor === confronto.clubeA ? confronto.clubeB : confronto.clubeA;
    return {...confronto, vencedor, perdedor, decididoPor: 'AGREGADO'};
  }
  return resolverConfronto(
    confronto,
    forca.get(confronto.clubeA) ?? 50,
    forca.get(confronto.clubeB) ?? 50,
    rngConfronto(temporada, confronto.id),
  );
}

/** Monta o playoff de acesso (2 confrontos) entre os 4 eliminados nas quartas. */
function montarPlayoff(
  perdedoresQuartas: string[],
  seedPorClube: Map<string, number>,
  temporada: string,
): FaseMataMata {
  const ordenados = [...perdedoresQuartas].sort(
    (a, b) => (seedPorClube.get(a) ?? 999) - (seedPorClube.get(b) ?? 999),
  );
  const confrontos: ConfrontoMataMata[] = [];
  const n = ordenados.length;
  for (let i = 0; i < n / 2; i += 1) {
    confrontos.push(
      criarConfronto(
        `serie_d_${temporada}_playoff_${i}`,
        NOME_PLAYOFF,
        ordenados[n - 1 - i],
        ordenados[i],
      ),
    );
  }
  return {nome: NOME_PLAYOFF, confrontos};
}

/**
 * Avança UMA fase do mata-mata do usuário: resolve todos os confrontos da fase
 * corrente (o do usuário por `forcarVitoriaUsuario`, se dado; senão simula),
 * atualiza acesso/campeão e prepara a próxima fase (ou o playoff das quartas).
 */
export function avancarMataMataSerieDCarreira(
  estado: EstadoSerieDCarreira,
  clubeUsuarioId: string,
  forca: Map<string, number>,
  forcarVitoriaUsuario?: boolean,
): EstadoSerieDCarreira {
  if (
    (estado.fase !== 'mata_mata' && estado.fase !== 'playoff_acesso') ||
    !estado.faseCorrente
  ) {
    return estado;
  }

  const eraQuartas = estado.faseCorrente.nome === 'Quartas de final';
  const eraPlayoff = estado.faseCorrente.nome === NOME_PLAYOFF;

  const resolvidos = estado.faseCorrente.confrontos.map(confronto =>
    resolverUm(confronto, clubeUsuarioId, forca, estado.temporada, forcarVitoriaUsuario),
  );
  const faseResolvida: FaseMataMata = {
    nome: estado.faseCorrente.nome,
    confrontos: resolvidos,
  };
  const fasesResolvidas = [...estado.fasesResolvidas, faseResolvida];

  const usuarioVenceu = resolvidos.some(c => c.vencedor === clubeUsuarioId);
  // Vencer as quartas garante acesso (semifinalista); vencer o playoff também.
  const acessoConquistado =
    estado.acessoConquistado ||
    (usuarioVenceu && eraQuartas) ||
    (usuarioVenceu && eraPlayoff);

  // Playoff decidido → fim da participação do usuário (com ou sem acesso).
  if (eraPlayoff) {
    return {
      ...estado,
      fase: 'eliminado',
      faseCorrente: null,
      fasesResolvidas,
      acessoConquistado,
    };
  }

  // Usuário eliminado nas quartas → vai ao playoff de acesso.
  if (!usuarioVenceu && eraQuartas) {
    const seedPorClube = new Map(estado.sementes.map(s => [s.clubeId, s.seed]));
    const perdedores = resolvidos
      .map(c => c.perdedor)
      .filter((id): id is string => Boolean(id));
    return {
      ...estado,
      fase: 'playoff_acesso',
      sementes: perdedores.map(id => ({
        clubeId: id,
        seed: seedPorClube.get(id) ?? 999,
      })),
      faseCorrente: montarPlayoff(perdedores, seedPorClube, estado.temporada),
      fasesResolvidas,
      acessoConquistado,
    };
  }

  // Usuário eliminado antes das quartas → acabou (sem acesso).
  if (!usuarioVenceu) {
    return {
      ...estado,
      fase: 'eliminado',
      faseCorrente: null,
      fasesResolvidas,
      acessoConquistado,
    };
  }

  // Usuário venceu: monta a próxima fase com os vencedores.
  const vencedores = new Set(
    resolvidos.map(c => c.vencedor).filter((id): id is string => Boolean(id)),
  );
  const proximasSementes = estado.sementes.filter(s => vencedores.has(s.clubeId));
  if (proximasSementes.length === 1) {
    return {
      ...estado,
      fase: 'campeao',
      sementes: proximasSementes,
      faseCorrente: null,
      fasesResolvidas,
      acessoConquistado: true,
      campeao: clubeUsuarioId,
    };
  }
  const confrontos = montarFase(
    proximasSementes,
    estado.temporada,
    fasesResolvidas.length,
  );
  return {
    ...estado,
    sementes: proximasSementes,
    faseCorrente: {nome: confrontos[0]?.fase ?? '', confrontos},
    fasesResolvidas,
    acessoConquistado,
  };
}
