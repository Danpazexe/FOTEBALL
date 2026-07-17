/**
 * Fluxo de temporada no STORE (ROADMAP Fase 5 / TESTES_BALANCEAMENTO §10): a
 * virada de temporada (finalizarTemporada) precisa mover clubes entre divisões
 * (4 sobem / 4 descem), seguir o clube do usuário para a nova divisão, gerar uma
 * temporada seguinte coerente e refletir título/rebaixamento na carreira.
 *
 * O playthrough.e2e cobre uma temporada JOGADA fim-a-fim; aqui focamos os buracos
 * que ele não cobre: acesso/rebaixamento REAL e os eventos de carreira da virada.
 * Controlamos a tabela final e a rodada via setState (padrão dos testes de store).
 */
import {useGameStore} from '../useGameStore';

const estado = () => useGameStore.getState();

/** Reordena a tabela colocando `clubeId` no topo (1º) ou no fim (último). */
function tabelaCom(clubeId: string, posicao: 'topo' | 'fim') {
  const atual = estado().tabela;
  const alvo = atual.find(linha => linha.clubeId === clubeId)!;
  const resto = atual.filter(linha => linha.clubeId !== clubeId);
  return posicao === 'topo' ? [alvo, ...resto] : [...resto, alvo];
}

describe('finalizarTemporada — acesso e rebaixamento', () => {
  beforeEach(() => {
    estado().reiniciarCarreira();
  });

  it('move exatamente 4 clubes em cada sentido (A↔B) e preserva o conjunto', () => {
    const usuario = estado().clubes[7];
    estado().iniciarNovaCarreira(usuario.id);
    const divisaoAntes = new Map(
      estado().todosClubes.map(clube => [clube.id, clube.divisao]),
    );

    useGameStore.setState({rodadaAtual: 39});
    estado().finalizarTemporada();

    const depois = estado().todosClubes;
    const desceram = depois.filter(
      clube =>
        divisaoAntes.get(clube.id) === 'Série A' && clube.divisao === 'Série B',
    );
    const subiram = depois.filter(
      clube =>
        divisaoAntes.get(clube.id) === 'Série B' && clube.divisao === 'Série A',
    );
    expect(desceram).toHaveLength(4);
    expect(subiram).toHaveLength(4);

    // Nenhum clube some ou duplica na virada.
    expect(depois).toHaveLength(divisaoAntes.size);
    expect(new Set(depois.map(clube => clube.id)).size).toBe(divisaoAntes.size);
  });

  it('a temporada seguinte nasce coerente (20 clubes da divisão do usuário, 380 jogos por jogar)', () => {
    const usuario = estado().clubes[7];
    estado().iniciarNovaCarreira(usuario.id);
    const temporadaAntes = estado().temporadaAtual;

    useGameStore.setState({rodadaAtual: 39});
    estado().finalizarTemporada();

    expect(estado().temporadaAtual).toBe(String(Number(temporadaAntes) + 1));
    expect(estado().rodadaAtual).toBe(1);
    expect(estado().clubes).toHaveLength(20);
    expect(estado().partidas).toHaveLength(380);
    expect(estado().partidas.filter(partida => partida.jogada)).toHaveLength(0);

    // Todos os clubes da nova liga pertencem à divisão (nova) do usuário.
    const divisaoUsuario = estado().clubes.find(
      clube => clube.id === usuario.id,
    )?.divisao;
    expect(
      estado().clubes.every(clube => clube.divisao === divisaoUsuario),
    ).toBe(true);
  });

  it('campeão (líder da tabela) eleva a reputação e permanece na Série A', () => {
    const usuario = estado().clubes[7];
    estado().iniciarNovaCarreira(usuario.id);
    const reputacaoAntes = estado().reputacaoTecnico;

    useGameStore.setState({
      rodadaAtual: 39,
      tabela: tabelaCom(usuario.id, 'topo'),
    });
    estado().finalizarTemporada();

    expect(estado().reputacaoTecnico).toBeGreaterThan(reputacaoAntes);
    expect(estado().clubes.find(clube => clube.id === usuario.id)?.divisao).toBe(
      'Série A',
    );
    expect(estado().demissao).toBeNull();
  });

  it('rebaixamento (últimos da tabela) leva o clube à Série B e dispara demissão', () => {
    const usuario = estado().clubes[7];
    estado().iniciarNovaCarreira(usuario.id);

    useGameStore.setState({
      rodadaAtual: 39,
      tabela: tabelaCom(usuario.id, 'fim'),
    });
    estado().finalizarTemporada();

    expect(estado().clubes.find(clube => clube.id === usuario.id)?.divisao).toBe(
      'Série B',
    );
    expect(estado().demissao).toBe('REBAIXAMENTO');
  });

  it('Premier↔Championship: virada move exatamente 3 em cada sentido (pirâmide inglesa)', () => {
    const clubeIngles = estado().todosClubes.find(
      clube => clube.divisao === 'Premier League',
    )!;
    estado().iniciarNovaCarreira(clubeIngles.id);
    const divisaoAntes = new Map(
      estado().todosClubes.map(clube => [clube.id, clube.divisao]),
    );

    // Premier: 20 clubes → 38 rodadas; o gate de fim de temporada é DINÂMICO.
    expect(Math.max(...estado().partidas.map(p => p.rodada))).toBe(38);
    useGameStore.setState({
      rodadaAtual: 39,
      tabela: tabelaCom(clubeIngles.id, 'topo'),
    });
    estado().finalizarTemporada();

    const depois = estado().todosClubes;
    const desceram = depois.filter(
      clube =>
        divisaoAntes.get(clube.id) === 'Premier League' &&
        clube.divisao === 'Championship',
    );
    const subiram = depois.filter(
      clube =>
        divisaoAntes.get(clube.id) === 'Championship' &&
        clube.divisao === 'Premier League',
    );
    expect(desceram).toHaveLength(3);
    expect(subiram).toHaveLength(3);

    // A pirâmide brasileira segue girando em paralelo (4 A↔B), sem interferência.
    const desceramBR = depois.filter(
      clube =>
        divisaoAntes.get(clube.id) === 'Série A' && clube.divisao === 'Série B',
    );
    expect(desceramBR).toHaveLength(4);

    // Campeão da Premier segue na Premier, e a nova temporada nasce coerente.
    expect(depois.find(clube => clube.id === clubeIngles.id)?.divisao).toBe(
      'Premier League',
    );
    expect(estado().clubes).toHaveLength(20);
    expect(estado().copa).toBeNull();
  });

  it('Primera División (divisão única, 3 clubes): temporada fecha sem mover ninguém', () => {
    const clubeArgentino = estado().todosClubes.find(
      clube => clube.divisao === 'Primera División',
    )!;
    estado().iniciarNovaCarreira(clubeArgentino.id);

    // 3 clubes → round-robin com folga: 6 rodadas.
    expect(Math.max(...estado().partidas.map(p => p.rodada))).toBe(6);
    useGameStore.setState({rodadaAtual: 7});
    estado().finalizarTemporada();

    // Divisão única: ninguém muda de divisão na Argentina.
    expect(
      estado().todosClubes.filter(
        clube => clube.divisao === 'Primera División',
      ),
    ).toHaveLength(3);
    expect(estado().clubes).toHaveLength(3);
    expect(estado().rodadaAtual).toBe(1);
  });

  it('Championship (46 rodadas) passa da rodada 39: teto de avanço é dinâmico', () => {
    const clubeChamp = estado().todosClubes.find(
      clube => clube.divisao === 'Championship',
    )!;
    estado().iniciarNovaCarreira(clubeChamp.id);

    // 24 clubes → 46 rodadas; o teto fixo antigo (39) travava a carreira aqui.
    expect(Math.max(...estado().partidas.map(p => p.rodada))).toBe(46);

    useGameStore.setState({rodadaAtual: 38});
    estado().avancarRodada();
    estado().avancarRodada();
    // Sem o fix, rodadaAtual congelava em 39 e as rodadas 40-46 nunca rodavam.
    expect(estado().rodadaAtual).toBe(40);

    // Fim de temporada: avança além da última rodada e fecha normalmente.
    useGameStore.setState({rodadaAtual: 46});
    estado().avancarRodada();
    expect(estado().rodadaAtual).toBe(47);
    estado().finalizarTemporada();
    expect(estado().rodadaAtual).toBe(1);
  });

  it('liga com FOLGA joga fim-a-fim: rodadas em que o usuário descansa avançam', () => {
    const clubeArgentino = estado().todosClubes.find(
      clube => clube.divisao === 'Primera División',
    )!;
    estado().iniciarNovaCarreira(clubeArgentino.id);

    let guarda = 0;
    while (estado().rodadaAtual <= 6 && guarda < 12) {
      guarda += 1;
      estado().avancarRodada();
    }

    // Todas as 6 rodadas disputadas (1 jogo por rodada — inclusive as 2 em que
    // o clube do usuário folgou) e cada clube jogou 4 vezes.
    expect(estado().rodadaAtual).toBe(7);
    const jogadas = estado().partidas.filter(partida => partida.jogada);
    expect(jogadas).toHaveLength(6);
    expect(
      estado().tabela.every(linha => linha.jogos === 4),
    ).toBe(true);
  });

  it('credita cota de TV (transação cota_tv) ao clube do usuário na virada', () => {
    const usuario = estado().clubes[7];
    estado().iniciarNovaCarreira(usuario.id);

    useGameStore.setState({
      rodadaAtual: 39,
      tabela: tabelaCom(usuario.id, 'topo'),
    });
    estado().finalizarTemporada();

    const clube = estado().clubes.find(c => c.id === usuario.id)!;
    const temCotaTV = clube.financas.historicoTransacoes.some(
      transacao => transacao.categoria === 'cota_tv',
    );
    expect(temCotaTV).toBe(true);
  });
});
