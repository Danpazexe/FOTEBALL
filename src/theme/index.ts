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

// corOverall/nivelCarta/glowDoTier foram APOSENTADOS na migração ao design
// system (decisão de produto): a régua única do overall é faixaCorOverall
// (design-system/tokens/colors), resolvida pelo tema ativo. Os 5 tiers de
// carta (Bronze/Prata/Ouro/Lendário/Especial) saíram do produto.

// corAdaptacao migrou para o design system: `corEncaixe(nivel, cores)` em
// src/design-system/sports/corEncaixe (natural agora é NEUTRO; desvios usam
// info/warning/danger — decisão de produto de 2026-07-21).

// corCondicao migrou para o design system: `corCondicao(valor, esporte)` em
// src/design-system/sports/corCondicao (fonte única, mesmos limiares 75/45).

// corDoTime/contrasteTexto migraram para o design system:
// src/design-system/sports/corDoTime (fonte única da identidade de cor do clube).

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
