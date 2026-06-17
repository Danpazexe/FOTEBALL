import type {Partida, Player, TabelaClassificacao} from '../../types';

/**
 * Verificador de conquistas (Módulo 15). Função pura: recebe um retrato do
 * progresso do usuário e devolve os ids das conquistas recém-desbloqueadas
 * (que satisfazem o critério e ainda não estavam desbloqueadas).
 *
 * Mantém o engine desacoplado do store: em vez de `GameState`, recebe só as
 * fatias necessárias em `ContextoConquistas`.
 */

export interface ContextoConquistas {
  clubeUsuarioId: string | null;
  jogadores: Player[];
  partidas: Partida[];
  tabela: TabelaClassificacao[];
  saldoUsuario: number;
  rodadaAtual: number;
  /** Temporadas completas no mesmo clube (se rastreado). */
  temporadasNoClube?: number;
  /** Marcado quando o usuário promove um jovem com potencial S. */
  promoveuPotencialS?: boolean;
}

type Resultado = 'V' | 'E' | 'D';

const META_SALDO = 10_000_000;
const META_GOLS_ARTILHEIRO = 15;
const META_MORAL = 85;

function partidasDoUsuario(ctx: ContextoConquistas): Partida[] {
  const id = ctx.clubeUsuarioId;
  if (!id) {
    return [];
  }
  return ctx.partidas
    .filter(
      partida =>
        partida.jogada && (partida.timeCasa === id || partida.timeFora === id),
    )
    .sort((a, b) => a.rodada - b.rodada);
}

function resultadoUsuario(partida: Partida, usuarioId: string): Resultado {
  const ehCasa = partida.timeCasa === usuarioId;
  const golsPro = (ehCasa ? partida.placarCasa : partida.placarFora) ?? 0;
  const golsContra = (ehCasa ? partida.placarFora : partida.placarCasa) ?? 0;
  if (golsPro > golsContra) {
    return 'V';
  }
  if (golsPro < golsContra) {
    return 'D';
  }
  return 'E';
}

function golsSofridos(partida: Partida, usuarioId: string): number {
  const ehCasa = partida.timeCasa === usuarioId;
  return (ehCasa ? partida.placarFora : partida.placarCasa) ?? 0;
}

function saldoGolsUsuario(partida: Partida, usuarioId: string): number {
  const ehCasa = partida.timeCasa === usuarioId;
  const golsPro = (ehCasa ? partida.placarCasa : partida.placarFora) ?? 0;
  const golsContra = (ehCasa ? partida.placarFora : partida.placarCasa) ?? 0;
  return golsPro - golsContra;
}

export function verificarConquistas(
  ctx: ContextoConquistas,
  desbloqueadas: Set<string>,
): string[] {
  const usuarioId = ctx.clubeUsuarioId;
  if (!usuarioId) {
    return [];
  }

  const jogos = partidasDoUsuario(ctx);
  const elenco = ctx.jogadores.filter(j => j.clubeId === usuarioId);
  const satisfeitas = new Set<string>();
  const marcar = (id: string, condicao: boolean) => {
    if (condicao) {
      satisfeitas.add(id);
    }
  };

  // Resultados
  marcar('primeira_vitoria', jogos.some(p => resultadoUsuario(p, usuarioId) === 'V'));
  marcar('goleada', jogos.some(p => saldoGolsUsuario(p, usuarioId) >= 5));

  // 5 rodadas sem perder (últimos 5 jogos)
  const ultimos5 = jogos.slice(-5);
  marcar(
    'invicto_5',
    ultimos5.length >= 5 && ultimos5.every(p => resultadoUsuario(p, usuarioId) !== 'D'),
  );

  // 3 partidas seguidas sem sofrer gol (qualquer janela de 3 consecutivos)
  let cleanSeguidos = 0;
  let semGolSofrido3 = false;
  for (const partida of jogos) {
    cleanSeguidos = golsSofridos(partida, usuarioId) === 0 ? cleanSeguidos + 1 : 0;
    if (cleanSeguidos >= 3) {
      semGolSofrido3 = true;
      break;
    }
  }
  marcar('sem_gol_sofrido', semGolSofrido3);

  // Título: terminou a temporada (rodada > 38) em 1º
  const liderId = ctx.tabela[0]?.clubeId;
  marcar('primeiro_titulo', ctx.rodadaAtual > 38 && liderId === usuarioId);

  // Finanças
  marcar('saldo_positivo', ctx.saldoUsuario > META_SALDO);

  // Moral média do elenco
  if (elenco.length > 0) {
    const moralMedia =
      elenco.reduce((soma, j) => soma + j.moral, 0) / elenco.length;
    marcar('moral_alto', moralMedia >= META_MORAL);
  }

  // Artilheiro próprio (15+ gols na temporada)
  marcar(
    'artilheiro_proprio',
    elenco.some(j => j.estatisticasTemporada.gols >= META_GOLS_ARTILHEIRO),
  );

  // Conquistas que dependem de sinal externo (rastreado pelo store)
  marcar('temporadas_3', (ctx.temporadasNoClube ?? 0) >= 3);
  marcar('revelacao', ctx.promoveuPotencialS === true);

  // Só devolve as recém-desbloqueadas.
  return [...satisfeitas].filter(id => !desbloqueadas.has(id));
}
