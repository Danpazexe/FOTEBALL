/**
 * Regressões da trilha "save robusto": uma nova carreira parte sempre do seed
 * limpo (nunca herda elencos/temporada de uma carreira anterior em memória) e as
 * substituições feitas durante a partida ao vivo não viram a escalação oficial.
 */
import {trocarTitular} from '../../api/database/seed/defaults';
import {selecionarProximoJogo, useGameStore} from '../useGameStore';
import {useAchievementsStore} from '../useAchievementsStore';

const estado = () => useGameStore.getState();

describe('iniciarNovaCarreira — slate limpo', () => {
  beforeEach(() => {
    estado().reiniciarCarreira();
  });

  it('parte do seed limpo e da temporada inicial mesmo após estado sujo', () => {
    const usuario = estado().clubes[5];
    const jogadorRef = estado().todosJogadores.find(
      j => j.clubeId === usuario.id,
    )!;
    const idadeSeed = jogadorRef.idade;

    // Simula uma carreira anterior já avançada em memória.
    useGameStore.setState({
      temporadaAtual: '2031',
      todosJogadores: estado().todosJogadores.map(j =>
        j.id === jogadorRef.id ? {...j, idade: j.idade + 5, overall: 99} : j,
      ),
    });
    useAchievementsStore.getState().desbloquearConquista('primeira_vitoria');

    estado().iniciarNovaCarreira(usuario.id);

    expect(estado().temporadaAtual).toBe('2026');
    expect(estado().rodadaAtual).toBe(1);
    const recarregado = estado().jogadores.find(j => j.id === jogadorRef.id)!;
    expect(recarregado.idade).toBe(idadeSeed);
    expect(recarregado.overall).not.toBe(99);
    // Conquistas zeram (são vinculadas à carreira).
    expect(
      useAchievementsStore
        .getState()
        .conquistas.find(c => c.id === 'primeira_vitoria')?.desbloqueada,
    ).toBe(false);
  });
});

describe('partida ao vivo — substituições não vazam na escalação oficial', () => {
  beforeEach(() => {
    estado().reiniciarCarreira();
  });

  it('restaura a formação ao concluir a partida', () => {
    const usuario = estado().clubes[7];
    estado().iniciarNovaCarreira(usuario.id);

    const clubeAntes = estado().clubes.find(c => c.id === usuario.id)!;
    const formacaoOriginal = clubeAntes.formacaoAtual!;
    const titularesIds = new Set(
      formacaoOriginal.titulares.map(t => t.jogadorId),
    );
    const reserva = estado().jogadores.find(
      j =>
        j.clubeId === usuario.id &&
        !titularesIds.has(j.id) &&
        !j.lesionado &&
        !j.suspenso,
    )!;

    const proximo = selecionarProximoJogo(estado())!;

    // Entra na partida e faz uma substituição (como na tela ao vivo).
    estado().prepararPartidaAoVivo();
    estado().atualizarFormacaoUsuario(
      trocarTitular(formacaoOriginal, 10, reserva.id),
    );
    // Durante o jogo a escalação realmente mudou.
    const titularesDurante = new Set(
      estado()
        .clubes.find(c => c.id === usuario.id)!
        .formacaoAtual!.titulares.map(t => t.jogadorId),
    );
    expect(titularesDurante.has(reserva.id)).toBe(true);

    estado().concluirPartidaAoVivo(proximo.id, [], 1, 0);

    // Concluída a partida, a escalação OFICIAL volta a ser a original.
    const clubeDepois = estado().clubes.find(c => c.id === usuario.id)!;
    expect(clubeDepois.formacaoAtual).toEqual(formacaoOriginal);
    expect(estado().formacaoPreLive).toBeNull();
  });

  it('restaurarFormacaoPreLive desfaz mudanças ao abandonar a partida', () => {
    const usuario = estado().clubes[7];
    estado().iniciarNovaCarreira(usuario.id);

    const formacaoOriginal = estado().clubes.find(c => c.id === usuario.id)!
      .formacaoAtual!;
    const titularesIds = new Set(
      formacaoOriginal.titulares.map(t => t.jogadorId),
    );
    const reserva = estado().jogadores.find(
      j => j.clubeId === usuario.id && !titularesIds.has(j.id),
    )!;

    estado().prepararPartidaAoVivo();
    estado().atualizarFormacaoUsuario(
      trocarTitular(formacaoOriginal, 10, reserva.id),
    );
    estado().restaurarFormacaoPreLive();

    const clubeDepois = estado().clubes.find(c => c.id === usuario.id)!;
    expect(clubeDepois.formacaoAtual).toEqual(formacaoOriginal);
    expect(estado().formacaoPreLive).toBeNull();
  });
});

describe('conversarComGrupo — moral semanal', () => {
  beforeEach(() => {
    estado().reiniciarCarreira();
  });

  it('sobe +5 de moral ao elenco e só pode 1x por semana', () => {
    const usuario = estado().clubes[2];
    estado().iniciarNovaCarreira(usuario.id);

    const moralAntes = new Map(
      estado()
        .jogadores.filter(j => j.clubeId === usuario.id)
        .map(j => [j.id, j.moral] as const),
    );

    expect(estado().conversouComGrupo).toBe(false);
    expect(estado().conversarComGrupo()).toBe(true);
    expect(estado().conversouComGrupo).toBe(true);

    for (const jogador of estado().jogadores.filter(
      j => j.clubeId === usuario.id,
    )) {
      const antes = moralAntes.get(jogador.id)!;
      expect(jogador.moral).toBe(Math.min(100, antes + 5));
    }

    // Segunda tentativa na mesma semana não faz efeito.
    const moralDepois = estado().jogadores.map(j => j.moral);
    expect(estado().conversarComGrupo()).toBe(false);
    expect(estado().jogadores.map(j => j.moral)).toEqual(moralDepois);
  });

  it('libera de novo após avançar a rodada', () => {
    const usuario = estado().clubes[2];
    estado().iniciarNovaCarreira(usuario.id);

    estado().conversarComGrupo();
    expect(estado().conversouComGrupo).toBe(true);

    estado().avancarRodada();
    expect(estado().conversouComGrupo).toBe(false);
    expect(estado().conversarComGrupo()).toBe(true);
  });
});

describe('concederColetiva — moral da coletiva (1x por rodada)', () => {
  beforeEach(() => {
    estado().reiniciarCarreira();
  });

  it('aplica o efeito total à moral do elenco uma única vez por rodada', () => {
    const usuario = estado().clubes[4];
    estado().iniciarNovaCarreira(usuario.id);

    const moralAntes = new Map(
      estado()
        .jogadores.filter(j => j.clubeId === usuario.id)
        .map(j => [j.id, j.moral] as const),
    );

    expect(estado().coletivaConcedida).toBe(false);
    expect(estado().concederColetiva(6)).toBe(true);
    expect(estado().coletivaConcedida).toBe(true);

    for (const jogador of estado().jogadores.filter(
      j => j.clubeId === usuario.id,
    )) {
      expect(jogador.moral).toBe(Math.min(100, moralAntes.get(jogador.id)! + 6));
    }

    // Segunda concessão na mesma rodada não tem efeito.
    const moralDepois = estado().jogadores.map(j => j.moral);
    expect(estado().concederColetiva(6)).toBe(false);
    expect(estado().jogadores.map(j => j.moral)).toEqual(moralDepois);
  });

  it('libera de novo ao avançar a rodada', () => {
    const usuario = estado().clubes[4];
    estado().iniciarNovaCarreira(usuario.id);

    estado().concederColetiva(3);
    expect(estado().coletivaConcedida).toBe(true);

    estado().avancarRodada();
    expect(estado().coletivaConcedida).toBe(false);
    expect(estado().concederColetiva(3)).toBe(true);
  });
});
