/**
 * radarCampo — helpers PUROS do Radar da Partida (mini-campo horizontal da
 * partida ao vivo). Sem React, sem Reanimated, sem sorteio: mesmos dados da
 * engine ⇒ mesmos pontos no campo. Testado em radarCampo.test.ts.
 *
 * REGRA DE OURO: nenhum dado inventado. Tudo aqui só PROJETA no radar o que a
 * engine já produziu:
 *  • Zona de pressão ← `momentumPorMinuto` (amostra por minuto, −1..1, ótica
 *    da casa — a mesma série do MomentoChart). É visualização de PRESSÃO, não
 *    posição de bola (a engine não simula bola contínua).
 *  • Chutes ← `ChutePartida.x/y` do ledger causal (posição REAL do lance).
 *  • Eventos sem coordenada na engine (cartão, lesão, substituição) ← posição
 *    da zona de pressão NO MINUTO do evento — honesto: "aconteceu no contexto
 *    da pressão daquele momento", nunca uma coordenada específica inventada.
 *
 * Convenção do radar (campo horizontal): a CASA defende a ESQUERDA e ataca
 * para a DIREITA; o visitante, o inverso. Coordenadas normalizadas 0..1:
 * x 0 = linha do gol da casa … 1 = linha do gol do visitante; y 0 = topo …
 * 1 = base (lado do atacante olhando o gol que ataca).
 */

import {
  coordenadaBasePosicao,
  paraCampoHorizontal,
} from '../../engine/simulation/reconstruirLanceMinuto';
import type {ChutePartida, EventoPartida, Position} from '../../types';

/** Ponto normalizado (0..1 × 0..1) no campo horizontal do radar. */
export interface PontoRadar {
  x: number;
  y: number;
}

export type LadoPressao = 'casa' | 'fora' | 'neutro';

export interface ZonaPressao {
  /** Posição do indicador ao longo do campo (0=gol da casa … 1=gol do visitante). */
  x: number;
  /** Intensidade da pressão 0..1 (|momento| suavizado). */
  intensidade: number;
  lado: LadoPressao;
}

/** O terço de ataque do mapa de chutes cobre 33% do campo inteiro (mesma
 * conversão documentada em `PassoLance`: yCampo = finalizacao.y * 0.33). */
const TERCO_ATAQUE = 0.33;
/** Quanto do campo a zona percorre a partir do meio (momento ±1 ⇒ 0.5±0.38). */
const AMPLITUDE_ZONA = 0.38;
/** Abaixo deste |momento| suavizado o jogo é mostrado como equilibrado. */
const LIMIAR_NEUTRO = 0.06;
/** Janela de suavização (minutos) da zona — média ponderada pró-recente. */
const JANELA_SUAVIZACAO = 3;

function limitar01(valor: number): number {
  return Math.min(1, Math.max(0, valor));
}

/**
 * Posição/intensidade da zona de pressão a partir da série REAL de momento
 * (`momentumPorMinuto`, ótica da casa). Suaviza com média ponderada dos
 * últimos minutos (o mais recente pesa mais) para a bola de pressão deslizar
 * sem pulos histéricos — mas ainda se mover a CADA minuto simulado.
 */
export function zonaPressao(
  momentum: readonly number[],
  janela: number = JANELA_SUAVIZACAO,
): ZonaPressao {
  if (momentum.length === 0 || janela <= 0) {
    return {x: 0.5, intensidade: 0, lado: 'neutro'};
  }
  const amostras = momentum.slice(-janela);
  let soma = 0;
  let somaPesos = 0;
  amostras.forEach((amostra, indice) => {
    const peso = indice + 1; // mais recente ⇒ maior peso
    soma += amostra * peso;
    somaPesos += peso;
  });
  const momento = soma / somaPesos;
  const intensidade = limitar01(Math.abs(momento));
  const lado: LadoPressao =
    momento > LIMIAR_NEUTRO ? 'casa' : momento < -LIMIAR_NEUTRO ? 'fora' : 'neutro';
  return {x: limitar01(0.5 + momento * AMPLITUDE_ZONA), intensidade, lado};
}

/**
 * Projeta um passo de lance (contrato `PassoLance`: campo INTEIRO, ataque
 * SEMPRE para cima — x 0=esq…1=dir, y 0=gol adversário…1=próprio gol) no
 * campo horizontal do radar. Delegado à geometria ÚNICA do módulo de lances
 * por minuto (engine) — radar e lance usam a mesma rotação.
 */
export function pontoPassoNoRadar(
  passo: {x: number; y: number},
  ehCasa: boolean,
): PontoRadar {
  return paraCampoHorizontal(passo, ehCasa);
}

/**
 * Projeta um chute REAL do ledger no radar. `ChutePartida.x/y` vive no TERÇO
 * de ataque (y 0=linha do gol…1=fundo do terço); primeiro vira coordenada de
 * campo inteiro (y × 0.33) e então gira para o lado do time que chutou.
 */
export function pontoChuteNoRadar(
  chute: Pick<ChutePartida, 'x' | 'y' | 'timeId'>,
  timeCasaId: string,
): PontoRadar {
  return pontoPassoNoRadar(
    {x: chute.x, y: chute.y * TERCO_ATAQUE},
    chute.timeId === timeCasaId,
  );
}

/**
 * Ponto de um EVENTO no radar, na ordem de honestidade:
 *  1. vínculo causal com chute do ledger (`chuteId`) ⇒ coordenada REAL;
 *  2. posição NATURAL do jogador envolvido (cartão/lesão/substituição têm
 *     jogador real, não coordenada — o ícone pinga onde aquele jogador atua);
 *  3. sem nem jogador conhecido ⇒ zona de pressão NO MINUTO do evento
 *     (derivada só do momentum já produzido até ali).
 * Nunca uma coordenada específica inventada.
 */
export function pontoEventoNoRadar(
  evento: Pick<EventoPartida, 'tipo' | 'minuto' | 'timeId' | 'jogadorId' | 'chuteId'>,
  chutes: ReadonlyArray<Pick<ChutePartida, 'id' | 'x' | 'y' | 'timeId'>>,
  timeCasaId: string,
  momentum: readonly number[],
  posicoes?: Readonly<Record<string, Position>>,
): {ponto: PontoRadar; coordenadaReal: boolean} {
  if (evento.chuteId !== undefined) {
    const chute = chutes.find(c => c.id === evento.chuteId);
    if (chute) {
      return {ponto: pontoChuteNoRadar(chute, timeCasaId), coordenadaReal: true};
    }
  }
  const posicao = posicoes?.[evento.jogadorId];
  if (posicao !== undefined) {
    return {
      ponto: pontoPassoNoRadar(
        coordenadaBasePosicao(posicao),
        evento.timeId === timeCasaId,
      ),
      coordenadaReal: false,
    };
  }
  const zona = zonaPressao(momentum.slice(0, Math.max(0, evento.minuto)));
  return {ponto: {x: zona.x, y: 0.5}, coordenadaReal: false};
}

/** Verde do gramado do radar (mobília de campo — mesmo do MapaFinalizacoes). */
const VERDE_CAMPO_RADAR = '#2E9E58';
/** Abaixo desta distância RGB, duas cores "colidem" no mini-campo. */
const LIMIAR_COLISAO = 110;

/** Distância euclidiana RGB entre duas cores hex (#RGB/#RRGGBB). */
function distanciaRgb(a: string, b: string): number {
  const rgb = (hex: string): [number, number, number] | null => {
    const puro = hex.replace('#', '').trim();
    const cheio =
      puro.length === 3
        ? puro
            .split('')
            .map(c => c + c)
            .join('')
        : puro;
    if (!/^[0-9a-fA-F]{6}$/.test(cheio)) {
      return null;
    }
    return [
      parseInt(cheio.slice(0, 2), 16),
      parseInt(cheio.slice(2, 4), 16),
      parseInt(cheio.slice(4, 6), 16),
    ];
  };
  const ca = rgb(a);
  const cb = rgb(b);
  if (ca === null || cb === null) {
    // Cor não-hex (nome/rgba): não dá para medir — trata como distante.
    return Number.POSITIVE_INFINITY;
  }
  return Math.sqrt(
    (ca[0] - cb[0]) ** 2 + (ca[1] - cb[1]) ** 2 + (ca[2] - cb[2]) ** 2,
  );
}

/**
 * Regra DETERMINÍSTICA de contorno dos pontos de jogador no radar:
 *  • se as cores dos DOIS times colidem entre si, o VISITANTE ganha contorno
 *    de tinta (sempre ele — sem sorteio);
 *  • se a cor de um time colide com o verde do gramado, esse time ganha
 *    contorno.
 */
export function contornoPorContraste(
  corCasa: string,
  corFora: string,
  corCampo: string = VERDE_CAMPO_RADAR,
): {casa: boolean; fora: boolean} {
  const colisaoTimes = distanciaRgb(corCasa, corFora) < LIMIAR_COLISAO;
  return {
    casa: distanciaRgb(corCasa, corCampo) < LIMIAR_COLISAO,
    fora: colisaoTimes || distanciaRgb(corFora, corCampo) < LIMIAR_COLISAO,
  };
}

/**
 * Resumo falado do radar (accessibilityLabel): quem pressiona + posse do time
 * que pressiona. Deixa explícito que é leitura de pressão, não bola.
 */
export function resumoRadar(
  nomeCasa: string,
  nomeFora: string,
  posseCasa: number,
  lado: LadoPressao,
): string {
  if (lado === 'casa') {
    return `Pressão do ${nomeCasa}, ${posseCasa}% de posse`;
  }
  if (lado === 'fora') {
    return `Pressão do ${nomeFora}, ${100 - posseCasa}% de posse`;
  }
  return `Jogo equilibrado, ${nomeCasa} com ${posseCasa}% de posse`;
}
