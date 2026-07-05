import type {Tatica} from '../../../types';
import {avaliarConfronto, taticaProvavelIA} from '../preview';

const base: Tatica = {
  estiloOfensivo: 'Equilibrado',
  marcacao: 'Zona',
  linhaDefensiva: 'Normal',
  ritmo: 'Normal',
  ladoAtaque: 'Ambos',
  amplidao: 'Normal',
};

describe('taticaProvavelIA', () => {
  it('favorito (forte + mandante) joga ofensivo/pressão', () => {
    const t = taticaProvavelIA({
      overallAdversario: 82,
      overallUsuario: 75,
      adversarioMandante: true,
    });
    expect(t.estiloOfensivo).toBe('Ataque direto');
    expect(t.marcacao).toBe('Pressão alta');
    expect(t.linhaDefensiva).toBe('Adiantada');
  });

  it('azarão (mais fraco) se fecha e joga de contra-ataque', () => {
    const t = taticaProvavelIA({
      overallAdversario: 70,
      overallUsuario: 80,
      adversarioMandante: false,
    });
    expect(t.estiloOfensivo).toBe('Contra-ataque');
    expect(t.linhaDefensiva).toBe('Recuada');
  });

  it('confronto equilibrado => tática neutra', () => {
    const t = taticaProvavelIA({
      overallAdversario: 78,
      overallUsuario: 77,
      adversarioMandante: false,
    });
    expect(t.estiloOfensivo).toBe('Equilibrado');
  });
});

describe('avaliarConfronto', () => {
  it('minha posse contra a pressão alta dele => ARRISCADO, com risco e sugestão', () => {
    const minha: Tatica = {...base, estiloOfensivo: 'Posse de bola'};
    const dele: Tatica = {...base, marcacao: 'Pressão alta'};
    const r = avaliarConfronto(minha, dele);
    expect(r.nivel).toBe('arriscado');
    expect(r.saldo).toBeLessThan(0);
    expect(r.riscos.length).toBeGreaterThan(0);
    expect(r.sugestao).not.toBeNull();
  });

  it('meu contra-ataque contra a posse dele => FAVORÁVEL', () => {
    const minha: Tatica = {...base, estiloOfensivo: 'Contra-ataque'};
    const dele: Tatica = {...base, estiloOfensivo: 'Posse de bola'};
    const r = avaliarConfronto(minha, dele);
    expect(r.nivel).toBe('favoravel');
    expect(r.saldo).toBeGreaterThan(0);
    expect(r.vantagens.length).toBeGreaterThan(0);
  });

  it('espelho neutro (mesma tática) => neutro', () => {
    const r = avaliarConfronto(base, base);
    expect(r.nivel).toBe('neutro');
    expect(r.saldo).toBe(0);
  });
});
