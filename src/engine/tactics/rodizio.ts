/**
 * Rodízio sugerido (pré-jogo) — o staff aponta TITULARES em risco de lesão ou
 * cansados demais para 90 minutos e sugere o melhor substituto apto do banco
 * no MESMO grupo posicional. Só LEITURA das derivações físicas já existentes
 * (`prontidao`/`nivelRisco` do fisicoEngine — importadas, nunca reimplementadas);
 * a troca em si NUNCA é aplicada aqui — quem decide é o técnico, no editor.
 * Função pura e determinística: sem RNG, sem relógio, sem store.
 */
import type {Player, TitularFormacao} from '../../types';
import {nivelRisco, prontidao} from '../physical/fisicoEngine';
import {grupoDaPosicao, type GrupoPosicao} from './posicoes';

export type MotivoRodizio = 'risco' | 'cansado';

export interface SugestaoRodizio {
  titularId: string;
  motivo: MotivoRodizio;
  /** Ausente quando o banco não tem opção apta melhor no grupo do titular. */
  substitutoId?: string;
}

/**
 * Limiar de prontidão abaixo do qual o titular é apontado como "cansado".
 * Coerente com as faixas já usadas no app (Departamento Médico): ≥70 "Boa",
 * 55–69 "Atenção", <55 "Crítica". O card pré-jogo usa o corte CRÍTICO (55),
 * não o de atenção (70) — alertar na faixa intermediária geraria ruído a cada
 * rodada; aqui só se fala quando a prontidão compromete os 90 minutos.
 */
export const PRONTIDAO_CANSADO = 55;

function riscoAlto(jogador: Player): boolean {
  const risco = nivelRisco(jogador);
  return risco === 'elevado' || risco === 'muito_elevado';
}

function apto(jogador: Player): boolean {
  return !jogador.lesionado && !jogador.suspenso;
}

/** O jogador cobre o grupo se a posição principal OU alguma secundária cai nele. */
function cobreGrupo(jogador: Player, grupo: GrupoPosicao): boolean {
  return (
    grupoDaPosicao(jogador.posicaoPrincipal) === grupo ||
    jogador.posicoesSecundarias.some(p => grupoDaPosicao(p) === grupo)
  );
}

/**
 * Sugestões de rodízio para a escalação atual. Aponta titulares com risco de
 * lesão elevado/muito elevado (motivo 'risco' — vence quando os dois valem) ou
 * prontidão abaixo de `PRONTIDAO_CANSADO` (motivo 'cansado') e, para cada um,
 * o melhor substituto do banco: apto, sem risco alto (sugerir entrar quem
 * também está em risco contradiria o próprio aviso), do mesmo grupo posicional
 * do SLOT do titular e com prontidão maior que a dele — maior overall vence,
 * prontidão desempata. Cada reserva é sugerida no máximo uma vez.
 *
 * Titular lesionado/suspenso não entra: isso é ERRO de escalação (bloqueia o
 * jogo via `validarFormacao`), não rodízio. Ordena por gravidade: 'risco'
 * antes de 'cansado'; dentro do motivo, menor prontidão primeiro.
 *
 * @param titulares slots da formação salva (posição + jogadorId).
 * @param reservas  ids do banco da formação salva.
 * @param jogadores catálogo para resolver os ids (ex.: elenco do usuário).
 */
export function sugerirRodizio(
  titulares: readonly TitularFormacao[],
  reservas: readonly string[],
  jogadores: readonly Player[],
): SugestaoRodizio[] {
  const porId = new Map(jogadores.map(jogador => [jogador.id, jogador]));

  const banco = reservas
    .map(id => porId.get(id))
    .filter(
      (jogador): jogador is Player =>
        jogador !== undefined && apto(jogador) && !riscoAlto(jogador),
    );
  const prontidaoBanco = new Map(banco.map(j => [j.id, prontidao(j)]));

  const apontados: Array<{
    titular: Player;
    grupo: GrupoPosicao;
    motivo: MotivoRodizio;
    prontidaoTitular: number;
  }> = [];

  for (const slot of titulares) {
    const titular = porId.get(slot.jogadorId);
    if (!titular || !apto(titular)) {
      continue;
    }
    const prontidaoTitular = prontidao(titular);
    const motivo: MotivoRodizio | null = riscoAlto(titular)
      ? 'risco'
      : prontidaoTitular < PRONTIDAO_CANSADO
      ? 'cansado'
      : null;
    if (motivo) {
      apontados.push({
        titular,
        grupo: grupoDaPosicao(slot.posicao),
        motivo,
        prontidaoTitular,
      });
    }
  }

  apontados.sort((a, b) => {
    if (a.motivo !== b.motivo) {
      return a.motivo === 'risco' ? -1 : 1;
    }
    return a.prontidaoTitular - b.prontidaoTitular;
  });

  const reservasUsadas = new Set<string>();

  return apontados.map(({titular, grupo, motivo, prontidaoTitular}) => {
    const candidatos = banco
      .filter(
        reserva =>
          !reservasUsadas.has(reserva.id) &&
          cobreGrupo(reserva, grupo) &&
          (prontidaoBanco.get(reserva.id) ?? 0) > prontidaoTitular,
      )
      .sort(
        (a, b) =>
          b.overall - a.overall ||
          (prontidaoBanco.get(b.id) ?? 0) - (prontidaoBanco.get(a.id) ?? 0),
      );

    const substituto = candidatos[0];
    if (substituto) {
      reservasUsadas.add(substituto.id);
    }
    return {
      titularId: titular.id,
      motivo,
      ...(substituto ? {substitutoId: substituto.id} : {}),
    };
  });
}
