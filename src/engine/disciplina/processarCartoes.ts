/**
 * Aplica a disciplina de UMA partida ao elenco (engine PURA, idempotente por
 * partidaId). Regras: amarelos acumulam por competição; ao chegar no LIMIAR da
 * competição (regraDisciplina — 3 no padrão brasileiro) → gancho e zera o acúmulo;
 * vermelho/2º amarelo → +1 jogo por expulsão sem apagar o acúmulo (mas o 1º
 * amarelo do jogo conta); a suspensão só é cumprida numa partida DAQUELA
 * competição. Cartões da Série A não tocam a Copa: tudo chaveado por `competicaoId`.
 */
import {
  COMPETICAO_LEGADO,
  regraDisciplina,
  type DisponibilidadeJogador,
  type EventoPartida,
  type Player,
} from '../../types';
import {
  comDisciplina,
  disciplinaDaCompeticao,
  sincronizarEspelhoLegado,
} from './disponibilidade';

export interface PartidaDisciplina {
  id: string;
  competicaoId: string;
  timeCasa: string;
  timeFora: string;
  eventos: EventoPartida[];
}

/** Cumpre 1 jogo de suspensão pendente nesta competição (e legado global). */
function decrementarSuspensao(
  disp: DisponibilidadeJogador,
  competicaoId: string,
): DisponibilidadeJogador {
  let mudou = false;
  const disciplinas = disp.disciplinas
    .map(d => {
      const aplica =
        d.competicaoId === competicaoId || d.competicaoId === COMPETICAO_LEGADO;
      if (aplica && d.partidasRestantesSuspensao > 0) {
        mudou = true;
        return {...d, partidasRestantesSuspensao: d.partidasRestantesSuspensao - 1};
      }
      return d;
    })
    .filter(d => d.amarelosAcumulados > 0 || d.partidasRestantesSuspensao > 0);
  return mudou ? {...disp, disciplinas} : disp;
}

/** Aplica os cartões deste jogo à competição correta. */
function aplicarNovosCartoes(
  disp: DisponibilidadeJogador,
  competicaoId: string,
  amarelos: number,
  vermelhos: number,
): DisponibilidadeJogador {
  const atual = disciplinaDaCompeticao(disp, competicaoId);
  const regra = regraDisciplina(competicaoId);
  const limiar = regra.amarelosParaSuspensao;
  let acum = atual.amarelosAcumulados;
  let susp = atual.partidasRestantesSuspensao;
  // Amarelos AVULSOS deste jogo contam pro acúmulo — inclusive o 1º amarelo de
  // uma expulsão por 2 amarelos (o motor emite 1 `amarelo` + 1 `vermelho`); só o
  // 2º amarelo (que vira vermelho) NÃO é contado de novo.
  if (amarelos > 0) {
    acum += amarelos;
    if (acum >= limiar) {
      susp += Math.floor(acum / limiar) * regra.jogosSuspensao;
      acum = acum % limiar; // zera ao completar o limiar
    }
  }
  // Expulsão (vermelho direto ou 2º amarelo): +1 jogo por vermelho, sem apagar
  // o acúmulo — a suspensão da expulsão é independente do gancho por amarelos.
  if (vermelhos > 0) {
    susp += vermelhos;
  }
  return comDisciplina(disp, {
    competicaoId,
    amarelosAcumulados: acum,
    partidasRestantesSuspensao: susp,
  });
}

/**
 * Processa a súmula de cartões de uma partida sobre os elencos dos dois clubes.
 * Idempotente: se `partida.id` já está em `processadas`, não faz nada. Devolve os
 * jogadores atualizados (com espelho legado sincronizado) e a nova lista de
 * partidas processadas.
 */
export function aplicarDisciplinaPartida(
  jogadores: Player[],
  partida: PartidaDisciplina,
  processadas: readonly string[],
): {jogadores: Player[]; processadas: string[]} {
  if (processadas.includes(partida.id)) {
    return {jogadores, processadas: [...processadas]};
  }
  const {id, competicaoId, timeCasa, timeFora, eventos} = partida;

  const amarelosPorJogador = new Map<string, number>();
  const vermelhosPorJogador = new Map<string, number>();
  for (const e of eventos) {
    if (e.tipo === 'cartao_amarelo') {
      amarelosPorJogador.set(e.jogadorId, (amarelosPorJogador.get(e.jogadorId) ?? 0) + 1);
    } else if (e.tipo === 'cartao_vermelho') {
      vermelhosPorJogador.set(e.jogadorId, (vermelhosPorJogador.get(e.jogadorId) ?? 0) + 1);
    }
  }

  const atualizados = jogadores.map(jogador => {
    const doJogo = jogador.clubeId === timeCasa || jogador.clubeId === timeFora;
    if (!doJogo || !jogador.disponibilidade) {
      return jogador;
    }
    // Passo A — cumpre suspensão pendente (banco incluído: todo o elenco).
    let disp = decrementarSuspensao(jogador.disponibilidade, competicaoId);
    // Passo B — novas punições deste jogo.
    const amarelos = amarelosPorJogador.get(jogador.id) ?? 0;
    const vermelhos = vermelhosPorJogador.get(jogador.id) ?? 0;
    if (amarelos > 0 || vermelhos > 0) {
      disp = aplicarNovosCartoes(disp, competicaoId, amarelos, vermelhos);
    }
    if (disp === jogador.disponibilidade) {
      return jogador;
    }
    return sincronizarEspelhoLegado({...jogador, disponibilidade: disp});
  });

  return {jogadores: atualizados, processadas: [...processadas, id]};
}
