import {
  DELTA_CONDICAO_FORA,
  DELTA_CONDICAO_RESERVA,
  DELTA_CONDICAO_TITULAR,
  RECUPERACAO_CONDICAO_DIA,
  aplicarCondicaoPosPartida,
  deltaCondicaoPosPartida,
  recuperarCondicaoDia,
} from '../condicao';
import {CONDICAO_MAX, CONDICAO_MIN, INTENSIDADES} from '../treinoTipos';

describe('deltaCondicaoPosPartida', () => {
  it('titular (jogou 90\') tem queda relevante', () => {
    expect(deltaCondicaoPosPartida({ehTitular: true, participou: true})).toBe(
      DELTA_CONDICAO_TITULAR,
    );
    expect(DELTA_CONDICAO_TITULAR).toBeLessThan(0);
  });

  it('reserva que entrou cansa de leve', () => {
    expect(deltaCondicaoPosPartida({ehTitular: false, participou: true})).toBe(
      DELTA_CONDICAO_RESERVA,
    );
    // Reserva cansa MENOS que titular, mas ainda cansa (não recupera jogando).
    expect(DELTA_CONDICAO_RESERVA).toBeLessThan(0);
    expect(DELTA_CONDICAO_RESERVA).toBeGreaterThan(DELTA_CONDICAO_TITULAR);
  });

  it('quem ficou de fora recupera com o salto REBALANCEADO (+12)', () => {
    expect(deltaCondicaoPosPartida({ehTitular: false, participou: false})).toBe(
      DELTA_CONDICAO_FORA,
    );
    expect(DELTA_CONDICAO_FORA).toBe(12);
  });

  it('é determinística — mesma entrada, mesma saída', () => {
    const args = {ehTitular: true, participou: true};
    expect(deltaCondicaoPosPartida(args)).toBe(deltaCondicaoPosPartida(args));
  });

  it('rodízio importa: titular que joga TODA rodada tende a cair mesmo com o treino leve', () => {
    // O motor aplica, por rodada, a queda da partida + o treino automático leve.
    // Para o rodízio fazer sentido, o líquido de um titular fixo deve ser < 0.
    const liquidoTitularFixo =
      DELTA_CONDICAO_TITULAR + INTENSIDADES.leve.deltaCondicao;
    expect(liquidoTitularFixo).toBeLessThan(0);
  });
});

describe('aplicarCondicaoPosPartida', () => {
  it('não passa do teto (CONDICAO_MAX) ao recuperar', () => {
    expect(
      aplicarCondicaoPosPartida(90, {ehTitular: false, participou: false}),
    ).toBe(CONDICAO_MAX);
  });

  it('não fura o piso (CONDICAO_MIN) ao cansar', () => {
    expect(
      aplicarCondicaoPosPartida(CONDICAO_MIN + 1, {
        ehTitular: true,
        participou: true,
      }),
    ).toBe(CONDICAO_MIN);
  });

  it('aplica a variação normalmente no meio da faixa', () => {
    expect(
      aplicarCondicaoPosPartida(80, {ehTitular: true, participou: true}),
    ).toBe(80 + DELTA_CONDICAO_TITULAR);
    expect(
      aplicarCondicaoPosPartida(50, {ehTitular: false, participou: true}),
    ).toBe(50 + DELTA_CONDICAO_RESERVA);
  });
});

describe('recuperarCondicaoDia (drift diário do pipeline)', () => {
  it('recupera +2 por dia no meio da faixa', () => {
    expect(RECUPERACAO_CONDICAO_DIA).toBe(2);
    expect(recuperarCondicaoDia(60)).toBe(62);
  });

  it('não passa do teto (CONDICAO_MAX)', () => {
    expect(recuperarCondicaoDia(99)).toBe(CONDICAO_MAX);
    expect(recuperarCondicaoDia(CONDICAO_MAX)).toBe(CONDICAO_MAX);
  });

  it('é determinístico — mesma entrada, mesma saída', () => {
    expect(recuperarCondicaoDia(73)).toBe(recuperarCondicaoDia(73));
  });

  it('paridade semanal aproximada: fora por 1 rodada ≈ salto antigo de +25', () => {
    // Antes: recuperação era um salto único de +25 no pós-jogo. Agora ela é
    // distribuída: +2/dia entre rodadas (calendarGenerator alterna 3 e 4 dias)
    // + salto de +12 → total travado em 18 (3 dias) ou 20 (4 dias).
    const SALTO_ANTIGO = 25;
    expect(DELTA_CONDICAO_FORA + 3 * RECUPERACAO_CONDICAO_DIA).toBe(18);
    expect(DELTA_CONDICAO_FORA + 4 * RECUPERACAO_CONDICAO_DIA).toBe(20);
    for (const dias of [3, 4]) {
      const totalRodada = DELTA_CONDICAO_FORA + dias * RECUPERACAO_CONDICAO_DIA;
      expect(Math.abs(totalRodada - SALTO_ANTIGO)).toBeLessThanOrEqual(7);
    }
  });
});
