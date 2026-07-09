import {comAlfa} from '../index';

describe('comAlfa', () => {
  it('converte hex de 6 dígitos + alfa em rgba()', () => {
    expect(comAlfa('#F4B740', 0.16)).toBe('rgba(244, 183, 64, 0.16)');
  });

  it('expande hex de 3 dígitos', () => {
    expect(comAlfa('#FFF', 1)).toBe('rgba(255, 255, 255, 1)');
  });

  it('aceita cor sem o # inicial', () => {
    expect(comAlfa('34C56C', 0.4)).toBe('rgba(52, 197, 108, 0.4)');
  });

  it('produz resultado idêntico para a mesma entrada (determinístico)', () => {
    expect(comAlfa('#101A13', 0.5)).toBe(comAlfa('#101A13', 0.5));
  });
});
