export interface PenaltiResultado {
  direcaoChute: 'E' | 'C' | 'D';
  alturaChute: 'A' | 'B';
  direcaoGoleiro: 'E' | 'C' | 'D';
  convertido: boolean;
  potencia: number;
}

export type EventoPartidaTipo =
  | 'gol'
  | 'cartao_amarelo'
  | 'cartao_vermelho'
  | 'lesao'
  | 'substituicao'
  | 'chance_perdida'
  | 'penalti'
  | 'falta_cobranca';

export interface EventoPartida {
  minuto: number;
  tipo: EventoPartidaTipo;
  timeId: string;
  jogadorId: string;
  jogadorEntraId?: string;
  /** Autor da assistência no gol de jogo aberto (quando houver). */
  jogadorAssistenciaId?: string;
  descricao: string;
  penaltiData?: PenaltiResultado;
  /** Pênalti do time do usuário aguardando cobrança interativa (não resolvido). */
  penaltiPendente?: boolean;
}

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
   * Vencedor decidido nos pênaltis (só em mata-mata empatado após a
   * prorrogação). Ausente em jogos de liga e em jogos resolvidos no tempo.
   */
  vencedorPenaltis?: string;
}
