/**
 * Simulação RÁPIDA de placar por força — para as partidas de FUNDO (que o
 * usuário não disputa ao vivo): jogos entre clubes da IA na Série D e nas fases
 * de mata-mata. Determinística: recebe um RNG semeado e sempre produz o mesmo
 * placar para a mesma seed.
 *
 * Não substitui o `matchSimulator` real (usado nos jogos do usuário) — é um
 * modelo enxuto de gols esperados (Poisson) calibrado para o tier: média ~2.6
 * gols/jogo, com vantagem clara para o time mais forte e mando de campo, sem
 * vitória automática. Fora do `engine/` nada de Math.random.
 */
import type {EventoPartida, Partida} from '../../../types';
import {inteiroEntre, limitar, type RandomGenerator} from '../../simulation/rng';

/** Gols esperados base do mandante (a diferença de força e o mando ajustam). */
const XG_BASE_CASA = 1.5;
const XG_BASE_FORA = 1.15;
/** Sensibilidade à diferença de força (pontos de overall por gol esperado). */
const ESCALA_FORCA = 40;

/** Amostra de Poisson (Knuth), limitada a `teto` para evitar goleadas absurdas. */
function poisson(lambda: number, rng: RandomGenerator, teto = 8): number {
  const limite = Math.exp(-lambda);
  let k = 0;
  let produto = 1;
  do {
    k += 1;
    produto *= rng();
  } while (produto > limite && k <= teto);
  return k - 1;
}

export interface Placar {
  golsCasa: number;
  golsFora: number;
}

/**
 * Placar de uma partida a partir das forças (0–100). `mandoNeutro` remove a
 * vantagem de casa (final em campo neutro).
 */
export function simularPlacar(
  forcaCasa: number,
  forcaFora: number,
  rng: RandomGenerator,
  mandoNeutro = false,
): Placar {
  const diff = (forcaCasa - forcaFora) / ESCALA_FORCA;
  const vantagemCasa = mandoNeutro ? 0 : 0.25;
  const lambdaCasa = limitar(XG_BASE_CASA + diff + vantagemCasa, 0.2, 4.5);
  const lambdaFora = limitar(XG_BASE_FORA - diff, 0.2, 4.5);
  return {
    golsCasa: poisson(lambdaCasa, rng),
    golsFora: poisson(lambdaFora, rng),
  };
}

/** Cartões leves para uma partida de fundo (alimentam o desempate por cartões). */
function gerarCartoes(
  timeCasa: string,
  timeFora: string,
  rng: RandomGenerator,
): EventoPartida[] {
  const eventos: EventoPartida[] = [];
  for (const timeId of [timeCasa, timeFora]) {
    const amarelos = inteiroEntre(rng, 0, 4);
    for (let i = 0; i < amarelos; i += 1) {
      eventos.push({
        minuto: inteiroEntre(rng, 1, 90),
        tipo: 'cartao_amarelo',
        timeId,
        jogadorId: '',
        descricao: '',
      });
    }
    if (rng() < 0.08) {
      eventos.push({
        minuto: inteiroEntre(rng, 20, 90),
        tipo: 'cartao_vermelho',
        timeId,
        jogadorId: '',
        descricao: '',
      });
    }
  }
  return eventos;
}

/**
 * Simula uma partida de fundo COMPLETA (placar + cartões) sobre um fixture já
 * criado, devolvendo a `Partida` marcada como jogada. Usada na fase de grupos,
 * onde a classificação lê `Partida[]`.
 */
export function simularPartidaRapida(
  fixture: Partida,
  forcaCasa: number,
  forcaFora: number,
  rng: RandomGenerator,
): Partida {
  const {golsCasa, golsFora} = simularPlacar(forcaCasa, forcaFora, rng);
  return {
    ...fixture,
    placarCasa: golsCasa,
    placarFora: golsFora,
    eventos: gerarCartoes(fixture.timeCasa, fixture.timeFora, rng),
    jogada: true,
    modoJogado: 'simulado',
  };
}
