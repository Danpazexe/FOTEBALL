import type {Partida} from '../../types';
import {adicionarDias} from '../../utils/datas';

/** Âncora: primeira rodada da temporada (6 de abril). */
const ANCORA_MES_DIA = '-04-06';

/**
 * Datas reais por rodada (1..total), com jogos a cada 3-4 dias — entre uma
 * partida e a próxima sobram 2 a 3 dias (descanso + treino). Determinístico.
 */
function datasDasRodadas(temporada: string, totalRodadas: number): string[] {
  const datas: string[] = [];
  let atual = `${temporada}${ANCORA_MES_DIA}`;
  for (let rodada = 1; rodada <= totalRodadas; rodada += 1) {
    datas[rodada] = atual;
    const intervalo = rodada % 3 === 0 ? 4 : 3; // alterna 3 e 4 dias
    atual = adicionarDias(atual, intervalo);
  }
  return datas;
}

function rotacionar(times: string[]): string[] {
  const [fixo, ...resto] = times;
  const ultimo = resto[resto.length - 1];
  const meio = resto.slice(0, -1);

  if (!fixo || !ultimo) {
    return times;
  }

  return [fixo, ultimo, ...meio];
}

/** Marcador de FOLGA (bye): fecha o círculo do round-robin quando a liga tem
 * nº ímpar de clubes — a cada rodada um clube "enfrenta" a folga e descansa. */
const FOLGA = '__folga__';

export function gerarCalendarioLiga(
  clubeIds: string[],
  temporada: string,
  competicaoId = `brasileirao_${temporada}`,
): Partida[] {
  // Nº ímpar (ex.: Primera División com 3 clubes): entra a folga; nº par
  // mantém o calendário EXATO de antes (mesmos ids/rodadas/datas).
  let times = clubeIds.length % 2 !== 0 ? [...clubeIds, FOLGA] : [...clubeIds];
  const metade = times.length / 2;
  const partidas: Partida[] = [];
  const offsetReturno = times.length - 1;
  const datas = datasDasRodadas(temporada, offsetReturno * 2);

  for (let rodada = 1; rodada <= offsetReturno; rodada += 1) {
    for (let index = 0; index < metade; index += 1) {
      const mandanteOriginal = times[index];
      const visitanteOriginal = times[times.length - 1 - index];

      if (
        !mandanteOriginal ||
        !visitanteOriginal ||
        mandanteOriginal === FOLGA ||
        visitanteOriginal === FOLGA
      ) {
        continue;
      }

      const inverterMando = rodada % 2 === 0;
      const timeCasa = inverterMando ? visitanteOriginal : mandanteOriginal;
      const timeFora = inverterMando ? mandanteOriginal : visitanteOriginal;

      partidas.push({
        id: `${competicaoId}_r${rodada}_${timeCasa}_${timeFora}`,
        competicaoId,
        rodada,
        data: datas[rodada],
        timeCasa,
        timeFora,
        eventos: [],
        jogada: false,
        modoJogado: 'simulado',
      });
    }

    times = rotacionar(times);
  }

  const returno = partidas.map(partida => ({
    ...partida,
    id: `${competicaoId}_r${partida.rodada + offsetReturno}_${partida.timeFora}_${partida.timeCasa}`,
    rodada: partida.rodada + offsetReturno,
    data: datas[partida.rodada + offsetReturno],
    timeCasa: partida.timeFora,
    timeFora: partida.timeCasa,
    placarCasa: undefined,
    placarFora: undefined,
    eventos: [],
    jogada: false,
  }));

  return [...partidas, ...returno];
}
