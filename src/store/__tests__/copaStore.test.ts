import {confrontoDoClube} from '../../engine/season/copaEngine';
import {aplicarSnapshot, montarSnapshot} from '../persistence';
import {selecionarProximoCompromisso, useGameStore} from '../useGameStore';

const estado = () => useGameStore.getState();
const saldoDe = (id: string) =>
  estado().clubes.find(c => c.id === id)?.financas.saldo ?? 0;

describe('Copa do Brasil no store', () => {
  beforeEach(() => {
    estado().reiniciarCarreira();
  });

  it('iniciarNovaCarreira gera a Copa com o clube do usuário incluído', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);

    const copa = estado().copa;
    expect(copa).not.toBeNull();
    expect(copa!.fases[0].nome).toBe('Oitavas de final');
    expect(copa!.fases[0].confrontos).toHaveLength(8);
    expect(confrontoDoClube(copa!, usuario.id)).not.toBeNull();
  });

  it('vencer o confronto avança a fase e paga premiação ao usuário', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);
    const saldoAntes = saldoDe(usuario.id);

    estado().avancarFaseCopa({golsUsuario: 3, golsAdversario: 0});

    const copa = estado().copa!;
    expect(copa.faseAtual).toBe(1);
    expect(copa.fases[1].nome).toBe('Quartas de final');
    // Usuário venceu → segue na chave e recebeu premiação das Oitavas (§11.2).
    expect(confrontoDoClube(copa, usuario.id)).not.toBeNull();
    expect(saldoDe(usuario.id)).toBe(saldoAntes + 1_575_000);
  });

  it('simular a copa inteira produz um campeão', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);

    let guarda = 0;
    while (!estado().copa!.campeao && guarda < 6) {
      guarda += 1;
      estado().avancarFaseCopa();
    }
    const copa = estado().copa!;
    expect(copa.campeao).toBeTruthy();
    expect(copa.fases).toHaveLength(4);
  });

  it('o próximo compromisso alterna da liga para a Copa quando a data chega', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);

    // No início da temporada, o próximo compromisso é o jogo da liga.
    expect(selecionarProximoCompromisso(estado())?.tipo).toBe('liga');

    // Avança a liga até passar a rodada-gatilho das Oitavas (8).
    let guarda = 0;
    while (estado().rodadaAtual <= 8 && guarda < 12) {
      guarda += 1;
      estado().avancarRodada();
    }

    const comp = selecionarProximoCompromisso(estado());
    expect(comp?.tipo).toBe('copa');
  });

  it('a Copa é preservada no snapshot de save', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);
    estado().avancarFaseCopa({golsUsuario: 2, golsAdversario: 1});

    const aplicado = aplicarSnapshot(montarSnapshot(estado()));
    expect(aplicado.copa?.faseAtual).toBe(estado().copa!.faseAtual);
    expect(aplicado.copa?.fases).toHaveLength(estado().copa!.fases.length);
  });
});
