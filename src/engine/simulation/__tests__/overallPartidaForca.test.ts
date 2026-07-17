/**
 * Onda 6 — a força de time passa a usar o OVERALL DE PARTIDA (estado modulando
 * atributos por categoria), sem dupla contagem: estado neutro = overall base;
 * condição/moral/forma mexem na força na direção certa, mas de forma limitada.
 */
import {criarPlayer} from '../../../testing/fixtures';
import type {Formacao, Player, Position, Tatica} from '../../../types';
import {comAtributosCalibrados} from '../../progression/calibracaoAtributos';
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

function elenco(mod: (j: Player) => Player): Player[] {
  return POSICOES.map((posicao, i) =>
    mod(comAtributosCalibrados(criarPlayer({id: `j${i}`, posicaoPrincipal: posicao}))),
  );
}
function formacao(jogadores: Player[]): Formacao {
  return {
    tipo: '4-3-3',
    titulares: jogadores.map((j, i) => ({jogadorId: j.id, posicao: POSICOES[i]!})),
    reservas: [],
  };
}
const forcaDe = (js: Player[]) =>
  calcularForcaTime(formacao(js), js, TATICA).overall;

describe('Overall de Partida na força de time (Onda 6)', () => {
  it('estado NEUTRO (cond 100, moral 50, forma 0) fica colado no overall base', () => {
    const neutro = elenco(j => ({
      ...j,
      condicaoFisica: 100,
      moral: 50,
      forma: 0,
    }));
    // Overall base 75 → força ~75 (sem inflar nem punir no estado neutro).
    expect(forcaDe(neutro)).toBeGreaterThan(72);
    expect(forcaDe(neutro)).toBeLessThan(78);
  });

  it('cansaço, moral baixa e forma ruim reduzem a força (sem dupla contagem)', () => {
    const pleno = elenco(j => ({...j, condicaoFisica: 100, moral: 60, forma: 2}));
    const acabado = elenco(j => ({...j, condicaoFisica: 30, moral: 20, forma: -3}));
    expect(forcaDe(acabado)).toBeLessThan(forcaDe(pleno));
    // Estado é fator secundário: a queda existe (~11 pts entre extremos), mas
    // o time exausto ainda é reconhecível como base 75, não colapsa (o clamp
    // Base±8 por jogador limita o desvio total).
    expect(forcaDe(pleno) - forcaDe(acabado)).toBeLessThan(14);
  });

  it('a condição minuto-a-minuto (ao vivo) derruba a força', () => {
    const js = elenco(j => ({...j, condicaoFisica: 100}));
    const plena = calcularForcaTime(formacao(js), js, TATICA).overall;
    const cansada = calcularForcaTime(formacao(js), js, TATICA, {
      condicaoAtual: new Map(js.map(j => [j.id, 40])),
    }).overall;
    expect(cansada).toBeLessThan(plena);
  });

  it('bom estado empurra a força para cima, mas de forma leve', () => {
    const base = elenco(j => ({...j, condicaoFisica: 100, moral: 50, forma: 0}));
    const emFogo = elenco(j => ({...j, condicaoFisica: 100, moral: 95, forma: 5}));
    expect(forcaDe(emFogo)).toBeGreaterThan(forcaDe(base));
    expect(forcaDe(emFogo) / forcaDe(base)).toBeLessThan(1.15);
  });
});
