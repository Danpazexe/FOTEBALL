import type {Clube, Partida, Player} from '../types';

/**
 * Fábricas de fixtures para testes (fora de __tests__ para não virar suíte).
 * Preenchem defaults válidos; passe um `parcial` para sobrescrever o necessário.
 */

export function criarPlayer(parcial: Partial<Player> & {id: string}): Player {
  return {
    nome: `Jogador ${parcial.id}`,
    idade: 25,
    nacionalidade: 'Brasil',
    posicaoPrincipal: 'MC',
    posicoesSecundarias: [],
    pernaDominante: 'D',
    atributos: {
      finalizacao: 70,
      passe: 70,
      marcacao: 70,
      desarme: 70,
      velocidade: 70,
      resistencia: 70,
      forca: 70,
      reflexos: 70,
      posicionamento: 70,
      drible: 70,
      cabeceio: 70,
      cruzamento: 70,
    },
    overall: 75,
    potencial: 80,
    condicaoFisica: 100,
    moral: 60,
    forma: 0,
    valorMercado: 1_000_000,
    salario: 10_000,
    contratoAte: '2030',
    clubeId: 'time',
    lesionado: false,
    diasLesao: 0,
    suspenso: false,
    jogosSuspensao: 0,
    amarelosParaSuspensao: 0,
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
    ...parcial,
  };
}

export function criarPartida(parcial: Partial<Partida> & {id: string}): Partida {
  return {
    competicaoId: 'brasileirao_2026',
    rodada: 1,
    data: '2026-04-01',
    timeCasa: 'casa',
    timeFora: 'fora',
    placarCasa: 0,
    placarFora: 0,
    eventos: [],
    jogada: true,
    modoJogado: 'simulado',
    ...parcial,
  };
}

export function criarClube(parcial: Partial<Clube> & {id: string}): Clube {
  return {
    nome: parcial.id,
    sigla: 'XYZ',
    cidade: '',
    estado: '',
    fundacao: null,
    elenco: [],
    formacaoAtual: null,
    taticaAtual: null,
    financas: {
      saldo: 5_000_000,
      receitaMensal: {
        bilheteria: 0,
        patrocinio: 0,
        premiacoes: 0,
        vendaJogadores: 0,
      },
      despesaMensal: {
        salarios: 0,
        manutencaoEstadio: 0,
        comissoes: 0,
        contratacoes: 0,
      },
      historicoTransacoes: [],
    },
    estadio: {
      nome: 'Estádio',
      capacidade: 30000,
      precoMedioIngresso: 40,
      nivelInfraestrutura: 3,
    },
    reputacao: 50,
    controladoPorIA: true,
    ...parcial,
  };
}
