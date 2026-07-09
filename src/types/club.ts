import type {Position} from './player';

/** Esquemas-base prontos (templates com posições fixas). */
export type FormacaoPreset =
  | '4-4-2'
  | '4-3-3'
  | '3-5-2'
  | '4-2-3-1'
  | '5-3-2'
  | '4-5-1';

export type FormacaoTipo =
  | FormacaoPreset
  /** Escalação montada livremente pelo técnico (posições vêm das coordenadas). */
  | 'Personalizada';

export interface TitularFormacao {
  /**
   * Posição "discreta" do jogador no campo (GOL/ZAG/...). Em escalações livres
   * é DERIVADA das coordenadas `x`/`y` (ver `engine/tactics/geometria`); nas
   * formações-base (templates) vem fixada pelo esquema.
   */
  posicao: Position;
  jogadorId: string;
  /**
   * Coordenadas normalizadas no campo, opcionais (saves antigos não têm):
   * - `x`: 0 = lateral esquerda, 1 = lateral direita;
   * - `y`: 0 = própria linha de fundo (defesa), 1 = linha de fundo adversária (ataque).
   * Quando ausentes, a UI usa o layout por linha do esquema (comportamento antigo).
   */
  x?: number;
  y?: number;
}

export interface Formacao {
  tipo: FormacaoTipo;
  titulares: TitularFormacao[];
  reservas: string[];
}

export interface Tatica {
  estiloOfensivo:
    | 'Contra-ataque'
    | 'Posse de bola'
    | 'Ataque direto'
    | 'Equilibrado';
  marcacao: 'Zona' | 'Individual' | 'Pressão alta';
  linhaDefensiva: 'Recuada' | 'Normal' | 'Adiantada';
  ritmo: 'Lento' | 'Normal' | 'Intenso';
  /**
   * Por onde o time ataca (afeta a força pela qualidade do flanco escolhido).
   * Opcional só por compatibilidade de saves antigos — ausência = 'Ambos'
   * (neutro). taticaDefault e os presets sempre definem.
   */
  ladoAtaque?: 'Esquerda' | 'Centro' | 'Direita' | 'Ambos';
  /**
   * Largura do time: Amplo abre o jogo (ataque), Estreito compacta (meio).
   * Opcional por compatibilidade de saves — ausência = 'Normal' (neutro).
   */
  amplidao?: 'Estreito' | 'Normal' | 'Amplo';
}

export interface Estadio {
  nome: string;
  capacidade: number;
  precoMedioIngresso: number;
  nivelInfraestrutura: number;
  /**
   * Fator de ajuste do preço do ingresso definido pelo técnico (§8.2). 1.0 =
   * preço normal; >1 cobra mais (afasta torcida); <1 barateia (lota). Opcional
   * para compatibilidade com saves antigos (tratado como 1.0).
   */
  precoIngressoFator?: number;
}

export interface ReceitaDetalhada {
  bilheteria: number;
  patrocinio: number;
  premiacoes: number;
  vendaJogadores: number;
}

export interface DespesaDetalhada {
  salarios: number;
  manutencaoEstadio: number;
  comissoes: number;
  contratacoes: number;
}

export interface Patrocinio {
  nome: string;
  valorMensal: number;
  bonusPorVitoria: number;
  ativoAte: string;
}

export interface Transacao {
  data: string;
  tipo: 'receita' | 'despesa';
  categoria: string;
  valor: number;
  descricao: string;
}

export interface FinancasClube {
  saldo: number;
  receitaMensal: ReceitaDetalhada;
  despesaMensal: DespesaDetalhada;
  patrocinadores: Patrocinio[];
  historicoTransacoes: Transacao[];
}

export interface Clube {
  id: string;
  nome: string;
  sigla: string;
  escudoUrl?: string;
  cidade: string;
  estado: string;
  /** Organização do seed: nacionalidade, campeonato e divisão do clube. */
  pais?: string;
  campeonato?: string;
  divisao?: string;
  fundacao?: number | null;
  elenco: string[];
  formacaoAtual: Formacao | null;
  taticaAtual: Tatica | null;
  financas: FinancasClube;
  estadio: Estadio;
  reputacao: number;
  controladoPorIA: boolean;
  /** Capitão do time (id do jogador). Opcional — saves antigos não têm. */
  capitaoId?: string;
}
