/**
 * Termômetro de pressão da diretoria. Puro e determinístico: lê os MESMOS sinais
 * que disparam a demissão (derrotas seguidas rumo ao limite, rodadas no vermelho
 * rumo à falência) + a distância da meta contratada e a reputação do técnico, e
 * grada tudo num nível 0-100. O objetivo é o jogador SENTIR o calor subir ANTES
 * do gatilho de demissão estourar. Não altera estado nem save — é derivação.
 *
 * Modelo (fiel a verificarDemissao em carreiraEngine.ts):
 *  • PISO = proximidade do gatilho de demissão mais perto de estourar (máximo
 *    entre a razão de derrotas e a de rodadas no vermelho). verificarDemissao
 *    checa esses gatilhos por CONTAGEM PURA — reputação não segura nenhum deles —
 *    então eles formam um piso que o alívio de reputação nunca reduz.
 *  • AGRAVANTES soft = distância abaixo da meta + impaciência por reputação baixa.
 *    Reputação alta ALIVIA só esta parte (nunca o piso).
 *  • 'Crítico' é RESERVADO para quando um gatilho real está a um passo de estourar;
 *    agravante soft sozinho não passa de 'Ameaçado'.
 */

import {RODADAS_VERMELHO_FALENCIA} from './carreiraEngine';

export type NivelPressao =
  | 'Tranquilo'
  | 'Estável'
  | 'Pressionado'
  | 'Ameaçado'
  | 'Crítico';

export interface PressaoDiretoria {
  nivel: NivelPressao;
  /** 0 (blindado) a 100 (demissão iminente). */
  pontuacao: number;
  /** Fatores legíveis que puxam a pressão, do MAIS grave ao menos (Home mostra o 1º). */
  fatores: string[];
}

/** A partir daqui o gatilho de demissão está a um passo de estourar. */
const LIMIAR_CRITICO = 80;
/** Peso máximo do buraco de expectativa (posições abaixo da meta). */
const PESO_META = 50;
/** Fator do colchão/impaciência de reputação (pontos por ponto de reputação). */
const PESO_REPUTACAO = 0.3;

function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor));
}

function nivelDePontuacao(pontuacao: number): NivelPressao {
  if (pontuacao < 20) {
    return 'Tranquilo';
  }
  if (pontuacao < 40) {
    return 'Estável';
  }
  if (pontuacao < 60) {
    return 'Pressionado';
  }
  if (pontuacao < LIMIAR_CRITICO) {
    return 'Ameaçado';
  }
  return 'Crítico';
}

/**
 * Calcula a pressão da diretoria sobre o técnico (0-100 + nível + fatores).
 */
export function calcularPressaoDiretoria(args: {
  derrotasConsecutivas: number;
  limiteDerrotas: number;
  rodadasNoVermelho: number;
  reputacaoTecnico: number;
  /** Posição atual na tabela (1 = líder); null quando ainda não há jogos/tabela. */
  posicaoAtual: number | null;
  /** Terminar até esta posição cumpre a meta (do objetivo da temporada). */
  posicaoAlvo: number;
  /** Total de clubes na divisão (normaliza o buraco de expectativa). */
  totalClubes: number;
}): PressaoDiretoria {
  const {
    derrotasConsecutivas,
    limiteDerrotas,
    rodadasNoVermelho,
    reputacaoTecnico,
    posicaoAtual,
    posicaoAlvo,
    totalClubes,
  } = args;

  // Razões 0-1 de proximidade de cada gatilho de demissão. Com limiteDerrotas<=0
  // (demissão imediata em qualquer derrota), estar em derrota já satura.
  const razaoDerrotas =
    limiteDerrotas > 0
      ? limitar(derrotasConsecutivas / limiteDerrotas, 0, 1)
      : derrotasConsecutivas > 0
        ? 1
        : 0;
  const razaoFinancas = limitar(
    rodadasNoVermelho / RODADAS_VERMELHO_FALENCIA,
    0,
    1,
  );

  // PISO: proximidade do gatilho mais perto de estourar (reputação NÃO segura).
  const gatilho = Math.max(razaoDerrotas, razaoFinancas) * 100;

  // AGRAVANTES soft (sentimento da diretoria).
  const buracoMeta =
    posicaoAtual != null && posicaoAtual > posicaoAlvo
      ? (limitar(posicaoAtual - posicaoAlvo, 0, totalClubes) /
          Math.max(1, totalClubes)) *
        PESO_META
      : 0;
  const impacienciaReputacao =
    reputacaoTecnico < 50 ? (50 - reputacaoTecnico) * PESO_REPUTACAO : 0;
  const alivioReputacao =
    reputacaoTecnico > 50 ? (reputacaoTecnico - 50) * PESO_REPUTACAO : 0;
  // Reputação alta alivia só o soft; nunca fica negativo (não reduz o piso).
  const soft = Math.max(0, buracoMeta + impacienciaReputacao - alivioReputacao);

  // 'Crítico' exige gatilho real de demissão a um passo; soft sozinho para em 'Ameaçado'.
  let pontuacao = gatilho + soft;
  if (gatilho < LIMIAR_CRITICO) {
    pontuacao = Math.min(pontuacao, LIMIAR_CRITICO - 1);
  }
  pontuacao = limitar(Math.round(pontuacao), 0, 100);

  // Fatores ordenados por severidade (peso 0-1) para que fatores[0] seja a causa real.
  const candidatos: Array<{peso: number; texto: string}> = [];
  if (derrotasConsecutivas > 0) {
    candidatos.push({
      peso: razaoDerrotas,
      texto: `${derrotasConsecutivas} ${
        derrotasConsecutivas === 1 ? 'derrota' : 'derrotas'
      } seguida${derrotasConsecutivas === 1 ? '' : 's'} (demissão em ${limiteDerrotas})`,
    });
  }
  if (rodadasNoVermelho > 0) {
    candidatos.push({
      peso: razaoFinancas,
      texto: `Finanças no vermelho há ${rodadasNoVermelho} ${
        rodadasNoVermelho === 1 ? 'rodada' : 'rodadas'
      } (falência em ${RODADAS_VERMELHO_FALENCIA})`,
    });
  }
  if (buracoMeta > 0 && posicaoAtual != null) {
    candidatos.push({
      peso: buracoMeta / PESO_META,
      texto: `Abaixo da meta: ${posicaoAtual}º, alvo até ${posicaoAlvo}º`,
    });
  }
  if (reputacaoTecnico <= 35) {
    candidatos.push({
      peso: impacienciaReputacao / (50 * PESO_REPUTACAO),
      texto: 'Reputação baixa: diretoria impaciente',
    });
  } else if (reputacaoTecnico >= 70 && gatilho < LIMIAR_CRITICO) {
    // Mensagem informativa de alívio — sempre por último (peso 0).
    candidatos.push({peso: 0, texto: 'Reputação sólida segura o cargo'});
  }
  candidatos.sort((a, b) => b.peso - a.peso);

  return {
    nivel: nivelDePontuacao(pontuacao),
    pontuacao,
    fatores: candidatos.map(candidato => candidato.texto),
  };
}
