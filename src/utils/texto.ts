/**
 * Normaliza um texto para busca acento-insensível: minúsculas + remoção dos
 * diacríticos combinantes (U+0300–U+036F). Puro e determinístico — usado nos
 * filtros de busca de jogador/clube.
 */
export function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}
