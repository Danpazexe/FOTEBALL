export interface ConfiguracoesJogo {
  dificuldade: 'Fácil' | 'Normal' | 'Difícil';
  velocidadeSimulacao: 'instantanea' | 'narrada';
  moeda: 'BRL';
}

export interface SaveGame {
  id: string;
  nomeTreinador: string;
  clubeUsuarioId: string;
  temporadaAtual: string;
  dataAtual: string;
  competicoes: string[];
  configuracoes: ConfiguracoesJogo;
  criadoEm: string;
  ultimoSalvamentoEm: string;
}
