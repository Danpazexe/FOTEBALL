/**
 * Índice dos jogadores do seed — UM arquivo JSON por time (ex.: flamengo.json,
 * sao_paulo.json). O nome do arquivo é o id do clube sem o prefixo `club_`.
 * Para editar um elenco, mexa no JSON do time; para um time novo, adicione o
 * `.json` nesta pasta e o import + spread aqui.
 */
import type {Player} from '../../../types';

// Brasileirão Série A
import athleticoPr from './athletico_pr.json';
import atleticoMg from './atletico_mg.json';
import bahia from './bahia.json';
import botafogo from './botafogo.json';
import bragantino from './bragantino.json';
import chapecoense from './chapecoense.json';
import corinthians from './corinthians.json';
import coritiba from './coritiba.json';
import cruzeiro from './cruzeiro.json';
import flamengo from './flamengo.json';
import fluminense from './fluminense.json';
import gremio from './gremio.json';
import internacional from './internacional.json';
import mirassol from './mirassol.json';
import palmeiras from './palmeiras.json';
import remo from './remo.json';
import santos from './santos.json';
import saoPaulo from './sao_paulo.json';
import vasco from './vasco.json';
import vitoria from './vitoria.json';

// Brasileirão Série B
import americaMg from './america_mg.json';
import athletic from './athletic.json';
import atleticoGo from './atletico_go.json';
import avai from './avai.json';
import botafogoSp from './botafogo_sp.json';
import ceara from './ceara.json';
import crb from './crb.json';
import criciuma from './criciuma.json';
import cuiaba from './cuiaba.json';
import fortaleza from './fortaleza.json';
import goias from './goias.json';
import juventude from './juventude.json';
import londrina from './londrina.json';
import nautico from './nautico.json';
import novorizontino from './novorizontino.json';
import operario from './operario.json';
import pontePreta from './ponte_preta.json';
import saoBernardo from './sao_bernardo.json';
import sport from './sport.json';
import vilaNova from './vila_nova.json';

// Brasileirão Série C
import jscAnapolis from './serie_c_anapolis.json';
import jscFigueirense from './serie_c_figueirense.json';
import jscConfianca from './serie_c_confianca.json';
import jscBotafogoPb from './serie_c_botafogo_pb.json';
import jscBrusque from './serie_c_brusque.json';
import jscFloresta from './serie_c_floresta.json';
import jscCaxias from './serie_c_caxias.json';
import jscFerroviaria from './serie_c_ferroviaria.json';
import jscAmazonas from './serie_c_amazonas.json';
import jscInterLimeira from './serie_c_inter_limeira.json';
import jscBarra from './serie_c_barra.json';
import jscMaranhao from './serie_c_maranhao.json';
import jscMaringa from './serie_c_maringa.json';
import jscYpiranga from './serie_c_ypiranga.json';
import jscItabaiana from './serie_c_itabaiana.json';
import jscPaysandu from './serie_c_paysandu.json';
import jscItuano from './serie_c_ituano.json';
import jscVoltaRedonda from './serie_c_volta_redonda.json';
import jscSantaCruz from './serie_c_santa_cruz.json';
import jscGuarani from './serie_c_guarani.json';

export const jogadoresSeed: Player[] = [
  // Série A
  ...(athleticoPr as Player[]),
  ...(atleticoMg as Player[]),
  ...(bahia as Player[]),
  ...(botafogo as Player[]),
  ...(bragantino as Player[]),
  ...(chapecoense as Player[]),
  ...(corinthians as Player[]),
  ...(coritiba as Player[]),
  ...(cruzeiro as Player[]),
  ...(flamengo as Player[]),
  ...(fluminense as Player[]),
  ...(gremio as Player[]),
  ...(internacional as Player[]),
  ...(mirassol as Player[]),
  ...(palmeiras as Player[]),
  ...(remo as Player[]),
  ...(santos as Player[]),
  ...(saoPaulo as Player[]),
  ...(vasco as Player[]),
  ...(vitoria as Player[]),
  // Série B
  ...(americaMg as Player[]),
  ...(athletic as Player[]),
  ...(atleticoGo as Player[]),
  ...(avai as Player[]),
  ...(botafogoSp as Player[]),
  ...(ceara as Player[]),
  ...(crb as Player[]),
  ...(criciuma as Player[]),
  ...(cuiaba as Player[]),
  ...(fortaleza as Player[]),
  ...(goias as Player[]),
  ...(juventude as Player[]),
  ...(londrina as Player[]),
  ...(nautico as Player[]),
  ...(novorizontino as Player[]),
  ...(operario as Player[]),
  ...(pontePreta as Player[]),
  ...(saoBernardo as Player[]),
  ...(sport as Player[]),
  ...(vilaNova as Player[]),
  // Série C
  ...(jscAnapolis as Player[]),
  ...(jscFigueirense as Player[]),
  ...(jscConfianca as Player[]),
  ...(jscBotafogoPb as Player[]),
  ...(jscBrusque as Player[]),
  ...(jscFloresta as Player[]),
  ...(jscCaxias as Player[]),
  ...(jscFerroviaria as Player[]),
  ...(jscAmazonas as Player[]),
  ...(jscInterLimeira as Player[]),
  ...(jscBarra as Player[]),
  ...(jscMaranhao as Player[]),
  ...(jscMaringa as Player[]),
  ...(jscYpiranga as Player[]),
  ...(jscItabaiana as Player[]),
  ...(jscPaysandu as Player[]),
  ...(jscItuano as Player[]),
  ...(jscVoltaRedonda as Player[]),
  ...(jscSantaCruz as Player[]),
  ...(jscGuarani as Player[]),
];
