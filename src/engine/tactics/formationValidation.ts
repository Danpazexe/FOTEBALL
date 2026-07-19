import type {Formacao, Player} from '../../types';
import {calcularElegibilidadeJogador} from '../disciplina';
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
 *   ERROS (bloqueiam):
 *     - estrutura (tudo que `validarEscalacao` já considera erro)
 *     - jogador que não pertence ao clube (clubeId divergente)
 *     - COM `competicaoId` (contexto de partida): titular OU reserva inelegível
 *       (lesionado, ou suspenso NAQUELA competição). Regra do projeto: lesionados
 *       e suspensos ficam bloqueados de titulares E do banco, e a validação
 *       impede iniciar a partida com jogador inelegível.
 *
 *   AVISOS (NÃO bloqueiam):
 *     - SEM `competicaoId` (salvar formação geral): indisponibilidade é só aviso —
 *       a formação não é de uma competição específica, então não trava o técnico.
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
  /**
   * Competição da PARTIDA. Quando informado, inelegível (lesionado ou suspenso
   * NAQUELA competição) vira ERRO que bloqueia iniciar — titulares E banco. Sem
   * ele (salvar formação geral), a indisponibilidade é apenas aviso.
   */
  competicaoId?: string;
}): FormationValidationResult {
  const {formacao, jogadores, clubeId, competicaoId} = args;

  // 1. Estrutura: reaproveita a validação existente (11 titulares, 1 goleiro,
  //    mínimos por setor, duplicados). NÃO reimplementa essas regras.
  const base = validarEscalacao(formacao, jogadores);
  const errors: string[] = [...base.erros];
  const warnings: string[] = [];

  const porId = new Map<string, Player>();
  for (const jogador of jogadores) {
    porId.set(jogador.id, jogador);
  }

  // Indisponibilidade (lesão/suspensão): ERRO no contexto de partida, aviso ao
  // salvar formação geral. Cobre titular E banco (regra do projeto).
  const avaliarDisponibilidade = (jogador: Player): void => {
    const {elegivel, motivo} = calcularElegibilidadeJogador(jogador, competicaoId);
    if (elegivel || !motivo) {
      return;
    }
    const texto =
      motivo === 'lesionado'
        ? `${jogador.nome} está lesionado (indisponível).`
        : `${jogador.nome} está suspenso nesta competição.`;
    (competicaoId ? errors : warnings).push(texto);
  };

  // 2. Regras por titular. Cada jogador é avaliado uma única vez — duplicados já
  //    viram erro estrutural em `base`.
  const vistos = new Set<string>();
  for (const titular of formacao.titulares) {
    const jogador = porId.get(titular.jogadorId);
    if (jogador === undefined || vistos.has(jogador.id)) {
      continue;
    }
    vistos.add(jogador.id);
    if (jogador.clubeId !== clubeId) {
      errors.push(`${jogador.nome} não pertence ao seu elenco.`);
    }
    avaliarDisponibilidade(jogador);
    if (nivelAdaptacao(jogador, titular.posicao).nivel === 'improvisado') {
      warnings.push(`${jogador.nome} está improvisado na posição ${titular.posicao}.`);
    }
    if (jogador.condicaoFisica < LIMIAR_CONDICAO_BAIXA) {
      warnings.push(
        `${jogador.nome} está com condição física baixa (${Math.round(
          jogador.condicaoFisica,
        )}%).`,
      );
    }
  }

  // 3. Banco: um reserva inelegível também bloqueia iniciar a partida.
  for (const id of formacao.reservas) {
    const jogador = porId.get(id);
    if (jogador === undefined || vistos.has(jogador.id)) {
      continue;
    }
    vistos.add(jogador.id);
    if (jogador.clubeId !== clubeId) {
      errors.push(`${jogador.nome} não pertence ao seu elenco.`);
    }
    avaliarDisponibilidade(jogador);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
