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

/**
 * Registra a transação só quando `valor > 0` — guarda única dos pontos de
 * crédito/débito condicionais (patrocínio, manutenção, juros, taxas de
 * transferência), evitando lançamentos zerados/negativos no histórico.
 */
export function registrarTransacaoSePositiva(
  clube: Clube,
  transacao: Transacao,
): Clube {
  if (transacao.valor <= 0) {
    return clube;
  }
  return registrarTransacao(clube, transacao);
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

/** Limites do fator de preço do ingresso ajustável pelo técnico (§8.2). */
export const PRECO_INGRESSO_FATOR_MIN = 0.5;
export const PRECO_INGRESSO_FATOR_MAX = 2.0;

/**
 * Elasticidade preço→ocupação (§8.2): cobrar acima do normal afasta a torcida;
 * baratear lota (com teto). Preço normal (fator 1.0) não altera a ocupação.
 */
export function fatorOcupacaoPorPreco(fatorPreco: number): number {
  return Math.min(1.2, Math.max(0.4, 1 - (fatorPreco - 1) * 0.6));
}

/**
 * Ocupação do estádio num jogo em casa (0..0.98): posição na tabela puxa a
 * torcida; o fator de preço do técnico (§8.2) escala inversamente.
 */
export function calcularOcupacaoJogo(
  clube: Clube,
  posicaoTabela: number,
): number {
  const fatorPosicao = Math.max(0.45, 1.15 - posicaoTabela * 0.025);
  const ocupacaoBase = Math.min(0.96, 0.48 + fatorPosicao * 0.32);
  const fatorPreco = clube.estadio.precoIngressoFator ?? 1;
  return Math.min(0.98, ocupacaoBase * fatorOcupacaoPorPreco(fatorPreco));
}

/** Público presente num jogo em casa — a MESMA conta da bilheteria. */
export function calcularPublicoJogo(
  clube: Clube,
  posicaoTabela: number,
): number {
  return Math.round(
    clube.estadio.capacidade * calcularOcupacaoJogo(clube, posicaoTabela),
  );
}

export function aplicarBilheteria(
  clube: Clube,
  posicaoTabela: number,
  data: string,
): Clube {
  // Preço ajustável pelo técnico: o fator escala o preço e (inversamente) a
  // ocupação — há um ponto ideal entre lotar barato e cobrar caro com estádio vazio.
  const fatorPreco = clube.estadio.precoIngressoFator ?? 1;
  const precoEfetivo = clube.estadio.precoMedioIngresso * fatorPreco;
  const ocupacao = calcularOcupacaoJogo(clube, posicaoTabela);

  const valor = Math.round(clube.estadio.capacidade * ocupacao * precoEfetivo);

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
  if (divisao === 'Série D') {
    // Receita modesta (4ª divisão): o valor real está no ACESSO, não na cota.
    if (posicaoFinal === 1) {
      return 800_000;
    }
    if (posicaoFinal <= 4) {
      return 500_000;
    }
    return 250_000;
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
  return registrarTransacaoSePositiva(clube, {
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
  return registrarTransacaoSePositiva(clube, {
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
  return registrarTransacaoSePositiva(clube, {
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
  /**
   * Pula o patrocínio derivado da reputação. Usado para o clube do usuário
   * quando ele tem um CONTRATO de patrocínio ativo (a renda vem do contrato,
   * evitando pagar duas vezes). Clubes da IA sempre usam o por-reputação.
   */
  pularPatrocinioReputacao = false,
): Clube {
  let atual = pularPatrocinioReputacao ? clube : aplicarPatrocinioAnual(clube, data);
  atual = aplicarFolhaMensal(atual, jogadores, data);
  atual = aplicarManutencaoEstadio(atual, data);
  // Juros por último: incidem sobre o saldo já consolidado da temporada.
  return aplicarJurosSaldoNegativo(atual, data);
}
