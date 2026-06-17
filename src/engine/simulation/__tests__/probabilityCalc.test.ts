import type {Tatica} from '../../../types';

import {calcularMando, calcularProbabilidades} from '../probabilityCalc';
import type {ForcaTime} from '../teamStrength';

const FORCA: ForcaTime = {
  ataque: 75,
  meio: 75,
  defesa: 75,
  forcaGoleiro: 70,
  overall: 75,
};

const EQUILIBRADO: Tatica = {
  estiloOfensivo: 'Equilibrado',
  marcacao: 'Zona',
  linhaDefensiva: 'Normal',
  ritmo: 'Normal',
};

describe('calcularProbabilidades', () => {
  it('um goleiro adversário melhor reduz os gols esperados', () => {
    const goleiroFraco: ForcaTime = {...FORCA, forcaGoleiro: 50};
    const goleiroForte: ForcaTime = {...FORCA, forcaGoleiro: 95};
    const contraFraco = calcularProbabilidades(FORCA, goleiroFraco, EQUILIBRADO, EQUILIBRADO);
    const contraForte = calcularProbabilidades(FORCA, goleiroForte, EQUILIBRADO, EQUILIBRADO);
    expect(contraForte.probGolCasaPorMinuto).toBeLessThan(contraFraco.probGolCasaPorMinuto);
  });

  it('contra-ataque rende mais contra posse de bola (matchup)', () => {
    const contraAtaque: Tatica = {...EQUILIBRADO, estiloOfensivo: 'Contra-ataque'};
    const posse: Tatica = {...EQUILIBRADO, estiloOfensivo: 'Posse de bola'};
    const matchup = calcularProbabilidades(FORCA, FORCA, contraAtaque, posse);
    const neutro = calcularProbabilidades(FORCA, FORCA, EQUILIBRADO, EQUILIBRADO);
    expect(matchup.probGolCasaPorMinuto).toBeGreaterThan(neutro.probGolCasaPorMinuto);
  });

  it('ritmo intenso aumenta o volume de chances', () => {
    const intenso: Tatica = {...EQUILIBRADO, ritmo: 'Intenso'};
    const lento: Tatica = {...EQUILIBRADO, ritmo: 'Lento'};
    const comIntenso = calcularProbabilidades(FORCA, FORCA, intenso, intenso);
    const comLento = calcularProbabilidades(FORCA, FORCA, lento, lento);
    expect(comIntenso.probChanceNarrativaPorMinuto).toBeGreaterThan(
      comLento.probChanceNarrativaPorMinuto,
    );
  });

  it('mando maior favorece o mandante e penaliza o visitante', () => {
    const neutro = calcularProbabilidades(FORCA, FORCA, EQUILIBRADO, EQUILIBRADO, 1.0);
    const mandoForte = calcularProbabilidades(FORCA, FORCA, EQUILIBRADO, EQUILIBRADO, 1.2);
    expect(mandoForte.probGolCasaPorMinuto).toBeGreaterThan(neutro.probGolCasaPorMinuto);
    expect(mandoForte.probGolForaPorMinuto).toBeLessThan(neutro.probGolForaPorMinuto);
  });
});

describe('calcularMando', () => {
  it('estádio médio e reputação 50 ficam próximos do neutro', () => {
    expect(calcularMando(30000, 50)).toBeCloseTo(1.08, 5);
  });

  it('estádio grande e reputação alta aumentam o mando (limitado)', () => {
    const grande = calcularMando(80000, 90);
    expect(grande).toBeGreaterThan(1.08);
    expect(grande).toBeLessThanOrEqual(1.22);
  });
});
