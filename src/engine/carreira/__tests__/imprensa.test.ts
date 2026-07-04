import {gerarManchetes, type ContextoImprensa} from '../imprensa';

const base: ContextoImprensa = {
  nomeClube: 'Flamengo',
  ultima: null,
  nivelPressao: 'Tranquilo',
  temUltimato: false,
  posicaoAtual: 4,
  posicaoAlvo: 6,
  objetivoDescricao: 'Vaga na Libertadores (G6)',
  proximoAdversario: 'Palmeiras',
};

describe('gerarManchetes', () => {
  it('sem partida disputada não gera manchete de resultado', () => {
    const m = gerarManchetes({...base, ultima: null, posicaoAtual: null});
    expect(m.some(x => x.id === 'partida')).toBe(false);
    // Diretoria + meta + próximo continuam.
    expect(m.some(x => x.id === 'diretoria')).toBe(true);
    expect(m.some(x => x.id === 'meta')).toBe(true);
  });

  it('goleada gera manchete positiva de resultado em primeiro', () => {
    const m = gerarManchetes({
      ...base,
      ultima: {golsFavor: 4, golsContra: 0, adversario: 'Vasco', mandante: true},
    });
    expect(m[0].id).toBe('partida');
    expect(m[0].tom).toBe('positivo');
    expect(m[0].texto).toContain('Goleada');
    expect(m[0].texto).toContain('4x0');
  });

  it('derrota gera manchete negativa com placar na ótica do clube', () => {
    const m = gerarManchetes({
      ...base,
      ultima: {golsFavor: 0, golsContra: 2, adversario: 'Grêmio', mandante: false},
    });
    const partida = m.find(x => x.id === 'partida');
    expect(partida?.tom).toBe('negativo');
    expect(partida?.texto).toContain('2x0');
    expect(partida?.texto).toContain('fora');
  });

  it('empate é neutro', () => {
    const m = gerarManchetes({
      ...base,
      ultima: {golsFavor: 1, golsContra: 1, adversario: 'Bahia', mandante: true},
    });
    expect(m.find(x => x.id === 'partida')?.tom).toBe('neutro');
  });

  it('ultimato ativo domina a manchete da diretoria (negativa)', () => {
    const m = gerarManchetes({...base, temUltimato: true, nivelPressao: 'Crítico'});
    const diretoria = m.find(x => x.id === 'diretoria');
    expect(diretoria?.tom).toBe('negativo');
    expect(diretoria?.texto).toContain('ultimato');
  });

  it('diretoria tranquila gera manchete positiva', () => {
    const diretoria = gerarManchetes(base).find(x => x.id === 'diretoria');
    expect(diretoria?.tom).toBe('positivo');
  });

  it('cumprir a meta é positivo; frustrar é negativo', () => {
    const cumpre = gerarManchetes({...base, posicaoAtual: 3, posicaoAlvo: 6}).find(
      x => x.id === 'meta',
    );
    const frustra = gerarManchetes({
      ...base,
      posicaoAtual: 15,
      posicaoAlvo: 6,
    }).find(x => x.id === 'meta');
    expect(cumpre?.tom).toBe('positivo');
    expect(frustra?.tom).toBe('negativo');
  });

  it('sem próximo adversário não gera manchete de próximo jogo', () => {
    const m = gerarManchetes({...base, proximoAdversario: null});
    expect(m.some(x => x.id === 'proximo')).toBe(false);
  });

  it('ids são únicos (chaves estáveis de lista)', () => {
    const m = gerarManchetes({
      ...base,
      ultima: {golsFavor: 2, golsContra: 1, adversario: 'Santos', mandante: true},
    });
    const ids = m.map(x => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('é determinística para o mesmo contexto', () => {
    const ctx = {
      ...base,
      ultima: {golsFavor: 3, golsContra: 1, adversario: 'Inter', mandante: true},
    };
    expect(gerarManchetes(ctx)).toEqual(gerarManchetes(ctx));
  });
});
