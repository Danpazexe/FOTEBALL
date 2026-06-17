import type {Formacao, Player, Position, Tatica} from '../../types';
import {fatorAdaptacao} from '../tactics/adaptacao';

export interface ForcaTime {
  ataque: number;
  meio: number;
  defesa: number;
  /** Qualidade isolada do goleiro (reflexos/posicionamento), 0-100. */
  forcaGoleiro: number;
  overall: number;
}

/**
 * Opções de contexto da partida que modulam a força ATUAL do time:
 * - `indisponiveis`: jogadores que saíram (expulsos/lesionados) e não contam mais;
 * - `condicaoAtual`: condição física minuto-a-minuto (fadiga dinâmica). Quando
 *   ausente, usa-se `jogador.condicaoFisica` (condição pré-jogo).
 */
export interface OpcoesForca {
  indisponiveis?: Set<string>;
  condicaoAtual?: Map<string, number>;
}

function linhaDaPosicao(posicao: Position): 'ataque' | 'meio' | 'defesa' {
  if (['PD', 'PE', 'SA', 'CA'].includes(posicao)) {
    return 'ataque';
  }

  if (['VOL', 'MC', 'MEI'].includes(posicao)) {
    return 'meio';
  }

  return 'defesa';
}

/** Fatores comuns (condição/moral/forma) que escalam a contribuição de um jogador. */
function fatoresEstado(jogador: Player, condicaoEfetiva: number): number {
  const fatorCondicao = condicaoEfetiva / 100;
  const fatorMoral = 0.85 + (jogador.moral / 100) * 0.3;
  const fatorForma = 1 + jogador.forma * 0.02;
  return fatorCondicao * fatorMoral * fatorForma;
}

function contribuicaoJogador(
  jogador: Player,
  posicaoEscalada: Position,
  condicaoEfetiva: number,
): number {
  // Penalidade GRADUADA por improviso: rende menos quanto mais distante da
  // posição natural (ver `adaptacao`). Posição natural = fator 1.0; um zagueiro
  // jogando de atacante (terço oposto) cai a ~0.6, e por aí vai. Substitui a
  // antiga penalidade fixa de -5, que não distinguia "fora de posição parecida"
  // de "improviso pesado".
  const fator = fatorAdaptacao(
    jogador.posicaoPrincipal,
    jogador.posicoesSecundarias,
    posicaoEscalada,
  );

  return (
    Math.max(1, jogador.overall * fator) *
    fatoresEstado(jogador, condicaoEfetiva)
  );
}

/**
 * Contribuição do goleiro: pondera reflexos e posicionamento acima do overall
 * bruto, para que um paredão pese de verdade na defesa (não diluído na média
 * da zaga, como antes).
 */
function contribuicaoGoleiro(jogador: Player, condicaoEfetiva: number): number {
  const base =
    jogador.overall * 0.5 +
    jogador.atributos.reflexos * 0.3 +
    jogador.atributos.posicionamento * 0.2;
  return base * fatoresEstado(jogador, condicaoEfetiva);
}

function media(valores: number[], fallback: number): number {
  if (valores.length === 0) {
    return fallback;
  }

  return valores.reduce((total, valor) => total + valor, 0) / valores.length;
}

export function calcularForcaTime(
  formacao: Formacao,
  jogadores: Player[],
  tatica: Tatica,
  opcoes?: OpcoesForca,
): ForcaTime {
  const jogadoresPorId = new Map(jogadores.map(jogador => [jogador.id, jogador]));
  const indisponiveis = opcoes?.indisponiveis;
  const condicaoAtual = opcoes?.condicaoAtual;
  const condicaoDe = (jogador: Player): number =>
    condicaoAtual?.get(jogador.id) ?? jogador.condicaoFisica;

  const linhas: Record<'ataque' | 'meio' | 'defesa', number[]> = {
    ataque: [],
    meio: [],
    defesa: [],
  };
  let forcaGoleiro = 55;
  let titularesDeLinha = 0; // jogadores de linha previstos na escalação (não-GOL)
  let presentesDeLinha = 0; // quantos desses estão realmente disponíveis

  for (const titular of formacao.titulares) {
    if (titular.posicao !== 'GOL') {
      titularesDeLinha += 1;
    }

    const jogador = jogadoresPorId.get(titular.jogadorId);

    if (
      !jogador ||
      jogador.lesionado ||
      jogador.suspenso ||
      indisponiveis?.has(jogador.id)
    ) {
      continue;
    }

    // Goleiro é avaliado à parte (não entra na média da defesa).
    if (titular.posicao === 'GOL') {
      forcaGoleiro = contribuicaoGoleiro(jogador, condicaoDe(jogador));
      continue;
    }

    presentesDeLinha += 1;
    linhas[linhaDaPosicao(titular.posicao)].push(
      contribuicaoJogador(jogador, titular.posicao, condicaoDe(jogador)),
    );
  }

  let ataque = media(linhas.ataque, 55);
  let meio = media(linhas.meio, 55);
  let defesa = media(linhas.defesa, 55);

  // Desvantagem numérica: jogar com menos gente (expulsão/lesão sem reserva)
  // enfraquece o time inteiro — não basta tirar o autor dos lances, a força
  // tem que cair. Como as linhas são MÉDIAS, sem isto um time com 10 jogaria
  // igual a um com 11.
  if (titularesDeLinha > 0 && presentesDeLinha < titularesDeLinha) {
    const fatorNumerico = Math.max(0.5, presentesDeLinha / titularesDeLinha);
    ataque *= fatorNumerico;
    meio *= fatorNumerico;
    defesa *= fatorNumerico;
  }

  // --- Tática: cada estilo não-neutro é um TRADE-OFF real (ganha numa linha,
  // perde noutra). 'Equilibrado'/'Zona'/'Normal' são a base neutra deliberada
  // (1.0): nenhum risco, nenhum bônus. O matchup entre estilos é resolvido em
  // probabilityCalc (pedra-papel-tesoura). ---
  if (tatica.estiloOfensivo === 'Posse de bola') {
    meio *= 1.06;
    ataque *= 0.96;
  } else if (tatica.estiloOfensivo === 'Contra-ataque') {
    ataque *= 1.06;
    defesa *= 1.04;
    meio *= 0.92;
  } else if (tatica.estiloOfensivo === 'Ataque direto') {
    ataque *= 1.08;
    meio *= 0.96;
    defesa *= 0.95;
  }

  if (tatica.marcacao === 'Pressão alta') {
    // Recupera a bola mais alto (meio/defesa), mas o preço é disciplinar e
    // físico (mais cartões/pênaltis/fadiga em probabilityCalc/fadiga).
    defesa *= 1.04;
    meio *= 1.04;
  } else if (tatica.marcacao === 'Individual') {
    defesa *= 1.02;
  }

  if (tatica.linhaDefensiva === 'Adiantada') {
    ataque *= 1.05;
    defesa *= 0.92;
  } else if (tatica.linhaDefensiva === 'Recuada') {
    ataque *= 0.96;
    defesa *= 1.05;
  }

  const overall = ataque * 0.35 + meio * 0.35 + defesa * 0.3;

  return {ataque, meio, defesa, forcaGoleiro, overall};
}
