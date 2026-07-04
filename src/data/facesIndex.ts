/**
 * Índice ESTÁTICO de faces de jogador — AUTO-GERADO por scripts/baixarFacesWiki.mjs.
 * NÃO edite à mão. Ver README_FACES.md.
 */

// prettier-ignore
export const FACES: Record<string, number> = {

};

/** true se há foto real empacotada para este jogador. */
export function temFace(jogadorId: string): boolean {
  return Object.prototype.hasOwnProperty.call(FACES, jogadorId);
}
