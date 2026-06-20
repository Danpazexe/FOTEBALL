/**
 * Identidade visual do FOTEBALL (paleta da spec, seção 16 de FOTEBALL.md).
 * Fonte única de cores/espaçamento usada por todas as telas e componentes.
 */

export const cores = {
  fundo: '#0A0E1A',
  fundoTopo: '#101A38',
  fundoBase: '#06090F',
  // Pitch / gramado (telas de jogo e tática).
  gramado: '#071B12',
  superficie: '#131929',
  superficieAlt: '#182231',
  superficieElevada: '#1B2740',
  borda: '#23304A',
  bordaClara: '#2E3D5C',
  // Vidro (glass) — superfícies translúcidas premium (nav, chips, overlays).
  glass: 'rgba(255, 255, 255, 0.045)',
  glassForte: 'rgba(255, 255, 255, 0.075)',
  bordaTransl: 'rgba(255, 255, 255, 0.08)',
  bordaTranslForte: 'rgba(255, 255, 255, 0.14)',
  primaria: '#00E5A0',
  primariaClara: '#46F2BE',
  primariaEscura: '#00A878',
  primariaGlow: 'rgba(0, 229, 160, 0.35)',
  secundaria: '#FFD600',
  secundariaClara: '#FFE36B',
  secundariaEscura: '#E0A400',
  perigo: '#FF3B5C',
  sucesso: '#22C55E',
  aviso: '#FF8A3D',
  texto: '#F0F4FF',
  textoSecundario: '#8892A4',
  textoMuted: '#5F6B82',
  contrastePrimaria: '#04130C',
} as const;

export const espaco = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const raio = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  xxl: 28,
  pill: 999,
} as const;

/**
 * Escala tipográfica condensada/forte (Premium UI v0.0.3). Números e títulos
 * grandes e apertados (peso 900, tracking negativo); rótulos de seção minúsculos
 * em CAIXA-ALTA espaçada. Espalhada pelos primitivos para dar "cara de jogo".
 */
export const tipografia = {
  display: {fontSize: 44, fontWeight: '900', letterSpacing: -1.2},
  placar: {fontSize: 38, fontWeight: '900', letterSpacing: -1},
  titulo: {fontSize: 28, fontWeight: '900', letterSpacing: -0.6},
  numero: {fontSize: 23, fontWeight: '900', letterSpacing: -0.4},
  secao: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  corpo: {fontSize: 13, fontWeight: '600'},
  chip: {fontSize: 11, fontWeight: '800', letterSpacing: 0.4},
} as const;

/**
 * Gradientes (listas de stops) usados por fundos e emblemas via react-native-svg.
 * Mantidos como `string[]` (não `as const`) para serem passados a props mutáveis.
 */
export const gradientes = {
  fundo: ['#101A38', '#0A0E1A', '#06090F'],
  primaria: ['#46F2BE', '#00E5A0', '#00A878'],
  // Premium UI v0.0.3 — superfícies profundas (3 stops) e acentos.
  card: ['#1B2740', '#131929', '#06090F'], // surfacePremium
  hero: ['#13315F', '#0C1428', '#06090F'], // matchHero
  ouro: ['#FFE36B', '#FFD600', '#E0A400'], // goldPrestige
  ouroEscuro: ['#111111', '#1B2740', '#0A0E1A'], // darkGold
  gramado: ['#0E3323', '#082116', '#05120C'], // pitch
  craque: ['#1A2B5C', '#0A1230'],
};

/** Sombras/elevação reutilizáveis (iOS shadow* + Android elevation). */
export const sombra = {
  suave: {
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.38,
    shadowRadius: 14,
    elevation: 6,
  },
  glow: {
    shadowColor: '#00E5A0',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  // Brilho dourado para botões/elementos premium (v0.0.2).
  ouro: {
    shadowColor: '#FFD600',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
};

/**
 * Nível/raridade da carta por faixa de overall — FONTE ÚNICA de cor e nome do
 * tier, usada tanto pela carta do jogador quanto pelo badge de overall, pela
 * lista de elenco etc. (padroniza tudo).
 *
 * Bronze <65 · Prata 65-74 · Ouro 75-84 · Lendário 85-89 · Especial 90+
 */
export type NivelCarta = {
  tipo: string;
  background: string;
  background2: string;
  primary: string;
  border: string;
  text: string;
  mutedText: string;
  player: string;
  playerShadow: string;
  /** Cor do glow (sombra colorida) do tier — usada em cartas/badges/mini-cartas. */
  glow: string;
};

export function nivelCarta(overall: number): NivelCarta {
  if (overall >= 90) {
    // Especial — azul-real profundo + ouro (topo de raridade, estilo TOTS).
    return {
      tipo: 'Especial',
      background: '#0B1E3F',
      background2: '#143D7A',
      primary: '#FFD600',
      border: '#9FC2F2',
      text: '#EAF2FF',
      mutedText: '#C7D6EE',
      player: '#AEB4BE',
      playerShadow: '#6F7680',
      glow: 'rgba(255, 214, 0, 0.38)',
    };
  }
  if (overall >= 85) {
    // Lendário — preto + ouro vivo (carta In-Form/TOTW).
    return {
      tipo: 'Lendário',
      background: '#111111',
      background2: '#2A2616',
      primary: '#FFD600',
      border: '#F6D873',
      text: '#FCE9A6',
      mutedText: '#E0C462',
      player: '#BDBDBD',
      playerShadow: '#757575',
      glow: 'rgba(255, 214, 0, 0.34)',
    };
  }
  if (overall >= 75) {
    // Ouro — dourado vivo do FIFA.
    return {
      tipo: 'Ouro',
      background: '#725600',
      background2: '#B8901E',
      primary: '#FFD600',
      border: '#FFE36B',
      text: '#FFF6D6',
      mutedText: '#F0D98A',
      player: '#BBBBBB',
      playerShadow: '#777777',
      glow: 'rgba(255, 214, 0, 0.30)',
    };
  }
  if (overall >= 65) {
    // Prata — metálico claro e limpo.
    return {
      tipo: 'Prata',
      background: '#5D6675',
      background2: '#8A93A2',
      primary: '#E5ECF7',
      border: '#F2F5FA',
      text: '#FBFCFE',
      mutedText: '#D6DCE6',
      player: '#B6B6B6',
      playerShadow: '#727272',
      glow: 'rgba(199, 209, 224, 0.30)',
    };
  }
  // Bronze — cobre quente.
  return {
    tipo: 'Bronze',
    background: '#70451F',
    background2: '#9C6432',
    primary: '#D1863F',
    border: '#E0A35C',
    text: '#F8E4CC',
    mutedText: '#E0BD97',
    player: '#AFAFAF',
    playerShadow: '#6E6E6E',
    glow: 'rgba(209, 134, 63, 0.28)',
  };
}

/** Cor do badge/anel de overall — derivada do MESMO tier da carta. */
export function corOverall(overall: number): string {
  return nivelCarta(overall).border;
}

/**
 * Glow (sombra colorida) do tier do jogador — dá profundidade premium a badges,
 * cartas e mini-cartas, na cor da raridade (v0.0.2).
 */
export function glowDoTier(overall: number) {
  return {
    shadowColor: nivelCarta(overall).border,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 8,
  };
}

/** Cor da barra de condição física (verde→amarelo→vermelho). */
export function corCondicao(valor: number): string {
  if (valor >= 75) {
    return cores.primaria;
  }
  if (valor >= 45) {
    return cores.secundaria;
  }
  return cores.perigo;
}

/**
 * Paleta de cores "de camisa" para identificar visualmente cada clube na
 * narração (balões/badges). Os dados não trazem cor, então derivamos uma cor
 * estável a partir do id do clube — sempre a mesma para o mesmo clube.
 */
// Paleta curada para o tema (verde/dourado/azul-noite): tons vivos e legíveis
// sobre o fundo escuro, espalhados de quente a frio para que dois times num
// confronto contrastem. Sem roxo/violeta/rosa/marrom (que destoavam da marca).
const CORES_TIME = [
  '#E5484D', // vermelho
  '#FF7A5C', // coral
  '#F4511E', // telha
  '#FB8C00', // laranja
  '#F5A623', // âmbar
  '#FDD835', // amarelo
  '#C0CA33', // lima
  '#43A047', // verde
  '#10B981', // esmeralda
  '#00897B', // teal
  '#00ACC1', // ciano
  '#26A9E0', // azul-céu
  '#1E88E5', // azul
  '#2979FF', // azul-vivo
] as const;

/** Cor estável de um clube (hash determinístico do id sobre a paleta). */
export function corDoTime(clubeId: string): string {
  let hash = 0;
  for (let i = 0; i < clubeId.length; i += 1) {
    hash = (hash * 31 + clubeId.charCodeAt(i)) >>> 0;
  }
  return CORES_TIME[hash % CORES_TIME.length];
}

/**
 * Paleta de cores (camisa) de cada clube da Série A, por sigla — usada nas
 * barras laterais do placar (faixas). 1 a 3 cores por time.
 */
const PALETAS_TIME: Record<string, string[]> = {
  FLA: ['#E30613', '#111111'],
  PAL: ['#0E6B33', '#FFFFFF'],
  CAM: ['#111111', '#FFFFFF'],
  BOT: ['#111111', '#FFFFFF'],
  SPF: ['#E30613', '#FFFFFF', '#111111'],
  FLU: ['#7A0026', '#0E6B33', '#FFFFFF'],
  COR: ['#111111', '#FFFFFF'],
  CRU: ['#1B3A8B', '#FFFFFF'],
  GRE: ['#0D80BF', '#111111', '#FFFFFF'],
  VAS: ['#111111', '#FFFFFF', '#E30613'],
  BAH: ['#0B5BA6', '#E30613', '#FFFFFF'],
  INT: ['#E30613', '#FFFFFF'],
  RBB: ['#E30613', '#FFFFFF'],
  MIR: ['#F2C200', '#0E6B33'],
  VIT: ['#E30613', '#111111'],
  SAN: ['#111111', '#FFFFFF'],
  CAP: ['#E30613', '#111111', '#FFFFFF'],
  CFC: ['#0E6B33', '#FFFFFF'],
  CHA: ['#0E6B33', '#FFFFFF'],
  REM: ['#0B3A8B', '#FFFFFF'],
};

/** Faixas de cor (camisa) de um clube pela sigla. Fallback: cor única lime. */
export function paletaDoTime(sigla: string): string[] {
  const paleta = PALETAS_TIME[sigla.toUpperCase()];
  return paleta && paleta.length > 0 ? paleta : ['#D6FF00'];
}

/** Texto legível (claro/escuro) sobre uma cor de fundo sólida. */
export function contrasteTexto(corHex: string): string {
  const hex = corHex.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminancia > 0.6 ? '#0A0E1A' : '#FFFFFF';
}
