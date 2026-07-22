/**
 * Geometria do painel de ajustes em jogo: projeção dos titulares para
 * coordenadas de tela (ataque em cima, y invertido) e detecção do slot de
 * drop mais próximo do dedo.
 */
import {posicoesDosSlots, slotMaisProximo, type MedidasCampo} from '../layoutCampo';
import type {Formacao} from '../../../../types';

const MEDIDAS: MedidasCampo = {largura: 300, altura: 400, padTopo: 20, padBase: 40};
// banda útil = altura − padTopo − padBase
const BANDA = 340;

function formacaoMinima(): Formacao {
  return {
    tipo: '4-4-2',
    titulares: [
      {posicao: 'GOL', jogadorId: 'gol', x: 0.5, y: 0.04},
      {posicao: 'CA', jogadorId: 'ca', x: 0.5, y: 0.94},
      {posicao: 'MC', jogadorId: 'mc', x: 0.25, y: 0.5},
    ],
    reservas: [],
  };
}

describe('posicoesDosSlots', () => {
  it('projeta x pela largura e inverte y (ataque em cima, defesa embaixo)', () => {
    const slots = posicoesDosSlots(formacaoMinima(), MEDIDAS);

    expect(slots).toHaveLength(3);
    expect(slots.map(s => s.slotIndex)).toEqual([0, 1, 2]);
    expect(slots.map(s => s.posicao)).toEqual(['GOL', 'CA', 'MC']);

    const [gol, ca, mc] = slots;
    expect(gol.x).toBeCloseTo(150);
    expect(gol.y).toBeCloseTo(20 + 0.96 * BANDA);
    expect(ca.y).toBeCloseTo(20 + 0.06 * BANDA);
    expect(mc.x).toBeCloseTo(75);
    expect(mc.y).toBeCloseTo(20 + 0.5 * BANDA);
    // Convenção visual: goleiro abaixo do atacante na tela.
    expect(gol.y).toBeGreaterThan(ca.y);
  });

  it('usa a coordenada padrão da posição quando o titular não tem x/y', () => {
    const formacao: Formacao = {
      tipo: '4-4-2',
      titulares: [{posicao: 'GOL', jogadorId: 'gol'}],
      reservas: [],
    };
    const [slot] = posicoesDosSlots(formacao, MEDIDAS);
    // Sem afirmar o valor exato do template: só que caiu dentro da banda útil
    // do gramado e na metade defensiva (embaixo na tela).
    expect(slot.x).toBeGreaterThan(0);
    expect(slot.x).toBeLessThan(MEDIDAS.largura);
    expect(slot.y).toBeGreaterThan(MEDIDAS.altura / 2);
    expect(slot.y).toBeLessThanOrEqual(MEDIDAS.altura - MEDIDAS.padBase);
  });
});

describe('slotMaisProximo', () => {
  const slots = posicoesDosSlots(formacaoMinima(), MEDIDAS);
  const origem = {x: 10, y: 100};

  it('retorna o slot mais próximo do ponto solto dentro do limiar', () => {
    // Ponto absoluto perto do MC (tela: origem + slot = 85, 290).
    expect(slotMaisProximo(slots, origem, 90, 295, 50)).toBe(2);
    // Perto do CA (tela: 160, 140.4).
    expect(slotMaisProximo(slots, origem, 165, 138, 50)).toBe(1);
  });

  it('retorna null fora do limiar de drop', () => {
    expect(slotMaisProximo(slots, origem, 90, 295, 5)).toBeNull();
  });

  it('não solta com o campo ainda não medido (origem 0,0)', () => {
    // Mesmo com o ponto exatamente sobre um slot relativo à origem zero.
    const [gol] = slots;
    expect(slotMaisProximo(slots, {x: 0, y: 0}, gol.x, gol.y, 50)).toBeNull();
  });
});
