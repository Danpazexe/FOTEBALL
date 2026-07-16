/**
 * LABORATÓRIO DE SIMULAÇÃO (RF-19/RF-20 da engine causal).
 *
 * Agrega métricas de uma amostra de partidas simuladas para:
 *  • registrar baseline (V1) e resultado (V2) comparáveis;
 *  • medir correlações posse×gols, chutes×gols e xG×gols (CA-18);
 *  • auditar casos extremos (zebra, posse alta e derrota, xG alto sem gol);
 *  • verificar invariantes causais quando a partida tem ledger V2.
 *
 * PURO e determinístico: recebe partidas prontas, não simula nem sorteia.
 * A medição de tempo/tamanho fica no chamador (teste), fora da engine.
 */
import type {Partida} from '../../types';
import {ehEventoGol} from '../../types';

export interface MetricasLab {
  jogos: number;
  mediaGols: number;
  taxaVitoriaCasa: number;
  taxaEmpate: number;
  taxaVitoriaFora: number;
  /** Diferença de 3+ gols. */
  taxaGoleada: number;
  posseMediaCasa: number;
  chutesPorJogo: number;
  chutesNoAlvoPorJogo: number;
  /** Fração dos chutes que foi no alvo. */
  taxaNoAlvo: number;
  xgPorJogo: number;
  /** Gols por finalização (conversão bruta). */
  conversaoPorChute: number;
  /** Gols por finalização no alvo. */
  conversaoNoAlvo: number;
  mediaCartoes: number;
  taxaJogoComPenalti: number;
  taxaJogoComLesao: number;
  /** Correlação de Pearson entre diferença de posse e diferença de gols. */
  correlacaoPosseGols: number;
  correlacaoChutesGols: number;
  correlacaoXgGols: number;
  /** Placares mais comuns ("2-1" → fração dos jogos). */
  placaresMaisComuns: Array<{placar: string; fracao: number}>;
  /** Gols válidos SEM vínculo com um chute do ledger (V2 exige 0). */
  golsSemChuteVinculado: number;
  /** Total de gols válidos da amostra (base do número acima). */
  golsValidos: number;
  /** Falhas de invariantes causais detectadas (apenas partidas com ledger). */
  falhasInvariantes: string[];
}

/** Resumo de um caso extremo auditável (não proibido — ver documento). */
export interface CasoExtremoLab {
  partidaId: string;
  placar: string;
  posseCasa: number;
  chutes: {casa: number; fora: number};
  xg: {casa: number; fora: number};
}

export interface CasosExtremosLab {
  /** 75%+ de posse e derrota. */
  posseAltaDerrota: CasoExtremoLab[];
  /** 20+ chutes e zero gol. */
  muitosChutesSemGol: CasoExtremoLab[];
  /** xG ≥ 2.2 e zero gol. */
  xgAltoSemGol: CasoExtremoLab[];
  /** Vitória finalizando no máximo 4 vezes (gol de pouquíssimo volume). */
  vitoriaComPoucosChutes: CasoExtremoLab[];
}

function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) {
    return 0;
  }
  let somaX = 0;
  let somaY = 0;
  for (let i = 0; i < n; i += 1) {
    somaX += xs[i] ?? 0;
    somaY += ys[i] ?? 0;
  }
  const mediaX = somaX / n;
  const mediaY = somaY / n;
  let cov = 0;
  let varX = 0;
  let varY = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = (xs[i] ?? 0) - mediaX;
    const dy = (ys[i] ?? 0) - mediaY;
    cov += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }
  if (varX <= 0 || varY <= 0) {
    return 0;
  }
  return cov / Math.sqrt(varX * varY);
}

/**
 * Verifica os invariantes causais de UMA partida com ledger V2 (CA-01…CA-05).
 * Partidas sem `chutes` (legacy/V1) não são verificadas — devolve [].
 */
export function verificarInvariantesPartida(partida: Partida): string[] {
  const chutes = partida.chutes;
  if (!chutes) {
    return [];
  }
  const falhas: string[] = [];
  const rotulo = partida.id;
  // Convenção documentada: chute com gol ANULADO fica no ledger, mas não conta
  // em finalizações nem no xG oficial (o lance foi invalidado).
  const validos = chutes.filter(c => c.resultado !== 'gol_anulado');

  const golsChutesCasa = validos.filter(
    c => c.resultado === 'gol' && c.timeId === partida.timeCasa,
  ).length;
  const golsChutesFora = validos.filter(
    c => c.resultado === 'gol' && c.timeId === partida.timeFora,
  ).length;
  if (golsChutesCasa !== (partida.placarCasa ?? 0)) {
    falhas.push(
      `${rotulo}: placar casa ${partida.placarCasa} != gols do ledger ${golsChutesCasa}`,
    );
  }
  if (golsChutesFora !== (partida.placarFora ?? 0)) {
    falhas.push(
      `${rotulo}: placar fora ${partida.placarFora} != gols do ledger ${golsChutesFora}`,
    );
  }

  // Partidas RESUMIDAS (IA) persistem só os chutes relevantes — a comparação
  // finalizações/xG × ledger só vale para o ledger COMPLETO (causal_full).
  const est =
    partida.qualidadeDados === 'causal_summary' ? undefined : partida.estatisticas;
  if (est) {
    const chutesCasa = validos.filter(c => c.timeId === partida.timeCasa).length;
    const chutesFora = validos.filter(c => c.timeId === partida.timeFora).length;
    if (chutesCasa !== est.casa.finalizacoes || chutesFora !== est.fora.finalizacoes) {
      falhas.push(
        `${rotulo}: finalizações (${est.casa.finalizacoes}/${est.fora.finalizacoes}) != ledger (${chutesCasa}/${chutesFora})`,
      );
    }
    const xgLedgerCasa = validos
      .filter(c => c.timeId === partida.timeCasa)
      .reduce((s, c) => s + c.xg, 0);
    if (Math.abs(xgLedgerCasa - est.casa.golsEsperados) > 0.05) {
      falhas.push(
        `${rotulo}: xG casa ${est.casa.golsEsperados} != soma do ledger ${xgLedgerCasa.toFixed(2)}`,
      );
    }
  }

  for (const chute of chutes) {
    if (chute.xg < 0.01 || chute.xg > 0.97) {
      falhas.push(`${rotulo}: xG fora da faixa (${chute.xg})`);
    }
    if (chute.x < 0 || chute.x > 1 || chute.y < 0 || chute.y > 1) {
      falhas.push(`${rotulo}: coordenada fora de 0..1`);
    }
  }

  const posse = (partida.posseCasa ?? 50) + (partida.posseFora ?? 50);
  if (posse !== 100) {
    falhas.push(`${rotulo}: posse não soma 100 (${posse})`);
  }

  return falhas;
}

export function agregarMetricasLab(partidas: Partida[]): MetricasLab {
  const jogos = partidas.length;
  let gols = 0;
  let vitoriasCasa = 0;
  let empates = 0;
  let vitoriasFora = 0;
  let goleadas = 0;
  let somaPosseCasa = 0;
  let chutes = 0;
  let chutesNoAlvo = 0;
  let xg = 0;
  let cartoes = 0;
  let comPenalti = 0;
  let comLesao = 0;
  let golsValidos = 0;
  let golsSemChuteVinculado = 0;
  const difPosse: number[] = [];
  const difChutes: number[] = [];
  const difXg: number[] = [];
  const difGols: number[] = [];
  const placares = new Map<string, number>();
  const falhasInvariantes: string[] = [];

  for (const partida of partidas) {
    const pc = partida.placarCasa ?? 0;
    const pf = partida.placarFora ?? 0;
    gols += pc + pf;
    if (pc === pf) {
      empates += 1;
    } else if (pc > pf) {
      vitoriasCasa += 1;
    } else {
      vitoriasFora += 1;
    }
    if (Math.abs(pc - pf) >= 3) {
      goleadas += 1;
    }
    const chave = `${pc}-${pf}`;
    placares.set(chave, (placares.get(chave) ?? 0) + 1);
    somaPosseCasa += partida.posseCasa ?? 50;

    const est = partida.estatisticas;
    if (est) {
      chutes += est.casa.finalizacoes + est.fora.finalizacoes;
      chutesNoAlvo += est.casa.finalizacoesNoAlvo + est.fora.finalizacoesNoAlvo;
      xg += est.casa.golsEsperados + est.fora.golsEsperados;
      difChutes.push(est.casa.finalizacoes - est.fora.finalizacoes);
      difXg.push(est.casa.golsEsperados - est.fora.golsEsperados);
    } else {
      difChutes.push(0);
      difXg.push(0);
    }
    difPosse.push((partida.posseCasa ?? 50) - (partida.posseFora ?? 50));
    difGols.push(pc - pf);

    let temPenalti = false;
    let temLesao = false;
    for (const evento of partida.eventos) {
      if (evento.tipo === 'cartao_amarelo' || evento.tipo === 'cartao_vermelho') {
        cartoes += 1;
      } else if (evento.tipo === 'penalti') {
        temPenalti = true;
      } else if (evento.tipo === 'lesao') {
        temLesao = true;
      }
      if (ehEventoGol(evento.tipo)) {
        golsValidos += 1;
        if (evento.chuteId === undefined) {
          golsSemChuteVinculado += 1;
        }
      }
    }
    if (temPenalti) {
      comPenalti += 1;
    }
    if (temLesao) {
      comLesao += 1;
    }

    falhasInvariantes.push(...verificarInvariantesPartida(partida));
  }

  const placaresMaisComuns = [...placares.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([placar, contagem]) => ({
      placar,
      fracao: Math.round((contagem / Math.max(1, jogos)) * 1000) / 1000,
    }));

  return {
    jogos,
    mediaGols: gols / Math.max(1, jogos),
    taxaVitoriaCasa: vitoriasCasa / Math.max(1, jogos),
    taxaEmpate: empates / Math.max(1, jogos),
    taxaVitoriaFora: vitoriasFora / Math.max(1, jogos),
    taxaGoleada: goleadas / Math.max(1, jogos),
    posseMediaCasa: somaPosseCasa / Math.max(1, jogos),
    chutesPorJogo: chutes / Math.max(1, jogos),
    chutesNoAlvoPorJogo: chutesNoAlvo / Math.max(1, jogos),
    taxaNoAlvo: chutes > 0 ? chutesNoAlvo / chutes : 0,
    xgPorJogo: xg / Math.max(1, jogos),
    conversaoPorChute: chutes > 0 ? gols / chutes : 0,
    conversaoNoAlvo: chutesNoAlvo > 0 ? gols / chutesNoAlvo : 0,
    mediaCartoes: cartoes / Math.max(1, jogos),
    taxaJogoComPenalti: comPenalti / Math.max(1, jogos),
    taxaJogoComLesao: comLesao / Math.max(1, jogos),
    correlacaoPosseGols: pearson(difPosse, difGols),
    correlacaoChutesGols: pearson(difChutes, difGols),
    correlacaoXgGols: pearson(difXg, difGols),
    placaresMaisComuns,
    golsSemChuteVinculado,
    golsValidos,
    falhasInvariantes,
  };
}

/** Uma faixa de calibração de xG (CA-17): previsto × realizado. */
export interface FaixaCalibracaoXg {
  faixa: string;
  chutes: number;
  xgMedio: number;
  gols: number;
  conversao: number;
  /** |conversão − xG médio| (erro absoluto da faixa). */
  erroAbsoluto: number;
}

const LIMITES_FAIXAS_XG = [0, 0.05, 0.1, 0.2, 0.35, 0.5, 0.7, 1.0001];

/**
 * Calibração do xG por faixa (CA-17): em amostra grande, a taxa de conversão
 * de cada faixa deve aproximar o xG médio previsto. Pênaltis ficam na própria
 * faixa (0.7–1.0). Gols anulados ficam fora (convenção das estatísticas).
 */
export function calibracaoXgPorFaixa(partidas: Partida[]): FaixaCalibracaoXg[] {
  const faixas = LIMITES_FAIXAS_XG.slice(0, -1).map((limite, i) => ({
    faixa: `${limite.toFixed(2)}–${(LIMITES_FAIXAS_XG[i + 1] ?? 1).toFixed(2)}`,
    chutes: 0,
    somaXg: 0,
    gols: 0,
  }));
  for (const partida of partidas) {
    for (const chute of partida.chutes ?? []) {
      if (chute.resultado === 'gol_anulado') {
        continue;
      }
      const indice = LIMITES_FAIXAS_XG.findIndex(
        (limite, i) =>
          chute.xg >= limite && chute.xg < (LIMITES_FAIXAS_XG[i + 1] ?? 1.0001),
      );
      const faixa = faixas[indice];
      if (faixa) {
        faixa.chutes += 1;
        faixa.somaXg += chute.xg;
        faixa.gols += chute.resultado === 'gol' ? 1 : 0;
      }
    }
  }
  return faixas
    .filter(f => f.chutes > 0)
    .map(f => {
      const xgMedio = f.somaXg / f.chutes;
      const conversao = f.gols / f.chutes;
      return {
        faixa: f.faixa,
        chutes: f.chutes,
        xgMedio: Math.round(xgMedio * 1000) / 1000,
        gols: f.gols,
        conversao: Math.round(conversao * 1000) / 1000,
        erroAbsoluto: Math.round(Math.abs(conversao - xgMedio) * 1000) / 1000,
      };
    });
}

function resumoCaso(partida: Partida): CasoExtremoLab {
  const est = partida.estatisticas;
  return {
    partidaId: partida.id,
    placar: `${partida.placarCasa ?? 0}-${partida.placarFora ?? 0}`,
    posseCasa: partida.posseCasa ?? 50,
    chutes: {
      casa: est?.casa.finalizacoes ?? 0,
      fora: est?.fora.finalizacoes ?? 0,
    },
    xg: {
      casa: est?.casa.golsEsperados ?? 0,
      fora: est?.fora.golsEsperados ?? 0,
    },
  };
}

/** Lista os casos extremos auditáveis da amostra (limitados a 5 por tipo). */
export function casosExtremosLab(partidas: Partida[]): CasosExtremosLab {
  const posseAltaDerrota: CasoExtremoLab[] = [];
  const muitosChutesSemGol: CasoExtremoLab[] = [];
  const xgAltoSemGol: CasoExtremoLab[] = [];
  const vitoriaComPoucosChutes: CasoExtremoLab[] = [];

  for (const partida of partidas) {
    const pc = partida.placarCasa ?? 0;
    const pf = partida.placarFora ?? 0;
    const posseCasa = partida.posseCasa ?? 50;
    const est = partida.estatisticas;

    const lados = [
      {
        gols: pc, golsRival: pf, posse: posseCasa,
        chutes: est?.casa.finalizacoes ?? 0, xg: est?.casa.golsEsperados ?? 0,
      },
      {
        gols: pf, golsRival: pc, posse: 100 - posseCasa,
        chutes: est?.fora.finalizacoes ?? 0, xg: est?.fora.golsEsperados ?? 0,
      },
    ];
    for (const lado of lados) {
      if (lado.posse >= 75 && lado.gols < lado.golsRival && posseAltaDerrota.length < 5) {
        posseAltaDerrota.push(resumoCaso(partida));
      }
      if (lado.chutes >= 20 && lado.gols === 0 && muitosChutesSemGol.length < 5) {
        muitosChutesSemGol.push(resumoCaso(partida));
      }
      if (lado.xg >= 2.2 && lado.gols === 0 && xgAltoSemGol.length < 5) {
        xgAltoSemGol.push(resumoCaso(partida));
      }
      if (
        est !== undefined &&
        lado.gols > lado.golsRival &&
        lado.chutes <= 4 &&
        vitoriaComPoucosChutes.length < 5
      ) {
        vitoriaComPoucosChutes.push(resumoCaso(partida));
      }
    }
  }

  return {posseAltaDerrota, muitosChutesSemGol, xgAltoSemGol, vitoriaComPoucosChutes};
}
