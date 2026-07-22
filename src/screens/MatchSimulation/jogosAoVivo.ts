/**
 * Os OUTROS jogos da rodada, simulados AO VIVO em paralelo com a partida do
 * usuário, e a projeção da classificação com resultados parciais. Lógica pura
 * (sem React) extraída da tela MatchSimulation — cada jogo usa a MESMA seed
 * que o store usará ao concluir a rodada, então o que roda aqui é bit-a-bit
 * igual ao que fica persistido no fim.
 */
import {
  acrescimosDaSeed,
  calcularContextoMinuto,
  iniciarPartidaAoVivo,
  simularMinuto,
  type EstadoPartidaAoVivo,
} from '../../engine/simulation/matchSimulator';
// Import direto do módulo (não do index do DS): este arquivo é puro e o index
// arrastaria componentes React para o grafo do teste de paridade.
import {corDoTime} from '../../design-system/sports/corDoTime';
import type {Clube, Partida, Player, TabelaClassificacao} from '../../types';
import {nomeClube} from '../../utils/formatters';

/** Duração regulamentar da partida, em minutos (acréscimos vêm por seed). */
export const DURACAO = 90;

/** Um dos OUTROS jogos da rodada, simulado AO VIVO junto com o do usuário. */
export type JogoAoVivo = {
  id: string;
  timeCasa: string;
  timeFora: string;
  nomeCasa: string;
  nomeFora: string;
  corCasa: string;
  corFora: string;
  clubeCasa: Clube;
  clubeFora: Clube;
  jogadoresCasa: Player[];
  jogadoresFora: Player[];
  /** Estado vivo (placar/eventos evoluem minuto a minuto). */
  estado: EstadoPartidaAoVivo;
  minutoSimulado: number;
  /** Acréscimos do 2º tempo deste jogo (mesma fórmula por seed do store). */
  acrescimos: number;
};

/** Placar de um jogo para render (derivado do estado vivo a cada minuto). */
export type PlacarAoVivo = {
  id: string;
  nomeCasa: string;
  nomeFora: string;
  idCasa: string;
  idFora: string;
  siglaCasa: string;
  siglaFora: string;
  golsCasa: number;
  golsFora: number;
};

/**
 * Cria os estados VIVOS dos outros jogos da rodada (minuto 0, nada simulado
 * ainda). Cada jogo usa a MESMA seed que o store usará ao concluir a rodada,
 * então — como o motor é determinístico — o que roda ao vivo aqui é
 * bit-a-bit igual ao que fica persistido no fim. Nada é "setado": os placares
 * nascem 0×0 e evoluem de verdade conforme o relógio anda.
 */
export function criarJogosAoVivo(
  st: {
    partidas: Partida[];
    clubes: Clube[];
    jogadores: Player[];
    rodadaAtual: number;
  },
  partidaUsuarioId: string,
): JogoAoVivo[] {
  const jogosRodada = st.partidas.filter(
    p => p.rodada === st.rodadaAtual && !p.jogada,
  );
  const lista: JogoAoVivo[] = [];
  for (const jogo of jogosRodada) {
    if (jogo.id === partidaUsuarioId) {
      continue;
    }
    const clubeCasa = st.clubes.find(c => c.id === jogo.timeCasa);
    const clubeFora = st.clubes.find(c => c.id === jogo.timeFora);
    if (
      !clubeCasa?.formacaoAtual ||
      !clubeCasa.taticaAtual ||
      !clubeFora?.formacaoAtual ||
      !clubeFora.taticaAtual
    ) {
      continue; // clube sem formação válida fica fora da rodada ao vivo.
    }
    lista.push({
      id: jogo.id,
      timeCasa: jogo.timeCasa,
      timeFora: jogo.timeFora,
      nomeCasa: nomeClube(st.clubes, jogo.timeCasa),
      nomeFora: nomeClube(st.clubes, jogo.timeFora),
      corCasa: corDoTime(jogo.timeCasa),
      corFora: corDoTime(jogo.timeFora),
      clubeCasa,
      clubeFora,
      jogadoresCasa: st.jogadores.filter(j => j.clubeId === clubeCasa.id),
      jogadoresFora: st.jogadores.filter(j => j.clubeId === clubeFora.id),
      estado: iniciarPartidaAoVivo(
        st.rodadaAtual * 1000 + jogosRodada.indexOf(jogo),
      ),
      minutoSimulado: 0,
      acrescimos: acrescimosDaSeed(
        st.rodadaAtual * 1000 + jogosRodada.indexOf(jogo),
      ),
    });
  }
  return lista;
}

/**
 * Avança CADA jogo ao vivo da rodada até o minuto `alvo` (mesmo caminho da
 * partida do usuário: recalcula o contexto por minuto → fadiga, expulsões e
 * substituições da IA valem). Muta os estados; devolve nada.
 */
export function avancarJogosAoVivo(jogos: JogoAoVivo[], alvo: number): void {
  for (const jogo of jogos) {
    // Cada jogo tem seu próprio fim (90 + acréscimos dele), então nunca passa do
    // total mesmo que o relógio da SUA partida vá além.
    const alvoJogo = Math.min(alvo, DURACAO + jogo.acrescimos);
    while (jogo.minutoSimulado < alvoJogo) {
      let ctx;
      try {
        ctx = calcularContextoMinuto(
          jogo.clubeCasa,
          jogo.clubeFora,
          jogo.jogadoresCasa,
          jogo.jogadoresFora,
          jogo.estado,
        );
      } catch {
        break;
      }
      simularMinuto(jogo.estado, ctx);
      jogo.minutoSimulado += 1;
    }
  }
}

/**
 * Classificação AO VIVO: parte da tabela ANTES da rodada e soma os resultados
 * PARCIAIS de todos os jogos da rodada (o do usuário incluso). Um time ganhando
 * 1×0 aos 30' já aparece provisoriamente com 3 pontos.
 */
export function projetarTabela(
  base: TabelaClassificacao[],
  resultados: Array<{
    timeCasa: string;
    timeFora: string;
    golsCasa: number;
    golsFora: number;
  }>,
): TabelaClassificacao[] {
  const mapa = new Map<string, TabelaClassificacao>(
    base.map(e => [e.clubeId, {...e}]),
  );
  const garantir = (id: string): TabelaClassificacao => {
    const existente = mapa.get(id);
    if (existente) {
      return existente;
    }
    const nova: TabelaClassificacao = {
      clubeId: id,
      pontos: 0,
      jogos: 0,
      vitorias: 0,
      empates: 0,
      derrotas: 0,
      golsPro: 0,
      golsContra: 0,
      saldoGols: 0,
    };
    mapa.set(id, nova);
    return nova;
  };
  for (const r of resultados) {
    const casa = garantir(r.timeCasa);
    const fora = garantir(r.timeFora);
    casa.jogos += 1;
    fora.jogos += 1;
    casa.golsPro += r.golsCasa;
    casa.golsContra += r.golsFora;
    fora.golsPro += r.golsFora;
    fora.golsContra += r.golsCasa;
    if (r.golsCasa > r.golsFora) {
      casa.pontos += 3;
      casa.vitorias += 1;
      fora.derrotas += 1;
    } else if (r.golsCasa < r.golsFora) {
      fora.pontos += 3;
      fora.vitorias += 1;
      casa.derrotas += 1;
    } else {
      casa.pontos += 1;
      fora.pontos += 1;
      casa.empates += 1;
      fora.empates += 1;
    }
  }
  return [...mapa.values()]
    .map(e => ({...e, saldoGols: e.golsPro - e.golsContra}))
    .sort(
      (a, b) =>
        b.pontos - a.pontos ||
        b.saldoGols - a.saldoGols ||
        b.golsPro - a.golsPro,
    );
}
