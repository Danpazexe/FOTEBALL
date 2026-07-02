import type {Player, PlayerAttributes, Position} from '../../../types/player';
import type {Tatica} from '../../../types/club';
import {
  atualizarTabelaCore,
  calcularForcaTimeCore,
  simularPartidaCore,
  validarEscalacaoCore,
} from '../index';

const atributosBase = (nota: number): PlayerAttributes => ({
  finalizacao: nota,
  passe: nota,
  marcacao: nota,
  desarme: nota,
  velocidade: nota,
  resistencia: nota,
  forca: nota,
  reflexos: nota,
  posicionamento: nota,
  drible: nota,
  cabeceio: nota,
  cruzamento: nota,
});

const criarJogador = (
  id: string,
  posicaoPrincipal: Position,
  overall: number,
  clubeId = 'casa',
): Player => ({
  id,
  nome: `Jogador ${id}`,
  idade: 25,
  nacionalidade: 'Brasil',
  posicaoPrincipal,
  posicoesSecundarias: [],
  pernaDominante: 'D',
  atributos: atributosBase(overall),
  overall,
  potencial: overall,
  condicaoFisica: 90,
  moral: 70,
  forma: 70,
  valorMercado: overall * 100000,
  salario: overall * 1000,
  contratoAte: '2027-12-31',
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
});

const posicoesTitulares: Position[] = [
  'GOL',
  'LD',
  'ZAG',
  'ZAG',
  'LE',
  'VOL',
  'MC',
  'MEI',
  'PD',
  'PE',
  'CA',
];

const criarElenco = (prefixo: string, overall: number, clubeId: string): Player[] =>
  posicoesTitulares.map((posicao, index) =>
    criarJogador(`${prefixo}-${index + 1}`, posicao, overall, clubeId),
  );

const criarEscalacao = (jogadores: Player[]) => ({
  titulares: jogadores.map((jogador, index) => ({
    jogadorId: jogador.id,
    posicao: posicoesTitulares[index],
  })),
});

const taticaEquilibrada: Tatica = {
  estiloOfensivo: 'Equilibrado',
  marcacao: 'Zona',
  linhaDefensiva: 'Normal',
  ritmo: 'Normal',
};

describe('core inicial FOTEBALL', () => {
  it('valida uma escalação livre com 11 titulares e setores mínimos', () => {
    const jogadores = criarElenco('casa', 75, 'casa');
    const resultado = validarEscalacaoCore(criarEscalacao(jogadores), jogadores);

    expect(resultado.valido).toBe(true);
    expect(resultado.erros).toHaveLength(0);
  });

  it('bloqueia escalação com menos de 11 titulares', () => {
    const jogadores = criarElenco('casa', 75, 'casa');
    const escalacao = {
      titulares: criarEscalacao(jogadores).titulares.slice(0, 10),
    };
    const resultado = validarEscalacaoCore(escalacao, jogadores);

    expect(resultado.valido).toBe(false);
    expect(resultado.erros).toContain('A escalação precisa ter exatamente 11 titulares.');
  });

  it('bloqueia jogador duplicado na escalação', () => {
    const jogadores = criarElenco('casa', 75, 'casa');
    const escalacao = criarEscalacao(jogadores);
    escalacao.titulares[10] = {...escalacao.titulares[0], posicao: 'CA'};
    const resultado = validarEscalacaoCore(escalacao, jogadores);

    expect(resultado.valido).toBe(false);
    expect(resultado.erros).toContain('A escalação não pode ter jogador duplicado.');
  });

  it('calcula força maior para elenco tecnicamente superior', () => {
    const elencoForte = criarElenco('forte', 84, 'forte');
    const elencoFraco = criarElenco('fraco', 62, 'fraco');
    const forcaForte = calcularForcaTimeCore(
      elencoForte,
      criarEscalacao(elencoForte),
      taticaEquilibrada,
      true,
    );
    const forcaFraca = calcularForcaTimeCore(
      elencoFraco,
      criarEscalacao(elencoFraco),
      taticaEquilibrada,
      false,
    );

    expect(forcaForte.geral).toBeGreaterThan(forcaFraca.geral);
  });

  it('simula partida de forma determinística com a mesma seed', () => {
    const casa = criarElenco('casa', 78, 'casa');
    const fora = criarElenco('fora', 72, 'fora');
    const input = {
      jogoId: 'jogo-1',
      casa: {
        clubeId: 'casa',
        nome: 'Casa FC',
        jogadores: casa,
        escalacao: criarEscalacao(casa),
        tatica: taticaEquilibrada,
      },
      fora: {
        clubeId: 'fora',
        nome: 'Fora FC',
        jogadores: fora,
        escalacao: criarEscalacao(fora),
        tatica: taticaEquilibrada,
      },
      seed: 'rodada-1-casa-fora',
    };

    const resultado1 = simularPartidaCore(input);
    const resultado2 = simularPartidaCore(input);

    expect(resultado1).toEqual(resultado2);
    expect(resultado1.estatisticas.posseCasa + resultado1.estatisticas.posseFora).toBe(100);
    expect(resultado1.estatisticas.finalizacoesNoAlvoCasa).toBeLessThanOrEqual(
      resultado1.estatisticas.finalizacoesCasa,
    );
    expect(resultado1.estatisticas.finalizacoesNoAlvoFora).toBeLessThanOrEqual(
      resultado1.estatisticas.finalizacoesFora,
    );
  });

  it('atualiza e ordena tabela com critérios básicos', () => {
    const tabela = atualizarTabelaCore([], {
      casaId: 'a',
      foraId: 'b',
      golsCasa: 2,
      golsFora: 1,
    });

    expect(tabela[0]).toMatchObject({
      clubeId: 'a',
      jogos: 1,
      vitorias: 1,
      pontos: 3,
      saldoGols: 1,
    });
    expect(tabela[1]).toMatchObject({
      clubeId: 'b',
      jogos: 1,
      derrotas: 1,
      pontos: 0,
      saldoGols: -1,
    });
  });
});
