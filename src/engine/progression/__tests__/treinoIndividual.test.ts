import {desenvolverFoco} from '../treinoIndividual';
import {criarPlayer} from '../../../testing/fixtures';
import type {Player} from '../../../types';

const passa = () => 0; // < 0.6 → evolui
const falha = () => 0.9; // >= 0.6 → não evolui

function atacante(over: Partial<Player> = {}): Player {
  return criarPlayer({
    id: 'p',
    posicaoPrincipal: 'CA',
    overall: 75,
    potencial: 90,
    atributos: {
      finalizacao: 70,
      passe: 65,
      marcacao: 40,
      desarme: 40,
      velocidade: 75,
      resistencia: 70,
      forca: 70,
      reflexos: 30,
      posicionamento: 72,
      drible: 74,
      cabeceio: 68,
      cruzamento: 66,
    },
    ...over,
  });
}

describe('desenvolverFoco', () => {
  it('sem foco → jogador inalterado', () => {
    const j = atacante();
    expect(desenvolverFoco(j, passa)).toBe(j);
  });

  it('com foco e margem + rng favorável → sobe 1 ponto do atributo focado', () => {
    const j = atacante({focoTreino: 'finalizacao'});
    const evoluido = desenvolverFoco(j, passa);
    expect(evoluido.atributos.finalizacao).toBe(71);
    // Só o atributo focado muda.
    expect(evoluido.atributos.drible).toBe(j.atributos.drible);
  });

  it('rng desfavorável → não evolui', () => {
    const j = atacante({focoTreino: 'finalizacao'});
    expect(desenvolverFoco(j, falha).atributos.finalizacao).toBe(70);
  });

  it('o foco não leva o overall além do potencial', () => {
    const j = atacante({focoTreino: 'finalizacao', overall: 90, potencial: 90});
    expect(desenvolverFoco(j, passa)).toBe(j);
  });

  it('atributo no teto (99) não sobe', () => {
    const j = atacante({
      focoTreino: 'finalizacao',
      atributos: {...atacante().atributos, finalizacao: 99},
    });
    expect(desenvolverFoco(j, passa).atributos.finalizacao).toBe(99);
  });

  it('recalcula o overall após evoluir o foco', () => {
    const j = atacante({focoTreino: 'finalizacao'});
    const evoluido = desenvolverFoco(j, passa);
    // finalização tem peso alto para atacante → overall não diminui.
    expect(evoluido.overall).toBeGreaterThanOrEqual(j.overall);
  });

  it('é determinística para a mesma entrada e rng', () => {
    const j = atacante({focoTreino: 'passe'});
    expect(desenvolverFoco(j, passa)).toEqual(desenvolverFoco(j, passa));
  });
});
