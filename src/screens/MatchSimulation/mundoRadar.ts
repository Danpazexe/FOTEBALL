/**
 * mundoRadar — WORLDSTATE ÚNICO do Radar da Partida (SRP).
 *
 * `derivarMundoRadar` é a ÚNICA fonte de verdade derivada do radar: recebe o
 * estado REAL da partida no minuto (momentum, chutes do ledger, eventos,
 * escalações vigentes com âncoras de formação, fim do lance anterior) e devolve
 * TUDO que o componente `RadarPartida` renderiza — elencos posicionados, lance
 * do minuto, dots de chute, ícones de evento, posse/pressão e os DESTAQUES
 * INTELIGENTES. O componente só desenha; os destaques são funções derivadoras
 * plugáveis sobre a MESMA entrada (aberto para novos derivadores, fechado para
 * modificação dos existentes).
 *
 * 100% puro e determinístico: sem React, sem Math.random(), sem Date.now(),
 * sem store. Física do jogador via fisicoEngine (`prontidao`/`nivelRisco`,
 * MESMOS cortes do rodízio — importados, nunca reimplementados).
 */

import type {TipoPassoLance} from '../../engine/simulation/lances';
import {nivelRisco, prontidao} from '../../engine/physical/fisicoEngine';
import {
  fimDoLance,
  posicionarElencosMinuto,
  reconstruirLanceMinuto,
  type ElencosPosicionados,
  type FimLanceMinuto,
  type JogadorEmCampoLance,
  type LanceMinuto,
  type PontoJogadorRadar,
} from '../../engine/simulation/reconstruirLanceMinuto';
import {PRONTIDAO_CANSADO} from '../../engine/tactics/rodizio';
import type {
  ChutePartida,
  EventoPartida,
  EventoPartidaTipo,
  Player,
  Position,
  ResultadoChute,
} from '../../types';
import {
  pontoChuteNoRadar,
  pontoEventoNoRadar,
  zonaPressao,
  type ZonaPressao,
} from './radarCampo';

// ─── Regras documentadas dos derivadores ─────────────────────────────────────

/**
 * Ícones de evento (cartão/lesão/sub/etc.) ficam em cena por esta janela de
 * MINUTOS de jogo e expiram — só os ícones; dots de CHUTE persistem a partida
 * inteira e a timeline completa segue no feed.
 */
export const JANELA_ICONES_MIN = 12;
/** Pressão sustentada: N minutos SEGUIDOS com momento do mesmo lado. */
export const PRESSAO_SUSTENTADA_MIN = 4;
/** ... acima deste |momento| por amostra. */
export const PRESSAO_SUSTENTADA_LIMIAR = 0.35;
/** Zona perigosa: célula da grade com pelo menos este nº de chutes REAIS. */
export const ZONA_PERIGO_MIN_CHUTES = 2;
/** Grade da mancha de perigo (colunas × linhas do campo horizontal). */
const GRADE_COLUNAS = 4;
const GRADE_LINHAS = 3;

// ─── Shapes do mundo ─────────────────────────────────────────────────────────

export interface DotChuteRadar {
  id: string;
  x: number;
  y: number;
  resultado: ResultadoChute;
  /** Idade em minutos de jogo (esmaecimento na UI). */
  idade: number;
}

export interface IconeEventoRadar {
  chave: string;
  tipo: EventoPartidaTipo;
  anuladoVAR: boolean;
  x: number;
  y: number;
}

/** Mancha de calor derivada de chutes REAIS acumulados numa região. */
export interface ZonaPerigoRadar {
  x: number;
  y: number;
  /** 0..1 (nº de chutes na célula / 5, teto 1). */
  intensidade: number;
  ladoCasa: boolean;
}

/** Alerta de pressão sustentada (ver constantes acima). */
export interface AlertaPressaoRadar {
  lado: 'casa' | 'fora';
  /** true quando quem pressiona é o ADVERSÁRIO do usuário (aviso no header). */
  doAdversario: boolean;
}

/** Linha/compactação do time do USUÁRIO (derivada dos pontos visíveis). */
export interface LinhaDefensivaRadar {
  /** x da última linha de defesa (média dos 4 de linha mais recuados). */
  xDefesa: number;
  /** x da linha de meio (média dos 4 seguintes). */
  xMeio: number;
  /** Distância defesa↔meio (0..1) — quanto menor, mais compacto. */
  compactacao: number;
}

export interface MundoRadar {
  minuto: number;
  ladoUsuario: 'casa' | 'fora';
  posse: {casa: number; fora: number};
  pressao: ZonaPressao;
  elencos: ElencosPosicionados;
  lance: LanceMinuto | null;
  /** Fim do lance deste minuto — realimenta `lanceAnterior` do próximo. */
  fim: FimLanceMinuto | null;
  dotsChute: DotChuteRadar[];
  iconesEvento: IconeEventoRadar[];
  zonasPerigo: ZonaPerigoRadar[];
  alertaPressao: AlertaPressaoRadar | null;
  linhaDefensiva: LinhaDefensivaRadar | null;
  /** Jogadores do USUÁRIO em campo no vermelho físico (cortes do rodízio). */
  jogadoresNoVermelho: string[];
  /** x do último defensor DE LINHA adversário (linha de impedimento). */
  linhaImpedimento: number | null;
}

export interface EntradaMundoRadar {
  seedPartida: number;
  minuto: number;
  /** Série REAL `momentumPorMinuto` completa até o minuto (ótica da casa). */
  momentum: number[];
  posseCasa: number;
  timeCasaId: string;
  timeForaId: string;
  ladoUsuario: 'casa' | 'fora';
  emCampoCasa: JogadorEmCampoLance[];
  emCampoFora: JogadorEmCampoLance[];
  /** Eventos REAIS da partida até agora. */
  eventos: EventoPartida[];
  /** Ledger causal completo até agora. */
  chutes: ChutePartida[];
  eventosDoMinuto: EventoPartida[];
  chutesDoMinuto: ChutePartida[];
  lanceAnterior: FimLanceMinuto | null;
  posicoes: Record<string, Position>;
  /** Jogadores do USUÁRIO em campo (fonte dos cortes físicos). */
  jogadoresUsuario: Player[];
}

// ─── Derivadores plugáveis (cada um lê só dado real) ─────────────────────────

/** Tipos de evento que pingam ícone no radar (gol tem dot + replay próprios). */
const TIPOS_ICONE: readonly EventoPartidaTipo[] = [
  'cartao_amarelo',
  'cartao_vermelho',
  'substituicao',
  'lesao',
  'penalti',
  'falta_cobranca',
  'bola_trave',
  'chance_perdida',
];

/**
 * ZONA PERIGOSA: grade 4×3 sobre o campo horizontal; célula com
 * `ZONA_PERIGO_MIN_CHUTES`+ chutes REAIS (por time) vira mancha no CENTROIDE
 * dos chutes dela. Intensidade = nº de chutes / 5 (teto 1).
 */
export function derivarZonasPerigo(
  chutes: ChutePartida[],
  timeCasaId: string,
): ZonaPerigoRadar[] {
  const celulas = new Map<
    string,
    {somaX: number; somaY: number; n: number; ladoCasa: boolean}
  >();
  for (const chute of chutes) {
    if (chute.resultado === 'gol_anulado') {
      continue;
    }
    const ponto = pontoChuteNoRadar(chute, timeCasaId);
    const coluna = Math.min(GRADE_COLUNAS - 1, Math.floor(ponto.x * GRADE_COLUNAS));
    const linha = Math.min(GRADE_LINHAS - 1, Math.floor(ponto.y * GRADE_LINHAS));
    const ladoCasa = chute.timeId === timeCasaId;
    const chave = `${coluna}:${linha}:${ladoCasa ? 'c' : 'f'}`;
    const celula = celulas.get(chave) ?? {somaX: 0, somaY: 0, n: 0, ladoCasa};
    celula.somaX += ponto.x;
    celula.somaY += ponto.y;
    celula.n += 1;
    celulas.set(chave, celula);
  }
  return [...celulas.entries()]
    .filter(([, c]) => c.n >= ZONA_PERIGO_MIN_CHUTES)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([, c]) => ({
      x: c.somaX / c.n,
      y: c.somaY / c.n,
      intensidade: Math.min(1, c.n / 5),
      ladoCasa: c.ladoCasa,
    }));
}

/**
 * PRESSÃO SUSTENTADA: os últimos `PRESSAO_SUSTENTADA_MIN` minutos TODOS com
 * momento além de `PRESSAO_SUSTENTADA_LIMIAR` para o mesmo lado.
 */
export function derivarAlertaPressao(
  momentum: readonly number[],
  ladoUsuario: 'casa' | 'fora',
): AlertaPressaoRadar | null {
  if (momentum.length < PRESSAO_SUSTENTADA_MIN) {
    return null;
  }
  const ultimos = momentum.slice(-PRESSAO_SUSTENTADA_MIN);
  const lado: 'casa' | 'fora' | null = ultimos.every(
    m => m >= PRESSAO_SUSTENTADA_LIMIAR,
  )
    ? 'casa'
    : ultimos.every(m => m <= -PRESSAO_SUSTENTADA_LIMIAR)
      ? 'fora'
      : null;
  if (lado === null) {
    return null;
  }
  return {lado, doAdversario: lado !== ladoUsuario};
}

/** Média do x dos pontos. */
function mediaX(pontos: PontoJogadorRadar[]): number {
  return pontos.reduce((soma, p) => soma + p.x, 0) / pontos.length;
}

/**
 * LINHA/COMPACTAÇÃO do time do usuário, dos pontos VISÍVEIS (âncoras reais já
 * deslizadas pelo momento): última linha de defesa = média do x dos 4 de linha
 * mais recuados; meio = média dos 4 seguintes; compactação = distância entre
 * as duas. Precisa de ao menos 8 jogadores de linha (senão, sem linha).
 */
export function derivarLinhaDefensiva(
  elencos: ElencosPosicionados,
  ladoUsuario: 'casa' | 'fora',
): LinhaDefensivaRadar | null {
  const meus = (ladoUsuario === 'casa' ? elencos.casa : elencos.fora).filter(
    p => !p.goleiro,
  );
  if (meus.length < 8) {
    return null;
  }
  // Casa defende a esquerda (recuado = x menor); visitante, a direita.
  const ordenados = [...meus].sort((a, b) =>
    ladoUsuario === 'casa' ? a.x - b.x : b.x - a.x,
  );
  const xDefesa = mediaX(ordenados.slice(0, 4));
  const xMeio = mediaX(ordenados.slice(4, 8));
  return {xDefesa, xMeio, compactacao: Math.abs(xMeio - xDefesa)};
}

/**
 * JOGADOR NO VERMELHO: MESMOS cortes do rodízio pré-jogo (c4430b0) —
 * prontidão < `PRONTIDAO_CANSADO` (55, faixa Crítica) OU risco de lesão
 * elevado/muito elevado. Sinal visual apenas; a troca segue pelos Ajustes.
 */
export function derivarJogadoresNoVermelho(
  jogadoresUsuario: Player[],
): string[] {
  return jogadoresUsuario
    .filter(jogador => {
      const risco = nivelRisco(jogador);
      return (
        prontidao(jogador) < PRONTIDAO_CANSADO ||
        risco === 'elevado' ||
        risco === 'muito_elevado'
      );
    })
    .map(jogador => jogador.id);
}

/**
 * LINHA DE IMPEDIMENTO (visualização broadcast): x do último defensor DE
 * LINHA do time ADVERSÁRIO do usuário — o ponto de linha mais próximo do gol
 * que ele defende (goleiro fora da conta, como na regra).
 */
export function derivarLinhaImpedimento(
  elencos: ElencosPosicionados,
  ladoUsuario: 'casa' | 'fora',
): number | null {
  const adversarios = (
    ladoUsuario === 'casa' ? elencos.fora : elencos.casa
  ).filter(p => !p.goleiro);
  if (adversarios.length === 0) {
    return null;
  }
  const xs = adversarios.map(p => p.x);
  // Visitante defende a direita (x=1); casa, a esquerda (x=0).
  return ladoUsuario === 'casa' ? Math.max(...xs) : Math.min(...xs);
}

// ─── O derivador do mundo ────────────────────────────────────────────────────

/** Deriva o MUNDO completo do radar para UM minuto simulado. */
export function derivarMundoRadar(entrada: EntradaMundoRadar): MundoRadar {
  const {
    seedPartida,
    minuto,
    momentum,
    posseCasa,
    timeCasaId,
    timeForaId,
    ladoUsuario,
    emCampoCasa,
    emCampoFora,
    eventos,
    chutes,
    eventosDoMinuto,
    chutesDoMinuto,
    lanceAnterior,
    posicoes,
    jogadoresUsuario,
  } = entrada;
  const momentoMinuto = momentum[momentum.length - 1] ?? 0;

  const elencos = posicionarElencosMinuto({
    seedPartida,
    minuto,
    momentoMinuto,
    emCampoCasa,
    emCampoFora,
  });

  const lance = reconstruirLanceMinuto({
    seedPartida,
    minuto,
    momentoMinuto,
    timeCasaId,
    timeForaId,
    emCampoCasa,
    emCampoFora,
    eventosDoMinuto,
    chutesDoMinuto,
    lanceAnterior,
  });

  const dotsChute: DotChuteRadar[] = chutes
    .filter(chute => chute.resultado !== 'gol_anulado')
    .map(chute => ({
      id: chute.id,
      resultado: chute.resultado,
      idade: minuto - chute.minuto,
      ...pontoChuteNoRadar(chute, timeCasaId),
    }));

  const iconesEvento: IconeEventoRadar[] = eventos
    .map((evento, indice) => ({evento, indice}))
    .filter(
      ({evento}) =>
        minuto - evento.minuto <= JANELA_ICONES_MIN &&
        TIPOS_ICONE.includes(evento.tipo),
    )
    .map(({evento, indice}) => ({
      chave: `${indice}_${evento.minuto}_${evento.tipo}`,
      tipo: evento.tipo,
      anuladoVAR: evento.anuladoVAR === true,
      ...pontoEventoNoRadar(evento, chutes, timeCasaId, momentum, posicoes)
        .ponto,
    }));

  return {
    minuto,
    ladoUsuario,
    posse: {casa: posseCasa, fora: 100 - posseCasa},
    pressao: zonaPressao(momentum),
    elencos,
    lance,
    fim: lance
      ? fimDoLance(lance, timeCasaId, timeForaId) ?? lanceAnterior ?? null
      : lanceAnterior ?? null,
    dotsChute,
    iconesEvento,
    zonasPerigo: derivarZonasPerigo(chutes, timeCasaId),
    alertaPressao: derivarAlertaPressao(momentum, ladoUsuario),
    linhaDefensiva: derivarLinhaDefensiva(elencos, ladoUsuario),
    jogadoresNoVermelho: derivarJogadoresNoVermelho(jogadoresUsuario),
    linhaImpedimento: derivarLinhaImpedimento(elencos, ladoUsuario),
  };
}

// ─── Cadência real (UI usa para sincronizar a bola com o relógio) ────────────

/** Peso relativo da duração de cada tipo de toque (chute é seco; bola alçada
 * demora; roubada é curta). */
const PESO_TOQUE: Partial<Record<TipoPassoLance, number>> = {
  finalizacao: 0.5,
  gol: 0.5,
  gol_contra: 0.5,
  cruzamento: 1.5,
  escanteio: 1.5,
  lancamento: 1.5,
  drible: 1.3,
  desarme: 0.8,
  interceptacao: 0.8,
  recuperacao: 0.9,
};
/** Piso de duração por segmento (abaixo disso o withTiming nem desenha). */
const DURACAO_MINIMA_MS = 16;

/**
 * Durações dos segmentos do lance para PREENCHER o tempo REAL que o minuto de
 * jogo dura na tela (900ms a 1x, 450ms a 2x, 180ms a 5x, 90ms a 10x — a UI
 * calcula pelo relógio da partida). `tipos` = tipo do toque de DESTINO de
 * cada segmento (`toques.slice(1)`). A soma ≈ msPorMinutoJogo (nunca abaixo
 * do piso por segmento): a bola nunca fica parada nem atropela.
 */
export function duracoesDosToques(
  tipos: readonly TipoPassoLance[],
  msPorMinutoJogo: number,
): number[] {
  if (tipos.length === 0) {
    return [];
  }
  const pesos = tipos.map(t => PESO_TOQUE[t] ?? 1);
  const somaPesos = pesos.reduce((soma, peso) => soma + peso, 0);
  const orcamento = Math.max(tipos.length * DURACAO_MINIMA_MS, msPorMinutoJogo);
  return pesos.map(peso =>
    Math.max(DURACAO_MINIMA_MS, Math.round((peso / somaPesos) * orcamento)),
  );
}
