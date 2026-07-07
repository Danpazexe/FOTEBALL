/**
 * Integração da Série D na virada de temporada (ativação "em background"): a
 * Série D roda de verdade pela engine (grupos + mata-mata) e alimenta o acesso
 * C↔D e o histórico de campeões, com o usuário disputando A/B/C.
 */
import {montarSnapshot, aplicarSnapshot} from '../persistence';
import {resolverSerieDNaVirada} from '../serieDSeason';
import {useGameStore} from '../useGameStore';

const estado = () => useGameStore.getState();

describe('resolverSerieDNaVirada', () => {
  it('roda a competição e devolve ordem (promovidos primeiro) + resumo', () => {
    const {todosClubes, todosJogadores} = estado();
    const resolucao = resolverSerieDNaVirada(todosClubes, todosJogadores, '2026');
    expect(resolucao).not.toBeNull();
    expect(resolucao!.ordem).toHaveLength(96);
    expect(new Set(resolucao!.ordem).size).toBe(96);
    expect(resolucao!.resumo.acessos).toHaveLength(6);
    expect(resolucao!.resumo.campeao).toBeTruthy();
    // Os 6 acessos ficam à frente da ordem (o acesso da pirâmide pega os primeiros).
    expect(resolucao!.ordem.slice(0, 6).sort()).toEqual(
      [...resolucao!.resumo.acessos].sort(),
    );
  });

  it('é determinístico para a mesma temporada', () => {
    const {todosClubes, todosJogadores} = estado();
    const a = resolverSerieDNaVirada(todosClubes, todosJogadores, '2026')!;
    const b = resolverSerieDNaVirada(todosClubes, todosJogadores, '2026')!;
    expect(b.resumo.campeao).toBe(a.resumo.campeao);
    expect(b.ordem).toEqual(a.ordem);
  });

  it('devolve null quando o mundo não tem a Série D completa (save antigo)', () => {
    const semSerieD = estado().todosClubes.filter(
      clube => clube.divisao !== 'Série D',
    );
    expect(
      resolverSerieDNaVirada(semSerieD, estado().todosJogadores, '2026'),
    ).toBeNull();
  });
});

describe('finalizarTemporada — acesso C↔D pela Série D real', () => {
  beforeEach(() => {
    estado().reiniciarCarreira();
  });

  it('sobem 4 da Série D e descem 4 da Série C, com tamanhos estáveis', () => {
    const usuarioC = estado().todosClubes.find(c => c.divisao === 'Série C')!;
    estado().iniciarNovaCarreira(usuarioC.id);
    const divisaoAntes = new Map(
      estado().todosClubes.map(c => [c.id, c.divisao]),
    );
    const qtdC = [...divisaoAntes.values()].filter(d => d === 'Série C').length;
    const qtdD = [...divisaoAntes.values()].filter(d => d === 'Série D').length;

    useGameStore.setState({rodadaAtual: 39});
    estado().finalizarTemporada();

    const depois = estado().todosClubes;
    const subiuDParaC = depois.filter(
      c => divisaoAntes.get(c.id) === 'Série D' && c.divisao === 'Série C',
    );
    const desceuCParaD = depois.filter(
      c => divisaoAntes.get(c.id) === 'Série C' && c.divisao === 'Série D',
    );
    expect(subiuDParaC).toHaveLength(4);
    expect(desceuCParaD).toHaveLength(4);
    // Tamanhos de C e D não mudam.
    expect(depois.filter(c => c.divisao === 'Série C')).toHaveLength(qtdC);
    expect(depois.filter(c => c.divisao === 'Série D')).toHaveLength(qtdD);
    // Nenhum clube some ou duplica.
    expect(new Set(depois.map(c => c.id)).size).toBe(divisaoAntes.size);
  });

  it('grava o histórico da Série D; o campeão sobe para a Série C', () => {
    const usuarioC = estado().todosClubes.find(c => c.divisao === 'Série C')!;
    estado().iniciarNovaCarreira(usuarioC.id);
    const divisaoAntes = new Map(
      estado().todosClubes.map(c => [c.id, c.divisao]),
    );

    useGameStore.setState({rodadaAtual: 39});
    estado().finalizarTemporada();

    const historico = estado().historicoSerieD;
    expect(historico).toHaveLength(1);
    expect(historico[0].temporada).toBe('2026');
    expect(historico[0].acessos).toHaveLength(6);
    expect(historico[0].semifinalistas).toHaveLength(4);
    // O campeão era da Série D e subiu para a Série C.
    expect(divisaoAntes.get(historico[0].campeao)).toBe('Série D');
    expect(
      estado().todosClubes.find(c => c.id === historico[0].campeao)?.divisao,
    ).toBe('Série C');
  });

  it('o histórico da Série D sobrevive ao montar/aplicar snapshot', () => {
    const usuarioC = estado().todosClubes.find(c => c.divisao === 'Série C')!;
    estado().iniciarNovaCarreira(usuarioC.id);
    useGameStore.setState({rodadaAtual: 39});
    estado().finalizarTemporada();

    const snap = montarSnapshot(estado());
    expect(snap.historicoSerieD).toEqual(estado().historicoSerieD);
    const aplicado = aplicarSnapshot(snap);
    expect(aplicado.historicoSerieD).toEqual(estado().historicoSerieD);
  });

  it('nova carreira zera o histórico da Série D', () => {
    const usuarioC = estado().todosClubes.find(c => c.divisao === 'Série C')!;
    estado().iniciarNovaCarreira(usuarioC.id);
    useGameStore.setState({rodadaAtual: 39});
    estado().finalizarTemporada();
    expect(estado().historicoSerieD.length).toBeGreaterThan(0);

    const outro = estado().clubes[0];
    estado().iniciarNovaCarreira(outro.id);
    expect(estado().historicoSerieD).toHaveLength(0);
  });
});

describe('carreira jogável na Série D — fase de grupos', () => {
  beforeEach(() => {
    estado().reiniciarCarreira();
  });

  it('começar carreira na Série D monta o GRUPO de 6 como liga ativa', () => {
    const clubeD = estado().todosClubes.find(c => c.divisao === 'Série D')!;
    estado().iniciarNovaCarreira(clubeD.id);

    // Liga ativa = grupo de 6 (não a divisão inteira de 96), todos da Série D.
    expect(estado().clubes).toHaveLength(6);
    expect(estado().clubes.every(c => c.divisao === 'Série D')).toBe(true);
    expect(estado().clubes.some(c => c.id === clubeD.id)).toBe(true);
    expect(estado().clubeUsuarioId).toBe(clubeD.id);

    // Turno e returno de 6 clubes = 30 jogos em 10 rodadas, nada jogado.
    expect(estado().partidas).toHaveLength(30);
    expect(new Set(estado().partidas.map(p => p.rodada)).size).toBe(10);
    expect(estado().partidas.every(p => !p.jogada)).toBe(true);
    expect(estado().tabela).toHaveLength(6);
  });

  it('o grupo do clube é determinístico (mesmo clube → mesmo grupo)', () => {
    const clubeD = estado().todosClubes.find(c => c.divisao === 'Série D')!;
    estado().iniciarNovaCarreira(clubeD.id);
    const grupo = estado()
      .clubes.map(c => c.id)
      .sort();

    estado().reiniciarCarreira();
    estado().iniciarNovaCarreira(clubeD.id);
    expect(estado().clubes.map(c => c.id).sort()).toEqual(grupo);
  });
});

describe('carreira jogável na Série D — grupos → mata-mata (store)', () => {
  beforeEach(() => {
    estado().reiniciarCarreira();
  });

  /** Preenche o grupo do usuário como jogado, com o usuário vencendo tudo. */
  function jogarGrupoComUsuarioLider(uid: string) {
    const jogadas = estado().partidas.map(partida => {
      const base = {...partida, jogada: true, eventos: []};
      if (partida.timeCasa === uid) {
        return {...base, placarCasa: 2, placarFora: 0};
      }
      if (partida.timeFora === uid) {
        return {...base, placarCasa: 0, placarFora: 2};
      }
      return {...base, placarCasa: 0, placarFora: 0};
    });
    useGameStore.setState({partidas: jogadas, rodadaAtual: 11});
  }

  it('classifica o líder do grupo e o leva ao mata-mata; vencendo tudo, é campeão', () => {
    const clubeD = estado().todosClubes.find(c => c.divisao === 'Série D')!;
    estado().iniciarNovaCarreira(clubeD.id);
    jogarGrupoComUsuarioLider(clubeD.id);

    estado().iniciarMataMataDaCarreira();
    const carreira = estado().serieDCarreira;
    expect(carreira).not.toBeNull();
    expect(carreira!.fase).toBe('mata_mata'); // líder do grupo → classificado

    // Vence todas as chaves → campeão + acesso.
    let guarda = 0;
    while (estado().serieDCarreira!.fase === 'mata_mata' && guarda < 10) {
      estado().avancarMataMataDaCarreira(true);
      guarda += 1;
    }
    expect(estado().serieDCarreira!.fase).toBe('campeao');
    expect(estado().serieDCarreira!.campeao).toBe(clubeD.id);
    expect(estado().serieDCarreira!.acessoConquistado).toBe(true);
  });

  it('o estado do mata-mata sobrevive ao snapshot', () => {
    const clubeD = estado().todosClubes.find(c => c.divisao === 'Série D')!;
    estado().iniciarNovaCarreira(clubeD.id);
    jogarGrupoComUsuarioLider(clubeD.id);
    estado().iniciarMataMataDaCarreira();

    const snap = montarSnapshot(estado());
    expect(snap.serieDCarreira).toEqual(estado().serieDCarreira);
    expect(aplicarSnapshot(snap).serieDCarreira).toEqual(estado().serieDCarreira);
  });

  it('nova carreira (em A/B/C) zera o mata-mata da Série D', () => {
    const clubeD = estado().todosClubes.find(c => c.divisao === 'Série D')!;
    estado().iniciarNovaCarreira(clubeD.id);
    jogarGrupoComUsuarioLider(clubeD.id);
    estado().iniciarMataMataDaCarreira();
    expect(estado().serieDCarreira).not.toBeNull();

    const clubeA = estado().todosClubes.find(c => c.divisao === 'Série A')!;
    estado().iniciarNovaCarreira(clubeA.id);
    expect(estado().serieDCarreira).toBeNull();
  });

  /** Leva o usuário da D até um estado terminal do mata-mata (campeão ou não). */
  function jogarAteFimMataMata(uid: string, vitorias: boolean) {
    jogarGrupoComUsuarioLider(uid);
    estado().iniciarMataMataDaCarreira();
    let guarda = 0;
    while (
      (estado().serieDCarreira!.fase === 'mata_mata' ||
        estado().serieDCarreira!.fase === 'playoff_acesso') &&
      guarda < 12
    ) {
      estado().avancarMataMataDaCarreira(vitorias);
      guarda += 1;
    }
  }

  it('campeão da Série D: fim de temporada promove o usuário à Série C', () => {
    const clubeD = estado().todosClubes.find(c => c.divisao === 'Série D')!;
    estado().iniciarNovaCarreira(clubeD.id);
    jogarAteFimMataMata(clubeD.id, true);
    expect(estado().serieDCarreira!.fase).toBe('campeao');
    const temporadaAntes = estado().temporadaAtual;

    estado().finalizarTemporada();

    expect(estado().temporadaAtual).toBe(String(Number(temporadaAntes) + 1));
    expect(estado().serieDCarreira).toBeNull();
    // Usuário subiu para a Série C: liga de 20 clubes.
    expect(
      estado().todosClubes.find(c => c.id === clubeD.id)?.divisao,
    ).toBe('Série C');
    expect(estado().clubes).toHaveLength(20);
    expect(estado().clubes.every(c => c.divisao === 'Série C')).toBe(true);
    expect(estado().clubes.some(c => c.id === clubeD.id)).toBe(true);
    // Histórico registra o usuário como campeão da Série D.
    expect(estado().historicoSerieD[0]?.campeao).toBe(clubeD.id);
  });

  it('eliminado na Série D: fim de temporada mantém o usuário na D (novo grupo)', () => {
    const clubeD = estado().todosClubes.find(c => c.divisao === 'Série D')!;
    estado().iniciarNovaCarreira(clubeD.id);
    jogarGrupoComUsuarioLider(clubeD.id);
    estado().iniciarMataMataDaCarreira();
    estado().avancarMataMataDaCarreira(false); // perde a 1ª chave → eliminado
    expect(estado().serieDCarreira!.fase).toBe('eliminado');
    expect(estado().serieDCarreira!.acessoConquistado).toBe(false);

    estado().finalizarTemporada();

    expect(estado().serieDCarreira).toBeNull();
    expect(estado().todosClubes.find(c => c.id === clubeD.id)?.divisao).toBe(
      'Série D',
    );
    // Nova temporada = novo grupo de 6 da Série D.
    expect(estado().clubes).toHaveLength(6);
    expect(estado().clubes.every(c => c.divisao === 'Série D')).toBe(true);
    expect(estado().clubes.some(c => c.id === clubeD.id)).toBe(true);
    expect(estado().copa).toBeNull();
  });
});
