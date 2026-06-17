CREATE TABLE IF NOT EXISTS save_game (
  id TEXT PRIMARY KEY,
  nome_treinador TEXT,
  clube_usuario_id TEXT,
  temporada_atual TEXT,
  data_atual TEXT,
  configuracoes TEXT,
  criado_em TEXT,
  ultimo_salvamento_em TEXT
);

CREATE TABLE IF NOT EXISTS clubes (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  sigla TEXT,
  cidade TEXT,
  estado TEXT,
  fundacao INTEGER,
  reputacao INTEGER DEFAULT 50,
  saldo REAL DEFAULT 5000000,
  controlado_por_ia INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS jogadores (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  idade INTEGER,
  nacionalidade TEXT,
  posicao_principal TEXT,
  posicoes_secundarias TEXT,
  perna_dominante TEXT DEFAULT 'D',
  atributos TEXT NOT NULL,
  overall INTEGER,
  potencial INTEGER,
  condicao_fisica INTEGER DEFAULT 100,
  moral INTEGER DEFAULT 70,
  forma INTEGER DEFAULT 0,
  valor_mercado REAL,
  salario REAL,
  contrato_ate TEXT,
  clube_id TEXT REFERENCES clubes(id),
  lesionado INTEGER DEFAULT 0,
  dias_lesao INTEGER DEFAULT 0,
  suspenso INTEGER DEFAULT 0,
  jogos_suspensao INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS jogador_stats_temporada (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  jogador_id TEXT REFERENCES jogadores(id),
  temporada TEXT,
  jogos INTEGER DEFAULT 0,
  gols INTEGER DEFAULT 0,
  assistencias INTEGER DEFAULT 0,
  cartoes_amarelos INTEGER DEFAULT 0,
  cartoes_vermelhos INTEGER DEFAULT 0,
  nota_media REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS competicoes (
  id TEXT PRIMARY KEY,
  nome TEXT,
  tipo TEXT,
  temporada TEXT,
  premiacoes TEXT
);

CREATE TABLE IF NOT EXISTS competicao_clubes (
  competicao_id TEXT REFERENCES competicoes(id),
  clube_id TEXT REFERENCES clubes(id),
  PRIMARY KEY (competicao_id, clube_id)
);

CREATE TABLE IF NOT EXISTS tabela_classificacao (
  competicao_id TEXT REFERENCES competicoes(id),
  clube_id TEXT REFERENCES clubes(id),
  pontos INTEGER DEFAULT 0,
  jogos INTEGER DEFAULT 0,
  vitorias INTEGER DEFAULT 0,
  empates INTEGER DEFAULT 0,
  derrotas INTEGER DEFAULT 0,
  gols_pro INTEGER DEFAULT 0,
  gols_contra INTEGER DEFAULT 0,
  saldo_gols INTEGER DEFAULT 0,
  PRIMARY KEY (competicao_id, clube_id)
);

CREATE TABLE IF NOT EXISTS partidas (
  id TEXT PRIMARY KEY,
  competicao_id TEXT REFERENCES competicoes(id),
  rodada INTEGER,
  data TEXT,
  time_casa TEXT REFERENCES clubes(id),
  time_fora TEXT REFERENCES clubes(id),
  placar_casa INTEGER,
  placar_fora INTEGER,
  eventos TEXT,
  jogada INTEGER DEFAULT 0,
  modo_jogado TEXT DEFAULT 'simulado'
);

CREATE TABLE IF NOT EXISTS formacoes (
  clube_id TEXT PRIMARY KEY REFERENCES clubes(id),
  tipo TEXT,
  titulares TEXT,
  reservas TEXT
);

CREATE TABLE IF NOT EXISTS taticas (
  clube_id TEXT PRIMARY KEY REFERENCES clubes(id),
  estilo_ofensivo TEXT,
  marcacao TEXT,
  linha_defensiva TEXT,
  ritmo TEXT,
  instrucoes_individuais TEXT
);

CREATE TABLE IF NOT EXISTS estadios (
  clube_id TEXT PRIMARY KEY REFERENCES clubes(id),
  nome TEXT,
  capacidade INTEGER DEFAULT 30000,
  preco_medio_ingresso REAL DEFAULT 40,
  nivel_infraestrutura INTEGER DEFAULT 3
);

CREATE TABLE IF NOT EXISTS financas_historico (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clube_id TEXT REFERENCES clubes(id),
  data TEXT,
  tipo TEXT,
  categoria TEXT,
  valor REAL,
  descricao TEXT
);

CREATE TABLE IF NOT EXISTS patrocinios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clube_id TEXT REFERENCES clubes(id),
  nome TEXT,
  valor_mensal REAL,
  bonus_por_vitoria REAL,
  ativo_ate TEXT
);

CREATE TABLE IF NOT EXISTS transferencias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  jogador_id TEXT REFERENCES jogadores(id),
  clube_origem TEXT,
  clube_destino TEXT,
  valor REAL,
  tipo TEXT,
  data TEXT
);
