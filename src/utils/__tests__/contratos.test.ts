import {anoContrato, contratoVenceNaTemporada} from '../contratos';

describe('anoContrato', () => {
  it('extrai o ano (AAAA) da data ISO do contrato', () => {
    expect(anoContrato('2026-12-31')).toBe(2026);
    expect(anoContrato('2028-01-01')).toBe(2028);
  });
});

describe('contratoVenceNaTemporada', () => {
  it('vence quando o ano do contrato é o da temporada atual', () => {
    expect(contratoVenceNaTemporada('2026-12-31', 2026)).toBe(true);
  });

  it('vence quando o contrato já ficou para trás (save antigo)', () => {
    expect(contratoVenceNaTemporada('2025-12-31', 2026)).toBe(true);
  });

  it('não vence quando expira só na próxima temporada ou depois', () => {
    expect(contratoVenceNaTemporada('2027-12-31', 2026)).toBe(false);
    expect(contratoVenceNaTemporada('2029-06-30', 2026)).toBe(false);
  });
});
