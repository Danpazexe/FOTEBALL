/**
 * corDoTime — FONTE ÚNICA da cor de identidade visual de um clube.
 *
 * Substitui `corDoTime`/`contrasteTexto` do tema antigo (`src/theme`). Os dados
 * dos clubes não trazem cor, então derivamos uma cor ESTÁVEL por hash do id
 * sobre uma paleta curada — sempre a mesma para o mesmo clube, em qualquer
 * tema. É identidade de DOMÍNIO (camisa/badge do clube na narração e no
 * escudo-placeholder), não token de tema: por isso os hex moram aqui, e não
 * em tokens/colors.
 * Funções puras: sem React, sem hooks, sem estado.
 */

// Paleta curada (verde/dourado/azul-noite): tons vivos e legíveis, espalhados de
// quente a frio para que dois times num confronto contrastem. Sem roxo/rosa/marrom.
const CORES_TIME = [
  '#E5484D', // vermelho
  '#FF7A5C', // coral
  '#F4511E', // telha
  '#FB8C00', // laranja
  '#F5A623', // âmbar
  '#FDD835', // amarelo
  '#C0CA33', // lima
  '#43A047', // verde
  '#10B981', // esmeralda
  '#00897B', // teal
  '#00ACC1', // ciano
  '#26A9E0', // azul-céu
  '#1E88E5', // azul
  '#2979FF', // azul-vivo
] as const;

/** Cor estável de um clube (hash determinístico do id sobre a paleta). */
export function corDoTime(clubeId: string): string {
  let hash = 0;
  for (let i = 0; i < clubeId.length; i += 1) {
    // eslint-disable-next-line no-bitwise -- hash intencional (cor estável)
    hash = (hash * 31 + clubeId.charCodeAt(i)) >>> 0;
  }
  return CORES_TIME[hash % CORES_TIME.length];
}

/** Texto legível (claro/escuro) sobre uma cor de fundo sólida. */
export function contrasteTexto(corHex: string): string {
  const hex = corHex.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminancia > 0.6 ? '#17233B' : '#FFFFFF';
}
