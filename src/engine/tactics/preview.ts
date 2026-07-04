/**
 * Preview tático (scouting) do pré-jogo. Duas coisas, ambas PURAS:
 *
 *  1. `taticaProvavelIA` — a tática que o adversário (IA) provavelmente vai usar,
 *     deduzida da força relativa + mando (favorito pressiona; azarão se fecha e
 *     joga de contra-ataque; equilibrado = neutro). Determinística: a MESMA que a
 *     simulação usa no jogo do usuário, então o preview é honesto.
 *
 *  2. `avaliarConfronto` — lê o matchup (pedra-papel-tesoura de `modMatchupAtaque`)
 *     nos DOIS sentidos e devolve: nível (favorável/neutro/arriscado), onde você
 *     leva/tem vantagem, e uma SUGESTÃO de ajuste que melhora o seu saldo.
 */

import {modMatchupAtaque} from '../simulation/probabilityCalc';
import type {Tatica} from '../../types';

// Táticas-arquétipo da IA (inline p/ não acoplar engine→api). Coerentes com os
// presets de estratégia do usuário.
const IA_FAVORITO: Tatica = {
  estiloOfensivo: 'Ataque direto',
  marcacao: 'Pressão alta',
  linhaDefensiva: 'Adiantada',
  ritmo: 'Intenso',
  ladoAtaque: 'Ambos',
  amplidao: 'Amplo',
};
const IA_AZARAO: Tatica = {
  estiloOfensivo: 'Contra-ataque',
  marcacao: 'Zona',
  linhaDefensiva: 'Recuada',
  ritmo: 'Normal',
  ladoAtaque: 'Ambos',
  amplidao: 'Estreito',
};
const IA_EQUILIBRADO: Tatica = {
  estiloOfensivo: 'Equilibrado',
  marcacao: 'Zona',
  linhaDefensiva: 'Normal',
  ritmo: 'Normal',
  ladoAtaque: 'Ambos',
  amplidao: 'Normal',
};

export type ContextoAdversario = {
  overallAdversario: number;
  overallUsuario: number;
  adversarioMandante: boolean;
};

/** Tática provável do adversário (IA), pela força relativa + mando. Pura. */
export function taticaProvavelIA(ctx: ContextoAdversario): Tatica {
  const vantagem =
    ctx.overallAdversario +
    (ctx.adversarioMandante ? 3 : 0) -
    ctx.overallUsuario;
  if (vantagem >= 4) {
    return IA_FAVORITO;
  }
  if (vantagem <= -4) {
    return IA_AZARAO;
  }
  return IA_EQUILIBRADO;
}

export type NivelConfronto = 'favoravel' | 'neutro' | 'arriscado';

export type LeituraConfronto = {
  nivel: NivelConfronto;
  /** Saldo do matchup: (meu ataque explora o dele) − (o dele explora o meu). */
  saldo: number;
  /** Como a SUA tática explora a dele. */
  vantagens: string[];
  /** Como a tática DELE explora a sua. */
  riscos: string[];
  /** Ajuste sugerido (ex.: "Contra-ataque + linha recuada"), ou null. */
  sugestao: string | null;
};

/** Frases legíveis de onde `atacante` explora `defensor` (espelha modMatchupAtaque). */
function exploracoes(atacante: Tatica, defensor: Tatica): string[] {
  const t: string[] = [];
  if (atacante.estiloOfensivo === 'Contra-ataque') {
    if (defensor.estiloOfensivo === 'Posse de bola') {
      t.push('contra-ataque em cima da posse');
    }
    if (defensor.marcacao === 'Pressão alta') {
      t.push('contra-ataque nas costas da pressão');
    }
    if (defensor.linhaDefensiva === 'Adiantada') {
      t.push('lançamentos nas costas da linha alta');
    }
  }
  if (
    atacante.estiloOfensivo === 'Ataque direto' &&
    defensor.linhaDefensiva === 'Adiantada'
  ) {
    t.push('bola longa por cima da linha adiantada');
  }
  if (
    atacante.marcacao === 'Pressão alta' &&
    (defensor.estiloOfensivo === 'Posse de bola' || defensor.ritmo === 'Lento')
  ) {
    t.push('pressão forçando erro na saída lenta');
  }
  return t;
}

const ESTILOS: Tatica['estiloOfensivo'][] = [
  'Equilibrado',
  'Posse de bola',
  'Contra-ataque',
  'Ataque direto',
];
const LINHAS: Tatica['linhaDefensiva'][] = ['Recuada', 'Normal', 'Adiantada'];
const MARCACOES: Tatica['marcacao'][] = ['Zona', 'Individual', 'Pressão alta'];

/** Saldo do matchup para uma tática minha contra a dele. */
function saldoContra(minha: Tatica, dele: Tatica): number {
  return modMatchupAtaque(minha, dele) - modMatchupAtaque(dele, minha);
}

/** Melhor ajuste (estilo/linha/marcação) que sobe o saldo; texto ou null. */
function sugerirAjuste(minha: Tatica, dele: Tatica): string | null {
  let melhor = minha;
  let melhorSaldo = saldoContra(minha, dele);
  for (const estiloOfensivo of ESTILOS) {
    for (const linhaDefensiva of LINHAS) {
      for (const marcacao of MARCACOES) {
        const v: Tatica = {...minha, estiloOfensivo, linhaDefensiva, marcacao};
        const s = saldoContra(v, dele);
        if (s > melhorSaldo + 0.03) {
          melhorSaldo = s;
          melhor = v;
        }
      }
    }
  }
  if (melhor === minha) {
    return null;
  }
  const mudancas: string[] = [];
  if (melhor.estiloOfensivo !== minha.estiloOfensivo) {
    mudancas.push(melhor.estiloOfensivo);
  }
  if (melhor.linhaDefensiva !== minha.linhaDefensiva) {
    mudancas.push(`linha ${melhor.linhaDefensiva.toLowerCase()}`);
  }
  if (melhor.marcacao !== minha.marcacao) {
    mudancas.push(melhor.marcacao.toLowerCase());
  }
  return mudancas.length > 0 ? mudancas.join(' + ') : null;
}

/** Lê o confronto tático (matchup nos dois sentidos) e sugere ajuste. Pura. */
export function avaliarConfronto(minha: Tatica, dele: Tatica): LeituraConfronto {
  const saldo = Math.round(saldoContra(minha, dele) * 100) / 100;
  const nivel: NivelConfronto =
    saldo > 0.06 ? 'favoravel' : saldo < -0.06 ? 'arriscado' : 'neutro';
  return {
    nivel,
    saldo,
    vantagens: exploracoes(minha, dele),
    riscos: exploracoes(dele, minha),
    sugestao: sugerirAjuste(minha, dele),
  };
}
