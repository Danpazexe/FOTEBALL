/**
 * Feed de mensagens da carreira (avisos/toasts do jogo). Isolado do useGameStore
 * para poder ser compartilhado por módulos extraídos do store (ex.: a virada de
 * temporada) sem criar import circular.
 */

/** Mensagem curta da carreira (id + texto). */
export interface MensagemJogo {
  id: string;
  texto: string;
}

/** Prepende uma mensagem ao feed (mais novas primeiro), com teto de 8. */
export function adicionarMensagem(
  mensagens: MensagemJogo[],
  texto: string,
): MensagemJogo[] {
  return [{id: `${Date.now()}_${mensagens.length}`, texto}, ...mensagens].slice(
    0,
    8,
  );
}
