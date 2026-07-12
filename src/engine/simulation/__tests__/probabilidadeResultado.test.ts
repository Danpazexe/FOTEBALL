import type {Tatica} from '../../../types';
import {
  preverResultado,
  probabilidadeResultado,
} from '../probabilidadeResultado';
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

const soma = (p: {
  vitoriaCasa: number;
  empate: number;
  vitoriaFora: number;
}): number => p.vitoriaCasa + p.empate + p.vitoriaFora;

describe('probabilidadeResultado', () => {
  it('as três probabilidades somam 1', () => {
    expect(soma(probabilidadeResultado(1.6, 1.2))).toBeCloseTo(1, 6);
    expect(soma(probabilidadeResultado(0.4, 3.0))).toBeCloseTo(1, 6);
    expect(soma(probabilidadeResultado(2.5, 2.5))).toBeCloseTo(1, 6);
  });

  it('gols esperados iguais → vitórias simétricas e empate positivo', () => {
    const p = probabilidadeResultado(1.5, 1.5);
    expect(p.vitoriaCasa).toBeCloseTo(p.vitoriaFora, 6);
    expect(p.empate).toBeGreaterThan(0.15);
  });

  it('quem tem mais gols esperados é mais provável vencedor', () => {
    const p = probabilidadeResultado(2.2, 1.0);
    expect(p.vitoriaCasa).toBeGreaterThan(p.vitoriaFora);
    expect(p.vitoriaCasa).toBeGreaterThan(p.empate);
  });

  it('é determinística (mesma entrada → mesma saída)', () => {
    expect(probabilidadeResultado(1.7, 1.3)).toEqual(probabilidadeResultado(1.7, 1.3));
  });

  it('mais gols esperados de um lado achata o empate', () => {
    const parelho = probabilidadeResultado(1.4, 1.4);
    const desnivelado = probabilidadeResultado(2.8, 0.6);
    expect(desnivelado.empate).toBeLessThan(parelho.empate);
  });
});

describe('preverResultado', () => {
  it('times iguais têm leve vantagem do mandante (base da engine)', () => {
    const p = preverResultado(FORCA, FORCA, EQUILIBRADO, EQUILIBRADO, 1);
    expect(soma(p)).toBeCloseTo(1, 6);
    expect(p.vitoriaCasa).toBeGreaterThan(p.vitoriaFora);
  });

  it('mando maior aumenta a chance do mandante', () => {
    const neutro = preverResultado(FORCA, FORCA, EQUILIBRADO, EQUILIBRADO, 1.0);
    const forte = preverResultado(FORCA, FORCA, EQUILIBRADO, EQUILIBRADO, 1.2);
    expect(forte.vitoriaCasa).toBeGreaterThan(neutro.vitoriaCasa);
    expect(forte.vitoriaFora).toBeLessThan(neutro.vitoriaFora);
  });

  it('time muito mais forte é favorito claro, mas sem certeza', () => {
    const forte: ForcaTime = {
      ataque: 88,
      meio: 88,
      defesa: 88,
      forcaGoleiro: 85,
      overall: 88,
    };
    const fraco: ForcaTime = {
      ataque: 62,
      meio: 62,
      defesa: 62,
      forcaGoleiro: 60,
      overall: 62,
    };
    const p = preverResultado(forte, fraco, EQUILIBRADO, EQUILIBRADO, 1.1);
    expect(p.vitoriaCasa).toBeGreaterThan(0.5);
    expect(p.vitoriaCasa).toBeLessThan(0.95); // sem vitória automática
  });
});
