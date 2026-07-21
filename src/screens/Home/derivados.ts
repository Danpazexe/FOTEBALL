/**
 * Derivações PURAS da Home (North Star) — apresentacionais, testáveis e sem tocar
 * a engine ou o estado. Duas saídas:
 *  • `derivarPendencias`  — "Pendências do técnico": agrega sinais que JÁ existem
 *    (indisponíveis, saldo, propostas, meta, base) numa lista acionável priorizada.
 *  • `derivarJanelaClassificacao` — janela compacta da tabela ao redor do clube.
 */
import type {IconeNome} from '../../components/Icone';
import type {Clube, TabelaClassificacao} from '../../types';

// ── Pendências ──────────────────────────────────────────────────────────────

export type TomPendencia = 'danger' | 'warning' | 'brand' | 'info';
export type DestinoPendencia =
  | 'elenco'
  | 'mercado'
  | 'academia'
  | 'clube'
  | 'gabinete'
  | 'contratos';

export interface Pendencia {
  id: string;
  titulo: string;
  subtitulo: string;
  icone: IconeNome;
  tom: TomPendencia;
  destino: DestinoPendencia;
}

export interface EntradaPendencias {
  /** Jogadores lesionados + suspensos no elenco do usuário. */
  indisponiveis: number;
  /** Propostas de compra recebidas aguardando resposta. */
  propostas: number;
  /** Jovens da base disponíveis para avaliação. */
  jovens: number;
  /**
   * Contratos do elenco vencendo NA temporada atual (critério canônico de
   * urgência da tela Contratos: `contratoVenceNaTemporada`).
   */
  contratosVencendo: number;
  /** Saldo do clube abaixo de zero. */
  saldoNegativo: boolean;
  /** Texto do saldo (ex.: "-R$ 2,3 mi") para o subtítulo. */
  saldoTexto: string;
  /** A posição atual está fora da meta da diretoria. */
  metaForaDoRumo: boolean;
}

/**
 * Lista priorizada (perigo → atenção → info) de pendências acionáveis. Cada item
 * só entra quando o sinal existe; a Home mostra as primeiras e a contagem total.
 */
export function derivarPendencias(e: EntradaPendencias): Pendencia[] {
  const lista: Pendencia[] = [];

  if (e.indisponiveis > 0) {
    lista.push({
      id: 'indisponiveis',
      titulo:
        e.indisponiveis === 1
          ? '1 jogador indisponível'
          : `${e.indisponiveis} jogadores indisponíveis`,
      subtitulo: 'Lesões e suspensões no elenco',
      icone: 'lesao',
      tom: 'danger',
      destino: 'elenco',
    });
  }

  if (e.saldoNegativo) {
    lista.push({
      id: 'saldo',
      titulo: 'Saldo negativo',
      subtitulo: e.saldoTexto,
      icone: 'dinheiro',
      tom: 'danger',
      destino: 'clube',
    });
  }

  if (e.propostas > 0) {
    lista.push({
      id: 'propostas',
      titulo:
        e.propostas === 1
          ? '1 proposta recebida'
          : `${e.propostas} propostas recebidas`,
      subtitulo: 'Responda antes que expirem',
      icone: 'mercado',
      tom: 'warning',
      destino: 'mercado',
    });
  }

  if (e.metaForaDoRumo) {
    lista.push({
      id: 'meta',
      titulo: 'Diretoria cobra resultado',
      subtitulo: 'Você está fora da meta da temporada',
      icone: 'conversa',
      tom: 'warning',
      destino: 'gabinete',
    });
  }

  if (e.contratosVencendo > 0) {
    lista.push({
      id: 'contratos',
      titulo:
        e.contratosVencendo === 1
          ? '1 contrato vence nesta temporada'
          : `${e.contratosVencendo} contratos vencem nesta temporada`,
      subtitulo: 'Renove antes que saiam de graça',
      icone: 'ficha',
      tom: 'warning',
      destino: 'contratos',
    });
  }

  if (e.jovens > 0) {
    lista.push({
      id: 'jovens',
      titulo:
        e.jovens === 1 ? '1 jovem para avaliar' : `${e.jovens} jovens para avaliar`,
      subtitulo: 'Relatório da base disponível',
      icone: 'base',
      tom: 'info',
      destino: 'academia',
    });
  }

  return lista;
}

// ── Janela da classificação ───────────────────────────────────────────────────

export type ZonaTabela = 'promocao' | 'rebaixamento' | 'nenhuma';

export interface LinhaClassificacao {
  posicao: number;
  clubeId: string;
  sigla: string;
  nome: string;
  jogos: number;
  pontos: number;
  destacado: boolean;
  zona: ZonaTabela;
}

/** Nº de posições no topo/fundo tratadas como zona (acesso/rebaixamento). */
const FAIXA_ZONA = 4;

/**
 * Janela de `tamanho` linhas centrada no clube do usuário (presa às bordas),
 * já resolvida com sigla/nome do clube, realce e zona. Vazia se não há tabela.
 */
export function derivarJanelaClassificacao(params: {
  tabela: TabelaClassificacao[];
  clubes: ReadonlyArray<Pick<Clube, 'id' | 'sigla' | 'nome'>>;
  clubeUsuarioId: string | null;
  tamanho?: number;
}): LinhaClassificacao[] {
  const {tabela, clubes, clubeUsuarioId, tamanho = 5} = params;
  const total = tabela.length;
  if (total === 0) {
    return [];
  }

  const idx = tabela.findIndex(l => l.clubeId === clubeUsuarioId);
  let inicio = idx === -1 ? 0 : idx - Math.floor(tamanho / 2);
  inicio = Math.max(0, Math.min(inicio, Math.max(0, total - tamanho)));
  const fim = Math.min(total, inicio + tamanho);

  const porId = new Map(clubes.map(c => [c.id, c]));
  const zonaDe = (posicao: number): ZonaTabela =>
    posicao <= FAIXA_ZONA
      ? 'promocao'
      : posicao > total - FAIXA_ZONA
      ? 'rebaixamento'
      : 'nenhuma';

  const linhas: LinhaClassificacao[] = [];
  for (let i = inicio; i < fim; i++) {
    const linha = tabela[i];
    const clube = porId.get(linha.clubeId);
    linhas.push({
      posicao: i + 1,
      clubeId: linha.clubeId,
      sigla: clube?.sigla ?? '?',
      nome: clube?.nome ?? linha.clubeId,
      jogos: linha.jogos,
      pontos: linha.pontos,
      destacado: linha.clubeId === clubeUsuarioId,
      zona: zonaDe(i + 1),
    });
  }
  return linhas;
}
