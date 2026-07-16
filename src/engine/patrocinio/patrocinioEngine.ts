/**
 * ENGINE PURA DE PATROCÍNIOS (determinística; sem React/RN/Zustand/SQLite,
 * sem Math.random/Date.now). Toda aleatoriedade vem de `criarRNGComSeed`
 * semeado por dados estáveis (clube + temporada), como o resto da engine.
 *
 * Fluxo: gerar propostas → aceitar/recusar → contrato ativo → pagamento por
 * temporada + bônus por vitória → progresso de metas (bônus idempotente) →
 * fim do contrato → histórico + novas propostas / renovação.
 */
import {
  criarRNGComSeed,
  hashString,
  limitar,
  type RandomGenerator,
} from '../simulation/rng';
import {CATALOGO_PATROCINADORES, patrocinadorPorId} from './catalogo';

import type {
  AlcancePatrocinador,
  ContratoPatrocinio,
  EstadoPatrocinio,
  MetaPatrocinio,
  Patrocinador,
  PropostaPatrocinio,
  TipoMetaPatrocinio,
} from '../../types/patrocinio';

// ── Configuração (RNF: parâmetros nomeados, sem número mágico solto) ─────────

export const MULTIPLICADOR_ALCANCE: Record<AlcancePatrocinador, number> = {
  REGIONAL: 0.75,
  NACIONAL: 1.0,
  GLOBAL: 1.35,
};

/** Valor-base anual de patrocínio por divisão (reais). */
const VALOR_BASE_DIVISAO: Record<string, number> = {
  'Série A': 6_000_000,
  'Série B': 2_500_000,
  'Série C': 1_000_000,
  'Série D': 400_000,
};
const VALOR_BASE_PADRAO = 800_000;

/** Contrato mais longo paga mais no TOTAL, mas um pouco menos por temporada. */
const FATOR_DURACAO_POR_TEMPORADA: Record<1 | 2 | 3, number> = {
  1: 1.0,
  2: 0.97,
  3: 0.94,
};

const MAX_PROPOSTAS = 3;

// ── Perfil do clube e valor da proposta ──────────────────────────────────────

export interface PerfilClubePatrocinio {
  clubeId: string;
  /** Temporada atual (número). */
  temporada: number;
  /** Reputação do clube (0–100). */
  reputacao: number;
  divisao: string;
  /** Última posição conhecida na liga (1 = líder). */
  posicaoLiga: number;
  /** Nº de clubes na divisão (limites de acesso/rebaixamento). */
  totalClubesDivisao: number;
  /** Desempenho recente 0–1 (aproveitamento). */
  desempenhoRecente: number;
  /** Força da torcida 0–1 (estádio/reputação). */
  torcidaFator: number;
}

function fatorReputacao(reputacao: number): number {
  return 0.6 + limitar(reputacao, 0, 100) / 100 * 0.8; // 0.6 → 1.4
}

function arredondarMoeda(valor: number): number {
  return Math.round(valor / 10_000) * 10_000;
}

export interface ValorProposta {
  valorPorTemporada: number;
  valorFixoTotal: number;
  bonusPorVitoria: number;
}

/** Valor da proposta a partir do perfil, alcance e duração (determinístico). */
export function calcularValorPropostaPatrocinio(
  perfil: PerfilClubePatrocinio,
  alcance: AlcancePatrocinador,
  duracao: 1 | 2 | 3,
): ValorProposta {
  const base = VALOR_BASE_DIVISAO[perfil.divisao] ?? VALOR_BASE_PADRAO;
  const porTemporada = arredondarMoeda(
    base *
      MULTIPLICADOR_ALCANCE[alcance] *
      fatorReputacao(perfil.reputacao) *
      (0.85 + limitar(perfil.desempenhoRecente, 0, 1) * 0.3) *
      (0.9 + limitar(perfil.torcidaFator, 0, 1) * 0.2) *
      FATOR_DURACAO_POR_TEMPORADA[duracao],
  );
  return {
    valorPorTemporada: porTemporada,
    valorFixoTotal: porTemporada * duracao,
    bonusPorVitoria: arredondarMoeda(porTemporada / 200),
  };
}

// ── Elegibilidade de alcance ─────────────────────────────────────────────────

function alcanceElegivel(
  perfil: PerfilClubePatrocinio,
  alcance: AlcancePatrocinador,
  rng: RandomGenerator,
): boolean {
  if (alcance === 'REGIONAL') {
    return true; // qualquer divisão
  }
  if (alcance === 'NACIONAL') {
    return perfil.reputacao >= 45 || perfil.divisao === 'Série A' || perfil.divisao === 'Série B';
  }
  // GLOBAL: reputação alta + 1ª divisão, ou pequena chance por campanha histórica.
  const elite = perfil.reputacao >= 68 && perfil.divisao === 'Série A';
  const surpresaHistorica =
    perfil.desempenhoRecente >= 0.75 && perfil.posicaoLiga <= 4 && rng() < 0.08;
  return elite || surpresaHistorica;
}

// ── Metas ────────────────────────────────────────────────────────────────────

interface DescricaoMeta {
  tipo: TipoMetaPatrocinio;
  descricao: string;
  alvo: number;
}

function embaralhar<T>(itens: readonly T[], rng: RandomGenerator): T[] {
  const arr = [...itens];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j] as T;
    arr[j] = tmp as T;
  }
  return arr;
}

/**
 * Metas REALISTAS para a força/divisão do clube. Um candidato ao rebaixamento
 * nunca recebe meta de título; um grande recebe metas ambiciosas. Devolve as
 * descrições possíveis, das quais 0–2 são sorteadas.
 */
function metasPossiveis(perfil: PerfilClubePatrocinio): DescricaoMeta[] {
  const opcoes: DescricaoMeta[] = [];
  const total = perfil.totalClubesDivisao;
  const zonaRebaixamento = Math.max(1, total - 3);
  const forte = perfil.reputacao >= 65 || perfil.posicaoLiga <= 4;
  const meio = !forte && perfil.reputacao >= 45;

  if (forte) {
    if (perfil.divisao === 'Série A') {
      opcoes.push({tipo: 'TITULO', descricao: 'Conquistar o título da liga', alvo: 1});
      opcoes.push({tipo: 'POSICAO_LIGA', descricao: 'Terminar entre os 4 primeiros', alvo: 4});
    } else {
      opcoes.push({tipo: 'ACESSO', descricao: 'Conquistar o acesso de divisão', alvo: 1});
      opcoes.push({tipo: 'POSICAO_LIGA', descricao: 'Terminar entre os 4 primeiros', alvo: 4});
    }
    opcoes.push({tipo: 'FASE_COPA', descricao: 'Chegar às quartas da Copa', alvo: 3});
    opcoes.push({tipo: 'VITORIAS', descricao: 'Vencer ao menos 18 partidas', alvo: 18});
    opcoes.push({tipo: 'INVENCIBILIDADE', descricao: 'Emendar 6 jogos sem perder', alvo: 6});
  } else if (meio) {
    opcoes.push({tipo: 'POSICAO_LIGA', descricao: `Terminar entre os ${Math.ceil(total / 2)} primeiros`, alvo: Math.ceil(total / 2)});
    opcoes.push({tipo: 'VITORIAS', descricao: 'Vencer ao menos 12 partidas', alvo: 12});
    opcoes.push({tipo: 'FASE_COPA', descricao: 'Passar da 2ª fase da Copa', alvo: 2});
    opcoes.push({tipo: 'INVENCIBILIDADE', descricao: 'Emendar 5 jogos sem perder', alvo: 5});
  } else {
    // Candidato ao rebaixamento: metas de sobrevivência (nunca título).
    opcoes.push({tipo: 'EVITAR_REBAIXAMENTO', descricao: 'Escapar do rebaixamento', alvo: zonaRebaixamento});
    opcoes.push({tipo: 'VITORIAS', descricao: 'Vencer ao menos 8 partidas', alvo: 8});
    opcoes.push({tipo: 'INVENCIBILIDADE', descricao: 'Emendar 4 jogos sem perder', alvo: 4});
  }
  // Nota: USO_DA_BASE existe no domínio, mas não é gerado até haver rastreio de
  // minutagem de jovens da base — não geramos meta que não sabemos avaliar.
  return opcoes;
}

/**
 * Seleciona 0–2 metas para um contrato. A 1ª é OBRIGATÓRIA (bônus 0, já embutida
 * no fixo); a 2ª é BÔNUS (paga ao concluir). Regionais tendem a menos metas.
 */
export function selecionarMetasPatrocinio(
  perfil: PerfilClubePatrocinio,
  alcance: AlcancePatrocinador,
  valorPorTemporada: number,
  rng: RandomGenerator,
): MetaPatrocinio[] {
  const possiveis = embaralhar(metasPossiveis(perfil), rng);
  // Quantidade: regional 0–1, nacional 1–2, global 1–2 (viés a 2).
  const sorteio = rng();
  let quantidade: number;
  if (alcance === 'REGIONAL') {
    quantidade = sorteio < 0.5 ? 0 : 1;
  } else if (alcance === 'NACIONAL') {
    quantidade = sorteio < 0.4 ? 1 : 2;
  } else {
    quantidade = sorteio < 0.25 ? 1 : 2;
  }
  quantidade = Math.min(quantidade, possiveis.length);

  const metas: MetaPatrocinio[] = [];
  for (let i = 0; i < quantidade; i += 1) {
    const desc = possiveis[i];
    if (!desc) {
      break;
    }
    const obrigatoria = i === 0;
    metas.push({
      id: `${desc.tipo}_${i}`,
      tipo: desc.tipo,
      descricao: desc.descricao,
      alvo: desc.alvo,
      progresso: 0,
      // Meta bônus paga ~40% de uma temporada; obrigatória não paga extra.
      valorBonus: obrigatoria ? 0 : arredondarMoeda(valorPorTemporada * 0.4),
      concluida: false,
      bonusPago: false,
    });
  }
  return metas;
}

// ── Geração de propostas ─────────────────────────────────────────────────────

/** Seed estável por clube+temporada (mesma janela ⇒ mesmas propostas). */
function seedPropostas(clubeId: string, temporada: number): number {
  return hashString(`patrocinio|${clubeId}|${temporada}`);
}

function duracaoSorteada(rng: RandomGenerator): 1 | 2 | 3 {
  const r = rng();
  return r < 0.45 ? 1 : r < 0.8 ? 2 : 3;
}

function montarProposta(
  perfil: PerfilClubePatrocinio,
  patrocinador: Patrocinador,
  rng: RandomGenerator,
  ehRenovacao: boolean,
): PropostaPatrocinio {
  const duracao = duracaoSorteada(rng);
  const valor = calcularValorPropostaPatrocinio(perfil, patrocinador.alcance, duracao);
  // Renovação premia a parceria: +8% no valor por temporada.
  const bonusRenovacao = ehRenovacao ? 1.08 : 1;
  const valorPorTemporada = arredondarMoeda(valor.valorPorTemporada * bonusRenovacao);
  const metas = selecionarMetasPatrocinio(perfil, patrocinador.alcance, valorPorTemporada, rng);
  return {
    id: `prop_${perfil.clubeId}_${perfil.temporada}_${patrocinador.id}`,
    patrocinadorId: patrocinador.id,
    clubeId: perfil.clubeId,
    temporadaInicio: perfil.temporada,
    duracaoTemporadas: duracao,
    valorFixoTotal: valorPorTemporada * duracao,
    valorPorTemporada,
    bonusPorVitoria: valor.bonusPorVitoria,
    metas,
    temporadaExpiracao: perfil.temporada,
    status: 'PENDENTE',
    ehRenovacao,
  };
}

/**
 * Gera até 3 propostas VÁLIDAS para o clube na temporada. Sem marcas repetidas.
 * Se houver contrato ativo no último ano, o patrocinador atual pode oferecer
 * renovação (marcada `ehRenovacao`); as demais excluem essa marca.
 */
export function gerarPropostasPatrocinio(
  perfil: PerfilClubePatrocinio,
  contratoAtivo: ContratoPatrocinio | null,
): PropostaPatrocinio[] {
  const rng = criarRNGComSeed(seedPropostas(perfil.clubeId, perfil.temporada));
  const propostas: PropostaPatrocinio[] = [];
  const usados = new Set<string>();

  // Renovação: só no ÚLTIMO ano do contrato ativo (últimos 20% ⇒ temporada fim).
  const patrocinadorAtual = contratoAtivo
    ? patrocinadorPorId(contratoAtivo.patrocinadorId)
    : undefined;
  const podeRenovar =
    contratoAtivo !== null &&
    contratoAtivo.status === 'ATIVO' &&
    perfil.temporada >= contratoAtivo.temporadaFim;
  if (podeRenovar && patrocinadorAtual && patrocinadorAtual.ativo) {
    propostas.push(montarProposta(perfil, patrocinadorAtual, rng, true));
    usados.add(patrocinadorAtual.id);
  }

  const pool = embaralhar(
    CATALOGO_PATROCINADORES.filter(p => p.ativo && !usados.has(p.id)),
    rng,
  );
  for (const patrocinador of pool) {
    if (propostas.length >= MAX_PROPOSTAS) {
      break;
    }
    if (!alcanceElegivel(perfil, patrocinador.alcance, rng)) {
      continue;
    }
    propostas.push(montarProposta(perfil, patrocinador, rng, false));
    usados.add(patrocinador.id);
  }

  return propostas;
}

// ── Aceitar / recusar ────────────────────────────────────────────────────────

function contratoDaProposta(proposta: PropostaPatrocinio): ContratoPatrocinio {
  return {
    id: `contrato_${proposta.id}`,
    propostaOrigemId: proposta.id,
    patrocinadorId: proposta.patrocinadorId,
    clubeId: proposta.clubeId,
    temporadaInicio: proposta.temporadaInicio,
    temporadaFim: proposta.temporadaInicio + proposta.duracaoTemporadas - 1,
    valorFixoTotal: proposta.valorFixoTotal,
    valorPorTemporada: proposta.valorPorTemporada,
    bonusPorVitoria: proposta.bonusPorVitoria,
    valorPago: 0,
    metas: proposta.metas,
    status: 'ATIVO',
  };
}

/**
 * Aceita uma proposta: cria o contrato ativo, arquiva o anterior (rescindido) e
 * marca as demais propostas como recusadas. Retorna o novo estado; se a
 * proposta não existir/não estiver pendente, devolve o estado inalterado.
 */
export function aceitarPropostaPatrocinio(
  estado: EstadoPatrocinio,
  propostaId: string,
): EstadoPatrocinio {
  const proposta = estado.propostas.find(p => p.id === propostaId);
  if (!proposta || proposta.status !== 'PENDENTE') {
    return estado;
  }
  const novoContrato = contratoDaProposta(proposta);
  const historico = estado.contratoAtivo
    ? [{...estado.contratoAtivo, status: 'RESCINDIDO' as const}, ...estado.historico]
    : estado.historico;
  return {
    ...estado,
    contratoAtivo: novoContrato,
    historico,
    propostas: estado.propostas.map(p =>
      p.id === propostaId
        ? {...p, status: 'ACEITA' as const}
        : p.status === 'PENDENTE'
          ? {...p, status: 'RECUSADA' as const}
          : p,
    ),
  };
}

export function recusarPropostaPatrocinio(
  estado: EstadoPatrocinio,
  propostaId: string,
): EstadoPatrocinio {
  return {
    ...estado,
    propostas: estado.propostas.map(p =>
      p.id === propostaId && p.status === 'PENDENTE'
        ? {...p, status: 'RECUSADA' as const}
        : p,
    ),
  };
}

// ── Pagamento e bônus ────────────────────────────────────────────────────────

/** Bônus por vitória do clube (crédito único por chamada). 0 se sem contrato. */
export function bonusVitoriaPatrocinio(estado: EstadoPatrocinio): number {
  return estado.contratoAtivo?.status === 'ATIVO'
    ? estado.contratoAtivo.bonusPorVitoria
    : 0;
}

/**
 * Registra o pagamento de UMA temporada no contrato (idempotente por
 * temporada: não paga além de `valorFixoTotal`). Devolve o novo estado e o
 * valor a creditar (0 se nada a pagar nesta temporada).
 */
export function pagarTemporadaPatrocinio(
  estado: EstadoPatrocinio,
): {estado: EstadoPatrocinio; credito: number} {
  const contrato = estado.contratoAtivo;
  if (!contrato || contrato.status !== 'ATIVO') {
    return {estado, credito: 0};
  }
  const restante = contrato.valorFixoTotal - contrato.valorPago;
  const credito = Math.max(0, Math.min(contrato.valorPorTemporada, restante));
  if (credito <= 0) {
    return {estado, credito: 0};
  }
  return {
    estado: {
      ...estado,
      contratoAtivo: {...contrato, valorPago: contrato.valorPago + credito},
    },
    credito,
  };
}

// ── Progresso das metas ──────────────────────────────────────────────────────

export interface ContextoMetasPatrocinio {
  posicaoLiga: number;
  vitoriasTemporada: number;
  sequenciaInvicto: number;
  acessoConquistado: boolean;
  rebaixado: boolean;
  /** Fase da copa alcançada (0 = fora; cresce a cada fase). */
  faseCopaAlcancada: number;
  titulosTemporada: number;
  jogosComBase: number;
}

function progressoMeta(meta: MetaPatrocinio, ctx: ContextoMetasPatrocinio): {
  progresso: number;
  concluida: boolean;
} {
  switch (meta.tipo) {
    case 'TITULO':
      return {progresso: ctx.titulosTemporada, concluida: ctx.titulosTemporada >= 1};
    case 'ACESSO':
      return {progresso: ctx.acessoConquistado ? 1 : 0, concluida: ctx.acessoConquistado};
    case 'EVITAR_REBAIXAMENTO':
      // Concluída quando a temporada acaba sem rebaixamento (posição fora da zona).
      return {
        progresso: ctx.rebaixado ? 0 : 1,
        concluida: !ctx.rebaixado && ctx.posicaoLiga > 0 && ctx.posicaoLiga <= meta.alvo,
      };
    case 'POSICAO_LIGA':
      return {
        progresso: ctx.posicaoLiga,
        concluida: ctx.posicaoLiga > 0 && ctx.posicaoLiga <= meta.alvo,
      };
    case 'FASE_COPA':
      return {progresso: ctx.faseCopaAlcancada, concluida: ctx.faseCopaAlcancada >= meta.alvo};
    case 'VITORIAS':
      return {progresso: ctx.vitoriasTemporada, concluida: ctx.vitoriasTemporada >= meta.alvo};
    case 'INVENCIBILIDADE':
      return {progresso: ctx.sequenciaInvicto, concluida: ctx.sequenciaInvicto >= meta.alvo};
    case 'USO_DA_BASE':
      return {progresso: ctx.jogosComBase, concluida: ctx.jogosComBase >= meta.alvo};
    default:
      return {progresso: meta.progresso, concluida: meta.concluida};
  }
}

/**
 * Atualiza o progresso das metas do contrato ativo e devolve o novo estado + o
 * total de bônus a creditar (metas recém-concluídas cujo bônus ainda não foi
 * pago — idempotente via `bonusPago`).
 */
export function atualizarMetasPatrocinio(
  estado: EstadoPatrocinio,
  ctx: ContextoMetasPatrocinio,
): {estado: EstadoPatrocinio; bonus: number} {
  const contrato = estado.contratoAtivo;
  if (!contrato || contrato.status !== 'ATIVO') {
    return {estado, bonus: 0};
  }
  let bonus = 0;
  const metas = contrato.metas.map(meta => {
    const {progresso, concluida} = progressoMeta(meta, ctx);
    const pagaAgora = concluida && !meta.bonusPago && meta.valorBonus > 0;
    if (pagaAgora) {
      bonus += meta.valorBonus;
    }
    return {
      ...meta,
      progresso,
      concluida: concluida || meta.concluida,
      bonusPago: meta.bonusPago || pagaAgora,
    };
  });
  return {
    estado: {...estado, contratoAtivo: {...contrato, metas}},
    bonus,
  };
}

// ── Fim do contrato ──────────────────────────────────────────────────────────

/**
 * Encerra o contrato ativo cuja temporada final já passou: move para o
 * histórico como CONCLUIDO. Chamado na virada de temporada, ANTES de gerar as
 * novas propostas. Idempotente.
 */
export function processarFimContratoPatrocinio(
  estado: EstadoPatrocinio,
  temporada: number,
): EstadoPatrocinio {
  const contrato = estado.contratoAtivo;
  if (!contrato || contrato.status !== 'ATIVO' || temporada <= contrato.temporadaFim) {
    return estado;
  }
  return {
    ...estado,
    contratoAtivo: null,
    historico: [{...contrato, status: 'CONCLUIDO' as const}, ...estado.historico],
  };
}
