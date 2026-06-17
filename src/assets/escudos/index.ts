/**
 * Escudos dos clubes e logo do campeonato (PNGs empacotados pelo Metro).
 * Mapeados pelo id do clube (ver src/data/seed/clubes/). Os arquivos PNG mantêm
 * os nomes originais; a chave do mapa é o id atual do clube (`club_<nome>`).
 */

import type {ImageSourcePropType} from 'react-native';

export const ESCUDOS: Record<string, ImageSourcePropType> = {
  club_bahia: require('./club_276.png'),
  club_vitoria: require('./club_109.png'),
  club_fluminense: require('./club_104.png'),
  club_corinthians: require('./club_132.png'),
  club_vasco: require('./club_131.png'),
  club_sao_paulo: require('./club_255.png'),
  club_flamengo: require('./club_281.png'),
  club_botafogo: require('./club_81.png'),
  club_gremio: require('./club_192.png'),
  club_cruzeiro: require('./club_288.png'),
  club_internacional: require('./club_85.png'),
  club_palmeiras: require('./club_121.png'),
  club_atletico_mg: require('./club_122.png'),
  club_santos: require('./club_extra_1.png'),
  club_bragantino: require('./club_extra_3.png'),
  club_mirassol: require('./club_extra_4.png'),
  club_athletico_pr: require('./club_extra_5.png'),
  club_chapecoense: require('./club_extra_6.png'),
  club_coritiba: require('./club_extra_7.png'),
  club_remo: require('./club_extra_8.png'),
};

// Logo por divisão (cada série tem o seu emblema).
export const LOGO_SERIE_A: ImageSourcePropType = require('../brasileiraoA.png');
export const LOGO_SERIE_B: ImageSourcePropType = require('../brasileiraoB.png');
export const LOGO_SERIE_C: ImageSourcePropType = require('../brasileiraoC.png');

const LOGO_POR_DIVISAO: Record<string, ImageSourcePropType> = {
  'Série A': LOGO_SERIE_A,
  'Série B': LOGO_SERIE_B,
  'Série C': LOGO_SERIE_C,
};

/** Emblema da divisão (cai para a logo da Série A se desconhecida). */
export function logoDaDivisao(divisao?: string): ImageSourcePropType {
  return (divisao && LOGO_POR_DIVISAO[divisao]) || LOGO_SERIE_A;
}

/** Paleta da identidade visual de cada divisão: as duas cores da própria logo. */
export type CoresDivisao = {
  /** Cor escura — estrutura/contornos da logo. */
  escuro: string;
  /** Cor de destaque — preenchimento vivo da logo. */
  destaque: string;
};

const CORES_POR_DIVISAO: Record<string, CoresDivisao> = {
  'Série A': {escuro: '#061431', destaque: '#D6FF00'}, // navy + lime
  'Série B': {escuro: '#1A3DA8', destaque: '#FFC81E'}, // azul royal + amarelo-ouro
  'Série C': {escuro: '#18452A', destaque: '#F5E000'}, // verde escuro + amarelo
};

/** Cores da divisão (cai para as da Série A se desconhecida). */
export function coresDaDivisao(divisao?: string): CoresDivisao {
  return (divisao && CORES_POR_DIVISAO[divisao]) || CORES_POR_DIVISAO['Série A'];
}

export function escudoDoTime(clubeId: string): ImageSourcePropType | undefined {
  return ESCUDOS[clubeId];
}
