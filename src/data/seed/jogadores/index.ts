/**
 * Índice dos jogadores do seed — UM arquivo JSON por time (ex.: flamengo.json,
 * sao_paulo.json). O nome do arquivo é o id do clube sem o prefixo `club_`.
 * Para editar um elenco, mexa no JSON do time; para um time novo, adicione o
 * `.json` nesta pasta e o import + spread aqui.
 */
import type {Player} from '../../../types';

// Prova multi-liga (PESDB eFootball 2026)
// Argentina
import bocaJuniors from './argentina/boca_juniors.json';
import lanus from './argentina/lanus.json';
import racingClub from './argentina/racing_club.json';
import riverPlate from './argentina/river_plate.json';
import independiente from './argentina/independiente.json';
import sanLorenzo from './argentina/san_lorenzo.json';
import estudiantes from './argentina/estudiantes.json';
import velezSarsfield from './argentina/velez_sarsfield.json';
import rosarioCentral from './argentina/rosario_central.json';
import newellsOldBoys from './argentina/newells_old_boys.json';
import talleres from './argentina/talleres.json';
import argentinosJuniors from './argentina/argentinos_juniors.json';
import defensaYJusticia from './argentina/defensa_y_justicia.json';
import huracan from './argentina/huracan.json';
import gimnasiaLp from './argentina/gimnasia_lp.json';
import banfield from './argentina/banfield.json';
import tigre from './argentina/tigre.json';
import centralCordoba from './argentina/central_cordoba.json';
import platense from './argentina/platense.json';
import godoyCruz from './argentina/godoy_cruz.json';
// Inglaterra
import arsenal from './inglaterra/arsenal.json';
import astonVilla from './inglaterra/aston_villa.json';
import birmingham from './inglaterra/birmingham.json';
import blackburn from './inglaterra/blackburn.json';
import bournemouth from './inglaterra/bournemouth.json';
import brentford from './inglaterra/brentford.json';
import brighton from './inglaterra/brighton.json';
import bristolCity from './inglaterra/bristol_city.json';
import burnley from './inglaterra/burnley.json';
import charlton from './inglaterra/charlton.json';
import chelsea from './inglaterra/chelsea.json';
import coventry from './inglaterra/coventry.json';
import crystalPalace from './inglaterra/crystal_palace.json';
import derby from './inglaterra/derby.json';
import everton from './inglaterra/everton.json';
import fulham from './inglaterra/fulham.json';
import hull from './inglaterra/hull.json';
import ipswich from './inglaterra/ipswich.json';
import leeds from './inglaterra/leeds.json';
import leicester from './inglaterra/leicester.json';
import liverpool from './inglaterra/liverpool.json';
import manCity from './inglaterra/man_city.json';
import manUnited from './inglaterra/man_united.json';
import middlesbrough from './inglaterra/middlesbrough.json';
import millwall from './inglaterra/millwall.json';
import newcastle from './inglaterra/newcastle.json';
import norwich from './inglaterra/norwich.json';
import nottinghamForest from './inglaterra/nottingham_forest.json';
import oxford from './inglaterra/oxford.json';
import portsmouth from './inglaterra/portsmouth.json';
import preston from './inglaterra/preston.json';
import qpr from './inglaterra/qpr.json';
import sheffieldUnited from './inglaterra/sheffield_united.json';
import sheffieldWednesday from './inglaterra/sheffield_wednesday.json';
import southampton from './inglaterra/southampton.json';
import stoke from './inglaterra/stoke.json';
import sunderland from './inglaterra/sunderland.json';
import swansea from './inglaterra/swansea.json';
import tottenham from './inglaterra/tottenham.json';
import watford from './inglaterra/watford.json';
import westBrom from './inglaterra/west_brom.json';
import westHam from './inglaterra/west_ham.json';
import wolves from './inglaterra/wolves.json';
import wrexham from './inglaterra/wrexham.json';

// Brasileirão Série A
import athleticoPr from './brasil/athletico_pr.json';
import atleticoMg from './brasil/atletico_mg.json';
import bahia from './brasil/bahia.json';
import botafogo from './brasil/botafogo.json';
import bragantino from './brasil/bragantino.json';
import chapecoense from './brasil/chapecoense.json';
import corinthians from './brasil/corinthians.json';
import coritiba from './brasil/coritiba.json';
import cruzeiro from './brasil/cruzeiro.json';
import flamengo from './brasil/flamengo.json';
import fluminense from './brasil/fluminense.json';
import gremio from './brasil/gremio.json';
import internacional from './brasil/internacional.json';
import mirassol from './brasil/mirassol.json';
import palmeiras from './brasil/palmeiras.json';
import remo from './brasil/remo.json';
import santos from './brasil/santos.json';
import saoPaulo from './brasil/sao_paulo.json';
import vasco from './brasil/vasco.json';
import vitoria from './brasil/vitoria.json';

// Brasileirão Série B
import americaMg from './brasil/america_mg.json';
import athletic from './brasil/athletic.json';
import atleticoGo from './brasil/atletico_go.json';
import avai from './brasil/avai.json';
import botafogoSp from './brasil/botafogo_sp.json';
import ceara from './brasil/ceara.json';
import crb from './brasil/crb.json';
import criciuma from './brasil/criciuma.json';
import cuiaba from './brasil/cuiaba.json';
import fortaleza from './brasil/fortaleza.json';
import goias from './brasil/goias.json';
import juventude from './brasil/juventude.json';
import londrina from './brasil/londrina.json';
import nautico from './brasil/nautico.json';
import novorizontino from './brasil/novorizontino.json';
import operario from './brasil/operario.json';
import pontePreta from './brasil/ponte_preta.json';
import saoBernardo from './brasil/sao_bernardo.json';
import sport from './brasil/sport.json';
import vilaNova from './brasil/vila_nova.json';

// Brasileirão Série C
import jscAnapolis from './brasil/serie_c_anapolis.json';
import jscFigueirense from './brasil/serie_c_figueirense.json';
import jscConfianca from './brasil/serie_c_confianca.json';
import jscBotafogoPb from './brasil/serie_c_botafogo_pb.json';
import jscBrusque from './brasil/serie_c_brusque.json';
import jscFloresta from './brasil/serie_c_floresta.json';
import jscCaxias from './brasil/serie_c_caxias.json';
import jscFerroviaria from './brasil/serie_c_ferroviaria.json';
import jscAmazonas from './brasil/serie_c_amazonas.json';
import jscInterLimeira from './brasil/serie_c_inter_limeira.json';
import jscBarra from './brasil/serie_c_barra.json';
import jscMaranhao from './brasil/serie_c_maranhao.json';
import jscMaringa from './brasil/serie_c_maringa.json';
import jscYpiranga from './brasil/serie_c_ypiranga.json';
import jscItabaiana from './brasil/serie_c_itabaiana.json';
import jscPaysandu from './brasil/serie_c_paysandu.json';
import jscItuano from './brasil/serie_c_ituano.json';
import jscVoltaRedonda from './brasil/serie_c_volta_redonda.json';
import jscSantaCruz from './brasil/serie_c_santa_cruz.json';
import jscGuarani from './brasil/serie_c_guarani.json';

// Brasileirão Série D
// Brasileirão Série D
import sdTocantinopolis from './brasil/serie_d_tocantinopolis.json';
import sdAraguaina from './brasil/serie_d_araguaina.json';
import sdTrem from './brasil/serie_d_trem.json';
import sdAguiaDeMaraba from './brasil/serie_d_aguia_de_maraba.json';
import sdManaus from './brasil/serie_d_manaus.json';
import sdManauara from './brasil/serie_d_manauara.json';
import sdNacionalAm from './brasil/serie_d_nacional_am.json';
import sdSaoRaimundoRr from './brasil/serie_d_sao_raimundo_rr.json';
import sdPortoVelho from './brasil/serie_d_porto_velho.json';
import sdGalvez from './brasil/serie_d_galvez.json';
import sdGremioAtleticoSampaio from './brasil/serie_d_gremio_atletico_sampaio.json';
import sdMonteRoraima from './brasil/serie_d_monte_roraima.json';
import sdGuapore from './brasil/serie_d_guapore.json';
import sdHumaitaAc from './brasil/serie_d_humaita_ac.json';
import sdIndependenciaAc from './brasil/serie_d_independencia_ac.json';
import sdOratorio from './brasil/serie_d_oratorio.json';
import sdTunaLuso from './brasil/serie_d_tuna_luso.json';
import sdAbc from './brasil/serie_d_abc.json';
import sdAmericaRn from './brasil/serie_d_america_rn.json';
import sdAsa from './brasil/serie_d_asa.json';
import sdCsa from './brasil/serie_d_csa.json';
import sdFerroviarioCe from './brasil/serie_d_ferroviario_ce.json';
import sdAtleticoCearense from './brasil/serie_d_atletico_cearense.json';
import sdIguatu from './brasil/serie_d_iguatu.json';
import sdMaracana from './brasil/serie_d_maracana.json';
import sdJacuipense from './brasil/serie_d_jacuipense.json';
import sdJuazeirense from './brasil/serie_d_juazeirense.json';
import sdAtleticoDeAlagoinhas from './brasil/serie_d_atletico_de_alagoinhas.json';
import sdLagarto from './brasil/serie_d_lagarto.json';
import sdSergipe from './brasil/serie_d_sergipe.json';
import sdSousa from './brasil/serie_d_sousa.json';
import sdTreze from './brasil/serie_d_treze.json';
import sdCentralPe from './brasil/serie_d_central_pe.json';
import sdRetro from './brasil/serie_d_retro.json';
import sdIape from './brasil/serie_d_iape.json';
import sdMotoClubSaoLuis from './brasil/serie_d_moto_club_sao_luis.json';
import sdParnahyba from './brasil/serie_d_parnahyba.json';
import sdAltos from './brasil/serie_d_altos.json';
import sdFluminensePi from './brasil/serie_d_fluminense_pi.json';
import sdPiaui from './brasil/serie_d_piaui.json';
import sdImperatriz from './brasil/serie_d_imperatriz.json';
import sdSampaioCorrea from './brasil/serie_d_sampaio_correa.json';
import sdDecisao from './brasil/serie_d_decisao.json';
import sdCse from './brasil/serie_d_cse.json';
import sdMaguaryPe from './brasil/serie_d_maguary_pe.json';
import sdPortoBa from './brasil/serie_d_porto_ba.json';
import sdSerraBranca from './brasil/serie_d_serra_branca.json';
import sdLagunaRn from './brasil/serie_d_laguna_rn.json';
import sdTirol from './brasil/serie_d_tirol.json';
import sdGama from './brasil/serie_d_gama.json';
import sdBrasiliense from './brasil/serie_d_brasiliense.json';
import sdCeilandia from './brasil/serie_d_ceilandia.json';
import sdCrac from './brasil/serie_d_crac.json';
import sdAparecidense from './brasil/serie_d_aparecidense.json';
import sdLuverdense from './brasil/serie_d_luverdense.json';
import sdMixto from './brasil/serie_d_mixto.json';
import sdOperarioMs from './brasil/serie_d_operario_ms.json';
import sdCapitalCf from './brasil/serie_d_capital_cf.json';
import sdAbecatOuvidorense from './brasil/serie_d_abecat_ouvidorense.json';
import sdGoiatuba from './brasil/serie_d_goiatuba.json';
import sdInhumas from './brasil/serie_d_inhumas.json';
import sdIvinhema from './brasil/serie_d_ivinhema.json';
import sdUniaoRondonopolis from './brasil/serie_d_uniao_rondonopolis.json';
import sdVarzeaGrande from './brasil/serie_d_varzea_grande.json';
import sdRioBrancoEs from './brasil/serie_d_rio_branco_es.json';
import sdRealNoroeste from './brasil/serie_d_real_noroeste.json';
import sdVitoriaEs from './brasil/serie_d_vitoria_es.json';
import sdNovaIguacu from './brasil/serie_d_nova_iguacu.json';
import sdPortuguesaRj from './brasil/serie_d_portuguesa_rj.json';
import sdAmericaRj from './brasil/serie_d_america_rj.json';
import sdMadureira from './brasil/serie_d_madureira.json';
import sdMarica from './brasil/serie_d_marica.json';
import sdPortuguesa from './brasil/serie_d_portuguesa.json';
import sdAguaSanta from './brasil/serie_d_agua_santa.json';
import sdVeloClube from './brasil/serie_d_velo_clube.json';
import sdNoroeste from './brasil/serie_d_noroeste.json';
import sdXvDePiracicaba from './brasil/serie_d_xv_de_piracicaba.json';
import sdTombense from './brasil/serie_d_tombense.json';
import sdPousoAlegre from './brasil/serie_d_pouso_alegre.json';
import sdUberlandia from './brasil/serie_d_uberlandia.json';
import sdBetim from './brasil/serie_d_betim.json';
import sdDemocrataGv from './brasil/serie_d_democrata_gv.json';
import sdPrimavera from './brasil/serie_d_primavera.json';
import sdSampaioCorreaRj from './brasil/serie_d_sampaio_correa_rj.json';
import sdBrasilDePelotas from './brasil/serie_d_brasil_de_pelotas.json';
import sdSaoJoseRs from './brasil/serie_d_sao_jose_rs.json';
import sdGuaranyDeBage from './brasil/serie_d_guarany_de_bage.json';
import sdSaoLuiz from './brasil/serie_d_sao_luiz.json';
import sdJoinville from './brasil/serie_d_joinville.json';
import sdMarcilioDias from './brasil/serie_d_marcilio_dias.json';
import sdBlumenau from './brasil/serie_d_blumenau.json';
import sdSaoJoseense from './brasil/serie_d_sao_joseense.json';
import sdCianorte from './brasil/serie_d_cianorte.json';
import sdFcCascavel from './brasil/serie_d_fc_cascavel.json';
import sdAzuriz from './brasil/serie_d_azuriz.json';
import sdSantaCatarina from './brasil/serie_d_santa_catarina.json';

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
  // Prova multi-liga (PESDB eFootball 2026): Argentina + Inglaterra.
  ...(bocaJuniors as Player[]),
  ...(lanus as Player[]),
  ...(racingClub as Player[]),
  ...(riverPlate as Player[]),
  ...(independiente as Player[]),
  ...(sanLorenzo as Player[]),
  ...(estudiantes as Player[]),
  ...(velezSarsfield as Player[]),
  ...(rosarioCentral as Player[]),
  ...(newellsOldBoys as Player[]),
  ...(talleres as Player[]),
  ...(argentinosJuniors as Player[]),
  ...(defensaYJusticia as Player[]),
  ...(huracan as Player[]),
  ...(gimnasiaLp as Player[]),
  ...(banfield as Player[]),
  ...(tigre as Player[]),
  ...(centralCordoba as Player[]),
  ...(platense as Player[]),
  ...(godoyCruz as Player[]),
  ...(arsenal as Player[]),
  ...(astonVilla as Player[]),
  ...(birmingham as Player[]),
  ...(blackburn as Player[]),
  ...(bournemouth as Player[]),
  ...(brentford as Player[]),
  ...(brighton as Player[]),
  ...(bristolCity as Player[]),
  ...(burnley as Player[]),
  ...(charlton as Player[]),
  ...(chelsea as Player[]),
  ...(coventry as Player[]),
  ...(crystalPalace as Player[]),
  ...(derby as Player[]),
  ...(everton as Player[]),
  ...(fulham as Player[]),
  ...(hull as Player[]),
  ...(ipswich as Player[]),
  ...(leeds as Player[]),
  ...(leicester as Player[]),
  ...(liverpool as Player[]),
  ...(manCity as Player[]),
  ...(manUnited as Player[]),
  ...(middlesbrough as Player[]),
  ...(millwall as Player[]),
  ...(newcastle as Player[]),
  ...(norwich as Player[]),
  ...(nottinghamForest as Player[]),
  ...(oxford as Player[]),
  ...(portsmouth as Player[]),
  ...(preston as Player[]),
  ...(qpr as Player[]),
  ...(sheffieldUnited as Player[]),
  ...(sheffieldWednesday as Player[]),
  ...(southampton as Player[]),
  ...(stoke as Player[]),
  ...(sunderland as Player[]),
  ...(swansea as Player[]),
  ...(tottenham as Player[]),
  ...(watford as Player[]),
  ...(westBrom as Player[]),
  ...(westHam as Player[]),
  ...(wolves as Player[]),
  ...(wrexham as Player[]),
];
