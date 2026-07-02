import type {Player, Position} from '../../types/player';
import type {Tatica} from '../../types/club';

export type Setor = 'GOL' | 'DEFESA' | 'MEIO' | 'ATAQUE';

export type GravidadeLesao = 'leve' | 'media' | 'grave';

export interface JogadorEscaladoCore {
  jogadorId: string;
  posicao: Position;
}

export interface EscalacaoCore {
  titulares: JogadorEscaladoCore[];
  reservas?: string[];
}

export interface PenalidadeEscalacao {
  jogadorId: string;
  posicaoOriginal: Position;
  posicaoEscalada: Position;
  percentual: number;
  motivo: 'secundaria' | 'mesmo_setor' | 'fora_setor';
}

export interface ResultadoValidacaoEscalacao {
  valido: boolean;
  erros: string[];
  avisos: string[];
  penalidades: PenalidadeEscalacao[];
}

export interface TimeEmPartidaCore {
  clubeId: string;
  nome: string;
  jogadores: Player[];
  escalacao: EscalacaoCore;
  tatica: Tatica | null;
  mandoDeCampo?: boolean;
}

export interface ForcaTimeCore {
  ataque: number;
  meio: number;
  defesa: number;
  goleiro: number;
  fisico: number;
  moral: number;
  forma: number;
  entrosamento: number;
  geral: number;
  riscoDefensivo: number;
  volumeOfensivo: number;
  desgasteProjetado: number;
}

export type EventoPartidaCoreTipo =
  | 'chance'
  | 'gol'
  | 'defesa_dificil'
  | 'bola_na_trave'
  | 'cartao_amarelo'
  | 'cartao_vermelho'
  | 'lesao'
  | 'pressao_final'
  | 'fim_de_jogo';

export interface EventoPartidaCore {
  minuto: number;
  tipo: EventoPartidaCoreTipo;
  clubeId?: string;
  jogadorId?: string;
  assistenciaId?: string;
  xg?: number;
  gravidade?: GravidadeLesao;
  texto: string;
}

export interface EstatisticasPartidaCore {
  posseCasa: number;
  posseFora: number;
  finalizacoesCasa: number;
  finalizacoesFora: number;
  finalizacoesNoAlvoCasa: number;
  finalizacoesNoAlvoFora: number;
  xgCasa: number;
  xgFora: number;
  escanteiosCasa: number;
  escanteiosFora: number;
  faltasCasa: number;
  faltasFora: number;
  amarelosCasa: number;
  amarelosFora: number;
  vermelhosCasa: number;
  vermelhosFora: number;
}

export interface NotaJogadorCore {
  jogadorId: string;
  clubeId: string;
  nota: number;
  minutos: number;
  gols: number;
  assistencias: number;
  cartoesAmarelos: number;
  cartoesVermelhos: number;
}

export interface AlteracaoCondicaoCore {
  jogadorId: string;
  antes: number;
  depois: number;
  delta: number;
}

export interface AlteracaoMoralCore {
  jogadorId: string;
  antes: number;
  depois: number;
  delta: number;
}

export interface LesaoGeradaCore {
  jogadorId: string;
  clubeId: string;
  gravidade: GravidadeLesao;
  jogosFora: number;
}

export interface SuspensaoGeradaCore {
  jogadorId: string;
  clubeId: string;
  jogos: number;
  motivo: 'vermelho' | 'amarelos';
}

export interface SimularPartidaCoreInput {
  jogoId: string;
  casa: TimeEmPartidaCore;
  fora: TimeEmPartidaCore;
  seed: string;
}

export interface SimularPartidaCoreOutput {
  jogoId: string;
  placar: {
    casa: number;
    fora: number;
  };
  eventos: EventoPartidaCore[];
  estatisticas: EstatisticasPartidaCore;
  notas: NotaJogadorCore[];
  forcas: {
    casa: ForcaTimeCore;
    fora: ForcaTimeCore;
  };
  alteracoes: {
    condicao: AlteracaoCondicaoCore[];
    moral: AlteracaoMoralCore[];
    lesoes: LesaoGeradaCore[];
    suspensoes: SuspensaoGeradaCore[];
  };
}

export interface RegistroTabelaCore {
  clubeId: string;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  golsPro: number;
  golsContra: number;
  saldoGols: number;
  pontos: number;
}

export interface ResultadoParaTabelaCore {
  casaId: string;
  foraId: string;
  golsCasa: number;
  golsFora: number;
}
