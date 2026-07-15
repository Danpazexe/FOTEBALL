import type {Clube, Partida, Player, TabelaClassificacao} from '../../types';

import {gerarFeedNoticias} from '../gerarNoticias';
import type {EntradaFeedNoticias} from '../tipos';

// ---------------------------------------------------------------------------
// Fixtures manuais (mínimos, sem depender do seed real).
// ---------------------------------------------------------------------------

function clube(id: string, nome: string, over: Partial<Clube> = {}): Clube {
  return {
    id,
    nome,
    sigla: id.toUpperCase().slice(0, 3),
    cidade: 'Cidade',
    estado: 'SP',
    elenco: [],
    formacaoAtual: null,
    taticaAtual: null,
    financas: {
      saldo: 0,
      receitaMensal: {bilheteria: 0, patrocinio: 0, premiacoes: 0, vendaJogadores: 0},
      despesaMensal: {salarios: 0, manutencaoEstadio: 0, comissoes: 0, contratacoes: 0},
      patrocinadores: [],
      historicoTransacoes: [],
    },
    estadio: {nome: 'Estádio', capacidade: 10000, precoMedioIngresso: 20, nivelInfraestrutura: 3},
    reputacao: 50,
    controladoPorIA: false,
    ...over,
  };
}

function jogador(id: string, clubeId: string, over: Partial<Player> = {}): Player {
  return {
    id,
    nome: `Jogador ${id}`,
    idade: 25,
    nacionalidade: 'Brasil',
    posicaoPrincipal: 'CA',
    posicoesSecundarias: [],
    pernaDominante: 'D',
    atributos: {
      finalizacao: 70,
      passe: 70,
      marcacao: 50,
      desarme: 50,
      velocidade: 70,
      resistencia: 70,
      forca: 70,
      reflexos: 40,
      posicionamento: 70,
      drible: 70,
      cabeceio: 60,
      cruzamento: 60,
    },
    overall: 70,
    potencial: 75,
    condicaoFisica: 100,
    moral: 70,
    forma: 70,
    valorMercado: 1000000,
    salario: 10000,
    contratoAte: '2028',
    clubeId,
    lesionado: false,
    diasLesao: 0,
    suspenso: false,
    jogosSuspensao: 0,
    estatisticasTemporada: {
      temporada: '2026',
      jogos: 0,
      gols: 0,
      assistencias: 0,
      cartoesAmarelos: 0,
      cartoesVermelhos: 0,
      notaMedia: 0,
    },
    historicoTemporadas: [],
    ...over,
  };
}

function partida(
  id: string,
  rodada: number,
  casa: string,
  fora: string,
  pc: number,
  pf: number,
  over: Partial<Partida> = {},
): Partida {
  return {
    id,
    competicaoId: 'brasileirao',
    rodada,
    data: `2026-01-${String(rodada).padStart(2, '0')}`,
    timeCasa: casa,
    timeFora: fora,
    placarCasa: pc,
    placarFora: pf,
    eventos: [],
    jogada: true,
    modoJogado: 'simulado',
    ...over,
  };
}

function tabelaLinha(clubeId: string, pontos: number): TabelaClassificacao {
  return {
    clubeId,
    pontos,
    jogos: 0,
    vitorias: 0,
    empates: 0,
    derrotas: 0,
    golsPro: 0,
    golsContra: 0,
    saldoGols: 0,
  };
}

const USER = 'user';
const ADV = 'adv';

function entradaBase(over: Partial<EntradaFeedNoticias> = {}): EntradaFeedNoticias {
  return {
    clubeId: USER,
    clube: clube(USER, 'Meu Time'),
    clubes: [clube(USER, 'Meu Time'), clube(ADV, 'Rival FC')],
    jogadores: [],
    partidas: [],
    tabela: [tabelaLinha(USER, 0)],
    rodadaAtual: 1,
    proximoJogo: null,
    divisao: 'Série A',
    ...over,
  };
}

// ---------------------------------------------------------------------------

describe('gerarFeedNoticias', () => {
  it('é determinística (duas chamadas ⇒ resultado igual)', () => {
    const entrada = entradaBase({
      partidas: [partida('p1', 1, USER, ADV, 2, 0)],
      proximoJogo: partida('p2', 2, ADV, USER, 0, 0, {jogada: false, placarCasa: undefined, placarFora: undefined}),
      jogadores: [jogador('j1', USER, {estatisticasTemporada: {temporada: '2026', jogos: 1, gols: 3, assistencias: 0, cartoesAmarelos: 0, cartoesVermelhos: 0, notaMedia: 7}})],
    });
    expect(gerarFeedNoticias(entrada)).toEqual(gerarFeedNoticias(entrada));
  });

  it('entrada vazia ⇒ sem crash, destaque null, notícia só de posição real', () => {
    const feed = gerarFeedNoticias(entradaBase());
    expect(feed.destaque).toBeNull();
    // Sem partidas/jogadores/transações. Só a posição na tabela mínima é real.
    expect(feed.noticias.every(n => n.id === 'pos')).toBe(true);
    expect(feed.noticias.find(n => n.id === 'pos')?.selo).toBe('1º');
  });

  it('próximo jogo vira destaque proximo_jogo com forma e ehCasa corretos', () => {
    const partidas = [
      partida('p1', 1, USER, ADV, 2, 0), // V (casa)
      partida('p2', 2, ADV, USER, 3, 1), // D (fora)
      partida('p3', 3, USER, ADV, 1, 1), // E (casa)
    ];
    const prox = partida('p4', 4, USER, ADV, 0, 0, {jogada: false, placarCasa: undefined, placarFora: undefined});
    const feed = gerarFeedNoticias(entradaBase({partidas, proximoJogo: prox}));

    expect(feed.destaque).not.toBeNull();
    const d = feed.destaque!;
    expect(d.tipo).toBe('proximo_jogo');
    expect(d.titulo).toBe('Próximo desafio: Rival FC');
    expect(d.ehCasa).toBe(true);
    expect(d.rodada).toBe(4);
    expect(d.formaUsuario).toEqual(['V', 'D', 'E']);
    expect(d.acao).toEqual({tipo: 'prejogo'});
  });

  it('sem próximo jogo mas com resultado ⇒ destaque ultimo_resultado', () => {
    const partidas = [partida('p1', 1, USER, ADV, 2, 0)];
    const feed = gerarFeedNoticias(entradaBase({partidas, proximoJogo: null}));
    expect(feed.destaque?.tipo).toBe('ultimo_resultado');
    expect(feed.destaque?.acao).toEqual({tipo: 'partida', partidaId: 'p1'});
    expect(feed.destaque?.formaUsuario).toEqual(['V']);
  });

  it('fora de casa: ehCasa=false e subtítulo "fora"', () => {
    const prox = partida('p1', 5, ADV, USER, 0, 0, {jogada: false, placarCasa: undefined, placarFora: undefined});
    const feed = gerarFeedNoticias(entradaBase({proximoJogo: prox}));
    expect(feed.destaque?.ehCasa).toBe(false);
    expect(feed.destaque?.subtitulo).toBe('Rodada 5 · fora');
  });

  it('3 vitórias seguidas ⇒ UMA notícia de sequência de vitórias', () => {
    const partidas = [
      partida('p1', 1, USER, ADV, 1, 0),
      partida('p2', 2, ADV, USER, 0, 1),
      partida('p3', 3, USER, ADV, 2, 0),
    ];
    const feed = gerarFeedNoticias(entradaBase({partidas}));
    const seqs = feed.noticias.filter(n => n.id === 'seq');
    expect(seqs).toHaveLength(1);
    expect(seqs[0].titulo).toBe('Embalados: 3 vitórias seguidas');
    expect(seqs[0].selo).toBe('×3');
    expect(seqs[0].tom).toBe('success');
  });

  it('sequência conta a série COMPLETA, não só os últimos 5', () => {
    // 7 vitórias seguidas: o contador não pode saturar na janela de 5 do destaque.
    const partidas = Array.from({length: 7}, (_, i) =>
      partida(`p${i + 1}`, i + 1, USER, ADV, 2, 0),
    );
    const feed = gerarFeedNoticias(entradaBase({partidas}));
    const seq = feed.noticias.find(n => n.id === 'seq');
    expect(seq?.titulo).toBe('Embalados: 7 vitórias seguidas');
    expect(seq?.selo).toBe('×7');
    // O destaque (forma) permanece com no máximo 5.
    expect(feed.destaque?.formaUsuario.length).toBeLessThanOrEqual(5);
  });

  it('invicto ≥4 (sem 3 vitórias) ⇒ notícia INVICTO', () => {
    const partidas = [
      partida('p1', 1, USER, ADV, 1, 1), // E
      partida('p2', 2, ADV, USER, 0, 1), // V
      partida('p3', 3, USER, ADV, 2, 2), // E
      partida('p4', 4, ADV, USER, 0, 1), // V
    ];
    const feed = gerarFeedNoticias(entradaBase({partidas}));
    const seq = feed.noticias.find(n => n.id === 'seq');
    expect(seq?.titulo).toBe('Invicto há 4 jogos');
    expect(seq?.selo).toBe('INVICTO');
  });

  it('3 derrotas seguidas ⇒ notícia de fase ruim', () => {
    const partidas = [
      partida('p1', 1, USER, ADV, 0, 1),
      partida('p2', 2, ADV, USER, 2, 0),
      partida('p3', 3, USER, ADV, 0, 3),
    ];
    const feed = gerarFeedNoticias(entradaBase({partidas}));
    const seq = feed.noticias.find(n => n.id === 'seq');
    expect(seq?.titulo).toBe('Fase ruim: 3 derrotas seguidas');
    expect(seq?.tom).toBe('danger');
  });

  it('resultado vira notícia com selo X-Y, tom por resultado e ação/adversário certos', () => {
    const partidas = [partida('p1', 7, USER, ADV, 3, 1)];
    const feed = gerarFeedNoticias(entradaBase({partidas}));
    const res = feed.noticias.find(n => n.id === 'res_p1');
    expect(res).toBeDefined();
    expect(res!.titulo).toBe('Vitória sobre o Rival FC por 3 a 1');
    expect(res!.subtitulo).toBe('Rodada 7 · em casa');
    expect(res!.selo).toBe('3-1');
    expect(res!.tom).toBe('success');
    expect(res!.clubeId).toBe(ADV);
    expect(res!.acao).toEqual({tipo: 'partida', partidaId: 'p1'});
  });

  it('derrota fora: placar na ótica do clube e tom danger', () => {
    const partidas = [partida('p1', 1, ADV, USER, 4, 2)];
    const feed = gerarFeedNoticias(entradaBase({partidas}));
    const res = feed.noticias.find(n => n.id === 'res_p1');
    expect(res!.titulo).toBe('Derrota para o Rival FC por 2 a 4');
    expect(res!.selo).toBe('2-4');
    expect(res!.tom).toBe('danger');
  });

  it('resultado por pênaltis usa frase "nos pênaltis" e placar mantido no selo', () => {
    const partidas = [partida('p1', 1, USER, ADV, 1, 1, {vencedorPenaltis: USER})];
    const feed = gerarFeedNoticias(entradaBase({partidas}));
    const res = feed.noticias.find(n => n.id === 'res_p1');
    expect(res!.titulo).toBe('Vitória sobre o Rival FC nos pênaltis');
    expect(res!.selo).toBe('1-1');
    expect(res!.tom).toBe('success');
  });

  it('mais recente tem peso maior entre resultados', () => {
    const partidas = [
      partida('p1', 1, USER, ADV, 1, 0),
      partida('p2', 2, USER, ADV, 2, 0),
    ];
    const feed = gerarFeedNoticias(entradaBase({partidas}));
    const r1 = feed.noticias.find(n => n.id === 'res_p1')!;
    const r2 = feed.noticias.find(n => n.id === 'res_p2')!;
    expect(r2.peso).toBeGreaterThan(r1.peso);
  });

  it('posição: clube em índice 2 ⇒ selo 3º e zona meio de tabela', () => {
    const tabela = [
      tabelaLinha('a', 30),
      tabelaLinha('b', 28),
      tabelaLinha(USER, 20),
      tabelaLinha('c', 18),
      tabelaLinha('d', 16),
      tabelaLinha('e', 14),
      tabelaLinha('f', 12),
      tabelaLinha('g', 10),
    ];
    const feed = gerarFeedNoticias(entradaBase({tabela}));
    const pos = feed.noticias.find(n => n.id === 'pos')!;
    expect(pos.selo).toBe('3º');
    expect(pos.subtitulo).toBe('Zona de Libertadores');
    expect(pos.tom).toBe('success');
    expect(pos.titulo).toBe('Meu Time em 3º lugar');
  });

  it('posição de meio de tabela ⇒ textSecondary', () => {
    // 12 times: top4 = 1..4, rebaixamento = >= length-3 = 9. USER em 7º = meio.
    const tabela = [
      tabelaLinha('a', 30),
      tabelaLinha('b', 28),
      tabelaLinha('c', 26),
      tabelaLinha('d', 24),
      tabelaLinha('e', 22),
      tabelaLinha('f', 21),
      tabelaLinha(USER, 20), // 7º de 12
      tabelaLinha('g', 18),
      tabelaLinha('h', 16),
      tabelaLinha('i', 14),
      tabelaLinha('j', 12),
      tabelaLinha('k', 10),
    ];
    const feed = gerarFeedNoticias(entradaBase({tabela}));
    const pos = feed.noticias.find(n => n.id === 'pos')!;
    expect(pos.subtitulo).toBe('Meio da tabela');
    expect(pos.tom).toBe('textSecondary');
  });

  it('posição na zona de rebaixamento ⇒ danger (fora da Série D)', () => {
    const tabela = [
      tabelaLinha('a', 30),
      tabelaLinha('b', 28),
      tabelaLinha('c', 26),
      tabelaLinha('d', 24),
      tabelaLinha('e', 22),
      tabelaLinha(USER, 8), // 6º de 8: >= length-3 (=5)
      tabelaLinha('f', 6),
      tabelaLinha('g', 4),
    ];
    const feed = gerarFeedNoticias(entradaBase({tabela}));
    const pos = feed.noticias.find(n => n.id === 'pos')!;
    expect(pos.subtitulo).toBe('Zona de rebaixamento');
    expect(pos.tom).toBe('danger');
  });

  it('Série D não tem zona de rebaixamento', () => {
    const tabela = [
      tabelaLinha('a', 30),
      tabelaLinha('b', 28),
      tabelaLinha('c', 26),
      tabelaLinha('d', 24),
      tabelaLinha('e', 22),
      tabelaLinha(USER, 8),
      tabelaLinha('f', 6),
      tabelaLinha('g', 4),
    ];
    const feed = gerarFeedNoticias(entradaBase({tabela, divisao: 'Série D'}));
    const pos = feed.noticias.find(n => n.id === 'pos')!;
    expect(pos.subtitulo).toBe('Meio da tabela');
  });

  it('clube fora da tabela ⇒ sem notícia de posição', () => {
    const feed = gerarFeedNoticias(entradaBase({tabela: [tabelaLinha('outro', 10)]}));
    expect(feed.noticias.find(n => n.id === 'pos')).toBeUndefined();
  });

  it('artilheiro: escolhe o de mais gols do clube; ação elenco e selo com gols', () => {
    const jogadores = [
      jogador('j1', USER, {apelido: 'Camisa 9', estatisticasTemporada: {temporada: '2026', jogos: 5, gols: 7, assistencias: 1, cartoesAmarelos: 0, cartoesVermelhos: 0, notaMedia: 7}}),
      jogador('j2', USER, {estatisticasTemporada: {temporada: '2026', jogos: 5, gols: 3, assistencias: 0, cartoesAmarelos: 0, cartoesVermelhos: 0, notaMedia: 6}}),
      // Jogador de OUTRO clube com mais gols — não deve vazar.
      jogador('jX', ADV, {estatisticasTemporada: {temporada: '2026', jogos: 5, gols: 20, assistencias: 0, cartoesAmarelos: 0, cartoesVermelhos: 0, notaMedia: 8}}),
    ];
    const feed = gerarFeedNoticias(entradaBase({jogadores}));
    const art = feed.noticias.find(n => n.categoria === 'clube' && n.icone === 'estrela')!;
    expect(art.titulo).toBe('Camisa 9 é o artilheiro do time');
    expect(art.subtitulo).toBe('7 gols na temporada');
    expect(art.selo).toBe('7');
    expect(art.jogadorId).toBe('j1');
    expect(art.acao).toEqual({tipo: 'elenco'});
  });

  it('sem gols no elenco ⇒ sem notícia de artilheiro', () => {
    const jogadores = [jogador('j1', USER), jogador('j2', USER)];
    const feed = gerarFeedNoticias(entradaBase({jogadores}));
    expect(feed.noticias.find(n => n.icone === 'estrela')).toBeUndefined();
  });

  it('lesão vira notícia de clube com jogadorId, ícone e ação médico', () => {
    const jogadores = [jogador('j1', USER, {nome: 'Fulano', lesionado: true, diasLesao: 14})];
    const feed = gerarFeedNoticias(entradaBase({jogadores}));
    const les = feed.noticias.find(n => n.id === 'les_j1')!;
    expect(les.categoria).toBe('clube');
    expect(les.titulo).toBe('Fulano no departamento médico');
    expect(les.subtitulo).toBe('Lesionado · 14 dias de recuperação');
    expect(les.icone).toBe('lesao');
    expect(les.tom).toBe('danger');
    expect(les.jogadorId).toBe('j1');
    expect(les.acao).toEqual({tipo: 'medico'});
  });

  it('suspensão vira notícia de clube com ícone cartao e warning', () => {
    const jogadores = [jogador('j1', USER, {nome: 'Beltrano', suspenso: true, jogosSuspensao: 1})];
    const feed = gerarFeedNoticias(entradaBase({jogadores}));
    const sus = feed.noticias.find(n => n.id === 'sus_j1')!;
    expect(sus.titulo).toBe('Beltrano suspenso');
    expect(sus.subtitulo).toBe('1 jogo de suspensão');
    expect(sus.icone).toBe('cartao');
    expect(sus.tom).toBe('warning');
    expect(sus.categoria).toBe('clube');
  });

  it('mercado: contratações e vendas viram notícias brand com descrição', () => {
    const meuClube = clube(USER, 'Meu Time', {
      financas: {
        saldo: 0,
        receitaMensal: {bilheteria: 0, patrocinio: 0, premiacoes: 0, vendaJogadores: 0},
        despesaMensal: {salarios: 0, manutencaoEstadio: 0, comissoes: 0, contratacoes: 0},
        patrocinadores: [],
        historicoTransacoes: [
          {data: '2026-01-01', tipo: 'despesa', categoria: 'salarios', valor: 100, descricao: 'Folha'},
          {data: '2026-01-02', tipo: 'despesa', categoria: 'contratacoes', valor: 5000, descricao: 'Contratação de Craque'},
          {data: '2026-01-03', tipo: 'receita', categoria: 'vendaJogadores', valor: 8000, descricao: 'Venda de Zagueiro'},
        ],
      },
    });
    const feed = gerarFeedNoticias(entradaBase({clube: meuClube}));
    const mkt = feed.noticias.filter(n => n.categoria === 'mercado');
    expect(mkt).toHaveLength(2);
    const contratacao = mkt.find(n => n.titulo === 'Reforço confirmado')!;
    expect(contratacao.subtitulo).toBe('Contratação de Craque');
    expect(contratacao.tom).toBe('brand');
    expect(contratacao.selo).toBeUndefined(); // não inventa valor
    const venda = mkt.find(n => n.titulo === 'Negócio fechado')!;
    expect(venda.subtitulo).toBe('Venda de Zagueiro');
  });

  it('não vaza dados de outros clubes (partidas, lesões, mercado)', () => {
    const partidas = [
      partida('pu', 1, USER, ADV, 1, 0),
      partida('pO', 1, ADV, 'terceiro', 5, 0), // jogo entre outros
    ];
    const jogadores = [
      jogador('j1', USER, {estatisticasTemporada: {temporada: '2026', jogos: 1, gols: 2, assistencias: 0, cartoesAmarelos: 0, cartoesVermelhos: 0, notaMedia: 7}}),
      jogador('jAdv', ADV, {lesionado: true, diasLesao: 30}),
    ];
    const feed = gerarFeedNoticias(entradaBase({partidas, jogadores}));
    expect(feed.noticias.find(n => n.id === 'res_pO')).toBeUndefined();
    expect(feed.noticias.find(n => n.id === 'les_jAdv')).toBeUndefined();
    expect(feed.noticias.find(n => n.id === 'res_pu')).toBeDefined();
  });

  it('feed ordenado por peso decrescente', () => {
    const partidas = [
      partida('p1', 1, USER, ADV, 1, 0),
      partida('p2', 2, USER, ADV, 2, 0),
      partida('p3', 3, USER, ADV, 3, 0),
    ];
    const feed = gerarFeedNoticias(entradaBase({partidas}));
    for (let i = 1; i < feed.noticias.length; i++) {
      expect(feed.noticias[i - 1].peso).toBeGreaterThanOrEqual(feed.noticias[i].peso);
    }
  });
});
