import {PRIMEIROS_NOMES, SOBRENOMES} from '../../data/nomesBase';
import type {Player, Position} from '../../types';
import {inteiroEntre, type RandomGenerator} from '../simulation/rng';

/**
 * Academia de base (Módulo 14). Gera jovens talentos por temporada de forma
 * determinística (RNG semeado), ponderando posições pelas necessidades do
 * elenco. O potencial é mostrado como letra (B/A/S), não como número.
 */

export interface JovemTalento {
  id: string;
  nome: string;
  idade: 17 | 18 | 19;
  posicao: Position;
  overall: number;
  potencial: number;
  salarioBase: number;
}

export type FaixaPotencial = 'B' | 'A' | 'S';

const TODAS_POSICOES: Position[] = [
  'GOL', 'ZAG', 'LD', 'LE', 'VOL', 'MC', 'MEI', 'PD', 'PE', 'SA', 'CA',
];

/** Faixa de potencial oculto: B (72-78), A (79-85), S (86-90). */
export function faixaPotencial(potencial: number): FaixaPotencial {
  if (potencial >= 86) {
    return 'S';
  }
  if (potencial >= 79) {
    return 'A';
  }
  return 'B';
}

/** Salário base mensal a partir do overall (jovens custam pouco). */
function salarioBasePorOverall(overall: number): number {
  return Math.round(overall * 70);
}

function montarPoolPosicoes(
  necessidades: Partial<Record<Position, number>>,
): Position[] {
  const pool: Position[] = [];
  for (const posicao of TODAS_POSICOES) {
    // Toda posição entra ao menos 1x; necessidades aumentam o peso.
    const peso = Math.max(1, necessidades[posicao] ?? 0);
    for (let i = 0; i < peso; i += 1) {
      pool.push(posicao);
    }
  }
  return pool;
}

/**
 * Gera de 3 a 5 jovens para a temporada. Determinístico para uma mesma seed —
 * a seed combina a temporada com o `rng` recebido.
 */
export function gerarJovensTemporada(
  temporada: number,
  necessidades: Partial<Record<Position, number>>,
  rng: RandomGenerator,
): JovemTalento[] {
  const pool = montarPoolPosicoes(necessidades);
  const quantidade = inteiroEntre(rng, 3, 5);

  return Array.from({length: quantidade}, (_, indice) => {
    const posicao = pool[inteiroEntre(rng, 0, pool.length - 1)];
    const primeiro = PRIMEIROS_NOMES[inteiroEntre(rng, 0, PRIMEIROS_NOMES.length - 1)];
    const sobrenome = SOBRENOMES[inteiroEntre(rng, 0, SOBRENOMES.length - 1)];
    const overall = inteiroEntre(rng, 55, 68);
    // Potencial sempre acima do overall (72-90 > 68).
    const potencial = inteiroEntre(rng, 72, 90);
    const idade = inteiroEntre(rng, 17, 19) as 17 | 18 | 19;

    return {
      id: `jovem_${temporada}_${indice}`,
      nome: `${primeiro} ${sobrenome}`,
      idade,
      posicao,
      overall,
      potencial,
      salarioBase: salarioBasePorOverall(overall),
    };
  });
}

/**
 * Converte um jovem promovido num `Player` completo do elenco. Atributos
 * iniciais espelham o overall (o jogador se especializa ao evoluir).
 */
export function jovemParaPlayer(
  jovem: JovemTalento,
  clubeId: string,
  temporada: string,
): Player {
  const nivel = jovem.overall;
  return {
    id: jovem.id,
    nome: jovem.nome,
    idade: jovem.idade,
    nacionalidade: 'Brasil',
    posicaoPrincipal: jovem.posicao,
    posicoesSecundarias: [],
    pernaDominante: 'D',
    atributos: {
      finalizacao: nivel,
      passe: nivel,
      marcacao: nivel,
      desarme: nivel,
      velocidade: nivel,
      resistencia: nivel,
      forca: nivel,
      reflexos: nivel,
      posicionamento: nivel,
      drible: nivel,
      cabeceio: nivel,
      cruzamento: nivel,
    },
    overall: jovem.overall,
    potencial: jovem.potencial,
    condicaoFisica: 100,
    moral: 70,
    forma: 0,
    valorMercado: Math.round(jovem.overall * 30000),
    salario: jovem.salarioBase,
    contratoAte: String(Number(temporada) + 3),
    clubeId,
    lesionado: false,
    diasLesao: 0,
    suspenso: false,
    jogosSuspensao: 0,
    amarelosParaSuspensao: 0,
    estatisticasTemporada: {
      temporada,
      jogos: 0,
      gols: 0,
      assistencias: 0,
      cartoesAmarelos: 0,
      cartoesVermelhos: 0,
      notaMedia: 0,
    },
    historicoTemporadas: [],
  };
}

