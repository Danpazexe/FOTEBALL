/**
 * Orquestrador da Série D: roda a competição INTEIRA de forma determinística —
 * grupos regionais → fase de grupos (turno/returno) → classificação (top-4) →
 * mata-mata ida/volta → semifinais/final → 6 acessos à Série C.
 *
 * Tudo deriva de uma única `seed`: mesma seed + mesmos clubes/forças = mesmo
 * campeão e mesmos promovidos. Sem React, sem Math.random/Date.now.
 *
 * As partidas de fundo usam a simulação rápida por força (`simularPlacar`). Ao
 * integrar na store, os jogos do usuário podem ser trocados pelo matchSimulator
 * real sem mudar a estrutura do resultado.
 */
import type {Clube, Partida, Player} from '../../../types';
import {criarRNGComSeed, hashString} from '../../simulation/rng';
import {
  classificarTodosGrupos,
  rankearClassificados,
  simularFaseGrupos,
} from '../groups/faseGrupos';
import {montarGruposRegionais, type OpcoesAgrupamento} from '../groups/regionalGrouping';
import {montarFase, type Semente} from '../knockout/bracket';
import {resolverConfronto} from '../knockout/confronto';
import {
  SERIE_D_2026,
  validarRegulamento,
  type RegulamentoSerieD,
} from '../rules/serieD2026';
import type {
  Classificado,
  ClassificacaoGrupo,
  FaseMataMata,
  GrupoCompeticao,
} from '../tipos';
import {mapaDeForca} from '../util';
import {resolverAcesso} from './acesso';

export interface ResultadoSerieD {
  temporada: string;
  regra: RegulamentoSerieD;
  grupos: GrupoCompeticao[];
  partidasGrupos: Partida[];
  classificacoes: ClassificacaoGrupo[];
  /** Os classificados (top-N por grupo) já com seed de campanha. */
  classificados: Classificado[];
  /** Fases do mata-mata principal (da 2ª fase à final), em ordem. */
  fases: FaseMataMata[];
  /** Playoff de acesso (null se o regulamento não o prevê). */
  playoffAcesso: FaseMataMata | null;
  campeao: string;
  vice: string;
  /** Os 4 semifinalistas (vencedores das quartas). */
  semifinalistas: string[];
  /** Clubes promovidos à Série C (6 no formato 2026). */
  promovidos: string[];
}

export interface OpcoesSerieD {
  clubes: Clube[];
  /** Jogadores para derivar a força (top-11). Alternativa a `forcaPorClube`. */
  jogadores?: Player[];
  /** Força pré-calculada por clube (0–100). Tem prioridade sobre `jogadores`. */
  forcaPorClube?: Map<string, number>;
  temporada: string;
  /** Semente-mestra: controla grupos, placares e sorteios. */
  seed: number | string;
  regra?: RegulamentoSerieD;
  agrupamento?: OpcoesAgrupamento;
}

export function simularSerieD(opcoes: OpcoesSerieD): ResultadoSerieD {
  const {clubes, temporada, agrupamento} = opcoes;
  const regra = opcoes.regra ?? SERIE_D_2026;

  const errosRegra = validarRegulamento(regra);
  if (errosRegra.length > 0) {
    throw new Error(`Regulamento inválido: ${errosRegra.join('; ')}`);
  }

  const forca =
    opcoes.forcaPorClube ??
    mapaDeForca(clubes.map(clube => clube.id), opcoes.jogadores ?? []);
  const seedBase = String(opcoes.seed);
  const seedSorteio = hashString(`${seedBase}_sorteio`);

  // 1) Grupos regionais.
  const rngGrupos = criarRNGComSeed(hashString(`${seedBase}_grupos`));
  const grupos = montarGruposRegionais(clubes, regra, rngGrupos, agrupamento);

  // 2) Fase de grupos (gera + simula) e classificação com desempate CBF.
  const partidasGrupos = simularFaseGrupos(grupos, temporada, forca, seedBase);
  const classificacoes = classificarTodosGrupos(grupos, partidasGrupos, seedSorteio);
  const classificados = rankearClassificados(classificacoes, regra);

  // 3) Mata-mata, fase a fase, guardando quartas para o acesso.
  let sementes: Semente[] = classificados.map(classificado => ({
    clubeId: classificado.clubeId,
    seed: classificado.seed,
  }));
  const seedPorClube = new Map(sementes.map(s => [s.clubeId, s.seed]));

  const fases: FaseMataMata[] = [];
  let perdedoresQuartas: string[] = [];
  let semifinalistas: string[] = [];
  let faseIndice = 0;

  while (sementes.length > 1) {
    const confrontos = montarFase(sementes, temporada, faseIndice).map(confronto =>
      resolverConfronto(
        confronto,
        forca.get(confronto.clubeA) ?? 50,
        forca.get(confronto.clubeB) ?? 50,
        criarRNGComSeed(hashString(`${seedBase}_${confronto.id}`)),
      ),
    );
    const nome = confrontos[0]?.fase ?? `Fase de ${sementes.length}`;
    fases.push({nome, confrontos});

    if (nome === 'Quartas de final') {
      perdedoresQuartas = confrontos
        .map(confronto => confronto.perdedor)
        .filter((clube): clube is string => Boolean(clube));
      semifinalistas = confrontos
        .map(confronto => confronto.vencedor)
        .filter((clube): clube is string => Boolean(clube));
    }

    const vencedores = new Set(
      confrontos
        .map(confronto => confronto.vencedor)
        .filter((clube): clube is string => Boolean(clube)),
    );
    sementes = sementes.filter(semente => vencedores.has(semente.clubeId));
    faseIndice += 1;
  }

  const campeao = sementes[0].clubeId;
  const faseFinal = fases[fases.length - 1];
  const vice = faseFinal.confrontos[0]?.perdedor ?? '';

  // 4) Acesso à Série C (semifinalistas + playoff das quartas).
  const {promovidos, playoffAcesso} = resolverAcesso({
    semifinalistas,
    perdedoresQuartas,
    seedPorClube,
    forcaPorClube: forca,
    temporada,
    seedBase,
    regra,
  });

  return {
    temporada,
    regra,
    grupos,
    partidasGrupos,
    classificacoes,
    classificados,
    fases,
    playoffAcesso,
    campeao,
    vice,
    semifinalistas,
    promovidos,
  };
}
