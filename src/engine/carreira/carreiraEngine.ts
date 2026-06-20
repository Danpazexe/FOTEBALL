import type {
  EstadoFinanceiro,
  MotivoDemissao,
  ResultadoCarreira,
} from '../../types';

/**
 * Motor do eixo Meta/Carreira do técnico (BRASFOOT_MASTER §12 e §8.4). Funções
 * puras: dado o estado de carreira + o que aconteceu na rodada, devolvem o novo
 * estado e eventuais gatilhos (salário atrasado, demissão). O wiring na store é
 * quem aplica os efeitos (moral, mensagens, fim de carreira).
 */

/** Derrotas consecutivas que levam à demissão, por divisão (§15). */
export const LIMITE_DERROTAS_DEMISSAO: Record<'A' | 'B' | 'C', number> = {
  A: 5,
  B: 7,
  C: 9,
};

/** Rodadas seguidas no vermelho a partir das quais os salários atrasam (§8.4). */
export const RODADAS_VERMELHO_SALARIO_ATRASADO = 3;
/** Rodadas seguidas no vermelho que configuram falência → demissão (§8.4). */
export const RODADAS_VERMELHO_FALENCIA = 8;
/** Penalidade de moral por rodada de salário atrasado (§5). */
export const MORAL_SALARIO_ATRASADO = -20;
/** Reputação inicial do técnico (0-100). */
export const REPUTACAO_INICIAL = 50;
/** Margem de reputação acima da do técnico que um clube ainda aceita contratar. */
export const MARGEM_CONTRATACAO = 10;

/**
 * Um clube se dispõe a contratar o técnico quando a reputação dele alcança a do
 * clube (com uma margem) — clubes grandes exigem reputação alta (§12). Se a
 * reputação afundar a ponto de nenhum clube ser elegível, é o fim da carreira.
 */
export function clubeElegivelParaTecnico(
  reputacaoTecnico: number,
  reputacaoClube: number,
): boolean {
  return reputacaoClube <= reputacaoTecnico + MARGEM_CONTRATACAO;
}

function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor));
}

/**
 * Rodadas consecutivas no vermelho → estado financeiro (§8.4).
 *   0 → SAUDAVEL · 1-2 → ATENCAO · 3-7 → CRITICO · 8+ → FALENCIA
 */
export function calcularEstadoFinanceiro(
  rodadasNoVermelho: number,
): EstadoFinanceiro {
  if (rodadasNoVermelho <= 0) {
    return 'SAUDAVEL';
  }
  if (rodadasNoVermelho < RODADAS_VERMELHO_SALARIO_ATRASADO) {
    return 'ATENCAO';
  }
  if (rodadasNoVermelho < RODADAS_VERMELHO_FALENCIA) {
    return 'CRITICO';
  }
  return 'FALENCIA';
}

/** Próxima contagem de rodadas no vermelho a partir do saldo atual. */
export function atualizarRodadasNoVermelho(
  rodadasNoVermelho: number,
  saldo: number,
): number {
  return saldo < 0 ? rodadasNoVermelho + 1 : 0;
}

/** Salários atrasam quando o clube acumula rodadas no vermelho (§8.4). */
export function salariosAtrasados(rodadasNoVermelho: number): boolean {
  return rodadasNoVermelho >= RODADAS_VERMELHO_SALARIO_ATRASADO;
}

/** Próxima contagem de derrotas consecutivas após um resultado (zera fora da derrota). */
export function atualizarDerrotasConsecutivas(
  atual: number,
  resultado: ResultadoCarreira,
): number {
  return resultado === 'derrota' ? atual + 1 : 0;
}

/** Atualiza a reputação do técnico após um jogo (0-100): vitória +2, derrota -2. */
export function atualizarReputacao(
  reputacaoAtual: number,
  resultado: ResultadoCarreira,
): number {
  const delta = resultado === 'vitoria' ? 2 : resultado === 'empate' ? 0 : -2;
  return limitar(reputacaoAtual + delta, 0, 100);
}

/** Ajuste de reputação no fim de temporada (§12). */
export function reputacaoFimTemporada(
  reputacaoAtual: number,
  evento: 'titulo' | 'acesso' | 'rebaixamento' | 'meio',
): number {
  const delta =
    evento === 'titulo'
      ? 20
      : evento === 'acesso'
        ? 12
        : evento === 'rebaixamento'
          ? -20
          : 0;
  return limitar(reputacaoAtual + delta, 0, 100);
}

/**
 * Verifica gatilho de demissão por desempenho ou finanças no meio da temporada
 * (§12). O rebaixamento é avaliado à parte, no fim da temporada.
 */
export function verificarDemissao(args: {
  derrotasConsecutivas: number;
  limiteDerrotas: number;
  rodadasNoVermelho: number;
}): MotivoDemissao | null {
  if (args.rodadasNoVermelho >= RODADAS_VERMELHO_FALENCIA) {
    return 'FALENCIA';
  }
  if (args.derrotasConsecutivas >= args.limiteDerrotas) {
    return 'DERROTAS_CONSECUTIVAS';
  }
  return null;
}
