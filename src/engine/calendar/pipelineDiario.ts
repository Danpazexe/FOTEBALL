/**
 * PIPELINE DIÁRIO DA CARREIRA (épico Overall Dinâmico, Onda 3).
 *
 * O relógio canônico é `dataAtual` (YYYY-MM-DD). No modelo aprovado (avanço
 * POR EVENTO), os dias entre o hoje e o próximo evento são processados EM
 * LOTE por esta engine — cada dia passa UMA vez, na ordem, de forma pura e
 * determinística (nenhum RNG é necessário nos passos atuais; passos futuros
 * recebem RNG por parâmetro).
 *
 * Passos por dia (P0 desta onda):
 *   1. lesões: `diasLesao` anda em DIAS REAIS de calendário (fim da escala
 *      dupla "7 dias = 1 rodada" apontada pela auditoria);
 *   2. pendências: recuperações concluídas viram pendência informativa de
 *      retorno (Central de Pendências).
 * Treino recorrente (Onda 4) e recuperação fisiológica (Onda 5) entram aqui
 * como novos passos — a ordem é o contrato.
 */
import type {PendenciaCarreira, Player} from '../../types';
import {adicionarDias, diferencaEmDias} from '../../utils/datas';

export interface ResultadoDia {
  jogadores: Player[];
  /** Pendências NOVAS geradas neste dia (o chamador acumula/deduplica). */
  novasPendencias: PendenciaCarreira[];
}

export interface ResultadoPeriodo extends ResultadoDia {
  /** Data final após processar todos os dias (== alvo). */
  dataFinal: string;
  diasProcessados: number;
}

/** Processa UM dia de calendário sobre os jogadores. Puro. */
export function processarDia(
  jogadores: Player[],
  data: string,
  clubeUsuarioId: string | null,
): ResultadoDia {
  const novasPendencias: PendenciaCarreira[] = [];
  const atualizados = jogadores.map(jogador => {
    if (!jogador.lesionado || jogador.diasLesao <= 0) {
      return jogador;
    }
    const diasRestantes = jogador.diasLesao - 1;
    if (diasRestantes > 0) {
      return {...jogador, diasLesao: diasRestantes};
    }
    // Recuperou HOJE: volta disponível; se é do clube do usuário, avisa a
    // Central (informativa — retorno GRADUAL vem com a engine física, Onda 5).
    if (jogador.clubeId !== null && jogador.clubeId === clubeUsuarioId) {
      novasPendencias.push({
        id: `pend_retorno_${jogador.id}_${data}`,
        tipo: 'retorno_lesao',
        prioridade: 'media',
        titulo: `${jogador.nome} está recuperado`,
        descricao: 'Voltou de lesão e já pode ser relacionado.',
        entidadeId: jogador.id,
        criadaEm: data,
        bloqueante: false,
      });
    }
    return {...jogador, lesionado: false, diasLesao: 0};
  });
  return {jogadores: atualizados, novasPendencias};
}

/**
 * Processa TODOS os dias de `dataAtual` (exclusiva) até `dataAlvo`
 * (inclusiva), em lote. Se o alvo não for posterior, devolve tudo intacto —
 * o relógio nunca anda para trás e nenhum dia roda duas vezes.
 */
export function processarDiasAte(
  jogadores: Player[],
  dataAtual: string,
  dataAlvo: string,
  clubeUsuarioId: string | null,
): ResultadoPeriodo {
  const dias = diferencaEmDias(dataAtual, dataAlvo);
  if (dias <= 0) {
    return {
      jogadores,
      novasPendencias: [],
      dataFinal: dataAtual,
      diasProcessados: 0,
    };
  }
  let atuais = jogadores;
  const pendencias: PendenciaCarreira[] = [];
  let data = dataAtual;
  for (let i = 0; i < dias; i += 1) {
    data = adicionarDias(data, 1);
    const resultado = processarDia(atuais, data, clubeUsuarioId);
    atuais = resultado.jogadores;
    pendencias.push(...resultado.novasPendencias);
  }
  return {
    jogadores: atuais,
    novasPendencias: pendencias,
    dataFinal: data,
    diasProcessados: dias,
  };
}
