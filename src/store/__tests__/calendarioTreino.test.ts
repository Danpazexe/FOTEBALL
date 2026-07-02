/**
 * Calendário + treino AUTOMÁTICO (estilo Brasfoot): o próximo evento é sempre o
 * JOGO (sem portão de treino obrigatório), e o treino-base é aplicado sozinho ao
 * avançar a rodada quando o usuário não treinou na mão.
 */
import {
  calcularProximoEvento,
  selecionarProximoJogo,
  useGameStore,
} from '../useGameStore';

const estado = () => useGameStore.getState();

/** Soma o progresso de treino acumulado do elenco do usuário (só treino mexe). */
function somaProgresso(clubeId: string): number {
  return estado()
    .jogadores.filter(jogador => jogador.clubeId === clubeId)
    .reduce(
      (total, jogador) =>
        total +
        Object.values(jogador.progressoAtributos ?? {}).reduce(
          (soma, valor) => soma + (valor ?? 0),
          0,
        ),
      0,
    );
}

describe('calendário e treino automático', () => {
  beforeEach(() => {
    estado().reiniciarCarreira();
  });

  it('o próximo evento é sempre o JOGO (sem portão de treino)', () => {
    const usuario = estado().clubes[2];
    estado().iniciarNovaCarreira(usuario.id);

    const proxima = selecionarProximoJogo(estado());
    expect(proxima).not.toBeNull();

    const evento = calcularProximoEvento(proxima);
    expect(evento.tipo).toBe('jogo');
    if (evento.tipo === 'jogo') {
      expect(evento.data).toBe(proxima!.data);
    }
  });

  it('sem próxima partida o evento é fim de temporada', () => {
    expect(calcularProximoEvento(null)).toEqual({tipo: 'fim'});
  });

  it('avançar a rodada aplica o treino automático e avança o ciclo', () => {
    const usuario = estado().clubes[2];
    estado().iniciarNovaCarreira(usuario.id);

    const progressoAntes = somaProgresso(usuario.id);
    const rodadaAntes = estado().rodadaAtual;

    expect(estado().treinouProximoJogo).toBe(false);
    estado().avancarRodada();

    // Ciclo avançou e o flag de treino reseta para a rodada seguinte.
    expect(estado().rodadaAtual).toBe(rodadaAntes + 1);
    expect(estado().treinouProximoJogo).toBe(false);

    // Treino-base foi aplicado sozinho: o progresso do elenco aumentou.
    expect(somaProgresso(usuario.id)).toBeGreaterThan(progressoAntes);

    // E o próximo evento continua sendo o JOGO (nunca treino).
    const evento = calcularProximoEvento(selecionarProximoJogo(estado()));
    expect(evento.tipo).toBe('jogo');
  });

  it('treino manual no ciclo pula o automático (não soma duas sessões)', () => {
    const usuario = estado().clubes[2];
    estado().iniciarNovaCarreira(usuario.id);

    estado().aplicarTreino('hab_fisico', 'normal');
    expect(estado().treinouProximoJogo).toBe(true);
    const progressoAposManual = somaProgresso(usuario.id);

    estado().avancarRodada();

    // Como treinou na mão, o automático é pulado: o progresso de treino não
    // recebe uma segunda sessão na mesma rodada (a partida não mexe nele).
    expect(estado().treinouProximoJogo).toBe(false);
    expect(somaProgresso(usuario.id)).toBe(progressoAposManual);
  });
});
