/**
 * Rodízio sugerido pré-jogo — casos de contrato: sem sugestões (todos prontos),
 * titular em risco, titular cansado (prontidão < limiar), sem substituto
 * disponível, ordenação por gravidade e reserva sugerida no máximo uma vez.
 * Os números físicos dos fixtures foram calibrados contra as derivações REAIS
 * do fisicoEngine (prontidao/nivelRisco) — nada é mockado.
 */
import {PRONTIDAO_CANSADO, sugerirRodizio} from '../rodizio';
import {nivelRisco, prontidao} from '../../physical/fisicoEngine';
import type {
  EstadoFisicoJogador,
  Player,
  Position,
  TitularFormacao,
} from '../../../types';

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

// Estados físicos calibrados contra o fisicoEngine real (ver asserts de sanidade).
const FISICO_PRONTO: EstadoFisicoJogador = {
  cargaAguda: 0,
  cargaCronica: 60,
  ritmo: 90,
};
const FISICO_CANSADO: EstadoFisicoJogador = {
  cargaAguda: 15,
  cargaCronica: 100,
  ritmo: 25,
};
const FISICO_RISCO: EstadoFisicoJogador = {
  cargaAguda: 80,
  cargaCronica: 60,
  ritmo: 50,
};

function pronto(id: string, posicao: Position, overall = 75): Player {
  return jogador(id, posicao, overall, {fisico: FISICO_PRONTO});
}

function cansado(id: string, posicao: Position, overall = 75): Player {
  return jogador(id, posicao, overall, {
    condicaoFisica: 60,
    fisico: FISICO_CANSADO,
  });
}

function emRisco(id: string, posicao: Position, overall = 75): Player {
  return jogador(id, posicao, overall, {
    condicaoFisica: 50,
    fisico: FISICO_RISCO,
  });
}

function slots(jogadores: Player[]): TitularFormacao[] {
  return jogadores.map(j => ({posicao: j.posicaoPrincipal, jogadorId: j.id}));
}

describe('sugerirRodizio', () => {
  it('fixtures batem com as derivações reais do fisicoEngine (sanidade)', () => {
    const ok = pronto('p', 'CA');
    const c = cansado('c', 'MC');
    const r = emRisco('r', 'CA');

    expect(prontidao(ok)).toBeGreaterThanOrEqual(PRONTIDAO_CANSADO);
    expect(nivelRisco(ok)).toBe('baixo');

    expect(prontidao(c)).toBeLessThan(PRONTIDAO_CANSADO);
    expect(nivelRisco(c)).toBe('moderado'); // cansado ≠ risco alto

    expect(['elevado', 'muito_elevado']).toContain(nivelRisco(r));
  });

  it('não sugere nada quando todos os titulares estão prontos', () => {
    const titulares = [pronto('g1', 'GOL'), pronto('z1', 'ZAG'), pronto('a1', 'CA')];
    const banco = [pronto('b1', 'CA')];

    expect(
      sugerirRodizio(slots(titulares), ['b1'], [...titulares, ...banco]),
    ).toEqual([]);
  });

  it('aponta titular em risco e sugere o melhor substituto apto do mesmo grupo', () => {
    const titular = emRisco('ca1', 'CA');
    // Dois atacantes aptos no banco: o de MAIOR overall vence ('sa2').
    const sa1 = pronto('sa1', 'SA', 70);
    const sa2 = pronto('sa2', 'SA', 80);
    const meia = pronto('mc1', 'MC', 90); // grupo errado, overall alto — ignorado

    const sugestoes = sugerirRodizio(
      slots([titular]),
      ['sa1', 'sa2', 'mc1'],
      [titular, sa1, sa2, meia],
    );

    expect(sugestoes).toEqual([
      {titularId: 'ca1', motivo: 'risco', substitutoId: 'sa2'},
    ]);
  });

  it('aponta titular cansado (prontidão abaixo do limiar) com motivo "cansado"', () => {
    const titular = cansado('mc1', 'MC');
    const reserva = pronto('mc2', 'MC');

    const sugestoes = sugerirRodizio(
      slots([titular]),
      ['mc2'],
      [titular, reserva],
    );

    expect(sugestoes).toEqual([
      {titularId: 'mc1', motivo: 'cansado', substitutoId: 'mc2'},
    ]);
  });

  it('mantém o aviso sem substituto quando o banco não tem opção apta no grupo', () => {
    const titular = emRisco('ca1', 'CA');
    const goleiro = pronto('g2', 'GOL'); // grupo errado
    const machucado = pronto('ca2', 'CA'); // mesmo grupo, mas lesionado
    machucado.lesionado = true;
    machucado.diasLesao = 10;

    const sugestoes = sugerirRodizio(
      slots([titular]),
      ['g2', 'ca2'],
      [titular, goleiro, machucado],
    );

    expect(sugestoes).toEqual([{titularId: 'ca1', motivo: 'risco'}]);
  });

  it('ordena risco antes de cansado e não sugere a mesma reserva duas vezes', () => {
    // Na escalação o cansado vem ANTES do em-risco; a saída inverte (gravidade).
    const saCansado = cansado('sa1', 'SA');
    const caRisco = emRisco('ca1', 'CA');
    const unicaReserva = pronto('ca2', 'CA');

    const sugestoes = sugerirRodizio(
      slots([saCansado, caRisco]),
      ['ca2'],
      [saCansado, caRisco, unicaReserva],
    );

    expect(sugestoes).toEqual([
      {titularId: 'ca1', motivo: 'risco', substitutoId: 'ca2'},
      {titularId: 'sa1', motivo: 'cansado'},
    ]);
  });
});
