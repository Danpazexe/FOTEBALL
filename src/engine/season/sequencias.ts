/**
 * Sequências (streaks) de resultados. Puro e determinístico: a partir do histórico
 * de jogos do clube (ótica do próprio time, em ordem cronológica), identifica as
 * sequências ATUAIS em andamento — contadas do último jogo para trás. É derivação
 * do histórico já persistido; sem estado, sem RNG.
 */

export type TipoSequencia =
  | 'vitorias'
  | 'invicto'
  | 'semVencer'
  | 'derrotas'
  | 'semSofrer';

export type DestaqueSequencia = 'bom' | 'ruim';

export interface Sequencia {
  tipo: TipoSequencia;
  contagem: number;
  rotulo: string;
  destaque: DestaqueSequencia;
}

export interface JogoResultado {
  resultado: 'V' | 'E' | 'D';
  golsFavor: number;
  golsContra: number;
}

/** Mínimo de jogos para uma sequência de forma (vitórias/derrotas) virar destaque. */
const MIN_FORMA = 3;
/** Invicto/sem vencer são sinais mais fracos — exigem mais jogos. */
const MIN_SEM_QUEBRA = 4;
/** Mínimo de jogos sem sofrer gol para virar destaque. */
const MIN_SEM_SOFRER = 3;

/** Conta quantos jogos, do fim para trás, satisfazem o predicado sem quebrar. */
function contarDoFim(
  jogos: JogoResultado[],
  predicado: (jogo: JogoResultado) => boolean,
): number {
  let contagem = 0;
  for (let i = jogos.length - 1; i >= 0; i--) {
    if (!predicado(jogos[i])) {
      break;
    }
    contagem++;
  }
  return contagem;
}

/**
 * Devolve as sequências atuais em destaque (0 a 2): a de FORMA mais relevante
 * (vitórias/derrotas prevalecem sobre invicto/sem vencer) + a defensiva (jogos
 * sem sofrer gol), quando cada uma cruza seu limiar.
 */
export function calcularSequencias(jogos: JogoResultado[]): Sequencia[] {
  if (jogos.length === 0) {
    return [];
  }

  const vitorias = contarDoFim(jogos, jogo => jogo.resultado === 'V');
  const derrotas = contarDoFim(jogos, jogo => jogo.resultado === 'D');
  const invicto = contarDoFim(jogos, jogo => jogo.resultado !== 'D');
  const semVencer = contarDoFim(jogos, jogo => jogo.resultado !== 'V');
  const semSofrer = contarDoFim(jogos, jogo => jogo.golsContra === 0);

  const sequencias: Sequencia[] = [];

  // Forma: a mais específica/forte que cruzar o limiar.
  if (vitorias >= MIN_FORMA) {
    sequencias.push({
      tipo: 'vitorias',
      contagem: vitorias,
      rotulo: `${vitorias} vitórias seguidas`,
      destaque: 'bom',
    });
  } else if (derrotas >= MIN_FORMA) {
    sequencias.push({
      tipo: 'derrotas',
      contagem: derrotas,
      rotulo: `${derrotas} derrotas seguidas`,
      destaque: 'ruim',
    });
  } else if (invicto >= MIN_SEM_QUEBRA) {
    sequencias.push({
      tipo: 'invicto',
      contagem: invicto,
      rotulo: `${invicto} jogos invicto`,
      destaque: 'bom',
    });
  } else if (semVencer >= MIN_SEM_QUEBRA) {
    sequencias.push({
      tipo: 'semVencer',
      contagem: semVencer,
      rotulo: `${semVencer} jogos sem vencer`,
      destaque: 'ruim',
    });
  }

  // Sequência defensiva (independente da forma).
  if (semSofrer >= MIN_SEM_SOFRER) {
    sequencias.push({
      tipo: 'semSofrer',
      contagem: semSofrer,
      rotulo: `${semSofrer} jogos sem sofrer gol`,
      destaque: 'bom',
    });
  }

  return sequencias;
}
