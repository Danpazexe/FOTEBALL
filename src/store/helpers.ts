/**
 * Helpers PUROS do store (FASE 8 — passo 1 da refatoração: extrair funções puras
 * do useGameStore sem mudar comportamento). Nada aqui lê ou escreve o estado do
 * Zustand: são funções determinísticas sobre dados de domínio, reaproveitáveis e
 * testáveis isoladamente. A store apenas as importa e orquestra.
 */
import {LIMITE_DERROTAS_DEMISSAO} from '../engine/carreira/carreiraEngine';
import {hashString, inteiroEntre, type RandomGenerator} from '../engine/simulation/rng';
import type {
  Clube,
  MotivoDemissao,
  Partida,
  Player,
  ResultadoCarreira,
  TabelaClassificacao,
} from '../types';
import {adicionarDias} from '../utils/datas';

/** Quantos jogadores faltam por posição no elenco do usuário (alvo: 2 por posição). */
export function necessidadesPorPosicao(
  jogadores: Player[],
): Partial<Record<Player['posicaoPrincipal'], number>> {
  const contagem = new Map<Player['posicaoPrincipal'], number>();
  for (const jogador of jogadores) {
    contagem.set(
      jogador.posicaoPrincipal,
      (contagem.get(jogador.posicaoPrincipal) ?? 0) + 1,
    );
  }
  const necessidades: Partial<Record<Player['posicaoPrincipal'], number>> = {};
  const posicoes: Player['posicaoPrincipal'][] = [
    'GOL', 'ZAG', 'LD', 'LE', 'VOL', 'MC', 'MEI', 'PD', 'PE', 'SA', 'CA',
  ];
  for (const posicao of posicoes) {
    necessidades[posicao] = Math.max(0, 2 - (contagem.get(posicao) ?? 0));
  }
  return necessidades;
}

/**
 * Data inicial de uma temporada: 2 dias antes da 1ª rodada, para que o primeiro
 * evento do calendário seja o treino (na véspera do jogo).
 */
export function dataInicialDeTemporada(
  partidas: Partida[],
  temporada: string,
): string {
  const rodada1 = partidas.find(partida => partida.rodada === 1);
  return rodada1 ? adicionarDias(rodada1.data, -2) : `${temporada}-04-04`;
}

/**
 * Classifica uma divisão por FORÇA de elenco (média dos 11 melhores overalls) com
 * um ruído determinístico por temporada. Usado SÓ para a divisão que não foi
 * jogada (ex.: a Série B enquanto o usuário disputa a Série A), para decidir quem
 * sobe/desce sem precisar simular um campeonato inteiro. Retorna os ids do melhor
 * para o pior.
 */
export function ranquearDivisaoPorForca(
  clubes: Clube[],
  jogadores: Player[],
  temporada: string,
): string[] {
  const score = (clube: Clube): number => {
    const top11 = jogadores
      .filter(jogador => jogador.clubeId === clube.id)
      .sort((a, b) => b.overall - a.overall)
      .slice(0, 11);
    const media =
      top11.length > 0
        ? top11.reduce((soma, jogador) => soma + jogador.overall, 0) /
          top11.length
        : 0;
    // ±3 de variação determinística por ano, para a classificação não congelar.
    const ruido = (hashString(`${temporada}_${clube.id}`) % 1000) / 1000;
    return media + ruido * 6 - 3;
  };
  return [...clubes].sort((a, b) => score(b) - score(a)).map(clube => clube.id);
}

export function jogadoresDoClube(
  jogadores: Player[],
  clubeId: string,
): Player[] {
  return jogadores.filter(jogador => jogador.clubeId === clubeId);
}

export function posicaoClube(
  tabela: TabelaClassificacao[],
  clubeId: string,
): number {
  const index = tabela.findIndex(linha => linha.clubeId === clubeId);
  return index === -1 ? tabela.length : index + 1;
}

/**
 * Dias de afastamento por gravidade da lesão (7 dias ≈ 1 jogo/rodada).
 * Determinístico: usa o RNG derivado da partida (mesma partida => mesma lesão).
 */
export function sortearDuracaoLesao(rng: RandomGenerator): number {
  const r = rng();
  if (r < 0.5) {
    return inteiroEntre(rng, 7, 14); // leve: 1-2 jogos
  }
  if (r < 0.85) {
    return inteiroEntre(rng, 21, 35); // média: 3-5 jogos
  }
  return inteiroEntre(rng, 42, 70); // grave: 6-10 jogos
}

export function limiteDerrotasPorDivisao(divisao: string): number {
  if (divisao === 'Série B') {
    return LIMITE_DERROTAS_DEMISSAO.B;
  }
  if (divisao === 'Série C') {
    return LIMITE_DERROTAS_DEMISSAO.C;
  }
  return LIMITE_DERROTAS_DEMISSAO.A;
}

export function mensagemDemissao(motivo: MotivoDemissao): string {
  if (motivo === 'FALENCIA') {
    return 'A diretoria te demitiu: o clube quebrou financeiramente.';
  }
  if (motivo === 'REBAIXAMENTO') {
    return 'A diretoria te demitiu após o rebaixamento.';
  }
  return 'A diretoria te demitiu após a sequência de derrotas.';
}

/** Resultado da rodada para o clube do usuário (null se não jogou). */
export function resultadoDoUsuario(
  partidaUsuario: Partida | null,
  clubeUsuarioId: string,
): ResultadoCarreira | null {
  if (!partidaUsuario || !partidaUsuario.jogada) {
    return null;
  }
  const ehCasa = partidaUsuario.timeCasa === clubeUsuarioId;
  const golsCasa = partidaUsuario.placarCasa ?? 0;
  const golsFora = partidaUsuario.placarFora ?? 0;
  if (golsCasa === golsFora) {
    return 'empate';
  }
  return (golsCasa > golsFora) === ehCasa ? 'vitoria' : 'derrota';
}
