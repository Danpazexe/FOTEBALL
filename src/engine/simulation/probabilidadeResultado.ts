/**
 * Probabilidade de RESULTADO (vitória / empate / derrota) — o "Quem vai ganhar?"
 * do Pré-jogo, estilo Sofascore.
 *
 * COERÊNCIA com a simulação: em vez de inventar uma fórmula, deriva do MESMO
 * modelo de gols esperados que o motor usa (`calcularProbabilidades`). A partir
 * dos gols esperados de cada lado (λ), modela o placar como duas Poisson
 * independentes e soma as células i>j (casa vence), i=j (empate) e i<j (fora
 * vence). É uma APROXIMAÇÃO (a partida real tem momentum, cartões, lesões), mas
 * ancorada nos mesmos números — então a previsão anda junto com o resultado.
 *
 * PURA e determinística: só aritmética, sem RNG, sem data. Não altera o motor
 * (não é chamada na simulação) — é leitura para a UI.
 */
import {calcularProbabilidades} from './probabilityCalc';
import type {ForcaTime} from './teamStrength';
import type {Tatica} from '../../types';

export interface ProbabilidadeResultado {
  /** 0..1 — probabilidade do mandante vencer. */
  vitoriaCasa: number;
  empate: number;
  /** 0..1 — probabilidade do visitante vencer. */
  vitoriaFora: number;
}

/** Máximo de gols por lado somado na grade Poisson (cauda além disso ~0). */
const MAX_GOLS = 12;

/** Massa de Poisson P(X=k) = e^-λ · λ^k / k!, calculada de forma estável. */
function poisson(k: number, lambda: number): number {
  let r = Math.exp(-lambda);
  for (let i = 1; i <= k; i += 1) {
    r *= lambda / i;
  }
  return r;
}

/**
 * Distribui o resultado a partir dos gols esperados de cada lado (λ). Sempre
 * normaliza para somar 1 (compensa a cauda truncada em MAX_GOLS).
 */
export function probabilidadeResultado(
  golsEsperadosCasa: number,
  golsEsperadosFora: number,
): ProbabilidadeResultado {
  const lc = Math.max(0.01, golsEsperadosCasa);
  const lf = Math.max(0.01, golsEsperadosFora);
  const pc = Array.from({length: MAX_GOLS + 1}, (_, k) => poisson(k, lc));
  const pf = Array.from({length: MAX_GOLS + 1}, (_, k) => poisson(k, lf));

  let casa = 0;
  let empate = 0;
  let fora = 0;
  for (let i = 0; i <= MAX_GOLS; i += 1) {
    for (let j = 0; j <= MAX_GOLS; j += 1) {
      const p = pc[i] * pf[j];
      if (i > j) {
        casa += p;
      } else if (i === j) {
        empate += p;
      } else {
        fora += p;
      }
    }
  }
  const total = casa + empate + fora || 1;
  return {
    vitoriaCasa: casa / total,
    empate: empate / total,
    vitoriaFora: fora / total,
  };
}

/**
 * Previsão coerente com o motor: calcula os gols esperados via
 * `calcularProbabilidades` (mesmo modelo da simulação) e devolve vitória/empate/
 * derrota. `mando` (1.0 = neutro) vem de `calcularMando`.
 */
export function preverResultado(
  casa: ForcaTime,
  fora: ForcaTime,
  taticaCasa: Tatica,
  taticaFora: Tatica,
  mando = 1,
): ProbabilidadeResultado {
  const p = calcularProbabilidades(casa, fora, taticaCasa, taticaFora, mando);
  return probabilidadeResultado(
    p.probGolCasaPorMinuto * 90,
    p.probGolForaPorMinuto * 90,
  );
}
