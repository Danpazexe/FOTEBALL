import {avaliarUltimato} from '../ultimato';

const calmo = {
  derrotasConsecutivas: 0,
  limiteDerrotas: 5,
  rodadasNoVermelho: 0,
};

describe('avaliarUltimato', () => {
  it('sem risco → nenhum ultimato', () => {
    expect(avaliarUltimato(calmo)).toBeNull();
    expect(avaliarUltimato({...calmo, derrotasConsecutivas: 2})).toBeNull();
    expect(avaliarUltimato({...calmo, rodadasNoVermelho: 3})).toBeNull();
  });

  it('a uma derrota da demissão → ultimato de desempenho', () => {
    const u = avaliarUltimato({...calmo, derrotasConsecutivas: 4});
    expect(u).not.toBeNull();
    expect(u?.gatilho).toBe('DERROTAS');
    expect(u?.mensagem).toContain('próximo jogo');
  });

  it('respeita o limite por divisão (Série B = 7)', () => {
    expect(avaliarUltimato({...calmo, derrotasConsecutivas: 6})).toBeNull();
    const u = avaliarUltimato({
      ...calmo,
      derrotasConsecutivas: 6,
      limiteDerrotas: 7,
    });
    expect(u?.gatilho).toBe('DERROTAS');
  });

  it('a uma rodada da falência → ultimato financeiro', () => {
    const u = avaliarUltimato({...calmo, rodadasNoVermelho: 7});
    expect(u?.gatilho).toBe('FINANCAS');
    expect(u?.mensagem).toContain('azul');
  });

  it('finança prevalece sobre derrotas quando os dois estão no brink', () => {
    const u = avaliarUltimato({
      derrotasConsecutivas: 4,
      limiteDerrotas: 5,
      rodadasNoVermelho: 7,
    });
    expect(u?.gatilho).toBe('FINANCAS');
  });

  it('já demitido (no ou além do limite) não emite ultimato — a demissão já ocorreu', () => {
    // No exato limite a demissão já disparou; o ultimato é só o passo ANTES.
    expect(avaliarUltimato({...calmo, derrotasConsecutivas: 5})).toBeNull();
    expect(avaliarUltimato({...calmo, rodadasNoVermelho: 8})).toBeNull();
  });

  it('é determinística para a mesma entrada', () => {
    const args = {...calmo, derrotasConsecutivas: 4};
    expect(avaliarUltimato(args)).toEqual(avaliarUltimato(args));
  });
});
