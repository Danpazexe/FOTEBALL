import {
  coresClaras,
  coresEscuras,
  esporteClaro,
  esporteEscuro,
} from '../tokens/colors';

describe('tokens de cor semânticos', () => {
  it('claro e escuro têm exatamente as mesmas chaves de UI', () => {
    expect(Object.keys(coresClaras).sort()).toEqual(
      Object.keys(coresEscuras).sort(),
    );
  });

  it('esporte claro e escuro têm as mesmas chaves (rasas e aninhadas)', () => {
    expect(Object.keys(esporteClaro).sort()).toEqual(
      Object.keys(esporteEscuro).sort(),
    );
    (Object.keys(esporteClaro) as (keyof typeof esporteClaro)[]).forEach(
      grupo => {
        expect(Object.keys(esporteClaro[grupo]).sort()).toEqual(
          Object.keys(esporteEscuro[grupo]).sort(),
        );
      },
    );
  });

  it('todo valor de cor é uma string não-vazia', () => {
    [...Object.values(coresClaras), ...Object.values(coresEscuras)].forEach(
      valor => {
        expect(typeof valor).toBe('string');
        expect(valor.length).toBeGreaterThan(0);
      },
    );
  });

  it('claro difere de escuro no fundo e no texto principal', () => {
    expect(coresClaras.canvas).not.toBe(coresEscuras.canvas);
    expect(coresClaras.textPrimary).not.toBe(coresEscuras.textPrimary);
  });
});
