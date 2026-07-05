/**
 * Operações puras sobre uma Formacao. Mantêm a escalação COERENTE quando um
 * jogador deixa o clube (venda, empréstimo, rescisão) — senão o id "fantasma"
 * fica na formação e o motor resolve um XI vazio (fonte de crash).
 */
import type {Formacao, TitularFormacao} from '../../types';

/**
 * Remove `jogadorId` da formação (titulares e reservas). Se ele era titular,
 * promove o primeiro reserva que ainda está no elenco para o slot vago (mantém
 * a posição), preservando os 11 quando possível; sem reserva apto, o slot é
 * removido (fica com menos de 11 — o motor tolera e a validação avisa).
 */
export function removerJogadorDaFormacao(
  formacao: Formacao,
  jogadorId: string,
  elencoRestante: readonly string[],
): Formacao {
  const reservasLimpos = formacao.reservas.filter(id => id !== jogadorId);
  const eraTitular = formacao.titulares.some(t => t.jogadorId === jogadorId);
  if (!eraTitular) {
    return {...formacao, reservas: reservasLimpos};
  }

  const noElenco = new Set(elencoRestante);
  const promovido = reservasLimpos.find(id => noElenco.has(id));

  const titulares = formacao.titulares
    .map((titular): TitularFormacao | null => {
      if (titular.jogadorId !== jogadorId) {
        return titular;
      }
      return promovido ? {...titular, jogadorId: promovido} : null;
    })
    .filter((titular): titular is TitularFormacao => titular !== null);

  const reservas =
    promovido !== undefined
      ? reservasLimpos.filter(id => id !== promovido)
      : reservasLimpos;

  return {...formacao, titulares, reservas};
}
