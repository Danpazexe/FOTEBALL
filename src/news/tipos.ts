/**
 * Contrato do FEED DE NOTÍCIAS — derivação PURA de dados reais do jogo
 * (resultados, tabela, elenco, mercado). Nada é inventado: cada notícia sai de
 * um fato já existente no estado. Sem estado persistente novo. A implementação
 * vive em `gerarNoticias.ts` e a UI (tela Notícias) consome este contrato.
 *
 * Mantém `src/engine` puro: esta é lógica de APRESENTAÇÃO derivada (pode referir
 * tokens/ícones da UI por tipo), não simulação.
 */
import type {IconeNome} from '../components/Icone';
import type {CorTexto} from '../design-system';
import type {Clube, Partida, Player, TabelaClassificacao} from '../types';

export type NoticiaCategoria = 'partida' | 'mercado' | 'clube';

/** Ação ao tocar numa notícia — a tela mapeia para a navegação real. */
export type AcaoNoticia =
  | {tipo: 'partida'; partidaId: string} // → Relatório (MatchResult)
  | {tipo: 'prejogo'} // → Pré-jogo
  | {tipo: 'medico'} // → Departamento Médico
  | {tipo: 'classificacao'} // → Classificação
  | {tipo: 'elenco'}; // → Elenco

export interface Noticia {
  id: string;
  categoria: NoticiaCategoria;
  titulo: string;
  subtitulo: string;
  icone: IconeNome;
  /** Cor do ícone/realce (token). */
  tom: CorTexto;
  /** Escudo do adversário/clube (notícias de partida). */
  clubeId?: string;
  /** Avatar do jogador (lesão, suspensão, artilheiro, reforço). */
  jogadorId?: string;
  /** Selo em destaque à direita: placar "3-1", posição "4º", "INVICTO". */
  selo?: string;
  /** Tom do selo (default neutro). */
  seloTom?: CorTexto;
  /** O que abrir ao tocar (opcional). */
  acao?: AcaoNoticia;
  /** Ordenação decrescente (recência + importância). */
  peso: number;
}

/** Card de DESTAQUE no topo do feed (herói). */
export interface DestaqueNoticia {
  tipo: 'proximo_jogo' | 'ultimo_resultado';
  titulo: string;
  subtitulo: string;
  clubeCasaId: string;
  clubeForaId: string;
  rodada: number;
  /** Forma recente (V/E/D) do clube do usuário, cronológica, até 5. */
  formaUsuario: Array<'V' | 'E' | 'D'>;
  /** O clube do usuário joga/jogou em casa. */
  ehCasa: boolean;
  acao: AcaoNoticia;
}

export interface FeedNoticias {
  destaque: DestaqueNoticia | null;
  noticias: Noticia[];
}

/** Tudo que a derivação precisa (montado na tela a partir do store). */
export interface EntradaFeedNoticias {
  clubeId: string;
  clube: Clube;
  clubes: Clube[];
  jogadores: Player[];
  partidas: Partida[];
  /** Tabela JÁ ORDENADA (state.tabela) — índice 0 = 1º lugar. */
  tabela: TabelaClassificacao[];
  rodadaAtual: number;
  /** Próximo jogo do usuário (selecionarProximoJogo) ou null. */
  proximoJogo: Partida | null;
  /** Divisão do clube (ex.: "Série A") — contexto de zona da tabela. */
  divisao: string;
}
