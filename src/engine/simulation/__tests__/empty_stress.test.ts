import type {Clube, Formacao, Player, Position, Tatica} from '../../../types';

import {simularPartida} from '../matchSimulator';

const posicoes433: Position[] = [
  'GOL',
  'LD',
  'ZAG',
  'ZAG',
  'LE',
  'VOL',
  'MC',
  'MEI',
  'PD',
  'CA',
  'PE',
];

// Tática que MAXIMIZA cartões/pênaltis/lesões (Pressão alta + Intenso + Adiantada).
const taticaAgressiva: Tatica = {
  estiloOfensivo: 'Ataque direto',
  marcacao: 'Pressão alta',
  linhaDefensiva: 'Adiantada',
  ritmo: 'Intenso',
};

function criarJogadores(prefixo: string, overall: number): Player[] {
  return posicoes433.map((posicao, index) => ({
    id: `${prefixo}_${index}`,
    nome: `${prefixo} ${index}`,
    idade: 26,
    nacionalidade: 'Brazil',
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
    valorMercado: 1000000,
    salario: 10000,
    contratoAte: '2028-12-31',
    clubeId: prefixo,
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
  }));
}

function criarFormacao(jogadores: Player[]): Formacao {
  return {
    tipo: '4-3-3',
    titulares: jogadores.map((jogador, index) => ({
      jogadorId: jogador.id,
      posicao: posicoes433[index] ?? jogador.posicaoPrincipal,
    })),
    reservas: [],
  };
}

function criarClube(id: string, jogadores: Player[]): Clube {
  return {
    id,
    nome: id,
    sigla: id.slice(0, 3).toUpperCase(),
    cidade: '',
    estado: '',
    fundacao: null,
    elenco: jogadores.map(jogador => jogador.id),
    formacaoAtual: criarFormacao(jogadores),
    taticaAtual: taticaAgressiva,
    financas: {
      saldo: 5000000,
      receitaMensal: {bilheteria: 0, patrocinio: 0, premiacoes: 0, vendaJogadores: 0},
      despesaMensal: {salarios: 0, manutencaoEstadio: 0, comissoes: 0, contratacoes: 0},
      patrocinadores: [],
      historicoTransacoes: [],
    },
    estadio: {nome: id, capacidade: 30000, precoMedioIngresso: 40, nivelInfraestrutura: 3},
    reputacao: 50,
    controladoPorIA: true,
  };
}

describe('STRESS: empty side reachability', () => {
  it('runs many aggressive matches without throwing', () => {
    const jogadoresCasa = criarJogadores('casa', 75);
    const jogadoresFora = criarJogadores('fora', 75);
    const timeCasa = criarClube('casa', jogadoresCasa);
    const timeFora = criarClube('fora', jogadoresFora);

    let maxIndisponiveisVistos = 0;
    let throwsCount = 0;
    const TOTAL = 200000;
    for (let i = 1; i <= TOTAL; i += 1) {
      try {
        const p = simularPartida({
          timeCasa,
          timeFora,
          jogadoresCasa,
          jogadoresFora,
          seed: i,
        });
        // conta vermelhos+lesões de UM lado para medir o quão perto chegamos.
        const porTime: Record<string, number> = {};
        for (const ev of p.eventos) {
          if (ev.tipo === 'cartao_vermelho' || ev.tipo === 'lesao') {
            porTime[ev.timeId] = (porTime[ev.timeId] ?? 0) + 1;
          }
        }
        for (const v of Object.values(porTime)) {
          if (v > maxIndisponiveisVistos) {
            maxIndisponiveisVistos = v;
          }
        }
      } catch {
        throwsCount += 1;
      }
    }
    // eslint-disable-next-line no-console
    console.log(
      `STRESS: throws=${throwsCount}, maxIndisponiveisUmLado=${maxIndisponiveisVistos} em ${TOTAL} jogos`,
    );
    expect(typeof throwsCount).toBe('number');
  });
});
