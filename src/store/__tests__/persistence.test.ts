import {
  aplicarSnapshot,
  carregarJogo,
  definirArmazenamentoSave,
  existeSave,
  montarSnapshot,
  salvarJogo,
  type ArmazenamentoSave,
} from '../persistence';
import {useGameStore} from '../useGameStore';

function armazenamentoMemoria(): ArmazenamentoSave & {bruto(): string | null} {
  let dado: string | null = null;
  return {
    escrever(json) {
      dado = json;
      return Promise.resolve();
    },
    ler() {
      return Promise.resolve(dado);
    },
    limpar() {
      dado = null;
      return Promise.resolve();
    },
    bruto() {
      return dado;
    },
  };
}

describe('persistence', () => {
  it('montarSnapshot + aplicarSnapshot preserva os campos principais', () => {
    const estado = useGameStore.getState();
    const aplicado = aplicarSnapshot(montarSnapshot(estado));
    expect(aplicado.clubes).toHaveLength(estado.clubes.length);
    expect(aplicado.jogadores).toHaveLength(estado.jogadores.length);
    expect(aplicado.partidas).toHaveLength(estado.partidas.length);
    expect(aplicado.temporadaAtual).toBe(estado.temporadaAtual);
    expect(aplicado.rodadaAtual).toBe(estado.rodadaAtual);
  });

  it('existeSave retorna false em armazenamento vazio', async () => {
    definirArmazenamentoSave(armazenamentoMemoria());
    expect(await existeSave()).toBe(false);
  });

  it('salvarJogo + carregarJogo reidrata o estado corretamente', async () => {
    definirArmazenamentoSave(armazenamentoMemoria());
    const estado = useGameStore.getState();

    await salvarJogo(estado);
    expect(await existeSave()).toBe(true);

    const carregado = await carregarJogo();
    expect(carregado).not.toBeNull();
    expect(carregado?.clubes).toHaveLength(estado.clubes.length);
    expect(carregado?.jogadores).toHaveLength(estado.jogadores.length);
    expect(carregado?.rodadaAtual).toBe(estado.rodadaAtual);
  });

  it('save é idempotente — múltiplos saves mantêm um único snapshot válido', async () => {
    const arm = armazenamentoMemoria();
    definirArmazenamentoSave(arm);
    const estado = useGameStore.getState();

    await salvarJogo(estado);
    await salvarJogo(estado);

    const bruto = arm.bruto();
    expect(bruto).not.toBeNull();
    expect(() => JSON.parse(bruto ?? '')).not.toThrow();
  });
});
