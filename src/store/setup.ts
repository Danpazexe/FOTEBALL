/**
 * Geração do "mundo" do jogo (FASE 8 — passo 2): montagem da liga ativa, estado
 * inicial da carreira e Copa do Brasil da temporada. Funções PURAS (sem acesso ao
 * estado do Zustand) extraídas do useGameStore sem mudar comportamento — a store
 * apenas as importa ao iniciar/reiniciar carreira e ao virar a temporada.
 */
import {loadSeedData} from '../api/database/seed/loadSeed';
import {filtrarClubesSerieD} from '../engine/competitions';
import {gerarCalendarioLiga} from '../engine/season/calendarGenerator';
import {calcularTabela} from '../engine/season/classification';
import {gerarCopaDoBrasil, type EstadoCopa} from '../engine/season/copaEngine';
import {criarRNGComSeed, hashString} from '../engine/simulation/rng';
import type {Clube, Partida, Player} from '../types';
import {adicionarDias} from '../utils/datas';

import {dataInicialDeTemporada} from './helpers';
import {grupoDoClube, gruposSerieDDaTemporada} from './serieDSeason';

export const DIVISAO_PADRAO = 'Série A';
/** Ano em que toda carreira começa (fonte única — usada em criar/reiniciar). */
export const TEMPORADA_INICIAL = '2026';

/** Quantos clubes sobem/descem entre divisões adjacentes na virada (padrão BR). */
export const N_ACESSO = 4;

/**
 * Pirâmide de divisões (topo → base). O acesso/rebaixamento acontece entre
 * divisões ADJACENTES que existam — então adicionar a Série C liga o B↔C
 * automaticamente, sem mexer na lógica.
 */
export const PIRAMIDE_DIVISOES = ['Série A', 'Série B', 'Série C', 'Série D'];

/**
 * Premiação da Copa creditada ao usuário por fase VENCIDA (avançou).
 * Valores conforme BRASFOOT_MASTER §11.2 (escala da Copa do Brasil): vencer a
 * fase paga o prêmio da fase, e o campeão (vence a Final) leva a cota máxima.
 */
export const PREMIACAO_COPA: Record<string, number> = {
  'Oitavas de final': 1_575_000,
  'Quartas de final': 3_150_000,
  Semifinal: 5_250_000,
  Final: 73_500_000,
};

/** Rodadas da liga em torno das quais cada fase da Copa é disputada (meio de semana). */
export const RODADAS_GATILHO_COPA = [8, 16, 24, 32];

/**
 * Monta a liga ATIVA de UMA divisão: filtra clubes/jogadores da divisão, gera o
 * calendário round-robin (turno+returno) e a tabela. O jogo roda uma divisão por
 * vez; ao iniciar carreira num clube de outra divisão, a liga é regenerada (ver
 * `iniciarNovaCarreira`).
 */
export function gerarLiga(
  todosClubes: Clube[],
  todosJogadores: Player[],
  divisao: string,
  temporada: string,
  opcoes: {clubeIds?: string[]; competicaoId?: string} = {},
) {
  // Por padrão a liga é a divisão inteira; `clubeIds` restringe a um subconjunto
  // (ex.: o GRUPO da Série D que o usuário disputa), preservando a ordem dada.
  const clubesDivisao = opcoes.clubeIds
    ? opcoes.clubeIds
        .map(id => todosClubes.find(clube => clube.id === id))
        .filter((clube): clube is Clube => clube !== undefined)
    : todosClubes.filter(
        clube => (clube.divisao ?? DIVISAO_PADRAO) === divisao,
      );
  const idsLiga = new Set(clubesDivisao.map(clube => clube.id));
  const jogadores = todosJogadores.filter(
    // Inclui agentes livres (clubeId null) — pertencem ao jogo, não à divisão.
    jogador => jogador.clubeId == null || idsLiga.has(jogador.clubeId),
  );
  // Reconstrói o elenco de cada clube a partir do clubeId (fonte da verdade da
  // posse) — mantém o array consistente após transferências/empréstimos.
  const elencoPorClube = new Map<string, string[]>();
  for (const jogador of jogadores) {
    if (jogador.clubeId && idsLiga.has(jogador.clubeId)) {
      const lista = elencoPorClube.get(jogador.clubeId) ?? [];
      lista.push(jogador.id);
      elencoPorClube.set(jogador.clubeId, lista);
    }
  }
  const clubes = clubesDivisao.map(clube => ({
    ...clube,
    elenco: elencoPorClube.get(clube.id) ?? [],
  }));
  const partidas = gerarCalendarioLiga(
    clubes.map(clube => clube.id),
    temporada,
    opcoes.competicaoId,
  );
  return {
    clubes,
    jogadores,
    partidas,
    tabela: calcularTabela(clubes, partidas),
    dataAtual: dataInicialDeTemporada(partidas, temporada),
  };
}

/**
 * Monta a liga ativa quando o usuário disputa a SÉRIE D: a "liga" é o GRUPO de 6
 * do clube (turno e returno = 10 rodadas). Reaproveita `gerarLiga` restringindo
 * aos clubes do grupo. Fora do grupo, o resto da Série D roda em background.
 */
export function gerarLigaSerieDGrupo(
  todosClubes: Clube[],
  todosJogadores: Player[],
  clubeUsuarioId: string,
  temporada: string,
) {
  const clubesD = filtrarClubesSerieD(todosClubes);
  const grupos = gruposSerieDDaTemporada(clubesD, temporada);
  const grupo = grupoDoClube(grupos, clubeUsuarioId);
  if (!grupo) {
    // Defensivo: clube da D fora de qualquer grupo (dados incompletos) — cai na
    // liga da divisão inteira (comportamento antigo).
    return gerarLiga(todosClubes, todosJogadores, 'Série D', temporada);
  }
  return gerarLiga(todosClubes, todosJogadores, 'Série D', temporada, {
    clubeIds: grupo.clubeIds,
    competicaoId: `serie_d_${temporada}_grupo_${grupo.id}`,
  });
}

export function criarEstadoInicial() {
  const seed = loadSeedData();
  return {
    todosClubes: seed.clubes,
    todosJogadores: seed.jogadores,
    ...gerarLiga(seed.clubes, seed.jogadores, DIVISAO_PADRAO, TEMPORADA_INICIAL),
  };
}

/** Datas das fases da Copa: ~3 dias após a rodada-gatilho da liga (meio de semana). */
export function calcularDatasFasesCopa(partidas: Partida[]): string[] {
  return RODADAS_GATILHO_COPA.map(rodada => {
    const jogo = partidas.find(partida => partida.rodada === rodada);
    return jogo ? adicionarDias(jogo.data, 3) : '';
  });
}

/** Gera a Copa do Brasil da temporada a partir do conjunto-mestre (todas as divisões). */
export function gerarCopaParaTemporada(
  todosClubes: Clube[],
  todosJogadores: Player[],
  temporada: string,
  clubeUsuarioId: string | null,
  datasFases: string[],
): EstadoCopa {
  return gerarCopaDoBrasil(
    todosClubes,
    todosJogadores,
    temporada,
    clubeUsuarioId,
    criarRNGComSeed(hashString(`${temporada}_copa`)),
    datasFases,
  );
}
