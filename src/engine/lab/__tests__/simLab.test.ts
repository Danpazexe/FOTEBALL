/**
 * LABORATÓRIO DE SIMULAÇÃO — relatório reproduzível (RF-19/RF-20).
 *
 * Roda cenários padrão e imprime as métricas agregadas em JSON (visível sem
 * --silent). Serve de baseline comparável entre versões do motor e trava os
 * invariantes causais: em partidas com ledger V2, NENHUMA falha é tolerada.
 *
 * Amostra maior: aumente AMOSTRA_BASE localmente para uma rodada de calibração.
 */
import type {Partida} from '../../../types';

import {simularPartida} from '../../simulation/matchSimulator';
import {criarClubeLab, criarJogadoresLab, TATICA_NEUTRA_LAB, type PerfilLinhas} from '../fixtures';
import {agregarMetricasLab, calibracaoXgPorFaixa, casosExtremosLab} from '../simLab';

const AMOSTRA_BASE = 400;

function simularCenario(
  perfilCasa: number | PerfilLinhas,
  perfilFora: number | PerfilLinhas,
  total: number,
): {partidas: Partida[]; duracaoMs: number; bytesMedioPartida: number} {
  const jogadoresCasa = criarJogadoresLab('casa', perfilCasa);
  const jogadoresFora = criarJogadoresLab('fora', perfilFora);
  const timeCasa = criarClubeLab('casa', jogadoresCasa, TATICA_NEUTRA_LAB);
  const timeFora = criarClubeLab('fora', jogadoresFora, TATICA_NEUTRA_LAB);

  // Medição de tempo fora da engine (teste): Date.now é permitido aqui.
  const inicio = Date.now();
  const partidas = Array.from({length: total}, (_, index) =>
    simularPartida({timeCasa, timeFora, jogadoresCasa, jogadoresFora, seed: index + 1}),
  );
  const duracaoMs = Date.now() - inicio;
  const bytes = partidas.reduce(
    (soma, partida) => soma + JSON.stringify(partida).length,
    0,
  );
  return {partidas, duracaoMs, bytesMedioPartida: Math.round(bytes / total)};
}

function relatorio(nome: string, cenario: ReturnType<typeof simularCenario>): void {
  const metricas = agregarMetricasLab(cenario.partidas);
  const extremos = casosExtremosLab(cenario.partidas);
  console.log(
    `[LAB ${nome}]`,
    JSON.stringify({
      ...metricas,
      falhasInvariantes: metricas.falhasInvariantes.slice(0, 5),
      totalFalhasInvariantes: metricas.falhasInvariantes.length,
      tempoMedioPartidaMs:
        Math.round((cenario.duracaoMs / cenario.partidas.length) * 100) / 100,
      bytesMedioPartida: cenario.bytesMedioPartida,
      extremos: {
        posseAltaDerrota: extremos.posseAltaDerrota.length,
        muitosChutesSemGol: extremos.muitosChutesSemGol.length,
        xgAltoSemGol: extremos.xgAltoSemGol.length,
        vitoriaComPoucosChutes: extremos.vitoriaComPoucosChutes.length,
      },
    }),
  );
}

describe('laboratório de simulação — cenários padrão', () => {
  it('cenário parelho 75×75: métricas na faixa e zero falha de invariante', () => {
    const cenario = simularCenario(75, 75, AMOSTRA_BASE);
    const metricas = agregarMetricasLab(cenario.partidas);
    relatorio('parelho 75x75', cenario);

    expect(metricas.jogos).toBe(AMOSTRA_BASE);
    expect(metricas.falhasInvariantes).toHaveLength(0);
    expect(metricas.mediaGols).toBeGreaterThan(2.4);
    expect(metricas.mediaGols).toBeLessThan(3.1);
    // Chutes/jogo na faixa realista do doc (20–32).
    expect(metricas.chutesPorJogo).toBeGreaterThan(20);
    expect(metricas.chutesPorJogo).toBeLessThan(32);
    // No alvo: 28–45% dos chutes.
    expect(metricas.taxaNoAlvo).toBeGreaterThan(0.28);
    expect(metricas.taxaNoAlvo).toBeLessThan(0.45);
  });

  it('cenário gap +11 (80×69): forte domina, zebra rara mas possível', () => {
    const cenario = simularCenario(80, 69, Math.min(AMOSTRA_BASE, 300));
    const metricas = agregarMetricasLab(cenario.partidas);
    relatorio('gap +11 80x69', cenario);

    expect(metricas.falhasInvariantes).toHaveLength(0);
    expect(metricas.taxaVitoriaCasa).toBeGreaterThan(0.6);
    expect(metricas.taxaVitoriaFora).toBeLessThan(0.18);
  });

  it('CA-17: conversão por faixa de xG aproxima a probabilidade prevista', () => {
    const cenario = simularCenario(75, 75, AMOSTRA_BASE);
    const faixas = calibracaoXgPorFaixa(cenario.partidas);
    console.log('[LAB calibração xG]', JSON.stringify(faixas));
    expect(faixas.length).toBeGreaterThan(2);
    for (const faixa of faixas) {
      // Tolerância do laboratório: faixas com amostra decente (≥150 chutes)
      // não podem desviar mais que 6 pontos percentuais + 25% relativo.
      if (faixa.chutes >= 150) {
        expect(faixa.erroAbsoluto).toBeLessThan(
          Math.max(0.06, faixa.xgMedio * 0.25),
        );
      }
    }
  });

  it('cenário assimétrico (ataque+ × meio+): estatísticas coerentes com o domínio', () => {
    const cenario = simularCenario(
      {GOL: 77, DEF: 76, MEI: 75, ATA: 79},
      {GOL: 74, DEF: 75, MEI: 80, ATA: 74},
      Math.min(AMOSTRA_BASE, 300),
    );
    const metricas = agregarMetricasLab(cenario.partidas);
    relatorio('assimétrico ata+ x meio+', cenario);

    expect(metricas.falhasInvariantes).toHaveLength(0);
    // CA-18: xG deve prever gols melhor que a posse (não exigir correlação ~1).
    expect(metricas.correlacaoXgGols).toBeGreaterThan(metricas.correlacaoPosseGols);
  });
});
