export type Position =
  | 'GOL'
  | 'ZAG'
  | 'LD'
  | 'LE'
  | 'VOL'
  | 'MC'
  | 'MEI'
  | 'PD'
  | 'PE'
  | 'SA'
  | 'CA';

export type PernaDominante = 'D' | 'E' | 'Ambidestro';

export interface PlayerAttributes {
  finalizacao: number;
  passe: number;
  marcacao: number;
  desarme: number;
  velocidade: number;
  resistencia: number;
  forca: number;
  reflexos: number;
  posicionamento: number;
  drible: number;
  cabeceio: number;
  cruzamento: number;
}

export type AtributoChave = keyof PlayerAttributes;

/**
 * Progresso acumulado rumo ao PRÓXIMO ponto de cada atributo (0–100%). Quando um
 * atributo chega a 100%, ele sobe +1 e o progresso volta a 0 (ver
 * `engine/progression/treinoAtributos`). Opcional: saves antigos e jogadores
 * recém-criados começam sem nenhum progresso (tratado como 0 em todo lugar).
 */
export type ProgressoAtributos = Partial<Record<AtributoChave, number>>;

export interface PlayerSeasonStats {
  temporada: string;
  jogos: number;
  gols: number;
  assistencias: number;
  cartoesAmarelos: number;
  cartoesVermelhos: number;
  notaMedia: number;
}

export interface Player {
  id: string;
  nome: string;
  apelido?: string;
  idade: number;
  nacionalidade: string;
  posicaoPrincipal: Position;
  posicoesSecundarias: Position[];
  pernaDominante: PernaDominante;
  atributos: PlayerAttributes;
  /**
   * Progresso (0–100%) rumo ao próximo ponto de cada atributo, acumulado pelos
   * treinos. Opcional para manter compatibilidade com saves antigos.
   */
  progressoAtributos?: ProgressoAtributos;
  overall: number;
  potencial: number;
  condicaoFisica: number;
  moral: number;
  forma: number;
  valorMercado: number;
  salario: number;
  contratoAte: string;
  clubeId: string | null;
  lesionado: boolean;
  diasLesao: number;
  suspenso: boolean;
  jogosSuspensao: number;
  /** Amarelos acumulados rumo à próxima suspensão (0-2; a cada 3, suspende). */
  amarelosParaSuspensao?: number;
  estatisticasTemporada: PlayerSeasonStats;
  historicoTemporadas: PlayerSeasonStats[];
}
