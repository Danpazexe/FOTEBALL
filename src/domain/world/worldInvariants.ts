/**
 * INVARIANTES DO MUNDO (AD-08, RN-01, RN-16) — verificações puras que detectam
 * corrupção após transferências: id fantasma na formação, posse divergente,
 * dono de empréstimo inexistente, jogador em dois elencos. Usadas por testes e
 * pela operação atômica (modo debug), nunca para "consertar em silêncio".
 */
import type {WorldState} from './worldTypes';

/** Ids na formação (titulares + reservas) de um clube. */
function idsDaFormacao(clube: {formacaoAtual: {titulares: {jogadorId: string}[]; reservas: string[]} | null}): string[] {
  const f = clube.formacaoAtual;
  if (!f) {
    return [];
  }
  return [...f.titulares.map(t => t.jogadorId), ...f.reservas];
}

/**
 * Devolve a lista de violações (vazia = mundo íntegro). Cada string descreve o
 * problema e o id afetado, para diagnóstico.
 */
export function verificarInvariantesMundo(world: WorldState): string[] {
  const violacoes: string[] = [];

  // Posse: todo clubeId de jogador aponta para clube existente (ou null).
  for (const jogador of Object.values(world.playersById)) {
    if (jogador.clubeId !== null && !world.clubsById[jogador.clubeId]) {
      violacoes.push(`jogador ${jogador.id}: clubeId fantasma ${jogador.clubeId}`);
    }
    const dono = jogador.emprestimo?.clubeDonoId;
    if (dono && !world.clubsById[dono]) {
      violacoes.push(`jogador ${jogador.id}: dono de empréstimo fantasma ${dono}`);
    }
  }

  for (const clube of Object.values(world.clubsById)) {
    // Formação sem id fantasma: todo id escalado é jogador QUE ATUA no clube.
    for (const id of idsDaFormacao(clube)) {
      const jogador = world.playersById[id];
      if (!jogador) {
        violacoes.push(`clube ${clube.id}: escala jogador inexistente ${id}`);
      } else if (jogador.clubeId !== clube.id) {
        violacoes.push(
          `clube ${clube.id}: escala ${id} que não pertence a ele (clubeId=${jogador.clubeId})`,
        );
      }
    }
    // Capitão, se houver, precisa pertencer ao clube.
    if (clube.capitaoId) {
      const cap = world.playersById[clube.capitaoId];
      if (!cap || cap.clubeId !== clube.id) {
        violacoes.push(`clube ${clube.id}: capitão ${clube.capitaoId} não pertence a ele`);
      }
    }
  }

  return violacoes;
}
