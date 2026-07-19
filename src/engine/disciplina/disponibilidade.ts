/**
 * Disponibilidade e elegibilidade do jogador (engine PURA — sem React/rng/Date).
 * Disciplina é POR COMPETIÇÃO; a lesão continua em DIAS (motor físico da Onda 5),
 * então a elegibilidade cruza "não-lesionado (dias)" com "não-suspenso NAQUELA
 * competição". Os campos legados `suspenso`/`jogosSuspensao` viram espelho global.
 */
import {
  COMPETICAO_LEGADO,
  type DisciplinaPorCompeticao,
  type DisponibilidadeJogador,
  type Player,
} from '../../types';

/** ~1 jogo a cada 4 dias — só para exibir "N jogos" a partir de `diasLesao`. */
const DIAS_POR_JOGO = 4;

export function disponibilidadeInicial(): DisponibilidadeJogador {
  return {partidasRestantesLesao: 0, disciplinas: []};
}

/** Entrada da competição (ou uma zerada, sem mutar). */
export function disciplinaDaCompeticao(
  disp: DisponibilidadeJogador,
  competicaoId: string,
): DisciplinaPorCompeticao {
  return (
    disp.disciplinas.find(d => d.competicaoId === competicaoId) ?? {
      competicaoId,
      amarelosAcumulados: 0,
      partidasRestantesSuspensao: 0,
    }
  );
}

/** Substitui/insere a entrada da competição, devolvendo um novo array. */
export function comDisciplina(
  disp: DisponibilidadeJogador,
  entrada: DisciplinaPorCompeticao,
): DisponibilidadeJogador {
  const outras = disp.disciplinas.filter(
    d => d.competicaoId !== entrada.competicaoId,
  );
  // Poda entradas totalmente zeradas (mantém a lista enxuta).
  const viva =
    entrada.amarelosAcumulados > 0 || entrada.partidasRestantesSuspensao > 0;
  return {
    ...disp,
    disciplinas: viva ? [...outras, entrada] : outras,
  };
}

/**
 * Suspenso NAQUELA competição? Uma suspensão LEGADA (`__legado__`) vale em
 * qualquer competição (preserva o comportamento global do save antigo).
 */
export function estaSuspensoNaCompeticao(
  jogador: Player,
  competicaoId: string,
): boolean {
  const disp = jogador.disponibilidade;
  if (!disp) {
    return jogador.suspenso; // pré-migração: espelho global legado
  }
  return disp.disciplinas.some(
    d =>
      (d.competicaoId === competicaoId || d.competicaoId === COMPETICAO_LEGADO) &&
      d.partidasRestantesSuspensao > 0,
  );
}

export type MotivoInelegivel = 'lesionado' | 'suspenso';

export interface Elegibilidade {
  elegivel: boolean;
  motivo?: MotivoInelegivel;
}

/**
 * Elegibilidade unificada para uma partida. Lesão bloqueia em qualquer
 * competição (motor físico, em dias); suspensão bloqueia só na competição da
 * partida. Sem `competicaoId`, usa o espelho global `suspenso` (contexto de UI).
 */
export function calcularElegibilidadeJogador(
  jogador: Player,
  competicaoId?: string,
): Elegibilidade {
  if (jogador.lesionado || jogador.diasLesao > 0) {
    return {elegivel: false, motivo: 'lesionado'};
  }
  const suspenso = competicaoId
    ? estaSuspensoNaCompeticao(jogador, competicaoId)
    : jogador.suspenso;
  if (suspenso) {
    return {elegivel: false, motivo: 'suspenso'};
  }
  return {elegivel: true};
}

/** Sincroniza os campos legados (`suspenso`/`jogosSuspensao`/`amarelos`) a partir
 * da disciplina por competição — mantém os ~15 leitores antigos funcionando. */
export function sincronizarEspelhoLegado(jogador: Player): Player {
  const disp = jogador.disponibilidade;
  if (!disp) {
    return jogador;
  }
  const jogosSuspensao = disp.disciplinas.reduce(
    (max, d) => Math.max(max, d.partidasRestantesSuspensao),
    0,
  );
  const amarelos = disp.disciplinas.reduce(
    (max, d) => Math.max(max, d.amarelosAcumulados),
    0,
  );
  return {
    ...jogador,
    suspenso: jogosSuspensao > 0,
    jogosSuspensao,
    amarelosParaSuspensao: amarelos,
  };
}

/**
 * Deriva `disponibilidade` a partir dos campos legados (load/migração de save).
 * Idempotente: se já existe, devolve intacto. Uma suspensão legada é semeada sob
 * `__legado__` (vale globalmente, como antes) para não sumir; amarelos legados
 * idem. Lesão continua a fonte da verdade em dias — só espelha uma contagem.
 */
export function comDisponibilidade(jogador: Player): Player {
  if (jogador.disponibilidade) {
    return jogador;
  }
  const disciplinas: DisciplinaPorCompeticao[] = [];
  const jogosSuspensao = jogador.jogosSuspensao ?? 0;
  const amarelos = jogador.amarelosParaSuspensao ?? 0;
  if ((jogador.suspenso && jogosSuspensao > 0) || amarelos > 0) {
    disciplinas.push({
      competicaoId: COMPETICAO_LEGADO,
      amarelosAcumulados: amarelos,
      partidasRestantesSuspensao: jogador.suspenso ? jogosSuspensao : 0,
    });
  }
  return {
    ...jogador,
    disponibilidade: {
      partidasRestantesLesao: jogador.lesionado
        ? Math.max(1, Math.ceil((jogador.diasLesao ?? 0) / DIAS_POR_JOGO))
        : 0,
      disciplinas,
    },
  };
}
