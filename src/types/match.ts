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
   * Vencedor decidido nos pênaltis (só em mata-mata empatado após a
   * prorrogação). Ausente em jogos de liga e em jogos resolvidos no tempo.
   */
  vencedorPenaltis?: string;
}
