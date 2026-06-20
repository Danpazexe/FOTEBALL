/**
 * Identidade visual do FOTEBALL (paleta da spec, seção 16 de FOTEBALL.md).
 * Fonte única de cores/espaçamento usada por todas as telas e componentes.
 */

export const cores = {
  fundo: '#0A0E1A',
  fundoTopo: '#101A38',
  fundoBase: '#06090F',
  superficie: '#131929',
  superficieAlt: '#182231',
  superficieElevada: '#1B2740',
  borda: '#23304A',
  bordaClara: '#2E3D5C',
  primaria: '#00E5A0',
  primariaClara: '#46F2BE',
  primariaEscura: '#00A878',
  primariaGlow: 'rgba(0, 229, 160, 0.35)',
  secundaria: '#FFD600',
  secundariaEscura: '#E0B400',
  perigo: '#FF3B5C',
  sucesso: '#22C55E',
  aviso: '#FF8A3D',
  texto: '#F0F4FF',
  textoSecundario: '#8892A4',
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
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

/**
 * Gradientes (listas de stops) usados por fundos e emblemas via react-native-svg.
 * Mantidos como `string[]` (não `as const`) para serem passados a props mutáveis.
 */
export const gradientes = {
  fundo: ['#101A38', '#0A0E1A', '#06090F'],
  primaria: ['#46F2BE', '#00E5A0', '#00A878'],
  hero: ['#13315F', '#0C1428'],
  ouro: ['#FFE36B', '#FFD600', '#E0A400'],
  // v0.0.2 (premium): superfície elevada e acento de craque (azul-marinho fundo).
  card: ['#1B2740', '#131929'],
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
};

export function nivelCarta(overall: number): NivelCarta {
  if (overall >= 90) {
    // Especial — estilo TOTS (azul-marinho + ouro), topo de raridade.
    return {
      tipo: 'Especial',
      background: '#06122B',
      background2: '#0E2C63',
      primary: '#F2D06B',
      border: '#F6DC85',
      text: '#FBE9A6',
      mutedText: '#D8C77F',
      player: '#AEB4BE',
      playerShadow: '#6F7680',
    };
  }
  if (overall >= 85) {
    // Lendário — estilo carta preta (TOTW/In-Form): preto + ouro.
    return {
      tipo: 'Lendário',
      background: '#0C0C0E',
      background2: '#242012',
      primary: '#D4AF37',
      border: '#F4D470',
      text: '#F7DE8A',
      mutedText: '#E0C462',
      player: '#B8B8B8',
      playerShadow: '#747474',
    };
  }
  if (overall >= 75) {
    // Ouro — dourado clássico do FIFA.
    return {
      tipo: 'Ouro',
      background: '#7A5E15',
      background2: '#C79A2E',
      primary: '#E7C45A',
      border: '#F2D275',
      text: '#FCE9A6',
      mutedText: '#E9CE78',
      player: '#B7B7B7',
      playerShadow: '#777777',
    };
  }
  if (overall >= 65) {
    // Prata — cinza metálico.
    return {
      tipo: 'Prata',
      background: '#4C5157',
      background2: '#9CA2A9',
      primary: '#C7CCD2',
      border: '#E2E6EA',
      text: '#F4F6F8',
      mutedText: '#CFD4DA',
      player: '#AFAFAF',
      playerShadow: '#6E6E6E',
    };
  }
  // Bronze — marrom/cobre.
  return {
    tipo: 'Bronze',
    background: '#4A2E18',
    background2: '#7A4A24',
    primary: '#B87333',
    border: '#C58A4E',
    text: '#F3D8B6',
    mutedText: '#D9AE85',
    player: '#A9A9A9',
    playerShadow: '#686868',
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
