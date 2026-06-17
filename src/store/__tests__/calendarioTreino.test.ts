/**
 * Fluxo de calendário (estilo FIFA) + treino obrigatório antes de cada jogo:
 * o próximo evento alterna TREINO → JOGO, a data atual acompanha, e o flag de
 * treino reseta a cada partida disputada.
 */
import {adicionarDias} from '../../utils/datas';
import {
  calcularProximoEvento,
  selecionarProximoJogo,
  useGameStore,
} from '../useGameStore';

const estado = () => useGameStore.getState();

describe('calendário e treino obrigatório', () => {
  beforeEach(() => {
    estado().reiniciarCarreira();
  });

  it('ciclo treino → jogo → treino mantém data e flag coerentes', () => {
    const usuario = estado().clubes[2];
    estado().iniciarNovaCarreira(usuario.id);

    const proxima = selecionarProximoJogo(estado());
    expect(proxima).not.toBeNull();
    const dataJogo = proxima!.data;

    // Recém-iniciado: ainda não treinou → evento é TREINO na véspera do jogo;
    // a data começa 2 dias antes da partida.
    expect(estado().treinouProximoJogo).toBe(false);
    expect(estado().dataAtual).toBe(adicionarDias(dataJogo, -2));
    const ev1 = calcularProximoEvento(
      selecionarProximoJogo(estado()),
      estado().treinouProximoJogo,
    );
    expect(ev1.tipo).toBe('treino');
    if (ev1.tipo === 'treino') {
      expect(ev1.data).toBe(adicionarDias(dataJogo, -1));
    }

    // Avança para o treino e treina → libera o jogo (evento vira JOGO).
    estado().avancarParaData(adicionarDias(dataJogo, -1));
    estado().aplicarTreino('hab_fisico', 'normal');
    expect(estado().treinouProximoJogo).toBe(true);
    const ev2 = calcularProximoEvento(
      selecionarProximoJogo(estado()),
      estado().treinouProximoJogo,
    );
    expect(ev2.tipo).toBe('jogo');
    if (ev2.tipo === 'jogo') {
      expect(ev2.data).toBe(dataJogo);
    }

    // Joga a rodada → flag reseta, rodada avança, data = dia do jogo.
    const rodadaAntes = estado().rodadaAtual;
    estado().avancarParaData(dataJogo);
    estado().avancarRodada();
    expect(estado().treinouProximoJogo).toBe(false);
    expect(estado().rodadaAtual).toBe(rodadaAntes + 1);
    expect(estado().dataAtual).toBe(dataJogo);

    // O próximo evento volta a ser TREINO (para a rodada seguinte).
    const ev3 = calcularProximoEvento(
      selecionarProximoJogo(estado()),
      estado().treinouProximoJogo,
    );
    expect(ev3.tipo).toBe('treino');
  });

  it('sem próxima partida o evento é fim de temporada', () => {
    expect(calcularProximoEvento(null, false)).toEqual({tipo: 'fim'});
    expect(calcularProximoEvento(null, true)).toEqual({tipo: 'fim'});
  });
});
