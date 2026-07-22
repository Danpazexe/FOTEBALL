export interface PenaltiResultado {
  direcaoChute: 'E' | 'C' | 'D';
  alturaChute: 'A' | 'B';
  direcaoGoleiro: 'E' | 'C' | 'D';
  convertido: boolean;
  potencia: number;
}

export type EventoPartidaTipo =
  | 'gol'
  | 'gol_contra'
  | 'cartao_amarelo'
  | 'cartao_vermelho'
  | 'lesao'
  | 'substituicao'
  | 'chance_perdida'
  | 'bola_trave'
  | 'penalti'
  | 'falta_cobranca';

/**
 * Evento que MUDA O PLACAR: gol normal ou gol contra (ambos somam 1 ao time que
 * marcou). Usado onde o placar é reconstruído a partir dos eventos (viradas,
 * moral, invariante placar↔eventos). NÃO inclui pênalti perdido/chance/trave.
 * Para CRÉDITO do artilheiro use `tipo === 'gol'` (gol contra não credita ninguém).
 */
export function ehEventoGol(tipo: EventoPartidaTipo): boolean {
  return tipo === 'gol' || tipo === 'gol_contra';
}

export interface EventoPartida {
  minuto: number;
  tipo: EventoPartidaTipo;
  timeId: string;
  jogadorId: string;
  jogadorEntraId?: string;
  /** Autor da assistência no gol de jogo aberto (quando houver). */
  jogadorAssistenciaId?: string;
  /** Quem cometeu a falta que originou o pênalti (eventos de pênalti/gol). */
  jogadorFaltaId?: string;
  descricao: string;
  penaltiData?: PenaltiResultado;
  /** Pênalti do time do usuário aguardando cobrança interativa (não resolvido). */
  penaltiPendente?: boolean;
  /**
   * Vínculo causal com o chute do ledger que originou o lance (engine V2).
   * Todo gol V2 tem chuteId; eventos antigos (saves V1) não têm.
   */
  chuteId?: string;
  /** Gol anulado pelo VAR (flag estruturada — não inferir da descrição). */
  anuladoVAR?: boolean;
  /** VAR flagrou o pênalti que originou este lance. */
  varFlagra?: boolean;
  /** Gol nascido de falha do goleiro adversário. */
  falhaGoleiro?: boolean;
  /** Gol nascido de falha grave da defesa adversária. */
  falhaDefesa?: boolean;
  /** Expulsão por segundo cartão amarelo (não vermelho direto). */
  segundoAmarelo?: boolean;
}

/** Desfecho estruturado de um chute do ledger causal (engine V2). */
export type ResultadoChute =
  | 'gol'
  | 'defesa' // no alvo, goleiro defendeu
  | 'bloqueado'
  | 'fora'
  | 'trave'
  | 'gol_anulado'; // entrou, mas o VAR anulou (não conta no placar)

/** Origem da jogada que gerou o chute (estruturada, não texto). */
export type SituacaoLance =
  | 'jogo_aberto'
  | 'contra_ataque'
  | 'escanteio'
  | 'falta'
  | 'penalti'
  | 'rebote';

export type ParteCorpoChute = 'pe_direito' | 'pe_esquerdo' | 'cabeca';

/**
 * Chute FACTUAL produzido pela engine causal V2 durante a simulação — fonte
 * única do placar, do xG e do mapa de finalizações. Persistido na Partida
 * (partidas de saves antigos não têm; a UI então mostra estado legacy honesto).
 * Invariantes: placar == chutes com resultado 'gol' por lado; xG do time ==
 * soma de `xg` dos chutes válidos do lado.
 */
export interface ChutePartida {
  id: string;
  timeId: string;
  /** Autor do chute. Em gol contra, é o DEFENSOR que marcou contra (golContra). */
  jogadorId: string;
  /** Garçom do lance (quando houver). */
  assistenciaId?: string;
  /** Goleiro que enfrentou o chute. */
  goleiroId?: string;
  minuto: number;
  /** Origem causal: id da posse/sequência ofensiva que gerou o chute. */
  posseId: string;
  situacao: SituacaoLance;
  corpo: ParteCorpoChute;
  /** Posição no terço de ataque: x 0=esq…1=dir; y 0=linha do gol…1=fundo. */
  x: number;
  y: number;
  /** Posição na baliza (apenas chutes no alvo): 0..1 esq→dir / chão→travessão. */
  golX?: number;
  golY?: number;
  /** Qualidade objetiva da chance (0..1). xG do time = soma dos chutes. */
  xg: number;
  /** Qualidade do chute que foi ao gol (0 quando não foi no alvo). */
  xgot: number;
  resultado: ResultadoChute;
  grandeChance: boolean;
  /** Chute de fora da área. */
  deFora: boolean;
  /** O gol saiu de falha do goleiro (evento raro, estruturado). */
  falhaGoleiro?: boolean;
  /** Gol contra: o autor é um defensor do time adversário ao `timeId`. */
  golContra?: boolean;
}

/** Versão do motor que produziu a partida (ausente = V1/legacy). */
export type VersaoEnginePartida = 1 | 2;

/**
 * Qualidade dos dados esportivos persistidos:
 *  • legacy — partida de save antigo ou motor de fundo (sem ledger causal);
 *  • causal_full — partida do usuário com ledger completo;
 *  • causal_summary — partida da IA: chutes + agregados (sem detalhe por minuto).
 */
export type QualidadeDadosPartida = 'legacy' | 'causal_full' | 'causal_summary';

/** Condição climática da partida (sorteada pela engine, determinística por seed). */
export type ClimaPartida = 'Ensolarado' | 'Nublado' | 'Chuvoso';

/**
 * Estatísticas avançadas de UM time na partida, acumuladas minuto a minuto
 * pela engine a partir do jogo REAL (forças atuais, tática, posse do minuto e
 * eventos) — nunca inventadas na UI. Invariantes garantidos:
 * finalizacoes = finalizacoesNaArea + finalizacoesDeFora;
 * finalizacoesNoAlvo ≥ gols; passesCertos ≤ passesTentados; faltas ≥ cartões.
 */
export interface EstatisticasTimePartida {
  /** xG — soma das probabilidades reais de gol do motor, minuto a minuto. */
  golsEsperados: number;
  /** xA — parcela do xG de jogo aberto que o motor credita a um garçom (~70%). */
  assistenciasEsperadas: number;
  finalizacoes: number;
  finalizacoesNoAlvo: number;
  finalizacoesNaArea: number;
  finalizacoesDeFora: number;
  grandesChances: number;
  passesTentados: number;
  passesCertos: number;
  dribles: number;
  desarmes: number;
  interceptacoes: number;
  cruzamentos: number;
  escanteios: number;
  faltas: number;
  impedimentos: number;
  /**
   * Posse relativa por zona do campo, grade 3×3 (frações que somam 1).
   * Linhas na perspectiva do PRÓPRIO time: [0]=terço defensivo, [1]=meio,
   * [2]=terço ofensivo. Colunas: [0]=esquerda, [1]=centro, [2]=direita.
   */
  posseZonas: number[][];
  /**
   * Perigo ofensivo criado por corredor [esquerda, centro, direita] (frações
   * que somam 1) — derivado da POSIÇÃO REAL dos autores dos lances.
   */
  perigoSetores: number[];
  /** Finalizações por jogador (id → contagem) — alimenta o card do destaque. */
  finalizacoesPorJogador: Record<string, {total: number; noAlvo: number}>;
  /** Passes por jogador (id → tentados/certos) — coluna PS da súmula. */
  passesPorJogador: Record<string, {tentados: number; certos: number}>;
}

export interface EstatisticasPartida {
  casa: EstatisticasTimePartida;
  fora: EstatisticasTimePartida;
  clima: ClimaPartida;
  /** Temperatura em °C (sorteada com o clima). */
  temperatura: number;
  /** Público presente — fórmula REAL da bilheteria (preenchido pelo store). */
  publico?: number;
  /**
   * Momentum minuto a minuto na perspectiva da CASA (−1 a 1): posse do minuto
   * mais o impacto dos lances reais. Alimenta o gráfico da súmula.
   */
  momentumPorMinuto: number[];
}

/**
 * Árbitro da partida — derivado deterministicamente da seed (ver
 * `engine/simulation/arbitro`). `rigor` 1–5 modula as probabilidades de
 * cartão/falta da simulação (1–2 "deixa jogar", 3 equilibrado, 4–5 rigoroso).
 */
export interface ArbitroPartida {
  nome: string;
  rigor: number;
}

export interface Partida {
  id: string;
  competicaoId: string;
  rodada: number;
  data: string;
  timeCasa: string;
  timeFora: string;
  placarCasa?: number;
  placarFora?: number;
  eventos: EventoPartida[];
  jogada: boolean;
  modoJogado: 'simulado' | 'interativo';
  /**
   * Posse de bola final (%), acumulada minuto a minuto pela engine durante a
   * simulação — nunca inventada na UI. Ausente em partidas antigas (saves
   * anteriores à estatística). posseCasa + posseFora = 100.
   */
  posseCasa?: number;
  posseFora?: number;
  /**
   * Estatísticas avançadas acumuladas pela engine (xG, finalizações, passes,
   * zonas...). Ausente em partidas de saves antigos.
   */
  estatisticas?: EstatisticasPartida;
  /**
   * Escalações titulares NO APITO INICIAL (ids, só quem estava disponível) —
   * snapshot para a súmula histórica não depender da formação ATUAL do clube,
   * que muda com trocas/transferências. Ausente em saves antigos.
   */
  titularesCasa?: string[];
  titularesFora?: string[];
  /**
   * Vencedor decidido nos pênaltis (só em mata-mata empatado após a
   * prorrogação). Ausente em jogos de liga e em jogos resolvidos no tempo.
   */
  vencedorPenaltis?: string;
  /** Versão do motor que simulou (ausente em saves antigos = V1). */
  engineVersion?: VersaoEnginePartida;
  /** Qualidade dos dados persistidos (ausente = legacy). */
  qualidadeDados?: QualidadeDadosPartida;
  /**
   * Ledger de chutes FACTUAIS da engine causal V2 (ordenado por minuto).
   * Fonte do placar, do xG e do mapa de finalizações. Ausente em partidas
   * legacy — a UI não fabrica dados no lugar.
   */
  chutes?: ChutePartida[];
  /**
   * Árbitro que apitou a partida (nome fictício + rigor 1–5). Derivado da seed
   * pela engine — ausente em saves antigos e em partidas ao vivo legadas
   * (campo aditivo; a ausência é sempre tolerada).
   */
  arbitro?: ArbitroPartida;
}
