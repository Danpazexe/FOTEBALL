/**
 * Operações puras sobre uma Formacao. Mantêm a escalação COERENTE quando um
 * jogador deixa o clube (venda, empréstimo, rescisão) — senão o id "fantasma"
 * fica na formação e o motor resolve um XI vazio (fonte de crash).
 */
import type {Formacao, TitularFormacao} from '../../types';

/** Tamanho do BANCO (reservas escalados para o jogo) — máximo do Brasileirão. */
export const TAMANHO_BANCO = 12;

/**
 * Garante um BANCO padrão coerente: mantém os reservas válidos (no elenco, não
 * titulares) e, se o banco estiver com menos que `TAMANHO_BANCO`, completa com
 * os melhores não-titulares de fora. Idempotente — um banco já cheio e válido
 * não muda. `elenco` traz `overall` só para ordenar os candidatos.
 */
export function preencherBanco(
  formacao: Formacao,
  elenco: ReadonlyArray<{id: string; overall: number}>,
): Formacao {
  const titularIds = new Set(formacao.titulares.map(t => t.jogadorId));
  const elencoIds = new Set(elenco.map(j => j.id));
  const reservasValidos = formacao.reservas.filter(
    id => elencoIds.has(id) && !titularIds.has(id),
  );
  const semSujeira = reservasValidos.length === formacao.reservas.length;

  // Excesso: corta no teto do banco.
  if (reservasValidos.length >= TAMANHO_BANCO) {
    const cortado = reservasValidos.slice(0, TAMANHO_BANCO);
    return semSujeira && cortado.length === formacao.reservas.length
      ? formacao
      : {...formacao, reservas: cortado};
  }

  // Já existe banco (abaixo do teto): RESPEITA a gestão manual — NÃO re-enche ao
  // remover; apenas limpa ids inválidos, se houver. Isso permite mover jogadores
  // do banco para "fora do jogo" sem o banco se auto-completar de volta.
  if (reservasValidos.length > 0) {
    return semSujeira ? formacao : {...formacao, reservas: reservasValidos};
  }

  // Banco VAZIO (save novo/antigo): monta um banco padrão com os melhores
  // não-titulares até o teto.
  const candidatos = elenco
    .filter(j => !titularIds.has(j.id))
    .sort((a, b) => b.overall - a.overall)
    .slice(0, TAMANHO_BANCO)
    .map(j => j.id);
  if (candidatos.length === 0) {
    return semSujeira ? formacao : {...formacao, reservas: []};
  }
  return {...formacao, reservas: candidatos};
}

/**
 * Move um jogador entre o BANCO e o "fora do jogo". Se está no banco → sai; se
 * está fora e o banco tem vaga → entra. Titular nunca vai pro banco. Puro.
 */
export function alternarBanco(formacao: Formacao, jogadorId: string): Formacao {
  if (formacao.titulares.some(t => t.jogadorId === jogadorId)) {
    return formacao;
  }
  if (formacao.reservas.includes(jogadorId)) {
    return {
      ...formacao,
      reservas: formacao.reservas.filter(id => id !== jogadorId),
    };
  }
  if (formacao.reservas.length >= TAMANHO_BANCO) {
    return formacao; // banco cheio
  }
  return {...formacao, reservas: [...formacao.reservas, jogadorId]};
}

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
