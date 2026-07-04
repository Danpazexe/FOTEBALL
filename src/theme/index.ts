/**
 * Identidade visual do FOTEBALL (paleta da spec, seção 16 de FOTEBALL.md).
 * Fonte única de cores/espaçamento usada por todas as telas e componentes.
 */

/**
 * Paleta CLARA (modelo SofaScore, a pedido do usuário): fundo cinza-claro,
 * cards brancos, texto azul-marinho e acentos vivos. A API de tokens é a
 * mesma da era escura — as telas que consomem tokens re-tematizam sozinhas.
 */
export const cores = {
  fundo: '#F1F3F7',
  fundoTopo: '#FFFFFF',
  fundoBase: '#E9EDF3',
  // Pitch / gramado (telas de jogo e tática) — verde suave sobre o claro.
  gramado: '#E3F2E8',
  superficie: '#FFFFFF',
  superficieAlt: '#F7F9FC',
  superficieElevada: '#FFFFFF',
  borda: '#E5E9F0',
  bordaClara: '#D9DFEA',
  // "Vidro" no claro: véus azul-marinho sutis (chips, nav, overlays).
  glass: 'rgba(23, 35, 59, 0.045)',
  glassForte: 'rgba(23, 35, 59, 0.075)',
  bordaTransl: 'rgba(23, 35, 59, 0.10)',
  bordaTranslForte: 'rgba(23, 35, 59, 0.16)',
  primaria: '#12B76A',
  primariaClara: '#3BD68B',
  primariaEscura: '#0A9153',
  primariaGlow: 'rgba(18, 183, 106, 0.22)',
  secundaria: '#E5A400',
  secundariaClara: '#FFC93C',
  secundariaEscura: '#B7791F',
  perigo: '#E5484D',
  sucesso: '#12B76A',
  aviso: '#E08700',
  texto: '#17233B',
  textoSecundario: '#7C8698',
  textoMuted: '#9AA4B5',
  contrastePrimaria: '#FFFFFF',
} as const;

/**
 * Tons SUAVES + acentos (modelo): fundos de badge/pill com texto forte do
 * mesmo matiz — posição do jogador, nota, chips de status.
 */
export const suaves = {
  verde: '#E4F7EE',
  amarelo: '#FFF4D6',
  vermelho: '#FFECEE',
  azul: '#E7F0FE',
  laranja: '#FFF1DE',
  rosa: '#FBE7F0',
} as const;

export const acentos = {
  verde: '#12B76A',
  amarelo: '#C99A06',
  vermelho: '#E5484D',
  azul: '#1D6FE0',
  laranja: '#D97A00',
  rosa: '#D6336C',
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
  fundo: ['#FFFFFF', '#F4F6FA', '#E9EDF3'],
  primaria: ['#3BD68B', '#12B76A', '#0A9153'],
  // Superfícies claras (3 stops) e acentos do modelo.
  card: ['#FFFFFF', '#F7F9FC', '#EEF2F7'], // surfacePremium
  hero: ['#E7F0FE', '#F4F7FC', '#FFFFFF'], // matchHero
  ouro: ['#FFD883', '#E5A400', '#B7791F'], // goldPrestige
  ouroEscuro: ['#FFFFFF', '#F6EED9', '#E9EDF3'], // darkGold (claro)
  gramado: ['#DFF2E5', '#EAF6EE', '#F4FBF6'], // pitch
  craque: ['#E7F0FE', '#F4F7FC'],
};

/** Sombras/elevação reutilizáveis (iOS shadow* + Android elevation). */
/**
 * Sombras CLEAN (pedido do usuário): quase planas — uma pluma de profundidade
 * em vez de brilho. Nada de glow forte; a hierarquia vem de borda + fundo.
 */
export const sombra = {
  suave: {
    shadowColor: '#0F1E3D',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  card: {
    shadowColor: '#0F1E3D',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  glow: {
    shadowColor: '#12B76A',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 3,
  },
  // Toque dourado discreto para elementos premium.
  ouro: {
    shadowColor: '#E5A400',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.14,
    shadowRadius: 7,
    elevation: 3,
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

/**
 * Cor que comunica o encaixe do jogador na posição escalada (verde = natural,
 * azul = similar, dourado = adaptado, vermelho = improviso). FONTE ÚNICA usada
 * por TODAS as telas de escalação (DraggablePitch, AjustesPartida) para o anel
 * das fichas. Import type-only do nível — sem acoplamento de runtime.
 */
export function corAdaptacao(
  nivel: 'natural' | 'similar' | 'adaptado' | 'improvisado',
): string {
  if (nivel === 'natural') {
    return cores.primaria;
  }
  if (nivel === 'similar') {
    return acentos.azul;
  }
  if (nivel === 'adaptado') {
    return cores.secundaria;
  }
  return cores.perigo;
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
 * Cor de camisa/identidade REAL dos clubes (aprox. da cor predominante do
 * escudo/uniforme), usada nas camisas dos cards. Times de uniforme branco usam
 * a cor escura da identidade (senão sumiriam no gramado claro). Fallback:
 * corDoTime (hash) para clubes fora do mapa (ex.: Série B/C).
 */
const CORES_CLUBE: Record<string, string> = {
  club_flamengo: '#C8102E',
  club_corinthians: '#151515',
  club_palmeiras: '#016436',
  club_sao_paulo: '#E4002B',
  club_santos: '#151515',
  club_vasco: '#151515',
  club_fluminense: '#7A1C2E',
  club_botafogo: '#151515',
  club_gremio: '#0D80BF',
  club_cruzeiro: '#1D4A9E',
  club_internacional: '#D6001C',
  club_atletico_mg: '#1A1A1A',
  club_bahia: '#1B54A4',
  club_vitoria: '#D6001C',
  club_bragantino: '#E30613',
  club_mirassol: '#0A8A3F',
  club_athletico_pr: '#C4122E',
  club_chapecoense: '#0A8B4C',
  club_coritiba: '#0A6B3B',
  club_remo: '#003DA5',
};

/** Cor real da camisa do clube (fallback: hash de corDoTime). */
export function corDoClube(clubeId: string): string {
  return CORES_CLUBE[clubeId] ?? corDoTime(clubeId);
}

/** Texto legível (claro/escuro) sobre uma cor de fundo sólida. */
export function contrasteTexto(corHex: string): string {
  const hex = corHex.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminancia > 0.6 ? '#17233B' : '#FFFFFF';
}
