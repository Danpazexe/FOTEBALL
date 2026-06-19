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
 * Habilidades especiais (perks) — no máximo 2 por jogador, ao estilo Brasfoot
 * (BRASFOOT_MASTER §3.2). Definem a identidade do jogador e modulam eventos
 * específicos da simulação. Os efeitos vivem em `engine/progression/habilidades`.
 */
export type Habilidade =
  | 'ARTILHEIRO'
  | 'ASSISTENCIAS'
  | 'LIDERANCA'
  | 'DEFENSOR'
  | 'VELOCISTA'
  | 'FINALIZADOR'
  | 'CHUTE_LONGO'
  | 'FALTA'
  | 'CABECEADOR'
  | 'GOLEIRO_PENALTI';

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
   * Habilidades especiais (máx. 2). Opcional: derivada dos atributos no load do
   * seed (`derivarHabilidades`) quando ausente, mas pode vir explícita no JSON
   * para craques feitos à mão.
   */
  habilidades?: Habilidade[];
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
