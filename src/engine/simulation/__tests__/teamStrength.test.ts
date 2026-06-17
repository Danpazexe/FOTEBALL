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
    // fator = (75) * (1.0) * (0.85 + 0.6*0.3=0.18 => 1.03) * 1.0 ≈ 77.25
    expect(forca.ataque).toBeGreaterThan(70);
    expect(forca.ataque).toBeLessThan(85);
    expect(forca.meio).toBeCloseTo(forca.defesa, 5);
  });
});
