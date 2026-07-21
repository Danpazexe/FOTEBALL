/**
 * ENGINE DO PLANO DE TREINO RECORRENTE (épico Overall Dinâmico, Onda 4).
 *
 * Corrige H3/H4: o treino deixa de ser uma escolha efêmera da tela e vira um
 * PLANO persistido, recorrente e explicável. Aqui ficam:
 *  - presets (pré-temporada, semana normal, semana de 2 jogos, recuperação…);
 *  - a resolução da SESSÃO DO CICLO por rodada (qual treino aplicar agora);
 *  - o ASSISTENTE, que gera um plano recomendado a partir do contexto e
 *    explica o porquê (reason codes traduzíveis pela UI).
 *
 * Puro e determinístico: nenhuma leitura de estado/relógio/rng aqui — o índice
 * do ciclo entra por parâmetro (derivado da rodada pela store).
 */
import type {
  IntensidadeTreino,
  PlanoTreino,
  SessaoPlanoTreino,
  SemanaPlanoTreino,
} from '../../types';
import {INTENSIDADES_ORDEM, TREINO_PADRAO_ID} from './treinoTipos';

/** Sessão provisória segura aplicada quando não há plano (nunca "sem treino"). */
export const SESSAO_PROVISORIA: SessaoPlanoTreino = {
  treinoId: TREINO_PADRAO_ID,
  intensidade: 'leve',
};

/** Nível de alerta semântico das classificações de treino (a UI mapeia p/ cor). */
export type NivelAlerta = 'ok' | 'atencao' | 'alerta';

/** Peso 1–5 de uma intensidade (descanso→muito forte) para agregar a carga. */
export function pesoIntensidade(intensidade: IntensidadeTreino): number {
  return INTENSIDADES_ORDEM.indexOf(intensidade) + 1;
}

/** Carga agregada da semana a partir das sessões (Folga/Leve/Média/Alta). */
export function cargaDaSemana(dias: (SessaoPlanoTreino | null)[]): {
  texto: string;
  nivel: NivelAlerta;
} {
  const pesos = dias
    .filter((dia): dia is SessaoPlanoTreino => dia !== null)
    .map(dia => pesoIntensidade(dia.intensidade));
  if (pesos.length === 0) {
    return {texto: 'Folga', nivel: 'ok'};
  }
  const medio = pesos.reduce((soma, valor) => soma + valor, 0) / pesos.length;
  if (medio <= 1.4) {
    return {texto: 'Leve', nivel: 'ok'};
  }
  if (medio <= 2.4) {
    return {texto: 'Média', nivel: 'atencao'};
  }
  return {texto: 'Alta', nivel: 'alerta'};
}

/** Classifica o risco-base de lesão de uma sessão/semana de treino. */
export function faixaRiscoLesao(risco: number): {
  texto: string;
  nivel: NivelAlerta;
} {
  if (risco <= 0.005) {
    return {texto: 'Muito baixo', nivel: 'ok'};
  }
  if (risco <= 0.015) {
    return {texto: 'Baixo', nivel: 'ok'};
  }
  if (risco <= 0.035) {
    return {texto: 'Médio', nivel: 'atencao'};
  }
  return {texto: 'Alto', nivel: 'alerta'};
}

interface PresetDef {
  nome: string;
  intensidadeBase: IntensidadeTreino;
  /** Rotina semanal: 7 slots (0=seg … 6=dom); null = folga. */
  dias: (SessaoPlanoTreino | null)[];
}

const s = (treinoId: string, intensidade: IntensidadeTreino): SessaoPlanoTreino => ({
  treinoId,
  intensidade,
});

/** Presets iniciais (mockup "Treino"): rotinas prontas por fase da temporada. */
export const PRESETS_TREINO: Record<string, PresetDef> = {
  pre_temporada: {
    nome: 'Pré-temporada',
    intensidadeBase: 'forte',
    dias: [
      s('hab_fisico', 'forte'),
      s('hab_resistencia', 'forte'),
      s('hab_tecnica', 'normal'),
      s('hab_fisico', 'normal'),
      s('hab_tecnica', 'normal'),
      null,
      null,
    ],
  },
  equilibrado: {
    nome: 'Equilibrado',
    intensidadeBase: 'normal',
    dias: [
      s('hab_tecnica', 'normal'),
      s('hab_fisico', 'leve'),
      s('hab_passe', 'normal'),
      null,
      s('hab_finalizacao', 'normal'),
      s('hab_fisico', 'leve'),
      null,
    ],
  },
  dois_jogos: {
    nome: 'Semana de 2 jogos',
    intensidadeBase: 'leve',
    dias: [
      s('hab_fisico', 'leve'),
      null,
      s('hab_bola_parada', 'leve'),
      null,
      s('hab_fisico', 'leve'),
      null,
      null,
    ],
  },
  decisiva: {
    nome: 'Semana decisiva',
    intensidadeBase: 'normal',
    dias: [
      s('hab_tecnica', 'normal'),
      s('hab_bola_parada', 'normal'),
      s('hab_finalizacao', 'leve'),
      null,
      s('hab_fisico', 'leve'),
      null,
      null,
    ],
  },
  recuperacao: {
    nome: 'Recuperação do elenco',
    intensidadeBase: 'leve',
    dias: [
      s('hab_fisico', 'leve'),
      null,
      s('hab_tecnica', 'leve'),
      null,
      null,
      null,
      null,
    ],
  },
  jovens: {
    nome: 'Desenvolvimento de jovens',
    intensidadeBase: 'normal',
    dias: [
      s('hab_tecnica', 'normal'),
      s('hab_drible', 'normal'),
      s('hab_passe', 'normal'),
      s('hab_fisico', 'leve'),
      s('hab_finalizacao', 'normal'),
      null,
      null,
    ],
  },
};

export type PresetTreinoId = keyof typeof PRESETS_TREINO;

/** Constrói um `PlanoTreino` a partir de um preset (semanal por padrão). */
export function planoDePreset(
  presetId: PresetTreinoId,
  clubeId: string,
  criadoEm: string,
  criadoPor: PlanoTreino['criadoPor'] = 'usuario',
): PlanoTreino {
  const preset = PRESETS_TREINO[presetId];
  const semana: SemanaPlanoTreino = {dias: preset.dias};
  return {
    id: `plano_${presetId}_${clubeId}`,
    clubeId,
    nome: preset.nome,
    status: 'ativo',
    recorrencia: {tipo: 'semanal'},
    semanas: [semana],
    criadoPor,
    criadoEm,
  };
}

/** Semana de 7 folgas — base para montar um plano manual dia-a-dia. */
function semanaVazia(): SemanaPlanoTreino {
  return {dias: [null, null, null, null, null, null, null]};
}

/**
 * Define a SESSÃO de UM dia (0=seg … 6=dom) do plano — a agenda dia-a-dia (FM).
 * `sessao=null` = folga. Cria um plano "Personalizado" do zero se ainda não
 * houver plano; preserva os demais dias. Puro — a store persiste via
 * `configurarPlanoTreino`.
 */
export function definirDiaNoPlano(
  plano: PlanoTreino | null,
  clubeId: string,
  criadoEm: string,
  diaIndex: number,
  sessao: SessaoPlanoTreino | null,
): PlanoTreino {
  const base: PlanoTreino = plano ?? {
    id: `plano_personalizado_${clubeId}`,
    clubeId,
    nome: 'Personalizado',
    status: 'ativo',
    recorrencia: {tipo: 'semanal'},
    semanas: [semanaVazia()],
    criadoPor: 'usuario',
    criadoEm,
  };
  if (diaIndex < 0 || diaIndex > 6) {
    return base;
  }
  const semana = base.semanas[0] ?? semanaVazia();
  const dias = [...semana.dias];
  while (dias.length < 7) {
    dias.push(null);
  }
  dias[diaIndex] = sessao;
  return {
    ...base,
    nome: 'Personalizado',
    status: 'ativo',
    criadoPor: 'usuario',
    semanas: [{...semana, dias}, ...base.semanas.slice(1)],
  };
}

/**
 * Contexto do elenco/temporada para o assistente decidir. Tudo derivável do
 * estado sem acoplar a store (a store monta e passa).
 */
export interface ContextoAssistente {
  clubeId: string;
  criadoEm: string;
  /** Fração do elenco cansado (condição < 65) ou lesionado, 0–1. */
  fracaoDesgastada: number;
  /** Idade média do elenco. */
  idadeMedia: number;
  /** Jogos nos próximos dias (congestionamento) — 2+ = semana de 2 jogos. */
  jogosProximos: number;
  /** true na janela de pré-temporada (rodada inicial). */
  preTemporada: boolean;
}

export interface RecomendacaoTreino {
  plano: PlanoTreino;
  presetId: PresetTreinoId;
  /** Motivos legíveis pela UI (mockup: "Recomendação do staff"). */
  motivos: string[];
}

/**
 * ASSISTENTE de treino: escolhe o preset mais adequado ao contexto e explica.
 * Prioridade: pré-temporada > congestionamento > elenco desgastado > elenco
 * jovem > equilibrado. Determinístico (sem rng).
 */
export function recomendarPlano(
  contexto: ContextoAssistente,
): RecomendacaoTreino {
  const motivos: string[] = [];
  let presetId: PresetTreinoId;

  if (contexto.preTemporada) {
    presetId = 'pre_temporada';
    motivos.push('Início de temporada: construir base física e entrosamento.');
  } else if (contexto.jogosProximos >= 2) {
    presetId = 'dois_jogos';
    motivos.push(
      `${contexto.jogosProximos} jogos em poucos dias: priorizar recuperação e carga baixa.`,
    );
  } else if (contexto.fracaoDesgastada >= 0.35) {
    presetId = 'recuperacao';
    motivos.push(
      `${Math.round(contexto.fracaoDesgastada * 100)}% do elenco cansado ou lesionado: semana de recuperação.`,
    );
  } else if (contexto.idadeMedia <= 24) {
    presetId = 'jovens';
    motivos.push(
      `Elenco jovem (média ${contexto.idadeMedia.toFixed(0)} anos): investir no desenvolvimento.`,
    );
  } else {
    presetId = 'equilibrado';
    motivos.push('Elenco pronto: manter técnica, tática e ritmo em equilíbrio.');
  }

  return {
    plano: planoDePreset(
      presetId,
      contexto.clubeId,
      contexto.criadoEm,
      'assistente',
    ),
    presetId,
    motivos,
  };
}

/**
 * Sessão do CICLO a aplicar nesta rodada. O índice do ciclo (derivado da
 * rodada pela store) escolhe a semana e o dia dentro dela; folga → sessão
 * provisória leve (recupera sem parar a progressão). Planos pausados também
 * caem no provisório. Determinístico.
 */
export function sessaoDoCiclo(
  plano: PlanoTreino | null,
  indiceCiclo: number,
): SessaoPlanoTreino {
  if (!plano || plano.status !== 'ativo' || plano.semanas.length === 0) {
    return SESSAO_PROVISORIA;
  }
  const semana = plano.semanas[indiceCiclo % plano.semanas.length];
  const dias = semana.dias.filter((dia): dia is SessaoPlanoTreino => dia !== null);
  if (dias.length === 0) {
    return SESSAO_PROVISORIA;
  }
  // Uma sessão "principal" por rodada (o ciclo semanal roda com a rodada).
  return dias[indiceCiclo % dias.length];
}
