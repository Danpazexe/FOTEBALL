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

// Brasileirão Série D
// Brasileirão Série D
import sdTocantinopolis from './serie_d_tocantinopolis.json';
import sdAraguaina from './serie_d_araguaina.json';
import sdTrem from './serie_d_trem.json';
import sdAguiaDeMaraba from './serie_d_aguia_de_maraba.json';
import sdManaus from './serie_d_manaus.json';
import sdManauara from './serie_d_manauara.json';
import sdNacionalAm from './serie_d_nacional_am.json';
import sdSaoRaimundoRr from './serie_d_sao_raimundo_rr.json';
import sdPortoVelho from './serie_d_porto_velho.json';
import sdGalvez from './serie_d_galvez.json';
import sdGremioAtleticoSampaio from './serie_d_gremio_atletico_sampaio.json';
import sdMonteRoraima from './serie_d_monte_roraima.json';
import sdGuapore from './serie_d_guapore.json';
import sdHumaitaAc from './serie_d_humaita_ac.json';
import sdIndependenciaAc from './serie_d_independencia_ac.json';
import sdOratorio from './serie_d_oratorio.json';
import sdTunaLuso from './serie_d_tuna_luso.json';
import sdAbc from './serie_d_abc.json';
import sdAmericaRn from './serie_d_america_rn.json';
import sdAsa from './serie_d_asa.json';
import sdCsa from './serie_d_csa.json';
import sdFerroviarioCe from './serie_d_ferroviario_ce.json';
import sdAtleticoCearense from './serie_d_atletico_cearense.json';
import sdIguatu from './serie_d_iguatu.json';
import sdMaracana from './serie_d_maracana.json';
import sdJacuipense from './serie_d_jacuipense.json';
import sdJuazeirense from './serie_d_juazeirense.json';
import sdAtleticoDeAlagoinhas from './serie_d_atletico_de_alagoinhas.json';
import sdLagarto from './serie_d_lagarto.json';
import sdSergipe from './serie_d_sergipe.json';
import sdSousa from './serie_d_sousa.json';
import sdTreze from './serie_d_treze.json';
import sdCentralPe from './serie_d_central_pe.json';
import sdRetro from './serie_d_retro.json';
import sdIape from './serie_d_iape.json';
import sdMotoClubSaoLuis from './serie_d_moto_club_sao_luis.json';
import sdParnahyba from './serie_d_parnahyba.json';
import sdAltos from './serie_d_altos.json';
import sdFluminensePi from './serie_d_fluminense_pi.json';
import sdPiaui from './serie_d_piaui.json';
import sdImperatriz from './serie_d_imperatriz.json';
import sdSampaioCorrea from './serie_d_sampaio_correa.json';
import sdDecisao from './serie_d_decisao.json';
import sdCse from './serie_d_cse.json';
import sdMaguaryPe from './serie_d_maguary_pe.json';
import sdPortoBa from './serie_d_porto_ba.json';
import sdSerraBranca from './serie_d_serra_branca.json';
import sdLagunaRn from './serie_d_laguna_rn.json';
import sdTirol from './serie_d_tirol.json';
import sdGama from './serie_d_gama.json';
import sdBrasiliense from './serie_d_brasiliense.json';
import sdCeilandia from './serie_d_ceilandia.json';
import sdCrac from './serie_d_crac.json';
import sdAparecidense from './serie_d_aparecidense.json';
import sdLuverdense from './serie_d_luverdense.json';
import sdMixto from './serie_d_mixto.json';
import sdOperarioMs from './serie_d_operario_ms.json';
import sdCapitalCf from './serie_d_capital_cf.json';
import sdAbecatOuvidorense from './serie_d_abecat_ouvidorense.json';
import sdGoiatuba from './serie_d_goiatuba.json';
import sdInhumas from './serie_d_inhumas.json';
import sdIvinhema from './serie_d_ivinhema.json';
import sdUniaoRondonopolis from './serie_d_uniao_rondonopolis.json';
import sdVarzeaGrande from './serie_d_varzea_grande.json';
import sdRioBrancoEs from './serie_d_rio_branco_es.json';
import sdRealNoroeste from './serie_d_real_noroeste.json';
import sdVitoriaEs from './serie_d_vitoria_es.json';
import sdNovaIguacu from './serie_d_nova_iguacu.json';
import sdPortuguesaRj from './serie_d_portuguesa_rj.json';
import sdAmericaRj from './serie_d_america_rj.json';
import sdMadureira from './serie_d_madureira.json';
import sdMarica from './serie_d_marica.json';
import sdPortuguesa from './serie_d_portuguesa.json';
import sdAguaSanta from './serie_d_agua_santa.json';
import sdVeloClube from './serie_d_velo_clube.json';
import sdNoroeste from './serie_d_noroeste.json';
import sdXvDePiracicaba from './serie_d_xv_de_piracicaba.json';
import sdTombense from './serie_d_tombense.json';
import sdPousoAlegre from './serie_d_pouso_alegre.json';
import sdUberlandia from './serie_d_uberlandia.json';
import sdBetim from './serie_d_betim.json';
import sdDemocrataGv from './serie_d_democrata_gv.json';
import sdPrimavera from './serie_d_primavera.json';
import sdSampaioCorreaRj from './serie_d_sampaio_correa_rj.json';
import sdBrasilDePelotas from './serie_d_brasil_de_pelotas.json';
import sdSaoJoseRs from './serie_d_sao_jose_rs.json';
import sdGuaranyDeBage from './serie_d_guarany_de_bage.json';
import sdSaoLuiz from './serie_d_sao_luiz.json';
import sdJoinville from './serie_d_joinville.json';
import sdMarcilioDias from './serie_d_marcilio_dias.json';
import sdBlumenau from './serie_d_blumenau.json';
import sdSaoJoseense from './serie_d_sao_joseense.json';
import sdCianorte from './serie_d_cianorte.json';
import sdFcCascavel from './serie_d_fc_cascavel.json';
import sdAzuriz from './serie_d_azuriz.json';
import sdSantaCatarina from './serie_d_santa_catarina.json';

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
  // Série D
  // Série D
  ...(sdTocantinopolis as Player[]),
  ...(sdAraguaina as Player[]),
  ...(sdTrem as Player[]),
  ...(sdAguiaDeMaraba as Player[]),
  ...(sdManaus as Player[]),
  ...(sdManauara as Player[]),
  ...(sdNacionalAm as Player[]),
  ...(sdSaoRaimundoRr as Player[]),
  ...(sdPortoVelho as Player[]),
  ...(sdGalvez as Player[]),
  ...(sdGremioAtleticoSampaio as Player[]),
  ...(sdMonteRoraima as Player[]),
  ...(sdGuapore as Player[]),
  ...(sdHumaitaAc as Player[]),
  ...(sdIndependenciaAc as Player[]),
  ...(sdOratorio as Player[]),
  ...(sdTunaLuso as Player[]),
  ...(sdAbc as Player[]),
  ...(sdAmericaRn as Player[]),
  ...(sdAsa as Player[]),
  ...(sdCsa as Player[]),
  ...(sdFerroviarioCe as Player[]),
  ...(sdAtleticoCearense as Player[]),
  ...(sdIguatu as Player[]),
  ...(sdMaracana as Player[]),
  ...(sdJacuipense as Player[]),
  ...(sdJuazeirense as Player[]),
  ...(sdAtleticoDeAlagoinhas as Player[]),
  ...(sdLagarto as Player[]),
  ...(sdSergipe as Player[]),
  ...(sdSousa as Player[]),
  ...(sdTreze as Player[]),
  ...(sdCentralPe as Player[]),
  ...(sdRetro as Player[]),
  ...(sdIape as Player[]),
  ...(sdMotoClubSaoLuis as Player[]),
  ...(sdParnahyba as Player[]),
  ...(sdAltos as Player[]),
  ...(sdFluminensePi as Player[]),
  ...(sdPiaui as Player[]),
  ...(sdImperatriz as Player[]),
  ...(sdSampaioCorrea as Player[]),
  ...(sdDecisao as Player[]),
  ...(sdCse as Player[]),
  ...(sdMaguaryPe as Player[]),
  ...(sdPortoBa as Player[]),
  ...(sdSerraBranca as Player[]),
  ...(sdLagunaRn as Player[]),
  ...(sdTirol as Player[]),
  ...(sdGama as Player[]),
  ...(sdBrasiliense as Player[]),
  ...(sdCeilandia as Player[]),
  ...(sdCrac as Player[]),
  ...(sdAparecidense as Player[]),
  ...(sdLuverdense as Player[]),
  ...(sdMixto as Player[]),
  ...(sdOperarioMs as Player[]),
  ...(sdCapitalCf as Player[]),
  ...(sdAbecatOuvidorense as Player[]),
  ...(sdGoiatuba as Player[]),
  ...(sdInhumas as Player[]),
  ...(sdIvinhema as Player[]),
  ...(sdUniaoRondonopolis as Player[]),
  ...(sdVarzeaGrande as Player[]),
  ...(sdRioBrancoEs as Player[]),
  ...(sdRealNoroeste as Player[]),
  ...(sdVitoriaEs as Player[]),
  ...(sdNovaIguacu as Player[]),
  ...(sdPortuguesaRj as Player[]),
  ...(sdAmericaRj as Player[]),
  ...(sdMadureira as Player[]),
  ...(sdMarica as Player[]),
  ...(sdPortuguesa as Player[]),
  ...(sdAguaSanta as Player[]),
  ...(sdVeloClube as Player[]),
  ...(sdNoroeste as Player[]),
  ...(sdXvDePiracicaba as Player[]),
  ...(sdTombense as Player[]),
  ...(sdPousoAlegre as Player[]),
  ...(sdUberlandia as Player[]),
  ...(sdBetim as Player[]),
  ...(sdDemocrataGv as Player[]),
  ...(sdPrimavera as Player[]),
  ...(sdSampaioCorreaRj as Player[]),
  ...(sdBrasilDePelotas as Player[]),
  ...(sdSaoJoseRs as Player[]),
  ...(sdGuaranyDeBage as Player[]),
  ...(sdSaoLuiz as Player[]),
  ...(sdJoinville as Player[]),
  ...(sdMarcilioDias as Player[]),
  ...(sdBlumenau as Player[]),
  ...(sdSaoJoseense as Player[]),
  ...(sdCianorte as Player[]),
  ...(sdFcCascavel as Player[]),
  ...(sdAzuriz as Player[]),
  ...(sdSantaCatarina as Player[]),
];
