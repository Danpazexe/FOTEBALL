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
