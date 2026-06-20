import type {Tatica} from '../../../types';
import {criarPlayer} from '../../../testing/fixtures';

import {
  calcularBonusHabilidades,
  comHabilidades,
  derivarHabilidades,
  fatorPesoAssistencia,
  fatorPesoGol,
  MAX_HABILIDADES,
} from '../habilidades';

const TATICA_BASE: Tatica = {
  estiloOfensivo: 'Equilibrado',
  marcacao: 'Zona',
  linhaDefensiva: 'Normal',
  ritmo: 'Normal',
};

describe('derivarHabilidades', () => {
  it('jogador mediano (atributos 70) não ganha nenhuma habilidade', () => {
    const mediano = criarPlayer({id: 'med'});
    expect(derivarHabilidades(mediano)).toEqual([]);
  });

  it('é determinístico: o mesmo jogador produz sempre a mesma lista', () => {
    const craque = criarPlayer({
      id: 'craque',
      posicaoPrincipal: 'CA',
      atributos: {
        finalizacao: 92,
        passe: 75,
        marcacao: 30,
        desarme: 28,
        velocidade: 88,
        resistencia: 80,
        forca: 78,
        reflexos: 20,
        posicionamento: 85,
        drible: 89,
        cabeceio: 70,
        cruzamento: 60,
      },
    });
    expect(derivarHabilidades(craque)).toEqual(derivarHabilidades(craque));
  });

  it('respeita o limite de 2 habilidades mesmo num jogador completo', () => {
    const completo = criarPlayer({
      id: 'completo',
      idade: 30,
      overall: 90,
      posicaoPrincipal: 'CA',
      atributos: {
        finalizacao: 95,
        passe: 90,
        marcacao: 85,
        desarme: 85,
        velocidade: 95,
        resistencia: 90,
        forca: 90,
        reflexos: 90,
        posicionamento: 95,
        drible: 92,
        cabeceio: 90,
        cruzamento: 90,
      },
    });
    expect(derivarHabilidades(completo).length).toBeLessThanOrEqual(
      MAX_HABILIDADES,
    );
  });

  it('centroavante finalizador vira ARTILHEIRO (e não duplica FINALIZADOR)', () => {
    const atacante = criarPlayer({
      id: 'ata',
      posicaoPrincipal: 'CA',
      atributos: {
        finalizacao: 90,
        passe: 60,
        marcacao: 25,
        desarme: 22,
        velocidade: 78,
        resistencia: 75,
        forca: 80,
        reflexos: 20,
        posicionamento: 85,
        drible: 80,
        cabeceio: 85,
        cruzamento: 50,
      },
    });
    const habs = derivarHabilidades(atacante);
    expect(habs).toContain('ARTILHEIRO');
    expect(habs).not.toContain('FINALIZADOR');
    expect(habs).toContain('CABECEADOR');
  });

  it('goleiro com reflexos altos vira GOLEIRO_PENALTI', () => {
    const goleiro = criarPlayer({
      id: 'gol',
      posicaoPrincipal: 'GOL',
      atributos: {
        finalizacao: 15,
        passe: 55,
        marcacao: 20,
        desarme: 25,
        velocidade: 60,
        resistencia: 65,
        forca: 72,
        reflexos: 90,
        posicionamento: 88,
        drible: 25,
        cabeceio: 30,
        cruzamento: 15,
      },
    });
    expect(derivarHabilidades(goleiro)).toContain('GOLEIRO_PENALTI');
  });

  it('zagueiro marcador vira DEFENSOR', () => {
    const zagueiro = criarPlayer({
      id: 'zag',
      posicaoPrincipal: 'ZAG',
      atributos: {
        finalizacao: 30,
        passe: 65,
        marcacao: 88,
        desarme: 86,
        velocidade: 65,
        resistencia: 80,
        forca: 82,
        reflexos: 20,
        posicionamento: 80,
        drible: 40,
        cabeceio: 78,
        cruzamento: 30,
      },
    });
    expect(derivarHabilidades(zagueiro)).toContain('DEFENSOR');
  });
});

describe('comHabilidades', () => {
  it('preserva habilidades explícitas e limita a 2', () => {
    const craque = criarPlayer({
      id: 'estrela',
      habilidades: ['FALTA', 'LIDERANCA', 'VELOCISTA'],
    });
    expect(comHabilidades(craque).habilidades).toEqual(['FALTA', 'LIDERANCA']);
  });

  it('deriva quando o jogador não traz habilidades', () => {
    const atacante = criarPlayer({
      id: 'ata2',
      posicaoPrincipal: 'CA',
      atributos: {
        finalizacao: 88,
        passe: 60,
        marcacao: 25,
        desarme: 22,
        velocidade: 80,
        resistencia: 75,
        forca: 78,
        reflexos: 20,
        posicionamento: 84,
        drible: 80,
        cabeceio: 70,
        cruzamento: 50,
      },
    });
    const habs = comHabilidades(atacante).habilidades ?? [];
    expect(habs.length).toBeGreaterThan(0);
    expect(habs).toContain('ARTILHEIRO');
  });
});

describe('fatorPesoGol', () => {
  it('jogador sem habilidades não altera o peso (1.0)', () => {
    expect(fatorPesoGol(criarPlayer({id: 'x'}))).toBe(1);
  });

  it('ARTILHEIRO aumenta o peso de ser o autor do gol', () => {
    const art = criarPlayer({id: 'a', habilidades: ['ARTILHEIRO']});
    expect(fatorPesoGol(art)).toBeGreaterThan(1);
  });

  it('habilidades de finalização compõem', () => {
    const duplo = criarPlayer({
      id: 'd',
      habilidades: ['ARTILHEIRO', 'CABECEADOR'],
    });
    const simples = criarPlayer({id: 'a2', habilidades: ['ARTILHEIRO']});
    expect(fatorPesoGol(duplo)).toBeGreaterThan(fatorPesoGol(simples));
  });
});

describe('fatorPesoAssistencia', () => {
  it('ASSISTENCIAS aumenta o peso de assistir; sem ela é 1.0', () => {
    const garcom = criarPlayer({id: 'g', habilidades: ['ASSISTENCIAS']});
    expect(fatorPesoAssistencia(garcom)).toBeGreaterThan(1);
    expect(fatorPesoAssistencia(criarPlayer({id: 'n'}))).toBe(1);
  });
});

describe('calcularBonusHabilidades', () => {
  it('time sem habilidades soma 0 (não afeta a simulação base)', () => {
    const time = [criarPlayer({id: '1'}), criarPlayer({id: '2'})];
    expect(calcularBonusHabilidades(time, TATICA_BASE)).toBe(0);
  });

  it('um líder soma bônus positivo', () => {
    const time = [criarPlayer({id: 'l', habilidades: ['LIDERANCA']})];
    expect(calcularBonusHabilidades(time, TATICA_BASE)).toBeGreaterThan(0);
  });

  it('velocista rende mais no contra-ataque', () => {
    const time = [criarPlayer({id: 'v', habilidades: ['VELOCISTA']})];
    const contra: Tatica = {...TATICA_BASE, estiloOfensivo: 'Contra-ataque'};
    expect(calcularBonusHabilidades(time, contra)).toBeGreaterThan(
      calcularBonusHabilidades(time, TATICA_BASE),
    );
  });

  it('tem teto (não passa de 6)', () => {
    const muitos = Array.from({length: 10}, (_, i) =>
      criarPlayer({id: `p${i}`, habilidades: ['LIDERANCA', 'DEFENSOR']}),
    );
    expect(calcularBonusHabilidades(muitos, TATICA_BASE)).toBeLessThanOrEqual(6);
  });
});
