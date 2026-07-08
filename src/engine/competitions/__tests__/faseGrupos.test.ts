import type {Partida} from '../../../types';
import {
  classificarGrupo,
  ordenarClassificacao,
  rankearClassificados,
  SERIE_D_2026,
} from '../index';
import type {ClassificacaoGrupo, LinhaClassificacao} from '../index';

function linha(
  clubeId: string,
  over: Partial<LinhaClassificacao> = {},
): LinhaClassificacao {
  return {
    clubeId,
    pontos: 0,
    jogos: 0,
    vitorias: 0,
    empates: 0,
    derrotas: 0,
    golsPro: 0,
    golsContra: 0,
    saldoGols: 0,
    cartoesAmarelos: 0,
    cartoesVermelhos: 0,
    ...over,
  };
}

function partida(
  timeCasa: string,
  timeFora: string,
  placarCasa: number,
  placarFora: number,
): Partida {
  return {
    id: `${timeCasa}_${timeFora}`,
    competicaoId: 't',
    rodada: 1,
    data: '2026-04-06',
    timeCasa,
    timeFora,
    placarCasa,
    placarFora,
    eventos: [],
    jogada: true,
    modoJogado: 'simulado',
  };
}

describe('classificarGrupo', () => {
  it('conta pontos, saldo e cartões a partir das partidas', () => {
    const grupo = {id: 'A', clubeIds: ['x', 'y']};
    const partidas: Partida[] = [
      {
        ...partida('x', 'y', 2, 0),
        eventos: [
          {minuto: 10, tipo: 'cartao_amarelo', timeId: 'y', jogadorId: '', descricao: ''},
          {minuto: 40, tipo: 'cartao_vermelho', timeId: 'y', jogadorId: '', descricao: ''},
        ],
      },
      partida('y', 'x', 1, 1),
    ];
    const {linhas} = classificarGrupo(grupo, partidas);
    const x = linhas.find(l => l.clubeId === 'x')!;
    const y = linhas.find(l => l.clubeId === 'y')!;
    expect(x.pontos).toBe(4); // vitória + empate
    expect(y.pontos).toBe(1);
    expect(x.saldoGols).toBe(2);
    expect(y.cartoesAmarelos).toBe(1);
    expect(y.cartoesVermelhos).toBe(1);
    expect(linhas[0].clubeId).toBe('x'); // líder
  });
});

describe('ordenarClassificacao (desempate CBF)', () => {
  it('bloco de 2: confronto direto decide', () => {
    // A e B empatados no primário; A venceu o confronto direto.
    const linhas = [
      linha('A', {pontos: 9, vitorias: 3, saldoGols: 2, golsPro: 5}),
      linha('B', {pontos: 9, vitorias: 3, saldoGols: 2, golsPro: 5}),
    ];
    const partidas = [partida('A', 'B', 1, 0)];
    const ordenada = ordenarClassificacao(linhas, partidas);
    expect(ordenada.map(l => l.clubeId)).toEqual(['A', 'B']);
  });

  it('bloco de 3+: pula confronto direto e usa cartões (vermelhos, depois amarelos)', () => {
    const linhas = [
      linha('X', {pontos: 9, vitorias: 3, saldoGols: 0, golsPro: 3, cartoesVermelhos: 0, cartoesAmarelos: 5}),
      linha('Y', {pontos: 9, vitorias: 3, saldoGols: 0, golsPro: 3, cartoesVermelhos: 0, cartoesAmarelos: 3}),
      linha('Z', {pontos: 9, vitorias: 3, saldoGols: 0, golsPro: 3, cartoesVermelhos: 1, cartoesAmarelos: 0}),
    ];
    const ordenada = ordenarClassificacao(linhas, []);
    expect(ordenada.map(l => l.clubeId)).toEqual(['Y', 'X', 'Z']);
  });

  it('respeita a ordem primária (pontos > saldo > gols pró)', () => {
    const linhas = [
      linha('C', {pontos: 6, saldoGols: 1, golsPro: 4}),
      linha('A', {pontos: 10, saldoGols: 0, golsPro: 2}),
      linha('B', {pontos: 6, saldoGols: 5, golsPro: 9}),
    ];
    const ordenada = ordenarClassificacao(linhas, []);
    expect(ordenada.map(l => l.clubeId)).toEqual(['A', 'B', 'C']);
  });

  it('empate total cai no sorteio semeado, de forma determinística', () => {
    const linhas = [linha('P'), linha('Q')];
    const a = ordenarClassificacao(linhas, [], 42);
    const b = ordenarClassificacao(linhas, [], 42);
    expect(a.map(l => l.clubeId)).toEqual(b.map(l => l.clubeId));
    expect(new Set(a.map(l => l.clubeId))).toEqual(new Set(['P', 'Q']));
  });
});

describe('rankearClassificados', () => {
  it('pega os N primeiros de cada grupo e ranqueia 1..total (líderes primeiro)', () => {
    const classificacoes: ClassificacaoGrupo[] = [
      {
        grupoId: 'A',
        linhas: [
          linha('a1', {pontos: 20}),
          linha('a2', {pontos: 18}),
          linha('a3', {pontos: 10}),
          linha('a4', {pontos: 9}),
          linha('a5', {pontos: 3}),
          linha('a6', {pontos: 1}),
        ],
      },
      {
        grupoId: 'B',
        linhas: [
          linha('b1', {pontos: 25}),
          linha('b2', {pontos: 12}),
          linha('b3', {pontos: 11}),
          linha('b4', {pontos: 8}),
          linha('b5', {pontos: 4}),
          linha('b6', {pontos: 2}),
        ],
      },
    ];
    const ranking = rankearClassificados(classificacoes, SERIE_D_2026);
    // 4 por grupo => 8 classificados; 5º/6º ficam de fora.
    expect(ranking).toHaveLength(8);
    expect(ranking.map(c => c.clubeId)).not.toContain('a5');
    // Seeds 1 e 2 devem ser líderes de grupo (posição 1).
    expect(ranking[0].posicao).toBe(1);
    expect(ranking[1].posicao).toBe(1);
    expect(ranking[0].seed).toBe(1);
    // b1 (25 pts) é o melhor líder => seed 1.
    expect(ranking[0].clubeId).toBe('b1');
  });
});
