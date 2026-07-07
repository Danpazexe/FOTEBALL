import {paraAscii} from '../asciiSafe';

describe('paraAscii (contorno da truncagem UTF-8 do op-sqlite)', () => {
  it('escapa não-ASCII para \\uXXXX e mantém ASCII intacto', () => {
    expect(paraAscii('Brasileirão')).toBe('Brasileir\\u00e3o');
    expect(paraAscii('São Paulo')).toBe('S\\u00e3o Paulo');
    expect(paraAscii('abc 123 {}[]":,')).toBe('abc 123 {}[]":,');
  });

  it('o resultado é JSON VÁLIDO e round-trippa (acentos reconstruídos)', () => {
    const obj = {
      clube: 'São Paulo',
      div: 'Série A',
      campeonato: 'Brasileirão',
      cidades: ['Goiânia', 'Vitória', 'Belém'],
      nota: 'Atlético-MG · Grêmio',
    };
    const asciiJson = paraAscii(JSON.stringify(obj));
    // 100% ASCII (o que o op-sqlite grava sem truncar).
    const todoAscii = [...asciiJson].every(c => c.charCodeAt(0) < 128);
    expect(todoAscii).toBe(true);
    // Ainda é JSON válido e devolve o objeto original.
    expect(JSON.parse(asciiJson)).toEqual(obj);
  });
});
