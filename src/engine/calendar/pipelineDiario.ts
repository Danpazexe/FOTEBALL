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
 *   1. físico: carga aguda dissipa e ritmo decai (`recuperarDiaFisico`) e a
 *      CONDIÇÃO recupera por dia para quem NÃO está lesionado
 *      (`recuperarCondicaoDia` — drift diário, simétrico usuário/IA);
 *   2. lesões: `diasLesao` anda em DIAS REAIS de calendário (fim da escala
 *      dupla "7 dias = 1 rodada" apontada pela auditoria);
 *   3. pendências: recuperações concluídas viram pendência informativa de
 *      retorno (Central de Pendências).
 * Treino recorrente (Onda 4) e recuperação fisiológica (Onda 5) entram aqui
 * como novos passos — a ordem é o contrato.
 */
import type {PendenciaCarreira, Player} from '../../types';
import {
  aoRetornarDeLesao,
  recuperarDiaFisico,
} from '../physical/fisicoEngine';
import {recuperarCondicaoDia} from '../progression/condicao';
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
    // Recuperação física do dia (carga aguda dissipa, ritmo cai devagar) —
    // vale para TODO jogador, todo dia (auditoria: recuperação por dia real).
    let comFisico = jogador.fisico
      ? {...jogador, fisico: recuperarDiaFisico(jogador.fisico)}
      : jogador;

    // Drift diário de CONDIÇÃO: quem NÃO está lesionado recupera um pouco por
    // dia real (todos os clubes, determinístico). Lesionado não recupera —
    // quem cuida do retorno é `aoRetornarDeLesao` (volta com condição parcial).
    if (!jogador.lesionado) {
      const condicaoFisica = recuperarCondicaoDia(jogador.condicaoFisica);
      if (condicaoFisica !== jogador.condicaoFisica) {
        comFisico =
          comFisico === jogador
            ? {...jogador, condicaoFisica}
            : {...comFisico, condicaoFisica};
      }
    }

    if (!comFisico.lesionado || comFisico.diasLesao <= 0) {
      return comFisico;
    }
    const diasRestantes = comFisico.diasLesao - 1;
    if (diasRestantes > 0) {
      return {...comFisico, diasLesao: diasRestantes};
    }
    // Recuperou HOJE: RETORNO PROGRESSIVO (Onda 5) — volta com condição/ritmo
    // parciais, não a 100%. Se é do clube do usuário, avisa a Central.
    if (comFisico.clubeId !== null && comFisico.clubeId === clubeUsuarioId) {
      novasPendencias.push({
        id: `pend_retorno_${comFisico.id}_${data}`,
        tipo: 'retorno_lesao',
        prioridade: 'media',
        titulo: `${comFisico.nome} está recuperado`,
        descricao: 'Voltou de lesão, com ritmo baixo — cuide dos minutos.',
        entidadeId: comFisico.id,
        criadaEm: data,
        bloqueante: false,
      });
    }
    return aoRetornarDeLesao(comFisico);
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
