/**
 * PARÂMETROS CENTRAIS DA ENGINE CAUSAL V2 (RNF-07: nada de número mágico
 * espalhado). Cada bloco corresponde a uma etapa da cadeia:
 *
 *   posse → progressão → oportunidade → chute (xG) → resolução → placar
 *
 * Todos os valores foram calibrados no laboratório (src/engine/lab) contra as
 * faixas-alvo do contrato de balanceamento (matchBalance.test.ts): gols/jogo
 * 2.4–3.1, empates 22–32%, mando 40–56%, goleadas 5–16%, chutes 20–32/jogo,
 * chutes no alvo 28–45%. NÃO ajustar no escuro — rodar o lab a cada mudança.
 *
 * As probabilidades-base por minuto (gols esperados por força/tática/mando)
 * continuam em probabilityCalc.ts, que já é o módulo central desses fatores.
 */

export const POSSE_CAUSAL = {
  /**
   * Peso do domínio de MEIO-CAMPO na fração de posse. Menor que o antigo 1.8:
   * a V1 inflava a posse (gap +11 dava 70% — futebol real fica ~58–62%);
   * como agora a posse ALIMENTA o volume de chutes (cadeia causal), o spread
   * precisa ser realista para não amplificar demais o favorito.
   */
  pesoMeio: 1.0,
  /** Peso do domínio ofensivo/territorial (ataque × defesa do rival). */
  pesoDominioOfensivo: 1.0,
  /** Ruído da disputa do minuto (bola dividida, erro de passe): ±metade. */
  ruidoMinuto: 0.18,
  /** Fração de posse mínima/máxima de um minuto. */
  pisoFracao: 0.18,
  tetoFracao: 0.82,
  /**
   * Urgência pelo placar (última meia hora): quem perde vai atrás da BOLA.
   * Efeito por gol de déficit (até 2), crescendo dos 60' aos 90'. MODESTO:
   * a iniciativa de quem perde aparece sobretudo na CRIAÇÃO (urgência de
   * chances), não num domínio territorial que contradiga o jogo.
   */
  urgenciaPorGol: 0.006,
  minutoInicioUrgencia: 60,
  /**
   * Tempo de POSSE MEDIDA creditado por sequência ofensiva que terminou em
   * chute (fração do minuto). É contabilidade da sequência REAL — o crédito é
   * idêntico com gol ou sem gol (função da chance, nunca do resultado), então
   * não há retroação de placar na posse (PI-04 continua eliminado).
   */
  creditoSequenciaChute: 0.12,
} as const;

export const CHANCE_CAUSAL = {
  /**
   * xG médio por finalização do modelo (denominador que converte o alvo de
   * gols do minuto em taxa de CHUTES). Mantém o volume em ~24–28 chutes/jogo:
   * alvoGols/minuto ÷ xgMedio ≈ chutes/minuto. Confirmado no laboratório
   * contra o xG realizado (CA-17: a média dos chutes deve bater com este valor).
   */
  xgMedioPorChute: 0.122,
  /** Teto da probabilidade de UM chute por lado num minuto. */
  tetoProbChuteMinuto: 0.5,
  /**
   * Acoplamento posse→volume: fatorPosse = (base + fração de posse) / (base + 0.5).
   * Neutro (posse 50%) = 1.0; 70% de posse ≈ +19% de chutes; 30% ≈ −19%.
   * É o elo causal "ter a bola → criar mais" (RN-01: posse cria OPORTUNIDADE,
   * não gols automáticos — a conversão de cada chute não muda com a posse).
   */
  basePosse: 0.9,
  /** Rebote: chance de um chute defendido/na trave gerar novo chute imediato. */
  probRebote: 0.16,
  /** Situações (frações do jogo aberto; pênalti/falta têm fluxo próprio). */
  fracaoContraAtaque: 0.14,
  fracaoEscanteio: 0.16,
  /** Estilo contra-ataque: menos volume, chances mais valiosas (RN-06). */
  contraAtaqueVolume: 0.85,
  contraAtaqueQualidade: 1.22,
  /** Estilo posse de bola: mais volume/controle, chances menos limpas (RN-07). */
  posseBolaVolume: 1.08,
  posseBolaQualidade: 0.94,
} as const;

export const XG_CAUSAL = {
  /** xG-base por perfil de posição do chute (antes dos multiplicadores). */
  baseAreaCurta: 0.34, // dentro da pequena área / cara do gol
  baseArea: 0.16, // dentro da área
  baseFora: 0.055, // de fora da área
  /** Fração dos chutes na área que sai da zona "curta" (cara do gol). */
  fracaoAreaCurta: 0.22,
  /** Fração dos chutes de jogo aberto que é de FORA da área. */
  fracaoDeFora: 0.42,
  /** Multiplicadores de situação/execução. */
  multCabeca: 0.72,
  multContraAtaque: 1.25,
  multEscanteio: 0.85,
  multRebote: 1.3,
  /** Pressão defensiva reduz a qualidade (0..1 → até −35%). */
  pesoPressao: 0.35,
  /** Limites do xG de um chute de jogo corrido. */
  minimo: 0.02,
  maximo: 0.65,
  /** Bola parada (valores clássicos de referência). */
  xgPenalti: 0.78,
  xgFaltaDireta: 0.045,
  /** Grande chance: oportunidade com xG a partir deste limiar (RN-05). */
  limiarGrandeChance: 0.24,
} as const;

export const RESOLUCAO_CAUSAL = {
  /**
   * Ajuste do FINALIZADOR sobre a conversão (execução): ±~10% entre um
   * finalizador 45 e um 95. A qualidade objetiva da chance segue no xG.
   */
  atributoFinalizadorNeutro: 72,
  divisorFinalizador: 260,
  /**
   * Ajuste do GOLEIRO — mesma curva do antigo fatorGoleiro de probabilityCalc
   * (goleiro 70 é neutro; paredão corta ~10%, goleiro fraco concede ~8%).
   * Aplicado AQUI (resolução do chute), não na criação da chance.
   */
  goleiroNeutro: 70,
  divisorGoleiro: 250,
  pisoAjusteGoleiro: 0.82,
  tetoAjusteGoleiro: 1.15,
  /** Faixa válida da probabilidade final de conversão de um chute. */
  pisoConversao: 0.01,
  tetoConversao: 0.9,
  /** Desfechos de chute NÃO convertido (frações relativas). */
  fracaoDefesaBase: 0.28, // no alvo, goleiro defende (cresce com o xG)
  pesoDefesaPorXg: 0.5,
  fracaoTrave: 0.016,
  fracaoBloqueado: 0.24,
  /** Drama estruturado (mesmas taxas medidas da V1 — ~2%/2.3%/6% dos gols). */
  probGolContra: 0.02,
  probFalhaGoleiro: 0.023,
  probFalhaDefesa: 0.062,
  /** Assistência creditada em ~70% dos gols de jogo aberto. */
  probAssistencia: 0.7,
} as const;

export const MOMENTO_CAUSAL = {
  /**
   * Decaimento exponencial da pressão ofensiva por minuto: exp(−1/τ) com
   * τ = 2.5 min (janela efetiva ~150s — faixa 120–240s do documento).
   */
  retencaoPorMinuto: 0.67,
  /**
   * Escala do tanh na normalização. Calibrada para o gráfico DIFERENCIAR:
   * chance isolada ~0.6, grande chance ~0.85, pressão sustentada satura (~1) —
   * e a barra esvazia visivelmente em ~4–5 minutos sem ataque.
   */
  escalaNormalizacao: 0.24,
  /**
   * Ameaça por ação real. Chute soma o próprio xG além do peso-base (pênalti e
   * falta cobrada são chutes, então já vêm daqui — não têm peso extra). Só o
   * escanteio, que NÃO é chute, tem entrada própria.
   */
  ameacaChute: 0.05,
  ameacaChuteNoAlvo: 0.05, // adicional quando exige defesa
  ameacaEscanteio: 0.035,
  /** Território: ter o jogo no campo do rival pressiona um pouco por si só. */
  pesoTerritorio: 0.04,
} as const;

export const INCIDENTES_CAUSAL = {
  /** VAR (taxas herdadas da V1, já calibradas para net ~neutro nos gols). */
  probVarAnulaGol: 0.06,
  probVarPenalti: 0.06,
  /** Falta perigosa (cobrança de bola parada) por minuto/time. */
  probFaltaPerigosaPorMinuto: 0.014,
  /** Volume de faltas comuns/escanteios/impedimentos por minuto (reducers). */
  probFaltaComumPorMinuto: 0.115,
  probEscanteioPressaoPorMinuto: 0.032,
  probEscanteioAposChuteNaArea: 0.42,
  probImpedimentoPorMinuto: 0.016,
} as const;
