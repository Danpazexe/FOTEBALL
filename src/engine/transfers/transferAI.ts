import type {Clube, Player} from '../../types';

export type DecisaoTransferencia = 'aceita' | 'rejeitada';

export function avaliarPropostaTransferencia(
  jogador: Player,
  clubeVendedor: Clube,
  valorOferta: number,
): DecisaoTransferencia {
  const multiplicador = valorOferta / jogador.valorMercado;
  const jogadorImportante = jogador.overall >= clubeVendedor.reputacao + 20;

  if (multiplicador < 0.85) {
    return 'rejeitada';
  }

  if (multiplicador >= 1.2 && !jogadorImportante) {
    return 'aceita';
  }

  if (multiplicador >= 1.45) {
    return 'aceita';
  }

  return 'rejeitada';
}
