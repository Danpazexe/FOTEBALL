import {
  adicionarDias,
  diaDaSemana,
  diasNoMes,
  diferencaEmDias,
  formatarDataCurta,
  formatarDataLonga,
  indiceDiaSemana,
  nomeMes,
} from '../datas';

describe('utils/datas', () => {
  it('adicionarDias soma e atravessa a virada de mês', () => {
    expect(adicionarDias('2026-04-06', 3)).toBe('2026-04-09');
    expect(adicionarDias('2026-04-28', 3)).toBe('2026-05-01');
    expect(adicionarDias('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('diferencaEmDias devolve dias inteiros (ate - de)', () => {
    expect(diferencaEmDias('2026-04-06', '2026-04-09')).toBe(3);
    expect(diferencaEmDias('2026-05-01', '2026-04-28')).toBe(-3);
  });

  it('diaDaSemana é determinístico', () => {
    // 2026-04-06 é uma segunda-feira.
    expect(diaDaSemana('2026-04-06')).toBe('Seg');
    expect(diaDaSemana('2026-04-09')).toBe('Qui');
  });

  it('formatadores produzem rótulos legíveis', () => {
    expect(formatarDataCurta('2026-04-06')).toBe('Seg 06/04');
    expect(formatarDataLonga('2026-04-06')).toBe('Seg, 6 de abril');
  });

  it('helpers do calendário mensal', () => {
    // 2026-04-06 é segunda (índice 1); 1º de abril/2026 é quarta (índice 3).
    expect(indiceDiaSemana('2026-04-06')).toBe(1);
    expect(indiceDiaSemana('2026-04-01')).toBe(3);
    expect(diasNoMes(2026, 4)).toBe(30);
    expect(diasNoMes(2026, 2)).toBe(28); // não bissexto
    expect(diasNoMes(2024, 2)).toBe(29); // bissexto
    expect(nomeMes(4)).toBe('Abril');
    expect(nomeMes(12)).toBe('Dezembro');
  });
});
