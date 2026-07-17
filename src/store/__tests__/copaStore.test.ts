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

  it('empate no confronto do usuário é decidido nos pênaltis pela engine (modo manager)', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);

    const confronto = confrontoDoClube(estado().copa!, usuario.id)!;
    const adversarioId =
      confronto.timeA === usuario.id ? confronto.timeB : confronto.timeA;

    // Jogo empatado no tempo normal — sem disputa interativa, a engine decide.
    estado().avancarFaseCopa({golsUsuario: 1, golsAdversario: 1});

    const copa = estado().copa!;
    const resolvido = copa.fases[0].confrontos.find(
      c => c.timeA === usuario.id || c.timeB === usuario.id,
    )!;

    // A fase avançou: o empate NÃO travou o chaveamento.
    expect(copa.faseAtual).toBe(1);
    // Empate no tempo normal, decidido nos pênaltis por um dos dois clubes.
    expect(resolvido.golsA).toBe(resolvido.golsB);
    expect(resolvido.vencedorPenaltis).toBeDefined();
    expect([usuario.id, adversarioId]).toContain(resolvido.vencedorPenaltis);
    expect(resolvido.vencedor).toBe(resolvido.vencedorPenaltis);
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

  it('só clubes BRASILEIROS disputam a Copa (mundo multi-país não vaza)', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);

    // Sem o filtro, o ranking por força escalaria os clubes internacionais
    // (mais fortes do seed: Man City, Liverpool…) nas Oitavas.
    const brasileiros = new Set(
      estado()
        .todosClubes.filter(clube =>
          ['Série A', 'Série B', 'Série C', 'Série D'].includes(
            clube.divisao ?? 'Série A',
          ),
        )
        .map(clube => clube.id),
    );
    const participantes = estado().copa!.fases[0].confrontos.flatMap(c => [
      c.timeA,
      c.timeB,
    ]);
    expect(participantes.every(id => brasileiros.has(id))).toBe(true);
  });

  it('carreira INTERNACIONAL começa sem Copa do Brasil e com a liga certa', () => {
    const clubeIngles = estado().todosClubes.find(
      clube => clube.divisao === 'Premier League',
    );
    expect(clubeIngles).toBeDefined();
    estado().iniciarNovaCarreira(clubeIngles!.id);

    expect(estado().copa).toBeNull();
    expect(estado().clubeUsuarioId).toBe(clubeIngles!.id);
    // A liga ativa é a Premier: 20 clubes, 38 rodadas (turno + returno).
    expect(estado().clubes).toHaveLength(20);
    expect(Math.max(...estado().partidas.map(p => p.rodada))).toBe(38);
  });
});
