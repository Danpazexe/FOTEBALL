/**
 * Engine PURA da disputa de pênaltis INTERATIVA — fiel ao Mini Cup do Google
 * (doodle da Copa do Mundo): só a fase de BATER. Sem React, sem Math.random,
 * sem Date.now — toda a aleatoriedade sai de um RNG semeado (determinismo/replay).
 *
 * Duas naturezas de cobrança:
 *  - USUÁRIO: o gesto (posição do chute) decide o desfecho; o goleiro "lê" a
 *    direção e mergulha, ficando mais rápido/preciso a cada gol (escala de
 *    dificuldade do original). O RNG entra só como ruído mínimo de execução.
 *  - CPU: resolvida 100% por probabilidade ponderada por força (mesmo modelo de
 *    `disputarPenaltis` em matchSimulator), sem input do usuário.
 *
 * A sequência (5 cobranças por lado + morte súbita) e a decisão do confronto
 * ficam em funções puras aqui; o `usePenaltiStore` só orquestra a UI por elas.
 */
import {limitar, type RandomGenerator} from '../../simulation/rng';
import type {
  DetalheResolucaoCobranca,
  PlayerAttributes,
  PosicaoChute,
  ResultadoCobranca,
  VencedorDisputa,
} from '../../../types';

// --- Ajuste do goleiro (cresce com o nível de dificuldade) --------------------

/** Alcance horizontal base do goleiro (em unidades de x; o gol vai de -1 a 1). */
const ALCANCE_BASE = 0.55;
/** Ganho de alcance por nível de dificuldade. */
const ALCANCE_POR_NIVEL = 0.05;
/** Teto de alcance — mantém o canto alto sempre defensável só pelo "perfeito". */
const ALCANCE_MAX = 1.05;

/** Quão bem o goleiro lê a direção (0 = palpite puro, 1 = leitura perfeita). */
const LEITURA_BASE = 0.3;
const LEITURA_POR_NIVEL = 0.06;
const LEITURA_MAX = 0.9;

/** Teto do nível de dificuldade — evita morte súbita virar impossível no meio. */
export const NIVEL_MAX_GOLEIRO = 10;

// --- Física do chute ----------------------------------------------------------

/** Chute alto é mais difícil de defender: reduz o alcance efetivo do goleiro. */
const FATOR_ALTURA = 0.6;

/** Ângulo perfeito: |x| alto (canto) + y alto → impossível defender. */
const LIMIAR_CANTO = 0.8;
const LIMIAR_ALTO = 0.8;

/** Peso do atributo de finalização (coloca melhor a bola). Efeito modesto. */
const PESO_FINALIZACAO = 0.15;
/** Finalização de referência (efeito neutro). */
const FINALIZACAO_NEUTRA = 60;

/** Amplitude do ruído semeado — determinismo/replay, não mecânica visível. */
const RUIDO = 0.08;

// --- Regras da disputa --------------------------------------------------------

/** Cobranças regulares por lado antes da morte súbita (regra real). */
export const COBRANCAS_REGULARES = 5;

/** Argumentos da resolução de UMA cobrança do usuário. */
export interface ArgsResolverCobrancaUsuario {
  /** Onde o usuário mirou (coordenada contínua do gol). */
  posicaoChute: PosicaoChute;
  /**
   * Potência do arrasto (0..1). NÃO altera o desfecho — no Mini Cup a força só
   * muda a velocidade da animação da bola. Mantida na assinatura para replay/UI.
   */
  potencia: number;
  /** Dificuldade atual do goleiro (0..NIVEL_MAX_GOLEIRO). */
  nivelDificuldadeGoleiro: number;
  /** Atributos do batedor — só `finalizacao` influencia (leve). */
  atributosBatedor: PlayerAttributes | null;
  /** RNG semeado da disputa. Consome sempre 3 valores (determinismo estável). */
  rng: RandomGenerator;
}

/**
 * Resolve UMA cobrança do usuário: mira + dificuldade do goleiro + finalização,
 * com ruído semeado. Consome exatamente 3 saídas do RNG, independente do
 * desfecho, para não desalinhar a sequência das cobranças seguintes.
 */
export function resolverCobrancaUsuario(
  args: ArgsResolverCobrancaUsuario,
): DetalheResolucaoCobranca {
  const {posicaoChute, nivelDificuldadeGoleiro, atributosBatedor, rng} = args;
  const x = limitar(posicaoChute.x, -1, 1);
  const y = limitar(posicaoChute.y, 0, 1);
  const nivel = limitar(nivelDificuldadeGoleiro, 0, NIVEL_MAX_GOLEIRO);

  // Sorteios feitos SEMPRE (antes de qualquer retorno) para o consumo de RNG ser
  // constante por cobrança — assim o "perfeito" não desalinha as próximas.
  const palpiteX = rng() * 2 - 1; // [-1, 1)
  const palpiteY = rng(); // [0, 1)
  const ruido = (rng() - 0.5) * RUIDO;

  const leitura = limitar(
    LEITURA_BASE + nivel * LEITURA_POR_NIVEL,
    0,
    LEITURA_MAX,
  );
  const alcance = Math.min(ALCANCE_MAX, ALCANCE_BASE + nivel * ALCANCE_POR_NIVEL);

  // Goleiro mergulha: mistura de palpite aleatório e leitura da direção do chute.
  const goleiroX = leitura * x + (1 - leitura) * palpiteX;
  const goleiroY = leitura * y + (1 - leitura) * palpiteY;

  // Ângulo perfeito é sempre gol — teto de habilidade que recompensa mirar no
  // canto alto (o único jeito de furar o goleiro no nível máximo).
  if (Math.abs(x) >= LIMIAR_CANTO && y >= LIMIAR_ALTO) {
    return {resultado: 'GOL', goleiroX, goleiroY, perfeito: true};
  }

  const finalizacao = atributosBatedor?.finalizacao ?? FINALIZACAO_NEUTRA;
  const bonus = ((finalizacao - FINALIZACAO_NEUTRA) / 40) * PESO_FINALIZACAO;

  // Alcance efetivo diminui com a altura do chute; a finalização afasta a bola
  // do goleiro (bônus positivo empurra o desfecho para gol).
  const alcanceEfetivo = alcance * (1 - y * FATOR_ALTURA);
  const distancia = Math.abs(x - goleiroX);
  const defendido = distancia + bonus + ruido <= alcanceEfetivo;

  return {
    resultado: defendido ? 'DEFESA' : 'GOL',
    goleiroX,
    goleiroY,
    perfeito: false,
  };
}

/**
 * Progressão da dificuldade do goleiro: mais rápido/preciso a cada gol do
 * usuário (extensão direta da escalada do Mini Cup). Limitada a NIVEL_MAX.
 */
export function avancarDificuldadeGoleiro(nivelAtual: number): number {
  return Math.min(NIVEL_MAX_GOLEIRO, Math.max(0, nivelAtual) + 1);
}

/**
 * Probabilidade de conversão de UMA cobrança, ponderada por força (0-100). Mesmo
 * modelo de `disputarPenaltis` (matchSimulator) — coerência entre os caminhos.
 */
export function probabilidadeCobranca(forca: number): number {
  return limitar(0.55 + forca / 300, 0.6, 0.85);
}

/** Resolve UMA cobrança da CPU por probabilidade (determinístico via RNG). */
export function resolverCobrancaCpu(
  probabilidade: number,
  rng: RandomGenerator,
): ResultadoCobranca {
  return rng() < probabilidade ? 'GOL' : 'DEFESA';
}

/** Resultado da avaliação de decisão da disputa. */
export interface ResultadoDecisao {
  decidido: boolean;
  vencedor?: VencedorDisputa;
}

/**
 * Diz se a disputa já está DECIDIDA a partir do placar e do nº de cobranças de
 * cada lado — cobre tanto o encerramento antecipado na fase regular (quando o
 * que falta não muda o resultado) quanto a morte súbita (após 5 cada, decide
 * quando os dois bateram o mesmo número e há diferença de gols).
 */
export function disputaDecidida(
  marcadosUsuario: number,
  marcadosCpu: number,
  cobradasUsuario: number,
  cobradasCpu: number,
): ResultadoDecisao {
  const restantesUsuario = Math.max(0, COBRANCAS_REGULARES - cobradasUsuario);
  const restantesCpu = Math.max(0, COBRANCAS_REGULARES - cobradasCpu);
  const emRegular =
    cobradasUsuario < COBRANCAS_REGULARES || cobradasCpu < COBRANCAS_REGULARES;

  if (emRegular) {
    // Encerramento antecipado: um lado já tem mais gols do que o outro pode
    // alcançar com o que resta das 5 cobranças.
    if (marcadosUsuario > marcadosCpu + restantesCpu) {
      return {decidido: true, vencedor: 'USUARIO'};
    }
    if (marcadosCpu > marcadosUsuario + restantesUsuario) {
      return {decidido: true, vencedor: 'CPU'};
    }
    return {decidido: false};
  }

  // Morte súbita: só decide quando os dois bateram o MESMO número de vezes.
  if (cobradasUsuario === cobradasCpu && marcadosUsuario !== marcadosCpu) {
    return {
      decidido: true,
      vencedor: marcadosUsuario > marcadosCpu ? 'USUARIO' : 'CPU',
    };
  }
  return {decidido: false};
}

/**
 * Predicado de entrada na tela interativa: só quando o confronto do usuário
 * terminou EMPATADO (no jogo de Copa do Brasil, empate no tempo normal;
 * genericamente, empate no agregado). Nesse caso o usuário bate ao vivo em vez
 * de a disputa ser resolvida por probabilidade.
 */
export function deveIrParaDisputaInterativa(args: {
  golsUsuario: number;
  golsAdversario: number;
}): boolean {
  return args.golsUsuario === args.golsAdversario;
}
