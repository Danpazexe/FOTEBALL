/**
 * Feed de imprensa. Puro e determinístico: a partir do estado atual (última
 * partida, humor da diretoria, expectativa vs. meta, próximo jogo) gera manchetes
 * editoriais que dão vida ao mundo do jogo. É DERIVAÇÃO — sem estado nem save, sem
 * RNG; as mesmas entradas produzem sempre as mesmas manchetes. As manchetes mudam
 * conforme o estado evolui (novo resultado → nova capa).
 */

import type {NivelPressao} from './pressao';

export type TomManchete = 'positivo' | 'neutro' | 'negativo';

export interface Manchete {
  /** Chave estável para listas (categoria — determinística, sem Date.now/random). */
  id: string;
  tom: TomManchete;
  texto: string;
}

export interface ContextoImprensa {
  nomeClube: string;
  /** Última partida disputada pelo clube (null se a temporada nem começou). */
  ultima: {
    golsFavor: number;
    golsContra: number;
    adversario: string;
    mandante: boolean;
  } | null;
  nivelPressao: NivelPressao;
  temUltimato: boolean;
  /** Posição atual (null antes da 1ª rodada); alvo da meta contratada. */
  posicaoAtual: number | null;
  posicaoAlvo: number;
  objetivoDescricao: string;
  proximoAdversario: string | null;
}

/** Manchete editorial sobre o último resultado. */
function mancheteDaPartida(ctx: ContextoImprensa): Manchete | null {
  if (!ctx.ultima) {
    return null;
  }
  const {golsFavor, golsContra, adversario, mandante} = ctx.ultima;
  const diff = golsFavor - golsContra;
  const local = mandante ? 'em casa' : 'fora';
  const placar = `${golsFavor}x${golsContra}`;
  if (diff >= 3) {
    return {
      id: 'partida',
      tom: 'positivo',
      texto: `Goleada! ${ctx.nomeClube} atropela o ${adversario} por ${placar} ${local}.`,
    };
  }
  if (diff >= 1) {
    return {
      id: 'partida',
      tom: 'positivo',
      texto: `${ctx.nomeClube} vence o ${adversario} por ${placar} ${local}.`,
    };
  }
  if (diff === 0) {
    return {
      id: 'partida',
      tom: 'neutro',
      texto: `${ctx.nomeClube} fica no ${placar} com o ${adversario} ${local}.`,
    };
  }
  if (diff <= -3) {
    return {
      id: 'partida',
      tom: 'negativo',
      texto: `Vexame: ${ctx.nomeClube} leva ${golsContra}x${golsFavor} do ${adversario} ${local}.`,
    };
  }
  return {
    id: 'partida',
    tom: 'negativo',
    texto: `${ctx.nomeClube} perde para o ${adversario} por ${golsContra}x${golsFavor} ${local}.`,
  };
}

/** Manchete sobre o clima nos bastidores (diretoria). */
function mancheteDaDiretoria(ctx: ContextoImprensa): Manchete {
  if (ctx.temUltimato) {
    return {
      id: 'diretoria',
      tom: 'negativo',
      texto: `Diretoria dá ultimato: cargo do técnico do ${ctx.nomeClube} por um fio.`,
    };
  }
  if (ctx.nivelPressao === 'Crítico' || ctx.nivelPressao === 'Ameaçado') {
    return {
      id: 'diretoria',
      tom: 'negativo',
      texto: `Pressão aumenta sobre o comando do ${ctx.nomeClube}.`,
    };
  }
  if (ctx.nivelPressao === 'Pressionado') {
    return {
      id: 'diretoria',
      tom: 'neutro',
      texto: `Clima esquenta nos bastidores do ${ctx.nomeClube}.`,
    };
  }
  return {
    id: 'diretoria',
    tom: 'positivo',
    texto: `Diretoria demonstra confiança no trabalho do técnico.`,
  };
}

/** Manchete sobre a campanha vs. a meta contratada. */
function mancheteDaMeta(ctx: ContextoImprensa): Manchete {
  if (ctx.posicaoAtual == null) {
    return {
      id: 'meta',
      tom: 'neutro',
      texto: `Torcida do ${ctx.nomeClube} sonha com a meta: ${ctx.objetivoDescricao.toLowerCase()}.`,
    };
  }
  if (ctx.posicaoAtual <= ctx.posicaoAlvo) {
    return {
      id: 'meta',
      tom: 'positivo',
      texto: `${ctx.nomeClube} em ${ctx.posicaoAtual}º cumpre o objetivo: ${ctx.objetivoDescricao.toLowerCase()}.`,
    };
  }
  return {
    id: 'meta',
    tom: 'negativo',
    texto: `${ctx.nomeClube} em ${ctx.posicaoAtual}º frustra a meta (${ctx.objetivoDescricao.toLowerCase()}).`,
  };
}

/**
 * Gera as manchetes da imprensa a partir do estado atual, da mais relevante
 * (último resultado) à de contexto (próximo jogo).
 */
export function gerarManchetes(ctx: ContextoImprensa): Manchete[] {
  const manchetes: Manchete[] = [];

  const partida = mancheteDaPartida(ctx);
  if (partida) {
    manchetes.push(partida);
  }
  manchetes.push(mancheteDaDiretoria(ctx));
  manchetes.push(mancheteDaMeta(ctx));

  if (ctx.proximoAdversario) {
    manchetes.push({
      id: 'proximo',
      tom: 'neutro',
      texto: `Próximo desafio: ${ctx.nomeClube} encara o ${ctx.proximoAdversario}.`,
    });
  }

  return manchetes;
}
