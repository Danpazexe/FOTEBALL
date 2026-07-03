import type {Formacao, Player, Position, Tatica} from '../../../types';
import {criarPlayer} from '../../../testing/fixtures';

import {calcularForcaTime} from '../teamStrength';

const POSICOES: Position[] = [
  'GOL', 'LD', 'ZAG', 'ZAG', 'LE', 'VOL', 'MC', 'MEI', 'PD', 'CA', 'PE',
];

const TATICA: Tatica = {
  estiloOfensivo: 'Equilibrado',
  marcacao: 'Zona',
  linhaDefensiva: 'Normal',
  ritmo: 'Normal',
};

function elenco(overrideGoleiro?: Partial<Player['atributos']>): Player[] {
  return POSICOES.map((posicao, index) => {
    const jogador = criarPlayer({id: `j${index}`, posicaoPrincipal: posicao});
    if (posicao === 'GOL' && overrideGoleiro) {
      return {...jogador, atributos: {...jogador.atributos, ...overrideGoleiro}};
    }
    return jogador;
  });
}

function formacao(jogadores: Player[]): Formacao {
  return {
    tipo: '4-3-3',
    titulares: jogadores.map((j, i) => ({jogadorId: j.id, posicao: POSICOES[i]!})),
    reservas: [],
  };
}

describe('calcularForcaTime', () => {
  it('reflete a qualidade isolada do goleiro em forcaGoleiro', () => {
    const fraco = elenco({reflexos: 50, posicionamento: 50});
    const forte = elenco({reflexos: 95, posicionamento: 95});
    const fGoleiroFraco = calcularForcaTime(formacao(fraco), fraco, TATICA).forcaGoleiro;
    const fGoleiroForte = calcularForcaTime(formacao(forte), forte, TATICA).forcaGoleiro;
    expect(fGoleiroForte).toBeGreaterThan(fGoleiroFraco);
  });

  it('enfraquece o time quando alguém está indisponível (desvantagem numérica)', () => {
    const jogadores = elenco();
    const form = formacao(jogadores);
    const cheio = calcularForcaTime(form, jogadores, TATICA);
    const comExpulso = calcularForcaTime(form, jogadores, TATICA, {
      indisponiveis: new Set([jogadores[9]!.id]), // o CA
    });
    expect(comExpulso.overall).toBeLessThan(cheio.overall);
    expect(comExpulso.ataque).toBeLessThan(cheio.ataque);
  });

  it('reduz a força conforme a fadiga (condição atual baixa)', () => {
    const jogadores = elenco();
    const form = formacao(jogadores);
    const pleno = calcularForcaTime(form, jogadores, TATICA);
    const condicaoBaixa = new Map(jogadores.map(j => [j.id, 50]));
    const cansado = calcularForcaTime(form, jogadores, TATICA, {
      condicaoAtual: condicaoBaixa,
    });
    expect(cansado.overall).toBeLessThan(pleno.overall);
  });

  it('o estilo neutro (Equilibrado/Zona/Normal) não altera as linhas-base', () => {
    const jogadores = elenco();
    const forca = calcularForcaTime(formacao(jogadores), jogadores, TATICA);
    // jogadores overall 75, moral 60, forma 0, condição 100:
    // fator = 75 * fatorPreparo(100)=1.0 * (0.90 + 0.6*0.2 => 1.02) * forma 1.0 ≈ 76.5
    expect(forca.ataque).toBeGreaterThan(70);
    expect(forca.ataque).toBeLessThan(85);
    expect(forca.meio).toBeCloseTo(forca.defesa, 5);
  });

  it('moral alta rende mais que moral baixa, mas de forma leve (±~10%)', () => {
    const base = POSICOES.map((posicao, i) =>
      criarPlayer({id: `j${i}`, posicaoPrincipal: posicao}),
    );
    const moralAlta = base.map(j => ({...j, moral: 90}));
    const moralBaixa = base.map(j => ({...j, moral: 20}));
    const fAlta = calcularForcaTime(formacao(moralAlta), moralAlta, TATICA);
    const fBaixa = calcularForcaTime(formacao(moralBaixa), moralBaixa, TATICA);
    expect(fAlta.overall).toBeGreaterThan(fBaixa.overall);
    // "leve": o fator de moral vive em ~[0.9, 1.1]; a razão não pode explodir.
    expect(fAlta.overall / fBaixa.overall).toBeLessThan(1.3);
  });

  it('forma positiva rende mais que forma negativa', () => {
    const base = POSICOES.map((posicao, i) =>
      criarPlayer({id: `j${i}`, posicaoPrincipal: posicao}),
    );
    const emAlta = base.map(j => ({...j, forma: 5}));
    const emBaixa = base.map(j => ({...j, forma: -5}));
    const fAlta = calcularForcaTime(formacao(emAlta), emAlta, TATICA);
    const fBaixa = calcularForcaTime(formacao(emBaixa), emBaixa, TATICA);
    expect(fAlta.overall).toBeGreaterThan(fBaixa.overall);
  });

  it('jogador improvisado (fora de posição) reduz a força de ataque', () => {
    const jogadores = elenco(); // todos naturais em suas posições
    const natural = formacao(jogadores);
    // Troca o CA (slot 9) pelo ZAG (slot 2): ambos passam a jogar no terço
    // oposto (fator de adaptação 0.6), enfraquecendo as pontas do campo.
    const improvisada: Formacao = {
      ...natural,
      titulares: natural.titulares.map((titular, i) => {
        if (i === 9) {
          return {...titular, jogadorId: jogadores[2]!.id};
        }
        if (i === 2) {
          return {...titular, jogadorId: jogadores[9]!.id};
        }
        return titular;
      }),
    };
    const fNatural = calcularForcaTime(natural, jogadores, TATICA);
    const fImprov = calcularForcaTime(improvisada, jogadores, TATICA);
    expect(fImprov.ataque).toBeLessThan(fNatural.ataque);
  });
});
