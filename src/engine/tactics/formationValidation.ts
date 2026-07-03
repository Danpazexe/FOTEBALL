import type {Formacao, Player} from '../../types';
import {validarEscalacao} from './validacao';
import {nivelAdaptacao} from './adaptacao';

/**
 * Validação CENTRAL e RÍGIDA da escalação — a regra de "quem pode entrar em
 * campo" vive aqui, na engine, não na UI. É o portão usado pela store antes de
 * salvar a formação do usuário (ver `atualizarFormacaoUsuario`): uma formação
 * inválida nunca deve virar `formacaoAtual` e, portanto, nunca chega à partida.
 *
 * Diferença para `validarEscalacao` (validacao.ts): aquela é PROPOSITALMENTE
 * frouxa e serve aos banners informativos das telas (Tactics/PreJogo), tratando
 * jogador indisponível apenas como AVISO. Esta é a versão ESTRITA do contrato de
 * produção: reaproveita toda a checagem estrutural de `validarEscalacao` (11
 * titulares, exatamente 1 goleiro, mínimos por setor, duplicados) e ENDURECE:
 *
 *   ERROS (bloqueiam):
 *     - jogador lesionado como titular
 *     - jogador suspenso como titular
 *     - jogador que não pertence ao clube (clubeId divergente)
 *     - tudo que `validarEscalacao` já considera erro (estrutura)
 *
 *   AVISOS (não bloqueiam):
 *     - jogador improvisado na posição escalada (nível 'improvisado' de
 *       `nivelAdaptacao` — abaixo de natural/similar/adaptado)
 *
 * Função pura: apenas inspeciona os dados recebidos, sem ler nem alterar estado.
 */

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

    // Propriedade: o titular precisa pertencer ao clube que está escalando.
    if (jogador.clubeId !== clubeId) {
      errors.push(`${jogador.nome} não pertence ao seu elenco.`);
    }
    // Disponibilidade: lesionado/suspenso não pode ser titular (bloqueia).
    if (jogador.lesionado) {
      errors.push(`${jogador.nome} está lesionado e não pode ser titular.`);
    }
    if (jogador.suspenso) {
      errors.push(`${jogador.nome} está suspenso e não pode ser titular.`);
    }
    // Encaixe: fora da posição natural/similar é só um AVISO (o técnico pode
    // improvisar de propósito), mas precisa ficar visível.
    if (nivelAdaptacao(jogador, titular.posicao).nivel === 'improvisado') {
      warnings.push(`${jogador.nome} está improvisado na posição ${titular.posicao}.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
