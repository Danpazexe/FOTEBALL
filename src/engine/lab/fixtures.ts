/**
 * Fábricas de elencos/clubes SINTÉTICOS para o laboratório de simulação.
 * Espelham as fábricas do matchBalance.test.ts (fonte da calibração), mas vivem
 * fora de __tests__ para o laboratório poder ser reutilizado por qualquer
 * suíte/relatório sem duplicação. PURAS e determinísticas.
 */
import type {Clube, Formacao, Player, Position, Tatica} from '../../types';

export const POSICOES_LAB: Position[] = [
  'GOL', 'LD', 'ZAG', 'ZAG', 'LE', 'VOL', 'MC', 'MEI', 'PD', 'CA', 'PE',
];

export const TATICA_NEUTRA_LAB: Tatica = {
  estiloOfensivo: 'Equilibrado',
  marcacao: 'Zona',
  linhaDefensiva: 'Normal',
  ritmo: 'Normal',
};

/** Overall por linha — permite montar times de linhas divergentes. */
export interface PerfilLinhas {
  GOL: number;
  DEF: number;
  MEI: number;
  ATA: number;
}

function grupoLinha(pos: Position): keyof PerfilLinhas {
  if (pos === 'GOL') {
    return 'GOL';
  }
  if (pos === 'LD' || pos === 'ZAG' || pos === 'LE') {
    return 'DEF';
  }
  if (pos === 'VOL' || pos === 'MC' || pos === 'MEI') {
    return 'MEI';
  }
  return 'ATA';
}

export function criarJogadoresLab(
  prefixo: string,
  perfil: number | PerfilLinhas,
): Player[] {
  return POSICOES_LAB.map((posicao, index) => {
    const overall =
      typeof perfil === 'number' ? perfil : perfil[grupoLinha(posicao)];
    return {
      id: `${prefixo}_${index}`,
      nome: `${prefixo} ${index}`,
      idade: 26,
      nacionalidade: 'Brazil',
      posicaoPrincipal: posicao,
      posicoesSecundarias: [],
      pernaDominante: 'D' as const,
      atributos: {
        finalizacao: overall, passe: overall, marcacao: overall,
        desarme: overall, velocidade: overall, resistencia: overall,
        forca: overall, reflexos: overall, posicionamento: overall,
        drible: overall, cabeceio: overall, cruzamento: overall,
      },
      overall,
      potencial: overall,
      condicaoFisica: 100,
      moral: 65,
      forma: 0,
      valorMercado: 1_000_000,
      salario: 10_000,
      contratoAte: '2028-12-31',
      clubeId: prefixo,
      lesionado: false,
      diasLesao: 0,
      suspenso: false,
      jogosSuspensao: 0,
      estatisticasTemporada: {
        temporada: '2026', jogos: 0, gols: 0, assistencias: 0,
        cartoesAmarelos: 0, cartoesVermelhos: 0, notaMedia: 0,
      },
      historicoTemporadas: [],
    };
  });
}

export function criarClubeLab(
  id: string,
  jogadores: Player[],
  tatica: Tatica,
): Clube {
  const formacao: Formacao = {
    tipo: '4-3-3',
    titulares: jogadores.map((jogador, index) => ({
      jogadorId: jogador.id,
      posicao: POSICOES_LAB[index] ?? jogador.posicaoPrincipal,
    })),
    reservas: [],
  };
  return {
    id,
    nome: id,
    sigla: id.slice(0, 3).toUpperCase(),
    cidade: '',
    estado: '',
    fundacao: null,
    elenco: jogadores.map(jogador => jogador.id),
    formacaoAtual: formacao,
    taticaAtual: tatica,
    financas: {
      saldo: 5_000_000,
      receitaMensal: {bilheteria: 0, patrocinio: 0, premiacoes: 0, vendaJogadores: 0},
      despesaMensal: {salarios: 0, manutencaoEstadio: 0, comissoes: 0, contratacoes: 0},
      patrocinadores: [],
      historicoTransacoes: [],
    },
    estadio: {
      nome: `Estádio ${id}`,
      capacidade: 30_000,
      precoMedioIngresso: 40,
      nivelInfraestrutura: 3,
    },
    reputacao: 50,
    controladoPorIA: true,
  };
}
