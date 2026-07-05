import {
  DIFICULDADES,
  modificadoresDificuldade,
} from '../dificuldade';

describe('modificadoresDificuldade', () => {
  it('lista os 4 níveis', () => {
    expect(DIFICULDADES).toEqual(['Fácil', 'Normal', 'Difícil', 'Lendário']);
  });

  it('Normal é neutro', () => {
    expect(modificadoresDificuldade('Normal')).toEqual({
      ajusteMetaPosicao: 0,
      fatorPenalidadeMeta: 1,
    });
  });

  it('mais difícil = meta mais exigente e penalidade maior', () => {
    const facil = modificadoresDificuldade('Fácil');
    const dificil = modificadoresDificuldade('Difícil');
    const lendario = modificadoresDificuldade('Lendário');
    // ajusteMetaPosicao: Fácil folga (positivo), Difícil/Lendário exigem (negativo).
    expect(facil.ajusteMetaPosicao).toBeGreaterThan(0);
    expect(dificil.ajusteMetaPosicao).toBeLessThan(0);
    expect(lendario.ajusteMetaPosicao).toBeLessThan(dificil.ajusteMetaPosicao);
    // penalidade cresce com a dificuldade.
    expect(facil.fatorPenalidadeMeta).toBeLessThan(1);
    expect(dificil.fatorPenalidadeMeta).toBeGreaterThan(1);
    expect(lendario.fatorPenalidadeMeta).toBeGreaterThan(
      dificil.fatorPenalidadeMeta,
    );
  });
});
