import {Platform, type TextStyle} from 'react-native';

/**
 * Tipografia oficial do FOTEBALL.
 *
 * As famílias abaixo assumem que os arquivos correspondentes estão em:
 * assets/fonts/*.ttf
 *
 * Após adicionar os arquivos, rode: yarn link:fonts
 */
const fallback =
  Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'System',
  }) ?? 'System';

export const fontes = {
  familia: {
    corpo: 'Rajdhani-Regular',
    corpoMedio: 'Rajdhani-Medium',
    corpoSemibold: 'Rajdhani-SemiBold',
    corpoBold: 'Rajdhani-Bold',
    titulo: 'Oswald-SemiBold',
    tituloBold: 'Oswald-Bold',
    numero: 'Oswald-Bold',
    fallback,
  },
  peso: {
    regular: '400',
    medio: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

export const tipografia = {
  hero: {
    fontFamily: fontes.familia.tituloBold,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: 0.6,
  },
  tituloTela: {
    fontFamily: fontes.familia.tituloBold,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: 0.4,
  },
  tituloCard: {
    fontFamily: fontes.familia.corpoBold,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  subtitulo: {
    fontFamily: fontes.familia.corpoSemibold,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  corpo: {
    fontFamily: fontes.familia.corpo,
    fontSize: 15,
    lineHeight: 21,
  },
  corpoPequeno: {
    fontFamily: fontes.familia.corpoMedio,
    fontSize: 13,
    lineHeight: 18,
  },
  label: {
    fontFamily: fontes.familia.corpoSemibold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  placar: {
    fontFamily: fontes.familia.numero,
    fontSize: 42,
    lineHeight: 46,
    letterSpacing: 0.8,
  },
  overall: {
    fontFamily: fontes.familia.numero,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: 0.3,
  },
} satisfies Record<string, TextStyle>;

export type ChaveTipografia = keyof typeof tipografia;
