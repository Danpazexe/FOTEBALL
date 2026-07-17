/**
 * REPARO DE FORMAÇÃO (AD-08) — após saída de jogador (venda/empréstimo/retorno),
 * remove ids fantasmas da formação e, quando possível, promove um reserva para a
 * vaga aberta no XI. Puro. Não inventa jogador: se não houver reserva, a vaga
 * some e o chamador registra "necessidade urgente".
 */
import type {Clube, Formacao} from '../../types';

export interface ResultadoReparo {
  clube: Clube;
  /** Ficou abaixo do XI completo (11 titulares) após o reparo. */
  formacaoIncompleta: boolean;
}

/**
 * Remove `jogadorSaiuId` da formação do clube e recompõe. `idsDisponiveis` são os
 * jogadores QUE AINDA pertencem ao clube (para não promover fantasma).
 */
export function repararFormacao(
  clube: Clube,
  jogadorSaiuId: string,
  idsDisponiveis: Set<string>,
): ResultadoReparo {
  const formacao = clube.formacaoAtual;
  if (!formacao) {
    return {clube, formacaoIncompleta: false};
  }

  const eraTitular = formacao.titulares.some(t => t.jogadorId === jogadorSaiuId);
  // Reservas válidas (ainda no clube e não são o que saiu), na ordem atual.
  const reservasValidas = formacao.reservas.filter(
    id => id !== jogadorSaiuId && idsDisponiveis.has(id),
  );

  let titulares = formacao.titulares.filter(t => t.jogadorId !== jogadorSaiuId);
  let reservas = reservasValidas;

  // Se saiu um titular, promove o primeiro reserva disponível para a mesma vaga.
  if (eraTitular && reservasValidas.length > 0) {
    const slot = formacao.titulares.find(t => t.jogadorId === jogadorSaiuId);
    const promovidoId = reservasValidas[0];
    if (slot && promovidoId) {
      titulares = [
        ...titulares,
        {...slot, jogadorId: promovidoId},
      ];
      reservas = reservasValidas.slice(1);
    }
  }

  const novaFormacao: Formacao = {...formacao, titulares, reservas};
  const capitaoId =
    clube.capitaoId && idsDisponiveis.has(clube.capitaoId)
      ? clube.capitaoId
      : undefined;

  return {
    clube: {...clube, formacaoAtual: novaFormacao, capitaoId},
    formacaoIncompleta: titulares.length < 11,
  };
}
