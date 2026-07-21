import {coresClaras, coresEscuras} from '../tokens/colors';
import {corEncaixe} from '../sports/corEncaixe';

describe('corEncaixe (fonte única da cor do encaixe posicional)', () => {
  it("'natural' é neutro: sem cor de destaque (null) nos dois temas", () => {
    expect(corEncaixe('natural', coresClaras)).toBeNull();
    expect(corEncaixe('natural', coresEscuras)).toBeNull();
  });

  it.each([
    ['similar', 'info'],
    ['adaptado', 'warning'],
    ['improvisado', 'danger'],
  ] as const)('desvio %s → token %s do tema recebido', (nivel, token) => {
    expect(corEncaixe(nivel, coresClaras)).toBe(coresClaras[token]);
    expect(corEncaixe(nivel, coresEscuras)).toBe(coresEscuras[token]);
  });

  it('usa a paleta recebida, não hex fixo', () => {
    expect(corEncaixe('improvisado', coresClaras)).not.toBe(
      corEncaixe('improvisado', coresEscuras),
    );
  });
});
