import {
  formatarImprensa,
  selecionarColetiva,
  veredictoColetiva,
} from '../imprensa';

describe('imprensa', () => {
  it('selecionarColetiva traz 3 perguntas, uma de cada categoria', () => {
    const perguntas = selecionarColetiva(7);
    expect(perguntas).toHaveLength(3);
    expect(perguntas.map(p => p.categoria)).toEqual([
      'escalacao',
      'jogador',
      'adversario',
    ]);
    // Toda pergunta tem ao menos 2 opções.
    perguntas.forEach(p => expect(p.opcoes.length).toBeGreaterThanOrEqual(2));
  });

  it('selecionarColetiva é determinística por rodada e lida com rodada 0', () => {
    expect(selecionarColetiva(3).map(p => p.id)).toEqual(
      selecionarColetiva(3).map(p => p.id),
    );
    // Não deve estourar índice negativo/zero.
    expect(selecionarColetiva(0)).toHaveLength(3);
  });

  it('formatarImprensa substitui {jogador} e {adversario}', () => {
    const texto = formatarImprensa('{jogador} enfrenta o {adversario}?', {
      jogador: 'Neymar',
      adversario: 'Palmeiras',
    });
    expect(texto).toBe('Neymar enfrenta o Palmeiras?');
  });

  it('veredictoColetiva varia conforme o efeito total (texto, sem números)', () => {
    expect(veredictoColetiva(9)).toMatch(/sucesso/i);
    expect(veredictoColetiva(4)).toMatch(/equilibrada/i);
    expect(veredictoColetiva(1)).toMatch(/morna/i);
    expect(veredictoColetiva(-2)).toMatch(/arriscadas/i);
    // Não vaza número nenhum no retorno.
    expect(veredictoColetiva(9)).not.toMatch(/[0-9]/);
  });
});
