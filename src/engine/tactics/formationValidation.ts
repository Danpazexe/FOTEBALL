import type {Formacao, Player} from '../../types';
import {validarEscalacao} from './validacao';
import {nivelAdaptacao} from './adaptacao';

/**
 * Validação CENTRAL e RÍGIDA da escalação — a regra de "quem pode entrar em
 * campo" vive aqui, na engine, não na UI. É o portão usado pela store antes de
 * salvar a formação do usuário (ver `atualizarFormacaoUsuario`): uma formação
 * inválida nunca deve virar `formacaoAtual` e, portanto, nunca chega à partida.
 *
 * Reaproveita a checagem estrutural de `validarEscalacao` (11 titulares, 1
 * goleiro, mínimos por setor, duplicados) e adiciona a propriedade do clube.
 *
 *   ERROS (bloqueiam — sempre satisfazíveis por qualquer elenco de 11+):
 *     - estrutura (tudo que `validarEscalacao` já considera erro)
 *     - jogador que não pertence ao clube (clubeId divergente)
 *
 *   AVISOS (NÃO bloqueiam):
 *     - jogador lesionado ou suspenso escalado como titular. NÃO é erro de
 *       propósito: bloquear travaria elencos curtos (que podem não ter 11 aptos)
 *       e o motor de simulação já IGNORA indisponíveis em campo. O aviso deixa o
 *       problema visível sem impedir o técnico de salvar/ajustar a escalação.
 *     - jogador improvisado na posição escalada (nível 'improvisado')
 *     - titular com condição física baixa (abaixo de LIMIAR_CONDICAO_BAIXA)
 *
 * Função pura: apenas inspeciona os dados recebidos, sem ler nem alterar estado.
 */

/**
 * Abaixo desta condição física, um titular rende bem menos e tem risco de lesão
 * elevado — vira aviso (não bloqueio). Alinhado ao BRASFOOT_MASTER (§8): "jogador
 * abaixo de 40 deve gerar alerta".
 */
const LIMIAR_CONDICAO_BAIXA = 40;

export interface FormationValidationResult {
  /** true quando não há erros (avisos não invalidam). */
  valid: boolean;
  /** Mensagens (pt-BR) que BLOQUEIAM a escalação. */
  errors: string[];
  /** Mensagens (pt-BR) que apenas ALERTAM, sem bloquear. */
  warnings: string[];
}

export function validarFormacao(args: {
  formacao: Formacao;
  jogadores: Player[];
  clubeId: string;
}): FormationValidationResult {
  const {formacao, jogadores, clubeId} = args;

  // 1. Estrutura: reaproveita a validação existente (11 titulares, 1 goleiro,
  //    mínimos por setor, duplicados). NÃO reimplementa essas regras.
  const base = validarEscalacao(formacao, jogadores);
  const errors: string[] = [...base.erros];
  const warnings: string[] = [];

  const porId = new Map<string, Player>();
  for (const jogador of jogadores) {
    porId.set(jogador.id, jogador);
  }

  // 2. Regras por titular (disponibilidade, propriedade e encaixe). Cada jogador
  //    é avaliado uma única vez — duplicados já viram erro estrutural em `base`.
  const vistos = new Set<string>();
  for (const titular of formacao.titulares) {
    const jogador = porId.get(titular.jogadorId);
    // Slot vazio / id inexistente: a falta de 11 titulares já é erro estrutural.
    if (jogador === undefined) {
      continue;
    }
    if (vistos.has(jogador.id)) {
      continue;
    }
    vistos.add(jogador.id);

    // Propriedade: o titular precisa pertencer ao clube que está escalando (erro).
    if (jogador.clubeId !== clubeId) {
      errors.push(`${jogador.nome} não pertence ao seu elenco.`);
    }
    // Disponibilidade: lesionado/suspenso é AVISO (não bloqueia) — ver cabeçalho.
    if (jogador.lesionado) {
      warnings.push(`${jogador.nome} está lesionado (indisponível).`);
    }
    if (jogador.suspenso) {
      warnings.push(`${jogador.nome} está suspenso (indisponível).`);
    }
    // Encaixe: fora da posição natural/similar é só um AVISO (o técnico pode
    // improvisar de propósito), mas precisa ficar visível.
    if (nivelAdaptacao(jogador, titular.posicao).nivel === 'improvisado') {
      warnings.push(`${jogador.nome} está improvisado na posição ${titular.posicao}.`);
    }
    // Condição física baixa: titular desgastado — avisa, sem bloquear.
    if (jogador.condicaoFisica < LIMIAR_CONDICAO_BAIXA) {
      warnings.push(
        `${jogador.nome} está com condição física baixa (${Math.round(
          jogador.condicaoFisica,
        )}%).`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
