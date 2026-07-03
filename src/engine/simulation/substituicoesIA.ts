/**
 * Substituições AUTOMÁTICAS dos clubes controlados pela IA, decididas minuto a
 * minuto dentro da simulação — o técnico adversário finalmente trabalha:
 *
 *  - LESÃO: reposição imediata (o time não fica com 10 se há reserva no banco);
 *  - FADIGA: a partir do 2º tempo, titular esgotado dá lugar a um reserva
 *    descansado (mesma posição quando possível);
 *  - PLACAR: perdendo na reta final, uma cartada ofensiva — sai um jogador de
 *    defesa/meio cansado, entra um atacante (e o slot assume a posição dele).
 *
 * Regras duras: expulso NUNCA é reposto (regra do futebol), quem saiu não
 * volta, máximo de 5 trocas por clube (padrão do Brasileirão) e goleiro só sai
 * para entrar outro goleiro. O clube do USUÁRIO (controladoPorIA=false) nunca
 * é tocado — as trocas dele são manuais, na tela da partida.
 *
 * Determinismo: usa o stream `rngSubs` do estado (derivado da seed), sem tocar
 * no RNG de eventos.
 */

import type {Clube, EventoPartida, Formacao, Player, Position} from '../../types';

import type {ContextoMinuto, EstadoPartidaAoVivo} from './matchSimulator';

/** Limite oficial de substituições por equipe. */
export const MAX_SUBSTITUICOES_IA = 5;
/** Condição a partir da qual o titular é candidato a ser poupado. */
const CONDICAO_ESGOTADO = 40;
/** Condição mínima para um reserva valer a troca por fadiga. */
const CONDICAO_RESERVA_DESCANSADA = 65;

const POSICOES_ATAQUE: Position[] = ['PD', 'PE', 'SA', 'CA'];

function compativel(reserva: Player, posicaoSlot: Position): boolean {
  return (
    reserva.posicaoPrincipal === posicaoSlot ||
    reserva.posicoesSecundarias.includes(posicaoSlot)
  );
}

/** Reservas aptos a entrar AGORA: fora do time, saudáveis e que não jogaram. */
function reservasDisponiveis(
  estado: EstadoPartidaAoVivo,
  formacao: Formacao,
  elenco: Player[],
): Player[] {
  const titularesIds = new Set(formacao.titulares.map(t => t.jogadorId));
  return elenco.filter(
    jogador =>
      !titularesIds.has(jogador.id) &&
      !jogador.lesionado &&
      !jogador.suspenso &&
      !estado.sairamNaPartida.has(jogador.id) &&
      !estado.indisponiveis.has(jogador.id),
  );
}

/** Melhor reserva para um slot: posição igual > secundária > melhor de linha. */
function escolherReserva(
  reservas: Player[],
  posicaoSlot: Position,
): Player | undefined {
  const deLinha = reservas.filter(r => r.posicaoPrincipal !== 'GOL');
  // Goleiro só é substituído por outro goleiro.
  if (posicaoSlot === 'GOL') {
    return reservas
      .filter(r => r.posicaoPrincipal === 'GOL')
      .sort((a, b) => b.overall - a.overall)[0];
  }
  const mesmaPosicao = deLinha
    .filter(r => r.posicaoPrincipal === posicaoSlot)
    .sort((a, b) => b.overall - a.overall)[0];
  if (mesmaPosicao) {
    return mesmaPosicao;
  }
  const secundaria = deLinha
    .filter(r => r.posicoesSecundarias.includes(posicaoSlot))
    .sort((a, b) => b.overall - a.overall)[0];
  if (secundaria) {
    return secundaria;
  }
  return deLinha.sort((a, b) => b.overall - a.overall)[0];
}

/** Executa a troca no override de formação e devolve o evento da súmula. */
function executarTroca(
  estado: EstadoPartidaAoVivo,
  clube: Clube,
  formacao: Formacao,
  slotIndex: number,
  sai: Player,
  entra: Player,
  motivo: string,
): EventoPartida {
  const slot = formacao.titulares[slotIndex];
  const posicaoSlot = slot?.posicao ?? entra.posicaoPrincipal;
  const titulares = formacao.titulares.map((t, i) =>
    i === slotIndex
      ? {
          jogadorId: entra.id,
          // Entrante improvisado assume a posição NATURAL dele (a IA ajusta o
          // desenho); compatível mantém o desenho da formação.
          posicao: compativel(entra, posicaoSlot)
            ? posicaoSlot
            : entra.posicaoPrincipal,
        }
      : t,
  );
  estado.formacoesAoVivo.set(clube.id, {...formacao, titulares});
  estado.sairamNaPartida.add(sai.id);
  estado.subsIA.set(clube.id, (estado.subsIA.get(clube.id) ?? 0) + 1);

  return {
    minuto: estado.minuto,
    tipo: 'substituicao',
    timeId: clube.id,
    jogadorId: sai.id,
    jogadorEntraId: entra.id,
    descricao: `Substituição (${motivo}): sai ${sai.nome}, entra ${entra.nome}.`,
  };
}

/** Trocas de UM clube da IA num minuto. Devolve os eventos gerados. */
function processarClube(
  estado: EstadoPartidaAoVivo,
  clube: Clube,
  elenco: Player[],
  perdendo: boolean,
): EventoPartida[] {
  if (!clube.controladoPorIA) {
    return [];
  }
  const formacao = estado.formacoesAoVivo.get(clube.id) ?? clube.formacaoAtual;
  if (!formacao) {
    return [];
  }
  const eventos: EventoPartida[] = [];
  const porId = new Map(elenco.map(j => [j.id, j]));
  const subsRestantes = () =>
    MAX_SUBSTITUICOES_IA - (estado.subsIA.get(clube.id) ?? 0);

  // 1) LESÃO: repõe imediatamente quem caiu (expulso não tem reposição).
  const pendentes = estado.lesionadosPendentes.filter(
    p => p.clubeId === clube.id,
  );
  for (const pendente of pendentes) {
    estado.lesionadosPendentes = estado.lesionadosPendentes.filter(
      p => p !== pendente,
    );
    if (subsRestantes() <= 0) {
      continue;
    }
    const formacaoAtual =
      estado.formacoesAoVivo.get(clube.id) ?? formacao;
    const slotIndex = formacaoAtual.titulares.findIndex(
      t => t.jogadorId === pendente.jogadorId,
    );
    const sai = porId.get(pendente.jogadorId);
    if (slotIndex < 0 || !sai) {
      continue;
    }
    const reservas = reservasDisponiveis(estado, formacaoAtual, elenco);
    const entra = escolherReserva(
      reservas,
      formacaoAtual.titulares[slotIndex]?.posicao ?? sai.posicaoPrincipal,
    );
    if (!entra) {
      continue; // banco vazio: segue com um a menos.
    }
    eventos.push(
      executarTroca(estado, clube, formacaoAtual, slotIndex, sai, entra, 'lesão'),
    );
  }

  // Trocas "de comissão técnica" só no 2º tempo, uma por minuto no máximo.
  if (estado.minuto < 46 || subsRestantes() <= 0) {
    return eventos;
  }

  const formacaoAtual = estado.formacoesAoVivo.get(clube.id) ?? formacao;
  const emCampo = formacaoAtual.titulares
    .map((t, index) => ({slot: t, index, jogador: porId.get(t.jogadorId)}))
    .filter(
      (item): item is {slot: {jogadorId: string; posicao: Position}; index: number; jogador: Player} =>
        item.jogador !== undefined &&
        !estado.indisponiveis.has(item.jogador.id) &&
        item.slot.posicao !== 'GOL',
    );
  const condicaoDe = (jogador: Player): number =>
    estado.condicaoAtual.get(jogador.id) ?? jogador.condicaoFisica;

  // 2) PLACAR: perdendo aos 75'+, cartada ofensiva (1x por jogo, 20%/min).
  if (
    perdendo &&
    estado.minuto >= 75 &&
    !estado.cartadaOfensiva.has(clube.id) &&
    estado.rngSubs() < 0.2
  ) {
    const defensivos = emCampo
      .filter(item => !POSICOES_ATAQUE.includes(item.slot.posicao))
      .sort((a, b) => condicaoDe(a.jogador) - condicaoDe(b.jogador));
    const alvo = defensivos[0];
    const reservas = reservasDisponiveis(estado, formacaoAtual, elenco);
    const atacante = reservas
      .filter(r => POSICOES_ATAQUE.includes(r.posicaoPrincipal))
      .sort((a, b) => b.overall - a.overall)[0];
    if (alvo && atacante) {
      estado.cartadaOfensiva.add(clube.id);
      eventos.push(
        executarTroca(
          estado,
          clube,
          formacaoAtual,
          alvo.index,
          alvo.jogador,
          atacante,
          'placar',
        ),
      );
      return eventos;
    }
  }

  // 3) FADIGA: 25%/min de checar o mais cansado; troca se está no limite.
  if (estado.rngSubs() < 0.25) {
    const esgotados = emCampo
      .filter(item => condicaoDe(item.jogador) < CONDICAO_ESGOTADO)
      .sort((a, b) => condicaoDe(a.jogador) - condicaoDe(b.jogador));
    const alvo = esgotados[0];
    if (alvo) {
      const formacaoFadiga =
        estado.formacoesAoVivo.get(clube.id) ?? formacaoAtual;
      const reservas = reservasDisponiveis(estado, formacaoFadiga, elenco).filter(
        r => condicaoDe(r) >= CONDICAO_RESERVA_DESCANSADA,
      );
      const entra = escolherReserva(reservas, alvo.slot.posicao);
      if (entra) {
        eventos.push(
          executarTroca(
            estado,
            clube,
            formacaoFadiga,
            alvo.index,
            alvo.jogador,
            entra,
            'fadiga',
          ),
        );
      }
    }
  }

  return eventos;
}

/**
 * Substituições da IA de um minuto (dois clubes). Chamado por `simularMinuto`
 * DEPOIS dos eventos do minuto — a lesão do minuto já está na fila e a
 * reposição entra em campo no mesmo lance, valendo a partir do próximo minuto
 * (o contexto/força é recalculado a cada minuto).
 */
export function processarSubstituicoesIA(
  estado: EstadoPartidaAoVivo,
  ctx: ContextoMinuto,
): EventoPartida[] {
  const diff = estado.placarCasa - estado.placarFora;
  return [
    ...processarClube(estado, ctx.timeCasa, ctx.elencoCasa, diff < 0),
    ...processarClube(estado, ctx.timeFora, ctx.elencoFora, diff > 0),
  ];
}
