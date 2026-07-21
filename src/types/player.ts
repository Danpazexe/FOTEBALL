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

/**
 * Ordem canônica das posições (gol → ataque) — fonte única para filtros,
 * ordenação de elenco e sorteios por posição. Espelha a união `Position`.
 */
export const ORDEM_POSICOES: Position[] = [
  'GOL', 'ZAG', 'LD', 'LE', 'VOL', 'MC', 'MEI', 'PD', 'PE', 'SA', 'CA',
];

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
 * Tipo de jogador no mercado (BRASFOOT_MASTER §3.4):
 * - NORMAL:   comportamento padrão, força visível.
 * - NOVATO:   jovem com margem de potencial — aposta (pode revelar ou decepcionar).
 * - VETERANO: força conhecida e alta, mas no fim de carreira (declínio).
 * Derivado de idade/potencial no load; pode vir explícito no seed.
 */
export type TipoJogador = 'NORMAL' | 'NOVATO' | 'VETERANO';

/**
 * Empréstimo ativo (BRASFOOT_MASTER §9.3): o jogador joga por outro clube
 * temporariamente. `clubeId` aponta para onde ele atua agora; ao chegar a
 * `retornaEmTemporada`, volta ao `clubeDonoId`. Enquanto emprestado, o salário
 * segue o `clubeId` (quem usa, paga).
 */
export interface Emprestimo {
  clubeDonoId: string;
  retornaEmTemporada: string;
}

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
  /** Tipo no mercado (NORMAL/NOVATO/VETERANO). Derivado no load se ausente. */
  tipo?: TipoJogador;
  /** Empréstimo ativo (§9.3): presente quando o jogador está cedido a outro clube. */
  emprestimo?: Emprestimo;
  /**
   * Progresso (0–100%) rumo ao próximo ponto de cada atributo, acumulado pelos
   * treinos. Opcional para manter compatibilidade com saves antigos.
   */
  progressoAtributos?: ProgressoAtributos;
  /**
   * Atributo em FOCO no treino individual (desenvolve mais rápido). Opcional para
   * compatibilidade com saves antigos (undefined = sem foco).
   */
  focoTreino?: AtributoChave;
  /**
   * Plano de desenvolvimento por FUNÇÃO (Camada 3): id de `PLANOS_FUNCAO`. Quando
   * definido, o treino individual desenvolve o CONJUNTO de atributos do papel (tem
   * prioridade sobre `focoTreino`). Opcional (undefined = sem plano).
   */
  planoDesenvolvimento?: string;
  overall: number;
  potencial: number;
  condicaoFisica: number;
  moral: number;
  forma: number;
  /**
   * Estado físico do épico Overall Dinâmico (carga aguda/crônica, ritmo).
   * Opcional para compatibilidade com saves antigos; derivado com defaults
   * seguros no load (ver `types/desenvolvimento`). Populado pela Onda 5.
   */
  fisico?: import('./desenvolvimento').EstadoFisicoJogador;
  valorMercado: number;
  salario: number;
  contratoAte: string;
  clubeId: string | null;
  lesionado: boolean;
  diasLesao: number;
  suspenso: boolean;
  jogosSuspensao: number;
  /** Amarelos acumulados rumo à próxima suspensão (espelho legado; a fonte da
   * verdade é `disponibilidade.disciplinas` por competição). */
  amarelosParaSuspensao?: number;
  /**
   * Disciplina POR COMPETIÇÃO (cartões/suspensão isolados por torneio) + lesão
   * derivada. Opcional para compatibilidade; derivada no load (`comDisponibilidade`).
   * Os campos `suspenso`/`jogosSuspensao` viram espelho global derivado daqui.
   */
  disponibilidade?: import('./disciplina').DisponibilidadeJogador;
  estatisticasTemporada: PlayerSeasonStats;
  historicoTemporadas: PlayerSeasonStats[];
}
