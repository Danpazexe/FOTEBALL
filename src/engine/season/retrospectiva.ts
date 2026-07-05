/**
 * Retrospectiva / recordes da temporada. Puro e determinístico: a partir das
 * partidas já jogadas pelo clube (em ordem cronológica), consolida o balanço da
 * campanha e os recordes — maior vitória/derrota, artilheiro, aproveitamento,
 * maior sequência de vitórias. Derivação do histórico; sem estado, sem RNG.
 */

export interface EventoGolRetro {
  timeId: string;
  jogadorId: string;
}

export interface PartidaRetro {
  timeCasa: string;
  timeFora: string;
  placarCasa: number;
  placarFora: number;
  /** Eventos de gol da partida (para atribuir o artilheiro do clube). */
  gols: EventoGolRetro[];
}

export interface PlacarRecorde {
  adversarioId: string;
  golsFavor: number;
  golsContra: number;
}

export interface RecordeArtilheiro {
  jogadorId: string;
  gols: number;
}

export interface RetrospectivaTemporada {
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  golsPro: number;
  golsContra: number;
  saldo: number;
  /** Pontos conquistados (V*3 + E). */
  pontos: number;
  /** Aproveitamento em % (pontos / pontos possíveis), 0-100 arredondado. */
  aproveitamento: number;
  maiorVitoria: PlacarRecorde | null;
  maiorDerrota: PlacarRecorde | null;
  maiorSequenciaVitorias: number;
  artilheiro: RecordeArtilheiro | null;
}

/** Consolida a campanha do clube a partir das partidas (cronológicas). */
export function calcularRetrospectiva(
  partidas: PartidaRetro[],
  clubeId: string,
): RetrospectivaTemporada {
  let jogos = 0;
  let vitorias = 0;
  let empates = 0;
  let derrotas = 0;
  let golsPro = 0;
  let golsContra = 0;
  let maiorVitoria: PlacarRecorde | null = null;
  let maiorDerrota: PlacarRecorde | null = null;
  let sequenciaAtual = 0;
  let maiorSequenciaVitorias = 0;
  const golsPorJogador = new Map<string, number>();

  for (const partida of partidas) {
    const mandante = partida.timeCasa === clubeId;
    const visitante = partida.timeFora === clubeId;
    if (!mandante && !visitante) {
      continue;
    }
    jogos++;
    const golsFavor = mandante ? partida.placarCasa : partida.placarFora;
    const golsContraJogo = mandante ? partida.placarFora : partida.placarCasa;
    const adversarioId = mandante ? partida.timeFora : partida.timeCasa;
    golsPro += golsFavor;
    golsContra += golsContraJogo;

    if (golsFavor > golsContraJogo) {
      vitorias++;
      sequenciaAtual++;
      maiorSequenciaVitorias = Math.max(maiorSequenciaVitorias, sequenciaAtual);
      const margem = golsFavor - golsContraJogo;
      if (
        !maiorVitoria ||
        margem > maiorVitoria.golsFavor - maiorVitoria.golsContra ||
        (margem === maiorVitoria.golsFavor - maiorVitoria.golsContra &&
          golsFavor > maiorVitoria.golsFavor)
      ) {
        maiorVitoria = {adversarioId, golsFavor, golsContra: golsContraJogo};
      }
    } else if (golsFavor < golsContraJogo) {
      derrotas++;
      sequenciaAtual = 0;
      const margem = golsContraJogo - golsFavor;
      if (
        !maiorDerrota ||
        margem > maiorDerrota.golsContra - maiorDerrota.golsFavor ||
        (margem === maiorDerrota.golsContra - maiorDerrota.golsFavor &&
          golsContraJogo > maiorDerrota.golsContra)
      ) {
        maiorDerrota = {adversarioId, golsFavor, golsContra: golsContraJogo};
      }
    } else {
      empates++;
      sequenciaAtual = 0;
    }

    for (const gol of partida.gols) {
      if (gol.timeId === clubeId) {
        golsPorJogador.set(
          gol.jogadorId,
          (golsPorJogador.get(gol.jogadorId) ?? 0) + 1,
        );
      }
    }
  }

  let artilheiro: RecordeArtilheiro | null = null;
  for (const [jogadorId, gols] of golsPorJogador) {
    if (!artilheiro || gols > artilheiro.gols) {
      artilheiro = {jogadorId, gols};
    }
  }

  const pontos = vitorias * 3 + empates;
  const aproveitamento =
    jogos > 0 ? Math.round((pontos / (jogos * 3)) * 100) : 0;

  return {
    jogos,
    vitorias,
    empates,
    derrotas,
    golsPro,
    golsContra,
    saldo: golsPro - golsContra,
    pontos,
    aproveitamento,
    maiorVitoria,
    maiorDerrota,
    maiorSequenciaVitorias,
    artilheiro,
  };
}
