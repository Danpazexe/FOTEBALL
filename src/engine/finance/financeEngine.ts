import type {Clube, Player, Transacao} from '../../types';

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
