/**
 * RELÓGIO DA CARREIRA no store (Onda 3): a data anda pelo pipeline no avanço
 * por evento, lesões correm em dias reais, a copa desgasta os titulares e a
 * Central de Pendências nasce com a carreira.
 */
import {useGameStore} from '../useGameStore';

const estado = () => useGameStore.getState();

describe('relógio da carreira (Onda 3)', () => {
  beforeEach(() => {
    estado().reiniciarCarreira();
  });

  it('carreira nova nasce com a pendência "Definir plano de treino" na Central', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);
    const pendencia = estado().pendencias.find(
      p => p.tipo === 'definir_plano_treino',
    );
    expect(pendencia).toBeDefined();
    expect(pendencia!.prioridade).toBe('alta');
    expect(pendencia!.bloqueante).toBe(false);
  });

  it('avancarRodada move a data para o dia da rodada e processa os dias no meio', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);
    const dataAntes = estado().dataAtual;
    const dataRodada = estado().partidas.find(
      p => p.rodada === estado().rodadaAtual,
    )!.data;

    estado().avancarRodada();

    expect(estado().dataAtual).toBe(dataRodada);
    expect(estado().dataAtual >= dataAntes).toBe(true);
  });

  it('lesão corre em DIAS REAIS: some após os dias passarem, com pendência de retorno', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);
    const alvo = estado().jogadores.find(j => j.clubeId === usuario.id)!;
    useGameStore.setState({
      jogadores: estado().jogadores.map(j =>
        j.id === alvo.id ? {...j, lesionado: true, diasLesao: 5} : j,
      ),
    });

    // Rodada 1→2 anda 3-4 dias de calendário; 5 dias de lesão exigem 2 rodadas.
    estado().avancarRodada();
    const aposUma = estado().jogadores.find(j => j.id === alvo.id)!;
    expect(aposUma.lesionado).toBe(true);
    expect(aposUma.diasLesao).toBeGreaterThan(0);
    expect(aposUma.diasLesao).toBeLessThan(5);

    estado().avancarRodada();
    const aposDuas = estado().jogadores.find(j => j.id === alvo.id)!;
    expect(aposDuas.lesionado).toBe(false);
    expect(aposDuas.diasLesao).toBe(0);
    expect(
      estado().pendencias.some(
        p => p.tipo === 'retorno_lesao' && p.entidadeId === alvo.id,
      ),
    ).toBe(true);
  });

  it('avancarParaData processa os dias (não só grava a string) e nunca volta no tempo', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);
    const alvo = estado().jogadores.find(j => j.clubeId === usuario.id)!;
    useGameStore.setState({
      jogadores: estado().jogadores.map(j =>
        j.id === alvo.id ? {...j, lesionado: true, diasLesao: 2} : j,
      ),
    });
    const hoje = estado().dataAtual;

    estado().avancarParaData('2026-04-09');
    expect(estado().jogadores.find(j => j.id === alvo.id)!.lesionado).toBe(false);

    // Alvo no passado: no-op (relógio monotônico).
    estado().avancarParaData(hoje);
    expect(estado().dataAtual).toBe('2026-04-09');
  });

  it('a COPA desgasta os titulares do usuário e conta o jogo', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);
    const condicaoAntes = new Map(
      estado().jogadores.map(j => [j.id, j.condicaoFisica]),
    );
    const jogosAntes = new Map(
      estado().jogadores.map(j => [j.id, j.estatisticasTemporada.jogos]),
    );

    estado().avancarFaseCopa({golsUsuario: 3, golsAdversario: 0});

    const desgastados = estado().jogadores.filter(
      j =>
        j.clubeId === usuario.id &&
        j.condicaoFisica < (condicaoAntes.get(j.id) ?? 100),
    );
    // Um XI inteiro do usuário cansou e contou o jogo de copa.
    expect(desgastados.length).toBeGreaterThanOrEqual(11);
    expect(
      desgastados.every(
        j => j.estatisticasTemporada.jogos === (jogosAntes.get(j.id) ?? 0) + 1,
      ),
    ).toBe(true);
  });

  it('proposta da IA que expira na próxima rodada vira pendência da Central', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);
    const meu = estado().jogadores.find(j => j.clubeId === usuario.id)!;
    useGameStore.setState({
      propostasRecebidas: [
        {
          id: 'prop_teste',
          jogadorId: meu.id,
          clubeOfertante: estado().clubes.find(c => c.id !== usuario.id)!.id,
          valorProposto: 1_000_000,
          status: 'pendente',
          expiracaoRodada: estado().rodadaAtual + 1,
        },
      ],
    });

    estado().avancarRodada();

    expect(
      estado().pendencias.some(p => p.tipo === 'proposta_expirando'),
    ).toBe(true);
  });
});
