import {calcularSequencias, type JogoResultado} from '../sequencias';

/** Helper: constrói jogos só com o resultado (gols coerentes com o resultado). */
function j(resultados: Array<'V' | 'E' | 'D'>): JogoResultado[] {
  return resultados.map(r => ({
    resultado: r,
    golsFavor: r === 'V' ? 2 : r === 'E' ? 1 : 0,
    golsContra: r === 'V' ? 0 : r === 'E' ? 1 : 2,
  }));
}

describe('calcularSequencias', () => {
  it('sem jogos → nenhuma sequência', () => {
    expect(calcularSequencias([])).toEqual([]);
  });

  it('3 vitórias seguidas viram destaque bom', () => {
    const s = calcularSequencias(j(['D', 'V', 'V', 'V']));
    const vit = s.find(x => x.tipo === 'vitorias');
    expect(vit?.contagem).toBe(3);
    expect(vit?.destaque).toBe('bom');
  });

  it('2 vitórias ainda NÃO são destaque de forma', () => {
    const s = calcularSequencias(j(['D', 'V', 'V']));
    expect(s.some(x => x.tipo === 'vitorias')).toBe(false);
  });

  it('conta do fim para trás (sequência atual, não a maior histórica)', () => {
    // 3 vitórias antigas, mas o jogo mais recente foi derrota → sem streak de vitórias.
    const s = calcularSequencias(j(['V', 'V', 'V', 'D']));
    expect(s.some(x => x.tipo === 'vitorias')).toBe(false);
    expect(s.some(x => x.tipo === 'derrotas')).toBe(false); // só 1 derrota
  });

  it('3 derrotas seguidas viram destaque ruim', () => {
    const s = calcularSequencias(j(['V', 'D', 'D', 'D']));
    const der = s.find(x => x.tipo === 'derrotas');
    expect(der?.contagem).toBe(3);
    expect(der?.destaque).toBe('ruim');
  });

  it('vitórias prevalecem sobre invicto (mais específico)', () => {
    const s = calcularSequencias(j(['V', 'V', 'V', 'V']));
    expect(s[0].tipo).toBe('vitorias');
    expect(s.some(x => x.tipo === 'invicto')).toBe(false);
  });

  it('invicto aparece só quando não há streak de vitórias (>=4)', () => {
    // E,V,E,V → sem 3 vitórias seguidas, mas 4 sem perder.
    const s = calcularSequencias(j(['E', 'V', 'E', 'V']));
    const inv = s.find(x => x.tipo === 'invicto');
    expect(inv?.contagem).toBe(4);
    expect(inv?.destaque).toBe('bom');
  });

  it('sem vencer (>=4) é destaque ruim', () => {
    const s = calcularSequencias(j(['V', 'E', 'D', 'E', 'D']));
    const sv = s.find(x => x.tipo === 'semVencer');
    expect(sv?.contagem).toBe(4);
    expect(sv?.destaque).toBe('ruim');
  });

  it('jogos sem sofrer gol viram destaque defensivo independente da forma', () => {
    const jogos: JogoResultado[] = [
      {resultado: 'V', golsFavor: 1, golsContra: 0},
      {resultado: 'E', golsFavor: 0, golsContra: 0},
      {resultado: 'V', golsFavor: 2, golsContra: 0},
    ];
    const s = calcularSequencias(jogos);
    const ss = s.find(x => x.tipo === 'semSofrer');
    expect(ss?.contagem).toBe(3);
    expect(ss?.destaque).toBe('bom');
  });

  it('é determinística para a mesma entrada', () => {
    const jogos = j(['V', 'V', 'V', 'E']);
    expect(calcularSequencias(jogos)).toEqual(calcularSequencias(jogos));
  });
});
