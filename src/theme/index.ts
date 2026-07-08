/**
 * Identidade visual do FOTEBALL — UM só tema: "Noite de estádio".
 *
 * `temaEscuro` é o mundo do jogo: gramado à noite, linha de cal e refletor
 * âmbar. Não há mais modo dia — o produto "não pisca entre temas".
 *
 * Os exports `cores`/`suaves`/`acentos`/`gradientes`/`sombra` apontam para esse
 * tema; as telas podem importá-los como constante OU consumir via `useTema()`/
 * `useEstilos()` (que leem exatamente do mesmo tema).
 *
 * ESTE ARQUIVO É PURO (sem React) — os hooks `useTema`/`useEstilos` vivem em
 * `./useTema` para não puxar React onde não deve (ex.: engine). O único import é
 * de TIPO (`TextStyle`, apagado em build), então não puxa runtime de RN/React.
 */

import type {TextStyle} from 'react-native';

/** Forma dos tokens de cor — idêntica em ambos os temas. */
export type PaletaCores = {
  fundo: string;
  fundoTopo: string;
  fundoBase: string;
  gramado: string;
  superficie: string;
  superficieAlt: string;
  superficieElevada: string;
  borda: string;
  bordaClara: string;
  glass: string;
  glassForte: string;
  bordaTransl: string;
  bordaTranslForte: string;
  primaria: string;
  primariaClara: string;
  primariaEscura: string;
  primariaGlow: string;
  secundaria: string;
  secundariaClara: string;
  secundariaEscura: string;
  perigo: string;
  sucesso: string;
  aviso: string;
  texto: string;
  textoSecundario: string;
  textoMuted: string;
  contrastePrimaria: string;
};

/** Fundos suaves de badge/pill (mesmo matiz do texto de acento). */
export type PaletaSuaves = {
  verde: string;
  amarelo: string;
  vermelho: string;
  azul: string;
  laranja: string;
  rosa: string;
};

/** Cores de acento (texto forte sobre `suaves`). */
export type PaletaAcentos = PaletaSuaves;

/** Listas de stops para gradientes (react-native-svg). */
export type Gradientes = {
  fundo: string[];
  primaria: string[];
  card: string[];
  hero: string[];
  ouro: string[];
  ouroEscuro: string[];
  gramado: string[];
  craque: string[];
};

/** Sombra/elevação (iOS shadow* + Android elevation). */
export type EstiloSombra = {
  shadowColor: string;
  shadowOffset: {width: number; height: number};
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

export type Sombras = {
  suave: EstiloSombra;
  card: EstiloSombra;
  glow: EstiloSombra;
  ouro: EstiloSombra;
};

/** Um tema completo — a unidade que o hook entrega às telas. */
export type Tema = {
  cores: PaletaCores;
  suaves: PaletaSuaves;
  acentos: PaletaAcentos;
  gradientes: Gradientes;
  sombra: Sombras;
};

// ============================================================================
// TEMA ESCURO ("Noite de estádio" · ÚNICO): gramado à noite (preto-esverdeado),
// linha de cal (chalk) e refletor âmbar como acento raro. Verde = estrutura/
// positivo; âmbar = o destaque (craque, gol, o que pede atenção).
// ============================================================================

const CORES_ESCURO: PaletaCores = {
  fundo: '#0B120D',
  fundoTopo: '#0E1712',
  fundoBase: '#080D0A',
  gramado: '#0C1611',
  superficie: '#101A13',
  superficieAlt: '#152118',
  superficieElevada: '#16241A',
  borda: '#25382B',
  bordaClara: '#2F4736',
  glass: 'rgba(234, 242, 230, 0.05)',
  glassForte: 'rgba(234, 242, 230, 0.09)',
  bordaTransl: 'rgba(234, 242, 230, 0.10)',
  bordaTranslForte: 'rgba(234, 242, 230, 0.16)',
  primaria: '#1FA45B',
  primariaClara: '#3FC97D',
  primariaEscura: '#14713F',
  primariaGlow: 'rgba(31, 164, 91, 0.30)',
  secundaria: '#F4B740',
  secundariaClara: '#FFD57A',
  secundariaEscura: '#C98A12',
  perigo: '#EB5B45',
  sucesso: '#34C56C',
  aviso: '#E6B93C',
  texto: '#EAF2E6',
  textoSecundario: '#8FA89A',
  textoMuted: '#5F7567',
  // Texto/ícone sobre preenchimentos de acento (verde/âmbar) — escuro para o
  // rótulo "cravar" no acento vivo (visual esportivo). NÃO usar como polegar de
  // Switch (some no trilho escuro) — lá use branco explícito.
  contrastePrimaria: '#06140D',
};

const SUAVES_ESCURO: PaletaSuaves = {
  verde: 'rgba(52, 197, 108, 0.16)',
  amarelo: 'rgba(230, 185, 60, 0.16)',
  vermelho: 'rgba(235, 91, 69, 0.16)',
  azul: 'rgba(74, 160, 240, 0.16)',
  laranja: 'rgba(244, 183, 64, 0.16)',
  rosa: 'rgba(236, 123, 172, 0.16)',
};

const ACENTOS_ESCURO: PaletaAcentos = {
  verde: '#3AD07E',
  amarelo: '#E6B93C',
  vermelho: '#F0715C',
  azul: '#4AA0F0',
  laranja: '#F4B740',
  rosa: '#EC7BAC',
};

const GRADIENTES_ESCURO: Gradientes = {
  fundo: ['#0E1712', '#0A110C', '#070C09'],
  primaria: ['#3FC97D', '#1FA45B', '#14713F'],
  card: ['#16241A', '#111C15', '#0D1610'],
  hero: ['#16281D', '#101E16', '#0B130E'],
  ouro: ['#FFD57A', '#F4B740', '#C98A12'],
  ouroEscuro: ['#1A2416', '#241F10', '#0D1610'],
  gramado: ['#123A26', '#0E2E1E', '#0A2016'],
  craque: ['#16281D', '#101E16'],
};

const SOMBRA_ESCURO: Sombras = {
  suave: {
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 1,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 3,
  },
  glow: {
    shadowColor: '#1FA45B',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  ouro: {
    shadowColor: '#F4B740',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
};

// ============================================================================
// TEMA montado (único = "noite de estádio") + exports de compatibilidade.
// ============================================================================

export const temaEscuro: Tema = {
  cores: CORES_ESCURO,
  suaves: SUAVES_ESCURO,
  acentos: ACENTOS_ESCURO,
  gradientes: GRADIENTES_ESCURO,
  sombra: SOMBRA_ESCURO,
};

/**
 * Exports de compatibilidade — apontam para o tema ESCURO (default). Telas ainda
 * não migradas para `useTema()` os importam como constante e ficam no escuro.
 */
export const cores = CORES_ESCURO;
export const suaves = SUAVES_ESCURO;
export const acentos = ACENTOS_ESCURO;
export const gradientes = GRADIENTES_ESCURO;
export const sombra = SOMBRA_ESCURO;

// ============================================================================
// Tokens independentes de tema (espaço, raio, tipografia) — únicos.
// ============================================================================

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
 * "O número é sagrado" — ative `tabular` (tabular-nums) em QUALQUER texto onde
 * dígitos se alinham em coluna: placar, overall, saldo, minuto, tabela. Garante
 * que cada dígito ocupe a mesma largura (colunas que casam), usando a fonte de
 * sistema — sem precisar embarcar uma fonte mono. Compose: `[styles.x, tabular]`
 * ou `{...tipografia.numero, ...tabular}`.
 */
export const tabular: TextStyle = {fontVariant: ['tabular-nums']};

/**
 * Escala tipográfica condensada/forte. Números e títulos grandes e apertados
 * (peso 900, tracking negativo); rótulos de seção minúsculos em CAIXA-ALTA
 * espaçada. Espalhada pelos primitivos para dar "cara de jogo".
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
 * Nível/raridade da carta por faixa de overall — FONTE ÚNICA de cor e nome do
 * tier, usada tanto pela carta do jogador quanto pelo badge de overall, pela
 * lista de elenco etc. (padroniza tudo). Independente de tema (uma carta de ouro
 * é ouro no dia e na noite).
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
 * das fichas. Usa os tokens do tema default (escuro).
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
// Paleta curada (verde/dourado/azul-noite): tons vivos e legíveis, espalhados de
// quente a frio para que dois times num confronto contrastem. Sem roxo/rosa/marrom.
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
 * a cor escura da identidade. Fallback: corDoTime (hash) para clubes fora do mapa.
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

/**
 * Cor sólida (#RRGGBB) → string rgba() com alfa. Serve para derivar tints de
 * estado (fundo/borda suaves) a partir de um token do tema, sem hardcodar rgba
 * nem concatenar hex opaco (`${cor}22`) — anti-padrão espalhado pelas telas.
 * "O acento é raro": use tints fracos (0.10–0.16) para o fundo de selos/chips
 * de estado e reserve a cor cheia para o texto/borda.
 */
export function comAlfa(corHex: string, alfa: number): string {
  const hex = corHex.replace('#', '');
  const n = hex.length === 3
    ? hex.split('').map(c => c + c).join('')
    : hex;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alfa})`;
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
