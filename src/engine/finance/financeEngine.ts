import type {Clube, Player, Transacao} from '../../types';

/** Juros anuais cobrados sobre saldo negativo (custo de operar no vermelho). */
export const TAXA_JUROS_ANUAL = 0.12;
/** Patrocínio anual derivado da reputação quando não há patrocinador no seed. */
export const PATROCINIO_POR_REPUTACAO = 80_000;
/** Custo anual de manutenção do estádio por lugar de capacidade. */
export const MANUTENCAO_POR_LUGAR = 35;

export function calcularFolhaSalarial(jogadores: Player[]): number {
  return jogadores.reduce((total, jogador) => total + jogador.salario, 0);
}

export function registrarTransacao(
  clube: Clube,
  transacao: Transacao,
): Clube {
  const saldo =
    transacao.tipo === 'receita'
      ? clube.financas.saldo + transacao.valor
      : clube.financas.saldo - transacao.valor;

  return {
    ...clube,
    financas: {
      ...clube.financas,
      saldo,
      historicoTransacoes: [
        transacao,
        ...clube.financas.historicoTransacoes,
      ].slice(0, 40),
    },
  };
}

export function aplicarBilheteria(
  clube: Clube,
  posicaoTabela: number,
  data: string,
): Clube {
  const fatorPosicao = Math.max(0.45, 1.15 - posicaoTabela * 0.025);
  const ocupacao = Math.min(0.96, 0.48 + fatorPosicao * 0.32);
  const valor = Math.round(
    clube.estadio.capacidade * ocupacao * clube.estadio.precoMedioIngresso,
  );

  return registrarTransacao(clube, {
    data,
    tipo: 'receita',
    categoria: 'bilheteria',
    valor,
    descricao: 'Receita de jogo como mandante',
  });
}

/**
 * Cota de TV por divisão e posição FINAL na tabela (BRASFOOT_MASTER §8.3).
 * Posição 1-indexada (1 = campeão). Distribuída no fim de temporada — é a
 * receita que premia terminar melhor na liga.
 */
export function cotaTV(divisao: string, posicaoFinal: number): number {
  if (divisao === 'Série B') {
    if (posicaoFinal === 1) {
      return 18_000_000;
    }
    if (posicaoFinal <= 4) {
      return 14_000_000;
    }
    if (posicaoFinal <= 12) {
      return 8_000_000;
    }
    return 4_000_000;
  }
  if (divisao === 'Série C') {
    if (posicaoFinal === 1) {
      return 5_000_000;
    }
    if (posicaoFinal <= 4) {
      return 3_500_000;
    }
    return 1_500_000;
  }
  // Série A (padrão).
  if (posicaoFinal === 1) {
    return 120_000_000;
  }
  if (posicaoFinal <= 4) {
    return 80_000_000;
  }
  if (posicaoFinal <= 8) {
    return 55_000_000;
  }
  if (posicaoFinal <= 12) {
    return 38_000_000;
  }
  if (posicaoFinal <= 16) {
    return 25_000_000;
  }
  return 18_000_000;
}

/** Credita a cota de TV (§8.3) ao clube conforme divisão e posição final. */
export function aplicarCotaTV(
  clube: Clube,
  divisao: string,
  posicaoFinal: number,
  data: string,
): Clube {
  return registrarTransacao(clube, {
    data,
    tipo: 'receita',
    categoria: 'cota_tv',
    valor: cotaTV(divisao, posicaoFinal),
    descricao: `Cota de TV (${divisao}, ${posicaoFinal}º)`,
  });
}

export function aplicarFolhaMensal(
  clube: Clube,
  jogadores: Player[],
  data: string,
): Clube {
  const valor = calcularFolhaSalarial(jogadores);

  return registrarTransacao(clube, {
    data,
    tipo: 'despesa',
    categoria: 'salarios',
    valor,
    descricao: 'Pagamento mensal de salários',
  });
}

/** Patrocínio anual: usa os patrocinadores do clube ou deriva da reputação. */
export function aplicarPatrocinioAnual(clube: Clube, data: string): Clube {
  const dosContratos = clube.financas.patrocinadores.reduce(
    (total, patrocinio) => total + patrocinio.valorMensal * 12,
    0,
  );
  const valor =
    dosContratos > 0
      ? dosContratos
      : Math.round(clube.reputacao * PATROCINIO_POR_REPUTACAO);
  if (valor <= 0) {
    return clube;
  }
  return registrarTransacao(clube, {
    data,
    tipo: 'receita',
    categoria: 'patrocinio',
    valor,
    descricao: 'Cota anual de patrocínio',
  });
}

/** Manutenção anual do estádio: usa a despesa do seed ou deriva da capacidade. */
export function aplicarManutencaoEstadio(clube: Clube, data: string): Clube {
  const doSeed = clube.financas.despesaMensal.manutencaoEstadio * 12;
  const valor =
    doSeed > 0
      ? doSeed
      : Math.round(clube.estadio.capacidade * MANUTENCAO_POR_LUGAR);
  if (valor <= 0) {
    return clube;
  }
  return registrarTransacao(clube, {
    data,
    tipo: 'despesa',
    categoria: 'manutencao',
    valor,
    descricao: 'Manutenção do estádio',
  });
}

/** Cobra juros sobre o saldo negativo (se houver). Sem dívida, não faz nada. */
export function aplicarJurosSaldoNegativo(clube: Clube, data: string): Clube {
  if (clube.financas.saldo >= 0) {
    return clube;
  }
  const valor = Math.round(-clube.financas.saldo * TAXA_JUROS_ANUAL);
  if (valor <= 0) {
    return clube;
  }
  return registrarTransacao(clube, {
    data,
    tipo: 'despesa',
    categoria: 'juros',
    valor,
    descricao: 'Juros sobre saldo negativo',
  });
}

/**
 * Acerto financeiro anual (fim de temporada): patrocínio entra, salários e
 * manutenção saem e, por fim, juros incidem sobre o que sobrou no vermelho.
 */
export function aplicarAcertoFinanceiroAnual(
  clube: Clube,
  jogadores: Player[],
  data: string,
): Clube {
  let atual = aplicarPatrocinioAnual(clube, data);
  atual = aplicarFolhaMensal(atual, jogadores, data);
  atual = aplicarManutencaoEstadio(atual, data);
  // Juros por último: incidem sobre o saldo já consolidado da temporada.
  return aplicarJurosSaldoNegativo(atual, data);
}
