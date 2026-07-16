/**
 * MOMENTUM DE ATAQUE (Fase 7 da cadeia causal) — pressão ofensiva RECENTE.
 *
 * Cada ação real do minuto (chute com seu xG, escanteio, falta perigosa,
 * pênalti, território) soma ameaça ao lado que atacou; a pressão decai
 * exponencialmente (janela efetiva ~150s). A amostra do minuto é
 * tanh((pressãoCasa − pressãoFora)/escala) ∈ [−1, 1].
 *
 * O GOL não recebe bônus artificial além da ameaça do próprio chute e da
 * construção (CA-07: sem dupla contagem) — na UI, o gol é MARCADOR no minuto
 * (derivado dos eventos), separado da altura das barras.
 */
import type {ChutePartida} from '../../../types';

import {limitar} from '../rng';
import {MOMENTO_CAUSAL} from './matchModelConfig';

/** Estado incremental da pressão (vive no EstadoPartidaAoVivo). */
export interface EstadoMomento {
  pressaoCasa: number;
  pressaoFora: number;
}

export function criarEstadoMomento(): EstadoMomento {
  return {pressaoCasa: 0, pressaoFora: 0};
}

/**
 * Ações reais de UM lado num minuto (entradas de ameaça). `chutes` já inclui
 * pênaltis e cobranças de falta (todos são ChutePartida) — a ameaça de cada um
 * vem do próprio xG do chute; NÃO há campo separado para eles (evita a dupla
 * contagem que o CA-07 proíbe). Escanteios entram à parte porque NÃO são chute.
 */
export interface AcoesMinutoLado {
  chutes: ChutePartida[];
  escanteios: number;
  /** Fração de posse do lado no minuto (território). */
  fracaoPosse: number;
}

/** Ameaça criada por um lado num minuto — função pura e testável (RF-07). */
export function calcularAmeacaMinuto(acoes: AcoesMinutoLado): number {
  let ameaca = 0;
  for (const chute of acoes.chutes) {
    // O chute vale sua qualidade real (xG) + um piso por existir; exigir
    // trabalho do goleiro pressiona um pouco mais. Pênalti/falta entram AQUI
    // (são chutes), com seu xG alto — sem bônus adicional por fora.
    ameaca += MOMENTO_CAUSAL.ameacaChute + chute.xg;
    if (chute.resultado === 'gol' || chute.resultado === 'defesa') {
      ameaca += MOMENTO_CAUSAL.ameacaChuteNoAlvo;
    }
  }
  ameaca += acoes.escanteios * MOMENTO_CAUSAL.ameacaEscanteio;
  ameaca += Math.max(0, acoes.fracaoPosse - 0.5) * MOMENTO_CAUSAL.pesoTerritorio;
  return ameaca;
}

/**
 * Avança um minuto de pressão (decaimento + ameaças novas) e devolve a
 * amostra normalizada do minuto na perspectiva da casa (−1..1).
 */
export function amostrarMomentoMinuto(
  estado: EstadoMomento,
  acoesCasa: AcoesMinutoLado,
  acoesFora: AcoesMinutoLado,
): number {
  estado.pressaoCasa =
    estado.pressaoCasa * MOMENTO_CAUSAL.retencaoPorMinuto +
    calcularAmeacaMinuto(acoesCasa);
  estado.pressaoFora =
    estado.pressaoFora * MOMENTO_CAUSAL.retencaoPorMinuto +
    calcularAmeacaMinuto(acoesFora);

  const normalizado = Math.tanh(
    (estado.pressaoCasa - estado.pressaoFora) /
      MOMENTO_CAUSAL.escalaNormalizacao,
  );
  return Math.round(limitar(normalizado, -1, 1) * 100) / 100;
}
