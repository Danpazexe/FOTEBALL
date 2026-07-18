/**
 * Série de evolução do elenco (gráfico de Desenvolvimento): a carreira nasce com
 * 1 instantâneo (baseline), cada virada acrescenta 1 ponto REAL, e a série
 * sobrevive a salvar/recarregar. Save antigo (sem o campo) carrega vazio.
 */
import {aplicarSnapshot, montarSnapshot} from '../persistence';
import {useGameStore} from '../useGameStore';

const estado = () => useGameStore.getState();

describe('histórico de desenvolvimento (gráfico de evolução)', () => {
  beforeEach(() => {
    estado().reiniciarCarreira();
  });

  it('carreira nova começa com 1 instantâneo (baseline do elenco)', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);
    const hist = estado().historicoDesenvolvimento;
    expect(hist.length).toBe(1);
    const ponto = hist[0];
    // Médias coerentes (0-100) e overall plausível.
    for (const chave of ['fisico', 'tecnico', 'mental', 'overall'] as const) {
      expect(ponto[chave]).toBeGreaterThan(0);
      expect(ponto[chave]).toBeLessThanOrEqual(100);
    }
    expect(ponto.temporada).toBe(estado().temporadaAtual);
  });

  it('cada virada de temporada acrescenta um ponto real', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);
    expect(estado().historicoDesenvolvimento.length).toBe(1);

    useGameStore.setState({rodadaAtual: 39});
    estado().finalizarTemporada();

    expect(estado().historicoDesenvolvimento.length).toBe(2);
    // O segundo ponto é da temporada seguinte.
    const [p0, p1] = estado().historicoDesenvolvimento;
    expect(Number(p1.temporada)).toBe(Number(p0.temporada) + 1);
  });

  it('a série sobrevive a salvar e recarregar', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);
    const antes = estado().historicoDesenvolvimento;
    const aplicado = aplicarSnapshot(montarSnapshot(estado()));
    expect(aplicado.historicoDesenvolvimento).toEqual(antes);
  });

  it('save antigo (sem o campo) carrega com série vazia', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);
    const snapshot = montarSnapshot(estado());
    delete snapshot.historicoDesenvolvimento;
    expect(aplicarSnapshot(snapshot).historicoDesenvolvimento).toEqual([]);
  });
});
