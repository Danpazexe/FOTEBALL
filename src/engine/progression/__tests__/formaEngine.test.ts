/**
 * Forma reagindo ao desempenho (Onda 6): a nota empurra a fase técnica e
 * jogos medianos regridem ao neutro, dentro dos limites −3..+5.
 */
import {atualizarFormaPorNota} from '../formaEngine';

describe('atualizarFormaPorNota', () => {
  it('jogo brilhante sobe a forma; jogo fraco derruba', () => {
    expect(atualizarFormaPorNota(0, 8.5)).toBe(1);
    expect(atualizarFormaPorNota(0, 4.5)).toBe(-1);
  });

  it('jogo mediano puxa a forma de volta ao neutro (fase não é eterna)', () => {
    expect(atualizarFormaPorNota(4, 6.5)).toBe(3);
    expect(atualizarFormaPorNota(-2, 6.5)).toBe(-1);
    expect(atualizarFormaPorNota(0, 6.5)).toBe(0);
  });

  it('respeita os limites +5 e −3', () => {
    expect(atualizarFormaPorNota(5, 9)).toBe(5);
    expect(atualizarFormaPorNota(-3, 3)).toBe(-3);
  });

  it('uma sequência de bons jogos leva ao pico e uma ruim ao fundo', () => {
    let f = 0;
    for (let i = 0; i < 6; i += 1) {
      f = atualizarFormaPorNota(f, 8);
    }
    expect(f).toBe(5);
    for (let i = 0; i < 10; i += 1) {
      f = atualizarFormaPorNota(f, 4);
    }
    expect(f).toBe(-3);
  });
});
