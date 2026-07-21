/**
 * Regras do painel de escalação em jogo, isoladas da UI para teste direto:
 * o que um gesto origem→alvo significa, quando uma substituição é válida,
 * quando a troca de posições é permitida e como ranquear quem pode entrar.
 */
import {
  nivelAdaptacao,
  type NivelAdaptacao,
} from '../../../engine/tactics/adaptacao';
import type {Formacao, Player, Position} from '../../../types';
import type {CandidatoTroca, Descritor} from './tipos';

// Ordena os candidatos à substituição pelo ENCAIXE na posição do slot (natural
// primeiro) e, dentro do mesmo nível, pelo overall — quem melhor cobre a vaga
// aparece no topo da lista.
const RANK_ADAPTACAO: Record<NivelAdaptacao, number> = {
  natural: 0,
  similar: 1,
  adaptado: 2,
  improvisado: 3,
};

/** O que o par origem→alvo (toque-e-toque ou arraste) significa em campo. */
export type AcaoEscalacao =
  | {tipo: 'substituicao'; slotIndex: number; entranteId: string}
  | {tipo: 'trocaPosicoes'; slotA: number; slotB: number}
  | {tipo: 'nenhuma'};

export function resolverAcao(origem: Descritor, alvo: Descritor): AcaoEscalacao {
  if (origem.tipo === alvo.tipo && origem.valor === alvo.valor) {
    return {tipo: 'nenhuma'};
  }
  if (origem.tipo === 'reserva' && alvo.tipo === 'titular') {
    return {
      tipo: 'substituicao',
      slotIndex: Number(alvo.valor),
      entranteId: origem.valor,
    };
  }
  if (origem.tipo === 'titular' && alvo.tipo === 'reserva') {
    return {
      tipo: 'substituicao',
      slotIndex: Number(origem.valor),
      entranteId: alvo.valor,
    };
  }
  if (origem.tipo === 'titular' && alvo.tipo === 'titular') {
    return {
      tipo: 'trocaPosicoes',
      slotA: Number(origem.valor),
      slotB: Number(alvo.valor),
    };
  }
  return {tipo: 'nenhuma'};
}

/**
 * Substituição válida? Bloqueia sem subs restantes, slot vazio, mesmo jogador
 * e entrante lesionado/suspenso ou fora do elenco (gastaria a sub à toa).
 */
export function podeSubstituir(
  formacao: Formacao,
  porId: ReadonlyMap<string, Player>,
  semSubs: boolean,
  slotIndex: number,
  entranteId: string,
): boolean {
  if (semSubs) {
    return false;
  }
  const saiId = formacao.titulares[slotIndex]?.jogadorId;
  if (!saiId || saiId === entranteId) {
    return false;
  }
  const entrante = porId.get(entranteId);
  if (!entrante || entrante.lesionado || entrante.suspenso) {
    return false;
  }
  return true;
}

/**
 * Troca de posições titular↔titular: retorna o id do jogador do `slotB` (o
 * argumento que `trocarTitular` espera) ou null quando a troca não é
 * permitida. Protege o gol: só permite mexer no slot GOL entre dois goleiros.
 */
export function jogadorParaTrocaDePosicao(
  formacao: Formacao,
  porId: ReadonlyMap<string, Player>,
  slotA: number,
  slotB: number,
): string | null {
  if (slotA === slotB) {
    return null;
  }
  const titulares = formacao.titulares;
  const envolveGol =
    titulares[slotA]?.posicao === 'GOL' || titulares[slotB]?.posicao === 'GOL';
  if (envolveGol) {
    const a = porId.get(titulares[slotA]?.jogadorId);
    const b = porId.get(titulares[slotB]?.jogadorId);
    if (a?.posicaoPrincipal !== 'GOL' || b?.posicaoPrincipal !== 'GOL') {
      return null;
    }
  }
  const jogadorB = titulares[slotB]?.jogadorId;
  return jogadorB ? jogadorB : null;
}

/**
 * Reservas APTOS (sem lesão/suspensão) ordenados por encaixe na vaga
 * (natural → improviso) e, dentro do mesmo nível, por overall.
 */
export function ordenarCandidatosTroca(
  banco: Player[],
  posicao: Position,
): CandidatoTroca[] {
  return banco
    .filter(j => !j.lesionado && !j.suspenso)
    .map(j => ({jogador: j, adaptacao: nivelAdaptacao(j, posicao)}))
    .sort((a, b) => {
      const r =
        RANK_ADAPTACAO[a.adaptacao.nivel] - RANK_ADAPTACAO[b.adaptacao.nivel];
      return r !== 0 ? r : b.jogador.overall - a.jogador.overall;
    });
}
