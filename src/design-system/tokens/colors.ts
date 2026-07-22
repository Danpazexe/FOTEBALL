/**
 * Tokens de cor SEMÂNTICOS do Design System v3 — North Star "GERAL (torcida/
 * cartaz)": cartaz brasileiro de arquibancada.
 *
 * Papel #F2EFE6 (canvas claro), tinta #141414, VERDE-BANDEIRA #009C3B = ação/
 * brand (CTA, seleção, destaque); amarelo #FFCF00 = accent (gol, craque,
 * conquista); azul #2456D6 = info/comparação; vermelho tijolo = risco/derrota.
 * Tema escuro = "cartaz à noite": canvas tinta, texto papel, mesmos verde/
 * amarelo (tons ajustados para AA sobre surface escura).
 *
 * Estas paletas são a FONTE DA VERDADE do tema novo — telas migradas consomem
 * daqui via `useTheme()`. O tema antigo (`src/theme`) segue como ponte para as
 * telas ainda não migradas (ADR-0002/0003).
 *
 * PURO (sem React/RN). O único import é de TIPO.
 */

/** Cores de interface (mesma forma no claro e no escuro). */
export type CoresSemanticas = {
  /** Fundo geral da tela. */
  canvas: string;
  /** Cards, listas, headers. */
  surface: string;
  /** Agrupamento leve dentro de uma superfície. */
  surfaceSubtle: string;
  /** Estado pressionado de uma superfície tocável. */
  surfacePressed: string;
  /** Separadores e bordas padrão. */
  border: string;
  /** Bordas de input/foco neutro. */
  borderStrong: string;
  /** Texto principal. */
  textPrimary: string;
  /** Texto secundário (contraste AA em surface). */
  textSecondary: string;
  /** Metadado não essencial. */
  textMuted: string;
  /** Ação/interativo (azul): CTA, seleção, ícones ativos, gráficos. */
  brand: string;
  /** Ação preenchida (botão) com texto `onBrand`. */
  brandStrong: string;
  /** Fundo suave de seleção/badge de ação. */
  brandSoft: string;
  /** Conteúdo sobre `brandStrong`. */
  onBrand: string;
  /** Âmbar: gol, craque, conquista, atenção premium. */
  accent: string;
  /** Fundo de selo âmbar. */
  accentSoft: string;
  /** Informação/comparação. */
  info: string;
  /** Fundo informativo. */
  infoSoft: string;
  /** Sucesso funcional. */
  success: string;
  /** Alerta. */
  warning: string;
  /** Erro, risco, destrutivo. */
  danger: string;
  /** Fundo de alerta/erro. */
  dangerSoft: string;
  /** Véu de modais/sheets. */
  overlay: string;
  /** Superfície de destaque de partida (placar/hero) — azul-marinho nos 2 temas. */
  scoreboard: string;
  /** Conteúdo sobre `scoreboard`. */
  onScoreboard: string;
};

/**
 * Cores ESPORTIVAS semânticas — separadas das cores de UI (briefing §5.4).
 * Nunca comunicar estado só por cor: combinar sempre com texto/ícone/shape.
 */
export type CoresEsporte = {
  match: {
    goal: string;
    cardYellow: string;
    cardRed: string;
    substitutionIn: string;
    substitutionOut: string;
    var: string;
    injury: string;
  };
  form: {win: string; draw: string; loss: string};
  zone: {
    promotion: string;
    continental: string;
    playoff: string;
    relegation: string;
  };
  fitness: {high: string; medium: string; low: string};
  morale: {high: string; medium: string; low: string};
  /** Cor por ÁREA de posição (selo de função): goleiro/defesa/meio/ataque. */
  posicao: {
    goleiro: {cor: string; fundo: string};
    defesa: {cor: string; fundo: string};
    meio: {cor: string; fundo: string};
    ataque: {cor: string; fundo: string};
  };
};

// ============================================================================
// TEMA CLARO — padrão do produto (briefing §5.2).
// ============================================================================

export const coresClaras: CoresSemanticas = {
  canvas: '#F2EFE6',
  surface: '#FAF7EC',
  surfaceSubtle: '#EAE6D8',
  surfacePressed: '#E1DCC9',
  border: '#D6D0BC',
  borderStrong: '#141414',
  textPrimary: '#141414',
  textSecondary: '#524F45',
  textMuted: '#6F6A5C',
  brand: '#009C3B',
  brandStrong: '#00742D',
  brandSoft: '#DCEEDB',
  onBrand: '#FFFFFF',
  accent: '#FFCF00',
  accentSoft: '#F6E9B8',
  info: '#2456D6',
  infoSoft: '#DCE4F7',
  success: '#0B7A33',
  warning: '#8A5E00',
  danger: '#C7362B',
  dangerSoft: '#F7DCD4',
  overlay: 'rgba(20, 20, 20, 0.55)',
  scoreboard: '#141414',
  onScoreboard: '#F2EFE6',
};

export const esporteClaro: CoresEsporte = {
  match: {
    goal: '#009C3B',
    cardYellow: '#F2B43C',
    cardRed: '#C7362B',
    substitutionIn: '#0B7A33',
    substitutionOut: '#C98200',
    var: '#2456D6',
    injury: '#C7362B',
  },
  form: {win: '#0B7A33', draw: '#6F6A5C', loss: '#C7362B'},
  zone: {
    promotion: '#0B7A33',
    continental: '#2456D6',
    playoff: '#C98200',
    relegation: '#C7362B',
  },
  fitness: {high: '#0B7A33', medium: '#C98200', low: '#C7362B'},
  morale: {high: '#0B7A33', medium: '#C98200', low: '#C7362B'},
  posicao: {
    goleiro: {cor: '#7C4DFF', fundo: '#EEE9FF'},
    defesa: {cor: '#2456D6', fundo: '#E6F0FD'},
    meio: {cor: '#0B7A33', fundo: '#E4F6EC'},
    ataque: {cor: '#C7362B', fundo: '#FBE9E9'},
  },
};

// ============================================================================
// TEMA ESCURO — "cartaz à noite": canvas tinta, texto papel, mesmos verde/
// amarelo (tons clareados onde preciso para AA sobre surface escura). Sobre os
// preenchimentos coloridos (brandStrong/accent/danger) o conteúdo é TINTA
// (`onBrand` escuro), como serigrafia sobre cor chapada.
// ============================================================================

export const coresEscuras: CoresSemanticas = {
  canvas: '#141414',
  surface: '#1D1D1B',
  surfaceSubtle: '#242421',
  surfacePressed: '#2C2C28',
  border: '#34342F',
  borderStrong: '#6C6B62',
  textPrimary: '#F2EFE6',
  textSecondary: '#C9C5B8',
  textMuted: '#98948A',
  brand: '#2EC167',
  brandStrong: '#009C3B',
  brandSoft: '#14301D',
  onBrand: '#141414',
  accent: '#FFCF00',
  accentSoft: '#35300F',
  info: '#7B9EF0',
  infoSoft: '#1C2440',
  success: '#3BCB74',
  warning: '#FFB020',
  danger: '#FF6B5E',
  dangerSoft: '#3B211D',
  overlay: 'rgba(0, 0, 0, 0.72)',
  scoreboard: '#0B0B0A',
  onScoreboard: '#F2EFE6',
};

export const esporteEscuro: CoresEsporte = {
  match: {
    goal: '#31C776',
    cardYellow: '#FFC857',
    cardRed: '#FF6B63',
    substitutionIn: '#31C776',
    substitutionOut: '#F1B94B',
    var: '#7B9EF0',
    injury: '#FF6B63',
  },
  form: {win: '#31C776', draw: '#788690', loss: '#FF6B63'},
  zone: {
    promotion: '#31C776',
    continental: '#7B9EF0',
    playoff: '#F1B94B',
    relegation: '#FF6B63',
  },
  fitness: {high: '#31C776', medium: '#F1B94B', low: '#FF6B63'},
  morale: {high: '#31C776', medium: '#F1B94B', low: '#FF6B63'},
  posicao: {
    goleiro: {cor: '#B39BFF', fundo: '#2A2447'},
    defesa: {cor: '#63A4FF', fundo: '#15263F'},
    meio: {cor: '#43C77E', fundo: '#123626'},
    ataque: {cor: '#FF6E66', fundo: '#3B1E1E'},
  },
};

/**
 * Cor semântica por FAIXA de overall — régua única do anel/badge de overall:
 * ≥75 verde (success), ≥60 âmbar (warning), abaixo vermelho (danger). Devolve um
 * token semântico (índice de CoresSemanticas), resolvido pela cor do tema ativo.
 */
export function faixaCorOverall(overall: number): keyof CoresSemanticas {
  if (overall >= 75) {
    return 'success';
  }
  if (overall >= 60) {
    return 'warning';
  }
  return 'danger';
}
