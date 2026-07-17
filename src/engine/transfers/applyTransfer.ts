/**
 * OPERAÇÃO ATÔMICA DE TRANSFERÊNCIA (AD-07) — a ÚNICA porta por onde qualquer
 * movimentação de jogador passa (compra/venda/empréstimo/retorno/agente livre,
 * usuário ou IA). Pura e sem efeito colateral: recebe o WorldState e devolve um
 * novo, com finanças simétricas, elencos coerentes, formação reparada e o
 * registro no histórico. Garante os invariantes de RN-01/RN-02/RN-16/AD-08.
 */
import type {Clube, Player} from '../../types';
import type {TipoTransferencia, TransferRecord} from '../../types/world';
import {registrarTransacao} from '../finance/financeEngine';
import {competicaoPorDivisaoLegada} from '../competitions/registry/competitionRegistry';
import {janelaAberta} from './transferWindow';
import {repararFormacao} from './formationRepair';
import type {WorldState} from '../../domain/world/worldTypes';

/** Reserva financeira mínima que o comprador deve preservar (RN-04). */
export const RESERVA_FINANCEIRA = 1_000_000;

export interface ApplyTransferInput {
  world: WorldState;
  playerId: string;
  fromClubId: string | null;
  toClubId: string | null;
  type: TipoTransferencia;
  fee: number;
  salary?: number;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** Se true, ignora a checagem de janela (ex.: acerto forçado do usuário). */
  ignorarJanela?: boolean;
  source: 'user' | 'ai';
  reasonCodes?: string[];
}

export interface ApplyTransferResult {
  ok: boolean;
  world: WorldState;
  record?: TransferRecord;
  errors: string[];
  warnings: string[];
}

function competitionIdDoClube(clube: Clube | undefined): string | undefined {
  return competicaoPorDivisaoLegada(clube?.divisao)?.id;
}

function temporadaDaData(date: string): string {
  return date.slice(0, 4);
}

/** Aplica um crédito/débito no clube preservando o histórico (categoria). */
function moverDinheiro(
  clube: Clube,
  valor: number,
  tipo: 'receita' | 'despesa',
  categoria: string,
  descricao: string,
  date: string,
): Clube {
  if (valor <= 0) {
    return clube;
  }
  return registrarTransacao(clube, {data: date, tipo, categoria, valor, descricao});
}

export function applyTransfer(input: ApplyTransferInput): ApplyTransferResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const {world, playerId, fromClubId, toClubId, type, fee, date} = input;

  const jogador = world.playersById[playerId];
  if (!jogador) {
    return {ok: false, world, errors: [`jogador inexistente: ${playerId}`], warnings};
  }
  const comprador = toClubId ? world.clubsById[toClubId] : undefined;
  const vendedor = fromClubId ? world.clubsById[fromClubId] : undefined;

  // ── Validações ─────────────────────────────────────────────────────────────
  if (toClubId && !comprador) {
    errors.push(`clube destino inexistente: ${toClubId}`);
  }
  if (fromClubId && !vendedor) {
    errors.push(`clube origem inexistente: ${fromClubId}`);
  }
  // Posse coerente com a origem.
  if (type === 'free_agent') {
    if (jogador.clubeId !== null) {
      errors.push(`agente livre inválido: ${playerId} pertence a ${jogador.clubeId}`);
    }
  } else if (jogador.clubeId !== fromClubId) {
    errors.push(
      `origem incoerente: ${playerId} está em ${jogador.clubeId}, não em ${fromClubId}`,
    );
  }
  if (type === 'loan_return' && !jogador.emprestimo) {
    errors.push(`retorno inválido: ${playerId} não está emprestado`);
  }
  // Janela (usa a competição do comprador; escopo global cobre tudo).
  if (!input.ignorarJanela && toClubId) {
    const aberta = janelaAberta({
      data: date,
      competitionId: competitionIdDoClube(comprador),
      tipo: type,
    });
    if (!aberta) {
      errors.push(`janela fechada para ${type} em ${date}`);
    }
  }
  // Orçamento do comprador (não gastar dinheiro que não tem).
  if (comprador && fee > 0 && comprador.financas.saldo < fee) {
    errors.push(
      `orçamento insuficiente: ${comprador.id} tem ${comprador.financas.saldo}, taxa ${fee}`,
    );
  }
  if (errors.length > 0) {
    return {ok: false, world, errors, warnings};
  }

  // Reserva financeira: aviso (não bloqueia acerto do usuário), útil para a IA.
  if (comprador && comprador.financas.saldo - fee < RESERVA_FINANCEIRA) {
    warnings.push(`compra deixa ${comprador.id} abaixo da reserva financeira`);
  }

  // ── Mutação (cópias imutáveis) ─────────────────────────────────────────────
  const clubsById: Record<string, Clube> = {...world.clubsById};
  const playersById: Record<string, Player> = {...world.playersById};
  const temporada = temporadaDaData(date);
  const emprestimoAnteriorDono = jogador.emprestimo?.clubeDonoId ?? null;

  // Novo estado do jogador.
  const novoJogador: Player = {...jogador};
  if (type === 'permanent' || type === 'free_agent') {
    novoJogador.clubeId = toClubId;
    delete novoJogador.emprestimo;
  } else if (type === 'loan') {
    novoJogador.clubeId = toClubId;
    novoJogador.emprestimo = {
      clubeDonoId: fromClubId ?? '',
      retornaEmTemporada: String(Number(temporada) + 1),
    };
  } else if (type === 'loan_return') {
    novoJogador.clubeId = emprestimoAnteriorDono ?? toClubId;
    delete novoJogador.emprestimo;
  }
  if (input.salary !== undefined) {
    novoJogador.salario = input.salary;
  }
  playersById[playerId] = novoJogador;

  // Finanças simétricas: comprador paga a taxa, vendedor recebe (RN-02).
  // Categoria coerente com o resto das finanças (empréstimo vs compra/venda).
  // RETORNO de empréstimo NUNCA move dinheiro (o jogador só volta pra casa) —
  // sem isto, um fee>0 num retorno debitaria o "comprador" sem contraparte.
  const ehEmprestimo = type === 'loan' || type === 'loan_return';
  const moveDinheiro = fee > 0 && type !== 'loan_return';
  const categoriaComprador = ehEmprestimo ? 'emprestimo' : 'contratacoes';
  const categoriaVendedor = ehEmprestimo ? 'emprestimo' : 'vendaJogadores';
  if (comprador && moveDinheiro) {
    clubsById[comprador.id] = moverDinheiro(
      clubsById[comprador.id] ?? comprador,
      fee,
      'despesa',
      categoriaComprador,
      ehEmprestimo ? `Empréstimo de ${jogador.nome}` : `Contratação de ${jogador.nome}`,
      date,
    );
  }
  if (vendedor && moveDinheiro) {
    clubsById[vendedor.id] = moverDinheiro(
      clubsById[vendedor.id] ?? vendedor,
      fee,
      'receita',
      categoriaVendedor,
      ehEmprestimo ? `Cessão de ${jogador.nome}` : `Venda de ${jogador.nome}`,
      date,
    );
  }

  // Elencos: quem PERDE o jogador (o clube onde ele atuava) e quem GANHA.
  const clubeQuePerde = jogador.clubeId; // onde ele atuava antes
  const clubeQueGanha = novoJogador.clubeId; // onde passa a atuar

  if (clubeQuePerde && clubeQuePerde !== clubeQueGanha) {
    const base = clubsById[clubeQuePerde] ?? world.clubsById[clubeQuePerde];
    if (base) {
      const semJogador: Clube = {
        ...base,
        elenco: base.elenco.filter(id => id !== playerId),
      };
      // Reparo de formação: ids que continuam no clube após a saída.
      const idsRestantes = new Set(
        Object.values(playersById)
          .filter(p => p.clubeId === clubeQuePerde && p.id !== playerId)
          .map(p => p.id),
      );
      const reparo = repararFormacao(semJogador, playerId, idsRestantes);
      clubsById[clubeQuePerde] = reparo.clube;
      if (reparo.formacaoIncompleta) {
        warnings.push(`formação de ${clubeQuePerde} ficou incompleta`);
      }
    }
  }

  if (clubeQueGanha) {
    const base = clubsById[clubeQueGanha] ?? world.clubsById[clubeQueGanha];
    if (base && !base.elenco.includes(playerId)) {
      clubsById[clubeQueGanha] = {...base, elenco: [...base.elenco, playerId]};
    }
  }

  const record: TransferRecord = {
    id: `tr_${playerId}_${date}_${world.transferHistory.length}`,
    playerId,
    fromClubId,
    toClubId,
    type,
    fee,
    salary: input.salary,
    date,
    season: temporada,
    source: input.source,
    reasonCodes: input.reasonCodes ?? [],
  };

  return {
    ok: true,
    world: {
      ...world,
      clubsById,
      playersById,
      transferHistory: [...world.transferHistory, record],
    },
    record,
    errors,
    warnings,
  };
}
