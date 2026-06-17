export interface TabelaClassificacao {
  clubeId: string;
  pontos: number;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  golsPro: number;
  golsContra: number;
  saldoGols: number;
}

export interface PremiacaoCompeticao {
  posicao: number;
  valor: number;
}

export interface Competicao {
  id: string;
  nome: string;
  tipo: 'liga' | 'copa_mata_mata' | 'copa_grupos';
  temporada: string;
  clubesParticipantes: string[];
  tabela?: TabelaClassificacao[];
  chaveamento?: Confronto[];
  premiacoes: PremiacaoCompeticao[];
}

export interface Confronto {
  id: string;
  fase: string;
  timeA: string;
  timeB: string;
  golsA?: number;
  golsB?: number;
  golsAVolta?: number;
  golsBVolta?: number;
  vencedor?: string;
}
