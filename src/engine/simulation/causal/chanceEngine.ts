/**
 * ENGINE DE CHANCES (Etapas 3–7 da cadeia causal): a partir do controle do
 * minuto (posse) e da força ofensiva ATUAL, decide se nasce uma oportunidade,
 * constrói o CHUTE factual (autor, criador, zona, corpo, pressão, xG) e o
 * resolve contra o goleiro — gol, defesa, trave, bloqueio ou fora.
 *
 * O gol SÓ existe aqui, como desfecho de um ChutePartida (PI-01 eliminado).
 * Todos os sorteios usam o RNG recebido; a ordem dos draws é função apenas do
 * estado anterior — mesma seed, mesma partida (RNF-01).
 */
import type {
  ChutePartida,
  ParteCorpoChute,
  Player,
  SituacaoLance,
  Tatica,
} from '../../../types';

import {limitar, type RandomGenerator} from '../rng';
import {corredorDaPosicao, limitar01} from '../geometriaCampo';
import type {ForcaTime} from '../teamStrength';
import {
  CHANCE_CAUSAL,
  INCIDENTES_CAUSAL,
  RESOLUCAO_CAUSAL,
  XG_CAUSAL,
} from './matchModelConfig';
import {
  escolherJogadorPonderado,
  pesoAssistenciaCompleto,
  pesoFinalizador,
} from './selecaoJogadores';
import {calcularBaseXG, probConversaoChute, type PerfilChute} from './xgModel';

export interface EntradaChancesMinuto {
  minuto: number;
  timeId: string;
  /** Jogadores EM CAMPO do lado que ataca (sem expulsos/lesionados). */
  emCampo: Player[];
  /** Jogadores EM CAMPO do adversário (gol contra / bloqueios). */
  emCampoAdversario: Player[];
  goleiroAdversario: Player | undefined;
  tatica: Tatica | null | undefined;
  taticaAdversario: Tatica | null | undefined;
  forca: ForcaTime;
  forcaAdversario: ForcaTime;
  /**
   * Alvo de gols deste lado NO MINUTO (xG-base por força/tática/mando ×
   * fatorTempo × urgência do placar), SEM o efeito do goleiro — o goleiro
   * entra na resolução de cada chute, não na criação da chance.
   */
  xgAlvoMinuto: number;
  /** Fração de posse DESTE lado no minuto (decidida antes, causalmente). */
  fracaoPosse: number;
  rng: RandomGenerator;
  /** Gera o próximo sequencial de chute da partida (ids estáveis). */
  proximoSequencial: () => number;
}

export interface ChancesMinutoLado {
  /** Chutes criados e resolvidos neste minuto (ordem do lance). */
  chutes: ChutePartida[];
  /** Gols VÁLIDOS (resultado 'gol', já descontando VAR). */
  gols: number;
  escanteios: number;
  impedimentos: number;
  faltasComuns: number;
}

/** Arredonda coordenadas persistidas (3 casas) — corta o payload do save. */
const coord = (v: number): number => Math.round(v * 1000) / 1000;

/** Corpo do chute: cabeça na área (mais em escanteio); pé pela perna dominante. */
function sortearCorpo(
  autor: Player,
  situacao: SituacaoLance,
  deFora: boolean,
  rng: RandomGenerator,
): ParteCorpoChute {
  const probCabeca = deFora ? 0.03 : situacao === 'escanteio' ? 0.3 : 0.2;
  if (rng() < probCabeca) {
    return 'cabeca';
  }
  const dominante: ParteCorpoChute =
    autor.pernaDominante === 'E' ? 'pe_esquerdo' : 'pe_direito';
  const fraca: ParteCorpoChute =
    autor.pernaDominante === 'E' ? 'pe_direito' : 'pe_esquerdo';
  return rng() < 0.78 ? dominante : fraca;
}

/** Pressão defensiva sobre a chance (0..1) — contexto real + variação do lance. */
function pressaoDefensiva(
  entrada: EntradaChancesMinuto,
  situacao: SituacaoLance,
  rng: RandomGenerator,
): number {
  let pressao =
    0.5 + (entrada.forcaAdversario.defesa - entrada.forca.ataque) / 150;
  if (entrada.taticaAdversario?.linhaDefensiva === 'Recuada') {
    pressao += 0.08;
  } else if (entrada.taticaAdversario?.linhaDefensiva === 'Adiantada') {
    pressao -= 0.06;
  }
  if (situacao === 'contra_ataque') {
    pressao -= 0.15; // defesa desarrumada na transição
  }
  pressao += (rng() - 0.5) * 0.16;
  return limitar(pressao, 0.1, 0.9);
}

/** Posição do chute no terço de ataque (coordenadas FACTUAIS persistidas). */
function sortearPosicao(
  autor: Player,
  situacao: SituacaoLance,
  deFora: boolean,
  areaCurta: boolean,
  rng: RandomGenerator,
): {x: number; y: number} {
  if (situacao === 'penalti') {
    return {x: 0.5 + (rng() - 0.5) * 0.1, y: 0.16 + rng() * 0.03};
  }
  if (situacao === 'falta') {
    const corredorFalta = corredorDaPosicao(autor.posicaoPrincipal);
    const centroFalta =
      corredorFalta === 0 ? 0.36 : corredorFalta === 2 ? 0.64 : 0.5;
    return {
      x: limitar01(centroFalta + (rng() - 0.5) * 0.2),
      y: 0.5 + rng() * 0.35,
    };
  }
  const corredor = corredorDaPosicao(autor.posicaoPrincipal);
  const centro = corredor === 0 ? 0.34 : corredor === 2 ? 0.66 : 0.5;
  const x = limitar01(centro + (rng() - 0.5) * 0.24);
  const y = deFora
    ? 0.4 + rng() * 0.45
    : areaCurta
      ? 0.04 + rng() * 0.1
      : 0.12 + rng() * 0.2;
  return {x, y};
}

/** Posição na baliza para chutes no alvo (gol/defesa). */
function sortearBaliza(rng: RandomGenerator): {golX: number; golY: number} {
  return {
    golX: limitar01(0.12 + rng() * 0.76),
    golY: limitar01(0.08 + rng() * 0.72),
  };
}

interface ResolucaoChute {
  resultado: ChutePartida['resultado'];
  golX?: number;
  golY?: number;
  xgot: number;
  falhaGoleiro: boolean;
  golContra: boolean;
  autorGolContra?: Player;
  falhaDefesa: boolean;
}

/**
 * Resolve o chute contra a defesa e o goleiro (Etapa 7). O VAR opera sobre o
 * gol EXISTENTE (Etapa 9): anula uma fração — o chute fica no ledger como
 * 'gol_anulado' e não conta no placar.
 */
function resolverChute(
  entrada: EntradaChancesMinuto,
  baseXG: number,
  autor: Player,
  situacao: SituacaoLance,
  rng: RandomGenerator,
): ResolucaoChute {
  const forcaGoleiro = entrada.goleiroAdversario
    ? entrada.forcaAdversario.forcaGoleiro
    : 55;
  const conversao = probConversaoChute(
    baseXG,
    autor.atributos.finalizacao,
    forcaGoleiro,
  );

  if (rng() < conversao) {
    // GOL — sabores de drama estruturados (mesmas taxas medidas da V1).
    const sorteDrama = rng();
    const anulado = rng() < INCIDENTES_CAUSAL.probVarAnulaGol;
    const baliza = sortearBaliza(rng);
    const xgot = Math.min(0.95, Math.max(baseXG, 0.3 + rng() * 0.5));

    if (anulado) {
      return {
        resultado: 'gol_anulado',
        ...baliza,
        xgot,
        falhaGoleiro: false,
        golContra: false,
        falhaDefesa: false,
      };
    }

    if (
      sorteDrama < RESOLUCAO_CAUSAL.probGolContra &&
      entrada.emCampoAdversario.length > 0
    ) {
      const defensores = entrada.emCampoAdversario.filter(jogador =>
        ['ZAG', 'LD', 'LE', 'VOL'].includes(jogador.posicaoPrincipal),
      );
      const pool =
        defensores.length > 0 ? defensores : entrada.emCampoAdversario;
      const autorContra = pool[Math.floor(rng() * pool.length)] ?? pool[0];
      return {
        resultado: 'gol',
        ...baliza,
        xgot,
        falhaGoleiro: false,
        golContra: true,
        autorGolContra: autorContra,
        falhaDefesa: false,
      };
    }
    const limiteFalhaGoleiro =
      RESOLUCAO_CAUSAL.probGolContra + RESOLUCAO_CAUSAL.probFalhaGoleiro;
    const limiteFalhaDefesa =
      limiteFalhaGoleiro + RESOLUCAO_CAUSAL.probFalhaDefesa;
    return {
      resultado: 'gol',
      ...baliza,
      xgot,
      falhaGoleiro:
        sorteDrama >= RESOLUCAO_CAUSAL.probGolContra &&
        sorteDrama < limiteFalhaGoleiro,
      golContra: false,
      falhaDefesa:
        sorteDrama >= limiteFalhaGoleiro && sorteDrama < limiteFalhaDefesa,
    };
  }

  // NÃO gol: defende (no alvo), trave, bloqueio ou para fora.
  const sorteio = rng();
  const probDefesa = limitar(
    RESOLUCAO_CAUSAL.fracaoDefesaBase +
      baseXG * RESOLUCAO_CAUSAL.pesoDefesaPorXg,
    0.2,
    0.72,
  );
  if (sorteio < probDefesa) {
    const baliza = sortearBaliza(rng);
    return {
      resultado: 'defesa',
      ...baliza,
      xgot: Math.min(0.95, baseXG * (0.5 + rng() * 0.45)),
      falhaGoleiro: false,
      golContra: false,
      falhaDefesa: false,
    };
  }
  if (sorteio < probDefesa + RESOLUCAO_CAUSAL.fracaoTrave) {
    return {
      resultado: 'trave',
      xgot: 0,
      falhaGoleiro: false,
      golContra: false,
      falhaDefesa: false,
    };
  }
  if (
    sorteio <
    probDefesa + RESOLUCAO_CAUSAL.fracaoTrave + RESOLUCAO_CAUSAL.fracaoBloqueado
  ) {
    return {
      resultado: 'bloqueado',
      xgot: 0,
      falhaGoleiro: false,
      golContra: false,
      falhaDefesa: false,
    };
  }
  return {
    resultado: 'fora',
    xgot: 0,
    falhaGoleiro: false,
    golContra: false,
    falhaDefesa: false,
  };
}

/** Constrói e resolve UM chute de jogo corrido/escanteio/contra-ataque/rebote. */
function criarChuteJogoCorrido(
  entrada: EntradaChancesMinuto,
  situacao: SituacaoLance,
  posseId: string,
  rng: RandomGenerator,
): ChutePartida {
  const linha = entrada.emCampo.filter(j => j.posicaoPrincipal !== 'GOL');
  const autor = escolherJogadorPonderado(
    linha.length > 0 ? linha : entrada.emCampo,
    rng,
    pesoFinalizador,
  );

  // Criador da jogada (garçom em potencial): presente em ~70% das chances.
  const candidatosCriacao = linha.filter(j => j.id !== autor.id);
  const criador =
    candidatosCriacao.length > 0 &&
    rng() < RESOLUCAO_CAUSAL.probAssistencia
      ? escolherJogadorPonderado(candidatosCriacao, rng, pesoAssistenciaCompleto)
      : undefined;

  const qualidadeEstilo =
    entrada.tatica?.estiloOfensivo === 'Contra-ataque'
      ? CHANCE_CAUSAL.contraAtaqueQualidade
      : entrada.tatica?.estiloOfensivo === 'Posse de bola'
        ? CHANCE_CAUSAL.posseBolaQualidade
        : 1;

  const deFora =
    situacao !== 'rebote' && rng() < XG_CAUSAL.fracaoDeFora;
  const areaCurta =
    !deFora &&
    rng() < (situacao === 'rebote' ? 0.5 : XG_CAUSAL.fracaoAreaCurta);
  const corpo = sortearCorpo(autor, situacao, deFora, rng);
  const pressao = pressaoDefensiva(entrada, situacao, rng);

  const perfil: PerfilChute = {situacao, corpo, deFora, areaCurta, pressao};
  const baseXG = limitar(
    calcularBaseXG(perfil) * qualidadeEstilo,
    XG_CAUSAL.minimo,
    XG_CAUSAL.maximo,
  );
  const posicao = sortearPosicao(autor, situacao, deFora, areaCurta, rng);
  const resolucao = resolverChute(entrada, baseXG, autor, situacao, rng);

  return {
    id: `chute_${entrada.minuto}_${entrada.proximoSequencial()}`,
    timeId: entrada.timeId,
    jogadorId: resolucao.autorGolContra?.id ?? autor.id,
    assistenciaId:
      resolucao.golContra || criador === undefined ? undefined : criador.id,
    goleiroId: entrada.goleiroAdversario?.id,
    minuto: entrada.minuto,
    posseId,
    situacao,
    corpo,
    x: coord(posicao.x),
    y: coord(posicao.y),
    golX: resolucao.golX === undefined ? undefined : coord(resolucao.golX),
    golY: resolucao.golY === undefined ? undefined : coord(resolucao.golY),
    xg: Math.round(baseXG * 1000) / 1000,
    xgot: Math.round(resolucao.xgot * 1000) / 1000,
    resultado: resolucao.resultado,
    grandeChance: baseXG >= XG_CAUSAL.limiarGrandeChance,
    deFora,
    falhaGoleiro: resolucao.falhaGoleiro || undefined,
    golContra: resolucao.golContra || undefined,
  };
}

/** A situação de uma chance de jogo corrido (estilo tático pesa — RN-06/07/08). */
function sortearSituacao(
  tatica: Tatica | null | undefined,
  rng: RandomGenerator,
): SituacaoLance {
  const bonusContra =
    tatica?.estiloOfensivo === 'Contra-ataque' ? 0.14 : 0;
  const sorteio = rng();
  if (sorteio < CHANCE_CAUSAL.fracaoContraAtaque + bonusContra) {
    return 'contra_ataque';
  }
  if (
    sorteio <
    CHANCE_CAUSAL.fracaoContraAtaque + bonusContra + CHANCE_CAUSAL.fracaoEscanteio
  ) {
    return 'escanteio';
  }
  return 'jogo_aberto';
}

/**
 * Gera as chances de UM lado num minuto. A taxa de chute deriva do alvo de
 * gols do minuto ÷ xG médio por chute, acoplada à POSSE (quem tem a bola cria
 * mais — RN-01) e ao estilo (contra-ataque troca volume por qualidade).
 */
export function gerarChancesMinutoLado(
  entrada: EntradaChancesMinuto,
): ChancesMinutoLado {
  const rng = entrada.rng;
  const resultado: ChancesMinutoLado = {
    chutes: [],
    gols: 0,
    escanteios: 0,
    impedimentos: 0,
    faltasComuns: 0,
  };
  if (entrada.emCampo.length === 0) {
    return resultado;
  }

  const fatorPosse =
    (CHANCE_CAUSAL.basePosse + entrada.fracaoPosse) /
    (CHANCE_CAUSAL.basePosse + 0.5);
  const fatorVolumeEstilo =
    entrada.tatica?.estiloOfensivo === 'Contra-ataque'
      ? CHANCE_CAUSAL.contraAtaqueVolume
      : entrada.tatica?.estiloOfensivo === 'Posse de bola'
        ? CHANCE_CAUSAL.posseBolaVolume
        : 1;

  const probChute = limitar(
    (entrada.xgAlvoMinuto / CHANCE_CAUSAL.xgMedioPorChute) *
      fatorPosse *
      fatorVolumeEstilo,
    0,
    CHANCE_CAUSAL.tetoProbChuteMinuto,
  );

  if (rng() < probChute) {
    const situacao = sortearSituacao(entrada.tatica, rng);
    const posseId = `seq_${entrada.minuto}_${entrada.timeId}`;
    const chute = criarChuteJogoCorrido(entrada, situacao, posseId, rng);
    resultado.chutes.push(chute);
    if (chute.resultado === 'gol') {
      resultado.gols += 1;
    }

    // Rebote: defesa/trave pode devolver a bola viva na área (chute encadeado).
    if (
      (chute.resultado === 'defesa' || chute.resultado === 'trave') &&
      rng() < CHANCE_CAUSAL.probRebote
    ) {
      const rebote = criarChuteJogoCorrido(entrada, 'rebote', posseId, rng);
      resultado.chutes.push(rebote);
      if (rebote.resultado === 'gol') {
        resultado.gols += 1;
      }
    }

    // Chute na área que a defesa/goleiro afastou rende escanteio com frequência.
    const ultimo = resultado.chutes[resultado.chutes.length - 1];
    if (
      ultimo !== undefined &&
      !ultimo.deFora &&
      (ultimo.resultado === 'defesa' || ultimo.resultado === 'bloqueado') &&
      rng() < INCIDENTES_CAUSAL.probEscanteioAposChuteNaArea
    ) {
      resultado.escanteios += 1;
    }
  }

  // Escanteio de pressão sem chute (cruzamento afastado pela zaga).
  if (
    rng() <
    INCIDENTES_CAUSAL.probEscanteioPressaoPorMinuto * (0.5 + entrada.fracaoPosse)
  ) {
    resultado.escanteios += 1;
  }

  // Impedimentos: bola longa contra linha adiantada é a receita clássica.
  const probImpedimento =
    INCIDENTES_CAUSAL.probImpedimentoPorMinuto *
    (entrada.tatica?.estiloOfensivo === 'Ataque direto'
      ? 1.6
      : entrada.tatica?.estiloOfensivo === 'Contra-ataque'
        ? 1.3
        : 1) *
    (entrada.taticaAdversario?.linhaDefensiva === 'Adiantada' ? 1.5 : 1);
  if (rng() < probImpedimento) {
    resultado.impedimentos += 1;
  }

  // Faltas comuns: marcação pesada e ritmo intenso cobram seu preço.
  const agressividade =
    (entrada.tatica?.marcacao === 'Pressão alta'
      ? 1.5
      : entrada.tatica?.marcacao === 'Individual'
        ? 1.25
        : 1) * (entrada.tatica?.ritmo === 'Intenso' ? 1.15 : 1);
  if (rng() < INCIDENTES_CAUSAL.probFaltaComumPorMinuto * agressividade) {
    resultado.faltasComuns += 1;
  }

  return resultado;
}

/**
 * Chute de PÊNALTI para o ledger (a cobrança em si — conversão, direção — é
 * resolvida pelo fluxo de pênalti do simulador; aqui registramos o fato).
 */
export function criarChutePenalti(args: {
  minuto: number;
  timeId: string;
  batedor: Player;
  goleiroId: string | undefined;
  convertido: boolean;
  defendido: boolean;
  sequencial: number;
  golX: number;
  golY: number;
}): ChutePartida {
  return {
    id: `chute_${args.minuto}_${args.sequencial}`,
    timeId: args.timeId,
    jogadorId: args.batedor.id,
    goleiroId: args.goleiroId,
    minuto: args.minuto,
    posseId: `bp_${args.minuto}_${args.timeId}`,
    situacao: 'penalti',
    corpo: args.batedor.pernaDominante === 'E' ? 'pe_esquerdo' : 'pe_direito',
    x: 0.5,
    y: 0.165,
    golX: args.convertido || args.defendido ? coord(args.golX) : undefined,
    golY: args.convertido || args.defendido ? coord(args.golY) : undefined,
    xg: XG_CAUSAL.xgPenalti,
    xgot: args.convertido ? 0.85 : args.defendido ? 0.6 : 0,
    resultado: args.convertido ? 'gol' : args.defendido ? 'defesa' : 'fora',
    grandeChance: true,
    deFora: false,
  };
}

/** Chute de FALTA DIRETA para o ledger (cobrança do especialista). */
export function criarChuteFaltaDireta(args: {
  minuto: number;
  timeId: string;
  cobrador: Player;
  goleiroId: string | undefined;
  gol: boolean;
  sequencial: number;
  rng: RandomGenerator;
}): ChutePartida {
  const rng = args.rng;
  const noAlvo = args.gol || rng() < 0.4;
  const baliza = noAlvo ? sortearBaliza(rng) : undefined;
  return {
    id: `chute_${args.minuto}_${args.sequencial}`,
    timeId: args.timeId,
    jogadorId: args.cobrador.id,
    goleiroId: args.goleiroId,
    minuto: args.minuto,
    posseId: `bp_${args.minuto}_${args.timeId}`,
    situacao: 'falta',
    corpo: args.cobrador.pernaDominante === 'E' ? 'pe_esquerdo' : 'pe_direito',
    x: coord(limitar01(0.5 + (rng() - 0.5) * 0.3)),
    y: coord(0.5 + rng() * 0.3),
    golX: baliza === undefined ? undefined : coord(baliza.golX),
    golY: baliza === undefined ? undefined : coord(baliza.golY),
    xg: XG_CAUSAL.xgFaltaDireta,
    xgot: coord(args.gol ? 0.5 + rng() * 0.3 : noAlvo ? 0.1 + rng() * 0.2 : 0),
    resultado: args.gol ? 'gol' : noAlvo ? 'defesa' : rng() < 0.5 ? 'fora' : 'bloqueado',
    grandeChance: false,
    deFora: true,
  };
}
