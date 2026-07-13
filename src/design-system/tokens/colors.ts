/**
 * Tokens de cor SEMÂNTICOS do Design System v2 ("Sala de Análise").
 *
 * Neutros em 75-85% da interface; AZUL = ação/interativo (CTA, seleção, destaque);
 * verde = estado positivo (êxito, boa fase); âmbar = atenção/gol/conquista;
 * vermelho = risco/derrota/destrutivo; azul-info = informação/comparação.
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
};

// ============================================================================
// TEMA CLARO — padrão do produto (briefing §5.2).
// ============================================================================

export const coresClaras: CoresSemanticas = {
  canvas: '#F4F6F8',
  surface: '#FFFFFF',
  surfaceSubtle: '#F8FAFB',
  surfacePressed: '#EEF2F4',
  border: '#E1E7EB',
  borderStrong: '#C9D2D9',
  textPrimary: '#101820',
  textSecondary: '#5B6773',
  textMuted: '#7E8A94',
  brand: '#2878F0',
  brandStrong: '#1B5FD9',
  brandSoft: '#E9F1FF',
  onBrand: '#FFFFFF',
  accent: '#F2B43C',
  accentSoft: '#FFF5D9',
  info: '#2878F0',
  infoSoft: '#EAF2FF',
  success: '#158A4B',
  warning: '#C98200',
  danger: '#D64545',
  dangerSoft: '#FDECEC',
  overlay: 'rgba(10, 18, 24, 0.56)',
  scoreboard: '#152238',
  onScoreboard: '#F2F6F8',
};

export const esporteClaro: CoresEsporte = {
  match: {
    goal: '#13A65A',
    cardYellow: '#F2B43C',
    cardRed: '#D64545',
    substitutionIn: '#158A4B',
    substitutionOut: '#C98200',
    var: '#2878F0',
    injury: '#D64545',
  },
  form: {win: '#158A4B', draw: '#7E8A94', loss: '#D64545'},
  zone: {
    promotion: '#158A4B',
    continental: '#2878F0',
    playoff: '#C98200',
    relegation: '#D64545',
  },
  fitness: {high: '#158A4B', medium: '#C98200', low: '#D64545'},
  morale: {high: '#158A4B', medium: '#C98200', low: '#D64545'},
};

// ============================================================================
// TEMA ESCURO — alternativa completa (briefing §5.3).
// ============================================================================

export const coresEscuras: CoresSemanticas = {
  canvas: '#0B1115',
  surface: '#121A20',
  surfaceSubtle: '#172128',
  surfacePressed: '#202C34',
  border: '#27343D',
  borderStrong: '#3B4A54',
  textPrimary: '#F2F6F8',
  textSecondary: '#A9B4BC',
  textMuted: '#788690',
  brand: '#4F9CFF',
  brandStrong: '#2F6FD6',
  brandSoft: '#14243D',
  onBrand: '#FFFFFF',
  accent: '#FFC857',
  accentSoft: '#3A2D12',
  info: '#62A0FF',
  infoSoft: '#152A47',
  success: '#31C776',
  warning: '#F1B94B',
  danger: '#FF6B63',
  dangerSoft: '#3D2020',
  overlay: 'rgba(0, 0, 0, 0.72)',
  scoreboard: '#101C2E',
  onScoreboard: '#F2F6F8',
};

export const esporteEscuro: CoresEsporte = {
  match: {
    goal: '#31C776',
    cardYellow: '#FFC857',
    cardRed: '#FF6B63',
    substitutionIn: '#31C776',
    substitutionOut: '#F1B94B',
    var: '#62A0FF',
    injury: '#FF6B63',
  },
  form: {win: '#31C776', draw: '#788690', loss: '#FF6B63'},
  zone: {
    promotion: '#31C776',
    continental: '#62A0FF',
    playoff: '#F1B94B',
    relegation: '#FF6B63',
  },
  fitness: {high: '#31C776', medium: '#F1B94B', low: '#FF6B63'},
  morale: {high: '#31C776', medium: '#F1B94B', low: '#FF6B63'},
};
