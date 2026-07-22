/**
 * Sequenciamento do replay de gol: os passos do lance avançam NA ORDEM e
 * TODOS os segmentos são percorridos. A condução é por timer JS justamente
 * para a progressão sobreviver à redução de movimento do sistema (Android com
 * escala de animação em 0) — ver sequenciaReplay.ts.
 */
import {
  DURACAO_SEGMENTO_MS,
  criarSequenciadorReplay,
  planoReplay,
  type EventoReplay,
} from '../sequenciaReplay';

type Avanco = Extract<EventoReplay, {tipo: 'avanco'}>;

describe('planoReplay', () => {
  it('gera avanços 1..N em ordem e a conclusão ao fim do último segmento', () => {
    expect(planoReplay(3, 700)).toEqual([
      {tipo: 'avanco', indice: 1, emMs: 0},
      {tipo: 'avanco', indice: 2, emMs: 700},
      {tipo: 'avanco', indice: 3, emMs: 1400},
      {tipo: 'conclusao', emMs: 2100},
    ]);
  });

  it('percorre todos os segmentos, em ordem, para lances de qualquer tamanho', () => {
    for (let total = 1; total <= 8; total += 1) {
      const eventos = planoReplay(total, DURACAO_SEGMENTO_MS);
      const avancos = eventos.filter((e): e is Avanco => e.tipo === 'avanco');
      expect(avancos.map(e => e.indice)).toEqual(
        Array.from({length: total}, (_, i) => i + 1),
      );
      for (let i = 1; i < eventos.length; i += 1) {
        expect(eventos[i].emMs).toBeGreaterThan(eventos[i - 1].emMs);
      }
      expect(eventos[eventos.length - 1]).toEqual({
        tipo: 'conclusao',
        emMs: total * DURACAO_SEGMENTO_MS,
      });
    }
  });

  it('sem segmentos ou duração inválida ⇒ sem eventos', () => {
    expect(planoReplay(0, 700)).toEqual([]);
    expect(planoReplay(-2, 700)).toEqual([]);
    expect(planoReplay(3, 0)).toEqual([]);
  });
});

describe('criarSequenciadorReplay', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  function montar(totalSegmentos: number) {
    const chamadas: Array<number | 'fim'> = [];
    const seq = criarSequenciadorReplay({
      totalSegmentos,
      duracaoSegmentoMs: 700,
      aoAvancar: indice => {
        chamadas.push(indice);
      },
      aoConcluir: () => {
        chamadas.push('fim');
      },
    });
    return {chamadas, seq};
  }

  it('avança passo a passo, na ordem, e conclui após o último segmento', () => {
    const {chamadas, seq} = montar(4);
    seq.iniciar();
    expect(chamadas).toEqual([1]); // 1º avanço é imediato
    jest.advanceTimersByTime(699);
    expect(chamadas).toEqual([1]);
    jest.advanceTimersByTime(1);
    expect(chamadas).toEqual([1, 2]);
    jest.advanceTimersByTime(700 * 3);
    expect(chamadas).toEqual([1, 2, 3, 4, 'fim']);
    jest.advanceTimersByTime(10_000);
    expect(chamadas).toEqual([1, 2, 3, 4, 'fim']); // nada além da conclusão
  });

  it('iniciar de novo (repetir replay) recomeça do primeiro passo', () => {
    const {chamadas, seq} = montar(3);
    seq.iniciar();
    jest.advanceTimersByTime(700); // [1, 2]
    seq.iniciar();
    jest.advanceTimersByTime(700 * 3);
    expect(chamadas).toEqual([1, 2, 1, 2, 3, 'fim']);
  });

  it('parar cancela os avanços pendentes', () => {
    const {chamadas, seq} = montar(3);
    seq.iniciar();
    jest.advanceTimersByTime(700); // [1, 2]
    seq.parar();
    jest.advanceTimersByTime(10_000);
    expect(chamadas).toEqual([1, 2]);
  });

  it('lance sem segmentos: não avança nem conclui', () => {
    const {chamadas, seq} = montar(0);
    seq.iniciar();
    jest.advanceTimersByTime(10_000);
    expect(chamadas).toEqual([]);
  });
});
