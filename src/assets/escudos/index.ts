/**
 * Escudos dos clubes e logo do campeonato (PNGs empacotados pelo Metro).
 * Organizados por divisão em `escudos/<serie>/club_<slug>.png` e mapeados pelo id
 * do clube (ver src/data/seed/clubes/). Arquivos leves (128px, transparentes) —
 * o suficiente para os tamanhos de exibição (até ~50px), sem peso morto no bundle.
 */

import type {ImageSourcePropType} from 'react-native';

export const ESCUDOS: Record<string, ImageSourcePropType> = {
  // Série A
  club_bahia: require('./serie-a/club_bahia.png'),
  club_vitoria: require('./serie-a/club_vitoria.png'),
  club_fluminense: require('./serie-a/club_fluminense.png'),
  club_corinthians: require('./serie-a/club_corinthians.png'),
  club_vasco: require('./serie-a/club_vasco.png'),
  club_sao_paulo: require('./serie-a/club_sao_paulo.png'),
  club_flamengo: require('./serie-a/club_flamengo.png'),
  club_botafogo: require('./serie-a/club_botafogo.png'),
  club_gremio: require('./serie-a/club_gremio.png'),
  club_cruzeiro: require('./serie-a/club_cruzeiro.png'),
  club_internacional: require('./serie-a/club_internacional.png'),
  club_palmeiras: require('./serie-a/club_palmeiras.png'),
  club_atletico_mg: require('./serie-a/club_atletico_mg.png'),
  club_santos: require('./serie-a/club_santos.png'),
  club_bragantino: require('./serie-a/club_bragantino.png'),
  club_mirassol: require('./serie-a/club_mirassol.png'),
  club_athletico_pr: require('./serie-a/club_athletico_pr.png'),
  club_chapecoense: require('./serie-a/club_chapecoense.png'),
  club_coritiba: require('./serie-a/club_coritiba.png'),
  club_remo: require('./serie-a/club_remo.png'),
  // Série B
  club_fortaleza: require('./serie-b/club_fortaleza.png'),
  club_sport: require('./serie-b/club_sport.png'),
  club_ceara: require('./serie-b/club_ceara.png'),
  club_juventude: require('./serie-b/club_juventude.png'),
  club_novorizontino: require('./serie-b/club_novorizontino.png'),
  club_goias: require('./serie-b/club_goias.png'),
  club_criciuma: require('./serie-b/club_criciuma.png'),
  club_crb: require('./serie-b/club_crb.png'),
  club_athletic: require('./serie-b/club_athletic.png'),
  club_cuiaba: require('./serie-b/club_cuiaba.png'),
  club_avai: require('./serie-b/club_avai.png'),
  club_vila_nova: require('./serie-b/club_vila_nova.png'),
  club_america_mg: require('./serie-b/club_america_mg.png'),
  club_operario: require('./serie-b/club_operario.png'),
  club_atletico_go: require('./serie-b/club_atletico_go.png'),
  club_sao_bernardo: require('./serie-b/club_sao_bernardo.png'),
  club_ponte_preta: require('./serie-b/club_ponte_preta.png'),
  club_botafogo_sp: require('./serie-b/club_botafogo_sp.png'),
  club_nautico: require('./serie-b/club_nautico.png'),
  club_londrina: require('./serie-b/club_londrina.png'),
};

// Logo por divisão (cada série tem o seu emblema).
export const LOGO_SERIE_A: ImageSourcePropType = require('../brasileiraoA.png');
export const LOGO_SERIE_B: ImageSourcePropType = require('../brasileiraoB.png');
export const LOGO_SERIE_C: ImageSourcePropType = require('../brasileiraoC.png');
/** Logo oficial da Copa do Brasil. */
export const LOGO_COPA: ImageSourcePropType = require('../copaDoBrasil.png');

const LOGO_POR_DIVISAO: Record<string, ImageSourcePropType> = {
  'Série A': LOGO_SERIE_A,
  'Série B': LOGO_SERIE_B,
  'Série C': LOGO_SERIE_C,
};

/** Emblema da divisão (cai para a logo da Série A se desconhecida). */
export function logoDaDivisao(divisao?: string): ImageSourcePropType {
  return (divisao && LOGO_POR_DIVISAO[divisao]) || LOGO_SERIE_A;
}

export function escudoDoTime(clubeId: string): ImageSourcePropType | undefined {
  return ESCUDOS[clubeId];
}
