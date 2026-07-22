/**
 * Regras do painel de escalação em jogo: significado do gesto origem→alvo,
 * validação de substituição, proteção do gol na troca de posições e ranking
 * de quem pode entrar (encaixe → overall).
 */
import {
  jogadorParaTrocaDePosicao,
  ordenarCandidatosTroca,
  podeSubstituir,
  resolverAcao,
} from '../acoes';
import type {Formacao, Player, Position} from '../../../../types';

function jogador(
  id: string,
  posicao: Position,
  overall: number,
  extra: Partial<Player> = {},
): Player {
  return {
    id,
    nome: `Jogador ${id}`,
    idade: 25,
    nacionalidade: 'Brasil',
    posicaoPrincipal: posicao,
    posicoesSecundarias: [],
    pernaDominante: 'D',
    atributos: {
      finalizacao: overall,
      passe: overall,
      marcacao: overall,
      desarme: overall,
      velocidade: overall,
      resistencia: overall,
      forca: overall,
      reflexos: overall,
      posicionamento: overall,
      drible: overall,
      cabeceio: overall,
      cruzamento: overall,
    },
    overall,
    potencial: overall,
    condicaoFisica: 100,
    moral: 70,
    forma: 0,
    valorMercado: 1_000_000,
    salario: 10_000,
    contratoAte: '2028-12-31',
    clubeId: 'clube',
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
    ...extra,
  };
}

/** GOL (slot 0), ZAG (1) e CA (2); z2 é um goleiro escalado na ZAG do slot 1. */
function cenario(comGoleiroNaLinha = false) {
  const goleiro = jogador('g1', 'GOL', 80);
  const zagueiro = comGoleiroNaLinha
    ? jogador('z1', 'GOL', 75)
    : jogador('z1', 'ZAG', 75);
  const atacante = jogador('a1', 'CA', 82);
  const formacao: Formacao = {
    tipo: '4-4-2',
    titulares: [
      {posicao: 'GOL', jogadorId: 'g1'},
      {posicao: 'ZAG', jogadorId: 'z1'},
      {posicao: 'CA', jogadorId: 'a1'},
    ],
    reservas: [],
  };
  const reserva = jogador('r1', 'CA', 70);
  const lesionado = jogador('r2', 'CA', 88, {lesionado: true});
  const suspenso = jogador('r3', 'CA', 86, {suspenso: true});
  const porId = new Map(
    [goleiro, zagueiro, atacante, reserva, lesionado, suspenso].map(j => [
      j.id,
      j,
    ]),
  );
  return {formacao, porId, reserva, lesionado, suspenso};
}

describe('resolverAcao', () => {
  it('reserva → titular substitui no slot do alvo', () => {
    expect(
      resolverAcao({tipo: 'reserva', valor: 'r1'}, {tipo: 'titular', valor: '2'}),
    ).toEqual({tipo: 'substituicao', slotIndex: 2, entranteId: 'r1'});
  });

  it('titular → reserva substitui no slot da origem', () => {
    expect(
      resolverAcao({tipo: 'titular', valor: '1'}, {tipo: 'reserva', valor: 'r1'}),
    ).toEqual({tipo: 'substituicao', slotIndex: 1, entranteId: 'r1'});
  });

  it('titular → titular troca as posições', () => {
    expect(
      resolverAcao({tipo: 'titular', valor: '1'}, {tipo: 'titular', valor: '2'}),
    ).toEqual({tipo: 'trocaPosicoes', slotA: 1, slotB: 2});
  });

  it('mesmo alvo e reserva → reserva não fazem nada', () => {
    expect(
      resolverAcao({tipo: 'titular', valor: '1'}, {tipo: 'titular', valor: '1'}),
    ).toEqual({tipo: 'nenhuma'});
    expect(
      resolverAcao({tipo: 'reserva', valor: 'r1'}, {tipo: 'reserva', valor: 'r2'}),
    ).toEqual({tipo: 'nenhuma'});
  });
});

describe('podeSubstituir', () => {
  it('aprova reserva apto entrando num slot ocupado', () => {
    const {formacao, porId} = cenario();
    expect(podeSubstituir(formacao, porId, false, 2, 'r1')).toBe(true);
  });

  it('bloqueia sem substituições restantes', () => {
    const {formacao, porId} = cenario();
    expect(podeSubstituir(formacao, porId, true, 2, 'r1')).toBe(false);
  });

  it('bloqueia slot inexistente e entrada do próprio titular', () => {
    const {formacao, porId} = cenario();
    expect(podeSubstituir(formacao, porId, false, 9, 'r1')).toBe(false);
    expect(podeSubstituir(formacao, porId, false, 2, 'a1')).toBe(false);
  });

  it('bloqueia entrante lesionado, suspenso ou fora do elenco', () => {
    const {formacao, porId} = cenario();
    expect(podeSubstituir(formacao, porId, false, 2, 'r2')).toBe(false);
    expect(podeSubstituir(formacao, porId, false, 2, 'r3')).toBe(false);
    expect(podeSubstituir(formacao, porId, false, 2, 'fantasma')).toBe(false);
  });
});

describe('jogadorParaTrocaDePosicao', () => {
  it('troca entre jogadores de linha retorna o jogador do slot B', () => {
    const {formacao, porId} = cenario();
    expect(jogadorParaTrocaDePosicao(formacao, porId, 1, 2)).toBe('a1');
  });

  it('não troca um slot com ele mesmo', () => {
    const {formacao, porId} = cenario();
    expect(jogadorParaTrocaDePosicao(formacao, porId, 1, 1)).toBeNull();
  });

  it('protege o gol: jogador de linha não assume o slot GOL', () => {
    const {formacao, porId} = cenario();
    expect(jogadorParaTrocaDePosicao(formacao, porId, 0, 1)).toBeNull();
    expect(jogadorParaTrocaDePosicao(formacao, porId, 2, 0)).toBeNull();
  });

  it('permite mexer no slot GOL entre dois goleiros', () => {
    const {formacao, porId} = cenario(true);
    expect(jogadorParaTrocaDePosicao(formacao, porId, 0, 1)).toBe('z1');
  });
});

describe('ordenarCandidatosTroca', () => {
  it('filtra lesionados/suspensos e ordena por encaixe e depois overall', () => {
    const banco = [
      jogador('meia', 'MC', 90),
      jogador('ca-fraco', 'CA', 70),
      jogador('ca-forte', 'CA', 82),
      jogador('machucado', 'CA', 95, {lesionado: true}),
      jogador('preso', 'CA', 94, {suspenso: true}),
    ];

    const candidatos = ordenarCandidatosTroca(banco, 'CA');

    expect(candidatos.map(c => c.jogador.id)).toEqual([
      'ca-forte',
      'ca-fraco',
      'meia',
    ]);
    expect(candidatos[0].adaptacao.nivel).toBe('natural');
    expect(candidatos[2].adaptacao.nivel).not.toBe('natural');
  });
});
