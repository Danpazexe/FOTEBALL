import {esporteClaro, esporteEscuro} from '../tokens/colors';
import {
  corCondicao,
  LIMIAR_CONDICAO_ALTA,
  LIMIAR_CONDICAO_MEDIA,
} from '../sports/corCondicao';

describe('corCondicao (fonte única da cor de condição física)', () => {
  it('mantém os limiares do tema antigo (75/45)', () => {
    expect(LIMIAR_CONDICAO_ALTA).toBe(75);
    expect(LIMIAR_CONDICAO_MEDIA).toBe(45);
  });

  it.each([
    [100, esporteClaro.fitness.high],
    [75, esporteClaro.fitness.high],
    [74, esporteClaro.fitness.medium],
    [45, esporteClaro.fitness.medium],
    [44, esporteClaro.fitness.low],
    [0, esporteClaro.fitness.low],
  ])('valor %i → cor de fitness correspondente (tema claro)', (valor, cor) => {
    expect(corCondicao(valor, esporteClaro)).toBe(cor);
  });

  it('usa o token do tema recebido, não hex fixo', () => {
    expect(corCondicao(80, esporteEscuro)).toBe(esporteEscuro.fitness.high);
    expect(corCondicao(60, esporteEscuro)).toBe(esporteEscuro.fitness.medium);
    expect(corCondicao(10, esporteEscuro)).toBe(esporteEscuro.fitness.low);
    expect(corCondicao(80, esporteClaro)).not.toBe(esporteEscuro.fitness.high);
  });
});
