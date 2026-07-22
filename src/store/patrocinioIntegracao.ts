/**
 * Integração do sistema de patrocínios com o estado do jogo (store).
 * Monta o perfil/contexto a partir do `GameState` e orquestra a engine pura
 * (geração de propostas, pagamento por temporada, bônus por vitória e progresso
 * de metas). Segue o padrão de `serieDSeason.ts`: funções que recebem dados do
 * estado e devolvem as atualizações, sem tocar em React/SQLite.
 *
 * O crédito financeiro passa pelo `registrarTransacao` existente (categoria
 * 'patrocinio'), mantendo saldo/histórico coerentes com o resto das finanças.
 */
import type {Clube, Partida, TabelaClassificacao} from '../types';
import type {EstadoPatrocinio} from '../types/patrocinio';

import {registrarTransacaoSePositiva} from '../engine/finance/financeEngine';
import {nomePatrocinador} from '../engine/patrocinio/catalogo';
import {
  atualizarMetasPatrocinio,
  bonusVitoriaPatrocinio,
  gerarPropostasPatrocinio,
  pagarTemporadaPatrocinio,
  processarFimContratoPatrocinio,
  type ContextoMetasPatrocinio,
  type PerfilClubePatrocinio,
} from '../engine/patrocinio/patrocinioEngine';
import {posicaoClube} from './helpers';

const ZONA_ACESSO = 4; // 4 primeiros sobem
const ZONA_REBAIXAMENTO = 4; // 4 últimos caem

interface DadosClubeUsuario {
  clube: Clube;
  tabela: TabelaClassificacao[];
  partidas: Partida[];
  temporada: number;
}

function fatorTorcida(clube: Clube): number {
  // Capacidade típica ~15k–70k → 0..1 (clamp).
  return Math.max(0, Math.min(1, (clube.estadio.capacidade - 10_000) / 60_000));
}

function desempenhoRecente(tabela: TabelaClassificacao[], clubeId: string): number {
  const linha = tabela.find(l => l.clubeId === clubeId);
  if (!linha || linha.jogos === 0) {
    return 0.5;
  }
  return Math.max(0, Math.min(1, linha.pontos / (linha.jogos * 3)));
}

/** Perfil do clube do usuário para a engine de patrocínio (null se sem dados). */
export function montarPerfilPatrocinio(
  dados: DadosClubeUsuario,
): PerfilClubePatrocinio {
  const {clube, tabela, temporada} = dados;
  return {
    clubeId: clube.id,
    temporada,
    reputacao: clube.reputacao,
    divisao: clube.divisao ?? 'Série A',
    posicaoLiga: posicaoClube(tabela, clube.id),
    totalClubesDivisao: tabela.length || 20,
    desempenhoRecente: desempenhoRecente(tabela, clube.id),
    torcidaFator: fatorTorcida(clube),
  };
}

/** Maior sequência de jogos SEM DERROTA do clube na temporada (partidas jogadas). */
function maiorInvencibilidade(partidas: Partida[], clubeId: string): number {
  const jogos = partidas
    .filter(
      p =>
        p.jogada &&
        (p.timeCasa === clubeId || p.timeFora === clubeId) &&
        p.placarCasa !== undefined &&
        p.placarFora !== undefined,
    )
    .sort((a, b) => a.rodada - b.rodada);
  let atual = 0;
  let melhor = 0;
  for (const p of jogos) {
    const ehCasa = p.timeCasa === clubeId;
    const gols = ehCasa ? p.placarCasa! : p.placarFora!;
    const golsAdv = ehCasa ? p.placarFora! : p.placarCasa!;
    if (gols >= golsAdv) {
      atual += 1;
      melhor = Math.max(melhor, atual);
    } else {
      atual = 0;
    }
  }
  return melhor;
}

/** Contexto de progresso das metas a partir do estado real (sem fabricar). */
export function montarContextoMetas(
  dados: DadosClubeUsuario,
  fimDeTemporada: boolean,
): ContextoMetasPatrocinio {
  const {clube, tabela, partidas} = dados;
  const linha = tabela.find(l => l.clubeId === clube.id);
  const posicao = posicaoClube(tabela, clube.id);
  const total = tabela.length || 20;
  const naSubida = clube.divisao !== 'Série A' && posicao <= ZONA_ACESSO;
  const naQueda = posicao > total - ZONA_REBAIXAMENTO;
  return {
    posicaoLiga: posicao,
    vitoriasTemporada: linha?.vitorias ?? 0,
    sequenciaInvicto: maiorInvencibilidade(partidas, clube.id),
    // Acesso/rebaixamento só se consolidam no fim; no meio, progresso parcial.
    acessoConquistado: fimDeTemporada && naSubida,
    rebaixado: fimDeTemporada && naQueda,
    faseCopaAlcancada: 0, // rastreio de fase da copa: pendente (ver ADR)
    titulosTemporada: fimDeTemporada && posicao === 1 ? 1 : 0,
    jogosComBase: 0, // rastreio de uso da base: pendente
  };
}

export interface ResultadoPatrocinio {
  patrocinio: EstadoPatrocinio;
  /** Clube do usuário atualizado (crédito de pagamento/bônus), ou o mesmo. */
  clube: Clube;
  /** Notícias curtas do que aconteceu (crédito, meta batida). */
  eventos: string[];
}

/** Credita um valor de patrocínio no clube (transação categoria 'patrocinio'). */
function creditar(clube: Clube, valor: number, descricao: string, data: string): Clube {
  return registrarTransacaoSePositiva(clube, {
    data,
    tipo: 'receita',
    categoria: 'patrocinio',
    valor,
    descricao,
  });
}

/** Há contrato de patrocínio ativo (define se pular o patrocínio por reputação). */
export function temContratoPatrocinioAtivo(patrocinio: EstadoPatrocinio): boolean {
  return patrocinio.contratoAtivo?.status === 'ATIVO';
}

/**
 * Encerra a temporada do patrocínio: avalia metas finais (paga bônus), credita
 * a parcela fixa da temporada e encerra o contrato cuja última temporada passou.
 * NÃO gera as novas propostas — isso é feito depois, já com a nova divisão/tabela
 * (via `garantirPropostasIniciais`). `temporadaNova` é a que vai começar.
 */
export function encerrarContratoTemporada(
  patrocinio: EstadoPatrocinio,
  dados: DadosClubeUsuario,
  temporadaNova: number,
  data: string,
): ResultadoPatrocinio {
  const eventos: string[] = [];
  let clube = dados.clube;
  let estado = patrocinio;

  // 1) Metas finais (posição/acesso/rebaixamento/título) + bônus.
  const metas = atualizarMetasPatrocinio(estado, montarContextoMetas(dados, true));
  estado = metas.estado;
  if (metas.bonus > 0 && estado.contratoAtivo) {
    clube = creditar(
      clube,
      metas.bonus,
      `Bônus de meta — ${nomePatrocinador(estado.contratoAtivo.patrocinadorId)}`,
      data,
    );
    eventos.push(`Meta de patrocínio cumprida: +${metas.bonus}`);
  }

  // 2) Parcela fixa da temporada que encerrou.
  const pago = pagarTemporadaPatrocinio(estado);
  estado = pago.estado;
  if (pago.credito > 0 && estado.contratoAtivo) {
    clube = creditar(
      clube,
      pago.credito,
      `Patrocínio — ${nomePatrocinador(estado.contratoAtivo.patrocinadorId)}`,
      data,
    );
  }

  // 3) Encerra contrato cuja última temporada passou (vira histórico).
  estado = processarFimContratoPatrocinio(estado, temporadaNova);

  return {patrocinio: estado, clube, eventos};
}

/**
 * Processa o patrocínio a cada rodada: bônus por vitória do usuário e progresso
 * das metas de curso (vitórias/invencibilidade), pagando bônus recém-batido.
 */
export function processarPatrocinioRodada(
  patrocinio: EstadoPatrocinio,
  dados: DadosClubeUsuario,
  venceuNaRodada: boolean,
  data: string,
): ResultadoPatrocinio {
  const eventos: string[] = [];
  let clube = dados.clube;
  let estado = patrocinio;

  if (estado.contratoAtivo?.status === 'ATIVO') {
    const patrocinadorId = estado.contratoAtivo.patrocinadorId;
    // Accessor do engine encapsula "só paga com contrato ATIVO" (fonte única).
    const bonusVitoria = bonusVitoriaPatrocinio(estado);
    if (venceuNaRodada && bonusVitoria > 0) {
      clube = creditar(
        clube,
        bonusVitoria,
        `Bônus por vitória — ${nomePatrocinador(patrocinadorId)}`,
        data,
      );
    }
    const metas = atualizarMetasPatrocinio(estado, montarContextoMetas(dados, false));
    estado = metas.estado;
    if (metas.bonus > 0) {
      clube = creditar(
        clube,
        metas.bonus,
        `Bônus de meta — ${nomePatrocinador(patrocinadorId)}`,
        data,
      );
      eventos.push('Meta de patrocínio cumprida');
    }
  }

  return {patrocinio: estado, clube, eventos};
}

/**
 * Garante que o clube do usuário tenha propostas na temporada atual (usado no
 * início de uma nova carreira, quando ainda não há nenhuma).
 */
export function garantirPropostasIniciais(
  patrocinio: EstadoPatrocinio,
  dados: DadosClubeUsuario,
): EstadoPatrocinio {
  if (
    patrocinio.temporadaPropostas === dados.temporada &&
    patrocinio.propostas.length > 0
  ) {
    return patrocinio;
  }
  const perfil = montarPerfilPatrocinio(dados);
  return {
    ...patrocinio,
    propostas: gerarPropostasPatrocinio(perfil, patrocinio.contratoAtivo),
    temporadaPropostas: dados.temporada,
  };
}
